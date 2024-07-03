from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from PIL import Image
import io
import os
import uuid
import subprocess
import music21

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def process_with_oemer(images):
    musicxml_path = f"{uuid.uuid4()}.musicxml"
    midi_path = f"{uuid.uuid4()}.midi"
    mp3_path = f"{uuid.uuid4()}.mp3"
    image_files = []

    for img in images:
        img_file = f"{uuid.uuid4()}.png"
        img.save(img_file)
        image_files.append(img_file)

    for img_file in image_files:
        subprocess.run(['oemer', img_file, '-o', musicxml_path])

    # Convert MusicXML to MIDI using music21
    """
    Burdan itibarenki kısım çalışmıyor TODO TODO TODO TODO TODO
    
    score = music21.converter.parse(musicxml_path)
    mf = music21.midi.translate.music21ObjectToMidiFile(score)
    mf.open(midi_path, 'wb')
    mf.write()
    mf.close()

    # Convert MIDI to MP3 using ffmpeg
    subprocess.run(['ffmpeg', '-i', midi_path, mp3_path])
    """
    return musicxml_path, mp3_path

@app.route('/process-images', methods=['POST'])
def process_images():
    if 'images' not in request.files:
        return jsonify({'error': 'No images part in the request'}), 400

    images = request.files.getlist('images')

    processed_images = []
    for image in images:
        img = Image.open(image)
        # Resize the image to the appropriate size for the Oemer library
        processed_images.append(img)

    # Process the images with the Oemer library
    musicxml_path, mp3_path = process_with_oemer(processed_images)

    return jsonify({
        'musicxml': musicxml_path,
        'mp3': mp3_path
    })

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_file(filename, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
