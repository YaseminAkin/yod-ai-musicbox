import glob
import os
import shutil
import subprocess
import uuid

import cv2
import music21
import numpy as np
from flask import Flask, jsonify, request, send_file, session
from flask_cors import CORS
from pdf2image import convert_from_path
from PIL import Image

app = Flask(__name__)
app.secret_key = 'for_users'
CORS(app, supports_credentials=True, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

UPLOAD_DIR = "/tmp/musicbox"
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
MAX_PDF_PAGES = 10
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
PROCESS_TIMEOUT = 180  # 3 minutes

os.makedirs(UPLOAD_DIR, exist_ok=True)


def _cleanup_old_sessions():
    try:
        for entry in os.scandir(UPLOAD_DIR):
            if entry.is_dir():
                shutil.rmtree(entry.path, ignore_errors=True)
    except Exception:
        pass

_cleanup_old_sessions()


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _user_dir(user_id):
    path = os.path.join(UPLOAD_DIR, user_id)
    os.makedirs(path, exist_ok=True)
    return path


# ── Image preprocessing ─────────────────────────────────────────────────────

def _is_grayscale(image):
    if image.mode in ("L", "I;16"):
        return True
    if image.mode == "RGB":
        arr = np.array(image)
        return np.all(arr[..., 0] == arr[..., 1]) and np.all(arr[..., 1] == arr[..., 2])
    return False


def _blur_and_threshold(gray):
    gray = cv2.GaussianBlur(gray, (3, 3), 2)
    thr = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    return cv2.fastNlMeansDenoising(thr, 11, 31, 9)


def _biggest_contour(contours, min_area):
    biggest, max_area, approx_contour = None, 0, None
    for n, c in enumerate(contours):
        area = cv2.contourArea(c)
        if area > min_area / 10:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if area > max_area:
                biggest, max_area, approx_contour = n, area, approx
    return biggest, approx_contour


def _order_points(pts):
    pts = pts.reshape(4, 2)
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _four_point_transform(image, pts):
    rect = _order_points(pts)
    tl, tr, br, bl = rect
    maxWidth = max(
        int(np.sqrt(((br[0]-bl[0])**2) + ((br[1]-bl[1])**2))),
        int(np.sqrt(((tr[0]-tl[0])**2) + ((tr[1]-tl[1])**2)))
    )
    maxHeight = max(
        int(np.sqrt(((tr[0]-br[0])**2) + ((tr[1]-br[1])**2))),
        int(np.sqrt(((tl[0]-bl[0])**2) + ((tl[1]-bl[1])**2)))
    )
    dst = np.array([[0,0],[maxWidth-1,0],[maxWidth-1,maxHeight-1],[0,maxHeight-1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (maxWidth, maxHeight))


def _transform(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) > 2 and image.shape[2] > 1 else image
    thr = _blur_and_threshold(gray)
    edges = cv2.Canny(thr, 50, 150, apertureSize=7)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    simplified = [cv2.approxPolyDP(cv2.convexHull(c), 0.001 * cv2.arcLength(cv2.convexHull(c), True), True) for c in contours]
    _, approx = _biggest_contour(simplified, gray.size)
    if approx is not None and len(approx) == 4:
        return _four_point_transform(image, np.float32(approx))
    return image


def _sharpen_and_brighten(rotated):
    kernel = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])
    sharpened = cv2.filter2D(rotated, -1, kernel)
    if sharpened.dtype in (np.float64, np.float32):
        sharpened = cv2.convertScaleAbs(sharpened)
    if len(sharpened.shape) == 2:
        sharpened = cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)
    hsv = cv2.cvtColor(sharpened, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    v[v > 225] = 255
    v[v <= 225] += 30
    sharpened = cv2.cvtColor(cv2.merge((h, s, v)), cv2.COLOR_HSV2BGR)
    return cv2.cvtColor(sharpened, cv2.COLOR_BGR2GRAY)


def _preprocess(pil_image):
    arr = np.array(pil_image) if _is_grayscale(pil_image) else np.array(pil_image.convert('L'))
    transformed = _transform(arr)
    return Image.fromarray(_sharpen_and_brighten(transformed))


# ── OMR pipeline ─────────────────────────────────────────────────────────────

def _run_homr(img_path):
    result = subprocess.run(
        ['homr', img_path],
        capture_output=True, text=True, timeout=PROCESS_TIMEOUT
    )
    expected_xml = os.path.splitext(img_path)[0] + '.musicxml'
    if result.returncode != 0 or not os.path.exists(expected_xml):
        raise RuntimeError(result.stderr or "homr produced no output")
    return expected_xml


def _analyze_chords(score):
    try:
        key_obj = score.analyze('key')
        key_name = key_obj.tonic.name
        mode = key_obj.mode

        scale = key_obj.getScale()
        scale_notes = [str(p.name) for p in scale.pitches[:-1]]

        chordified = score.chordify()
        chord_map = {}
        for c in chordified.flatten().getElementsByClass('Chord'):
            if not (c.isTriad() or c.isSeventh()):
                continue
            try:
                root = c.root().name
                quality = c.quality
                symbol = c.commonName
                notes = [str(p.name) for p in c.pitches]
                try:
                    rn = music21.roman.romanNumeralFromChord(c, key_obj)
                    roman = str(rn.figure)
                except Exception:
                    roman = None
                k = (root, symbol)
                if k not in chord_map:
                    chord_map[k] = {
                        'root': root, 'symbol': symbol,
                        'quality': quality, 'notes': notes,
                        'roman': roman, 'count': 0,
                    }
                chord_map[k]['count'] += 1
            except Exception:
                continue

        chords = sorted(chord_map.values(), key=lambda x: -x['count'])[:10]
        return {'key': key_name, 'mode': mode, 'scale_notes': scale_notes, 'chords': chords}
    except Exception:
        return None


def _process_pages(pil_images, user_id):
    work_dir = _user_dir(user_id)

    musicxml_path = None
    for i, img in enumerate(pil_images):
        preprocessed = _preprocess(img)
        img_path = os.path.join(work_dir, f"page_{i}.png")
        preprocessed.save(img_path)
        try:
            musicxml_path = _run_homr(img_path)
        except (RuntimeError, subprocess.TimeoutExpired) as e:
            raise RuntimeError(f"OMR failed on page {i+1}: {e}")

    if not musicxml_path:
        raise RuntimeError("No pages were processed")

    midi_path = os.path.splitext(musicxml_path)[0] + '.midi'
    score = music21.converter.parse(musicxml_path)
    chord_data = _analyze_chords(score)
    mf = music21.midi.translate.music21ObjectToMidiFile(score)
    mf.open(midi_path, 'wb')
    mf.write()
    mf.close()

    rel_xml = os.path.relpath(musicxml_path, UPLOAD_DIR)
    rel_midi = os.path.relpath(midi_path, UPLOAD_DIR)
    return rel_xml, rel_midi, chord_data


# ── Routes ───────────────────────────────────────────────────────────────────

def _get_or_create_user_id():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return session['user_id']


@app.route('/process-images', methods=['POST'])
def process_images():
    if 'images' not in request.files:
        return jsonify({'error': 'No images in request'}), 400

    files = request.files.getlist('images')
    for f in files:
        if not _allowed_file(f.filename):
            return jsonify({'error': f'File type not allowed: {f.filename}'}), 400
        f.stream.seek(0, 2)
        if f.stream.tell() > MAX_UPLOAD_BYTES:
            return jsonify({'error': 'File exceeds 20 MB limit'}), 413
        f.stream.seek(0)

    user_id = _get_or_create_user_id()

    try:
        pil_images = [Image.open(f) for f in files]
        rel_xml, rel_midi, chord_data = _process_pages(pil_images, user_id)
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Processing timed out (3 min limit). Try a simpler image.'}), 504
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {e}'}), 500

    return jsonify({'musicxml': rel_xml, 'midi': rel_midi, 'chord_data': chord_data})


@app.route('/process-pdf', methods=['POST'])
def process_pdf():
    if 'pdf' not in request.files:
        return jsonify({'error': 'No PDF in request'}), 400

    pdf_file = request.files['pdf']
    if not _allowed_file(pdf_file.filename):
        return jsonify({'error': 'Only PDF files accepted here'}), 400

    pdf_file.stream.seek(0, 2)
    if pdf_file.stream.tell() > MAX_UPLOAD_BYTES:
        return jsonify({'error': 'File exceeds 20 MB limit'}), 413
    pdf_file.stream.seek(0)

    user_id = _get_or_create_user_id()
    tmp_pdf = f"/tmp/musicbox_upload_{uuid.uuid4()}.pdf"

    try:
        pdf_file.save(tmp_pdf)
        pages = convert_from_path(tmp_pdf)
        if len(pages) > MAX_PDF_PAGES:
            return jsonify({'error': f'PDF too long (max {MAX_PDF_PAGES} pages)'}), 400

        rel_xml, rel_midi, chord_data = _process_pages(pages, user_id)
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Processing timed out (3 min limit).'}), 504
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {e}'}), 500
    finally:
        if os.path.exists(tmp_pdf):
            os.remove(tmp_pdf)

    return jsonify({'musicxml': rel_xml, 'midi': rel_midi, 'chord_data': chord_data})


@app.route('/download/<path:filename>', methods=['GET'])
def download_file(filename):
    full_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(full_path):
        return jsonify({'error': 'File not found'}), 404
    # Block path traversal
    if not os.path.abspath(full_path).startswith(os.path.abspath(UPLOAD_DIR)):
        return jsonify({'error': 'Invalid path'}), 400
    return send_file(full_path)


@app.route('/delete-user-files', methods=['POST', 'OPTIONS'])
def delete_user_files():
    if request.method == 'OPTIONS':
        return '', 200
    if 'user_id' not in session:
        return jsonify({'error': 'User not recognized'}), 400
    user_dir = os.path.join(UPLOAD_DIR, session['user_id'])
    if os.path.exists(user_dir):
        shutil.rmtree(user_dir, ignore_errors=True)
    return jsonify({'message': 'Files deleted'}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
