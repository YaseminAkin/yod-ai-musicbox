from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from PIL import Image
import io
import os
import uuid
import subprocess
import music21
import numpy as np
import cv2
import fitz
from pdf2image import convert_from_path

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


def is_grayscale(image):
    if image.mode in ("L", "I;16"):  # Check if the image is in a grayscale mode
        return True
    elif image.mode == "RGB":
        np_img = np.array(image)
        if np.all(np_img[..., 0] == np_img[..., 1]) and np.all(np_img[..., 1] == np_img[..., 2]):
            return True
    return False


# Image processing functions
def blur_and_threshold(gray):
    gray = cv2.GaussianBlur(gray, (3, 3), 2)
    threshold = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    threshold = cv2.fastNlMeansDenoising(threshold, 11, 31, 9)
    return threshold


def biggest_contour(contours, min_area):
    biggest = None
    max_area = 0
    biggest_n = 0
    approx_contour = None
    for n, i in enumerate(contours):
        area = cv2.contourArea(i)
        if area > min_area / 10:
            peri = cv2.arcLength(i, True)
            approx = cv2.approxPolyDP(i, 0.02 * peri, True)
            if area > max_area:
                biggest = approx
                max_area = area
                biggest_n = n
                approx_contour = approx
    return biggest_n, approx_contour


def order_points(pts):
    pts = pts.reshape(4, 2)
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def four_point_transform(image, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped


def transformation(image):
    image = image.copy()
    if len(image.shape) > 2 and image.shape[2] > 1:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    # gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    image_size = gray.size
    threshold = blur_and_threshold(gray)
    edges = cv2.Canny(threshold, 50, 150, apertureSize=7)
    contours, hierarchy = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    simplified_contours = []
    for cnt in contours:
        hull = cv2.convexHull(cnt)
        simplified_contours.append(cv2.approxPolyDP(hull, 0.001 * cv2.arcLength(hull, True), True))
    biggest_n, approx_contour = biggest_contour(simplified_contours, image_size)
    if approx_contour is not None and len(approx_contour) == 4:
        approx_contour = np.float32(approx_contour)
        dst = four_point_transform(image, approx_contour)
    else:
        # If no suitable contour is found, return the original image
        dst = image
    return dst


def increase_brightness(img, value=30):
    # Ensure the image is in 8-bit unsigned integer format
    if img.dtype == np.float64 or img.dtype == np.float32:
        img = cv2.convertScaleAbs(img)

    # Convert grayscale to BGR if needed
    if len(img.shape) == 2:  # If the image is grayscale
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    # Convert the image to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Split the HSV channels
    h, s, v = cv2.split(hsv)

    # Increase the brightness
    lim = 255 - value
    v[v > lim] = 255
    v[v <= lim] += value

    # Merge the channels back and convert to BGR
    final_hsv = cv2.merge((h, s, v))
    img = cv2.cvtColor(final_hsv, cv2.COLOR_HSV2BGR)

    return img


def final_image(rotated):
    kernel_sharpening = np.array([[0, -1, 0],
                                  [-1, 5, -1],
                                  [0, -1, 0]])
    sharpened = cv2.filter2D(rotated, -1, kernel_sharpening)
    sharpened = increase_brightness(sharpened, 30)
    gray_sharpened = cv2.cvtColor(sharpened, cv2.COLOR_BGR2GRAY)
    return gray_sharpened


# Image processing function for Flask
def process_image(image):
    if is_grayscale(image):
        image_np = np.array(image)
        print("Grayscale")
    else:
        image_np = np.array(image.convert('L'))
        print("Not Grayscale")
    processed_image = transformation(image_np)
    final_img = final_image(processed_image)
    return final_img



def extract_images_from_pdf(pdf_file):
    pdf_data = pdf_file.read()
    pdf_path = f"/tmp/{uuid.uuid4()}.pdf"
    
    with open(pdf_path, "wb") as f:
        f.write(pdf_data)
    
    images = convert_from_path(pdf_path)
    
    return images

def process_with_oemer(images):
    # Generate unique filenames for output files
    musicxml_path = f"{uuid.uuid4()}.musicxml"
    midi_path = f"{uuid.uuid4()}.midi"

    image_files = []

    # Save images to disk with unique filenames
    for img in images:
        img_file = f"{uuid.uuid4()}.png"
        img.save(img_file)
        image_files.append(img_file)

    # Run Oemer on each image file to generate MusicXML
    for img_file in image_files:
        subprocess.run(['oemer', img_file, '-o', musicxml_path])

    # Convert MusicXML to MIDI using music21
    score = music21.converter.parse(musicxml_path)
    mf = music21.midi.translate.music21ObjectToMidiFile(score)
    mf.open(midi_path, 'wb')
    mf.write()
    mf.close()

    return musicxml_path, midi_path



@app.route('/process-images', methods=['POST'])
def process_images():
    if 'images' not in request.files:
        return jsonify({'error': 'No images part in the request'}), 400
    #
    images = request.files.getlist('images')

    processed_images = []
    for image in images:
        img = Image.open(image)

        #     # Process the image using OpenCV functions
        processed_img = process_image(img)
        processed_images.append(Image.fromarray(processed_img))
    #
    # Process the images with the Oemer library
    musicxml_path, midi_path = process_with_oemer(processed_images)

    #musicxml_path = "9da88d61-76b2-48bb-a5aa-6135c9945c93.musicxml"
    #midi_path = "53d32db5-681b-4d57-acda-52ed5a83b11d.midi"

    return jsonify({
        'musicxml': musicxml_path,
        'midi': midi_path,
    }) 

@app.route('/process-pdf', methods=['POST'])
def process_pdf():
    if 'pdf' not in request.files:
        return jsonify({'error': 'No PDF file uploaded'}), 400

    pdf_file = request.files['pdf']
    images = extract_images_from_pdf(pdf_file)
    processed_images = []
    for pdf_image in images:
        processed_img = process_image(pdf_image)
        processed_images.append(Image.fromarray(processed_img))

    musicxml_path, midi_path = process_with_oemer(processed_images)
    #musicxml_path = "9da88d61-76b2-48bb-a5aa-6135c9945c93.musicxml"
    #midi_path = "53d32db5-681b-4d57-acda-52ed5a83b11d.midi"

    return jsonify({
        'musicxml': musicxml_path,
        'midi': midi_path,
    })

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_file(filename, as_attachment=True)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
