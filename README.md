# MUSICBOX by YOD-AI

A music education application that converts music sheets to voice and tabs. 
Our project is a web application that reads musical notes from music sheet paper 
and processes them to provide sound playback, giving real-time guidance on playing 
musical instruments. Our application uses an advanced Optical Music Recognition (OMR) 
feature, using OpenCV to preprocess the sheet music and use open source external libraries 
like Oemer. Recognized notes are converted into the MIDI format and synthesized into sound 
using open source external libraries called MuseScore and FluidSynth. Our high-level execution 
plan will preprocess the image, identify notes, and synthesize sound. This project integrates the 
fields of computer vision and machine learning to make an interactive, fun, and educational tool
in the process of learning music. Additionally, we plan to demonstrate to users how to play the 
specified note sheet on the piano virtually.

## Installation 
Firstly, you need to clone the project to your local machine. You can use the following command to clone the project:
```bash
git clone https://github.com/YaseminAkin/yod-ai-musicbox.git
```
Then, you need to open two separate terminals for the server and the client.
You can write the following commands in the terminal to run the project:

**Server (Terminal 1):**
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install git+https://github.com/BreezeWhite/oemer
python3 app.py runserver
```

**Client (Terminal 2):**
```bash
cd Front/vite-project
npm install
npm run dev 
```

After running the commands, you can open the project on your browser by typing `http://localhost:5173/` in the address bar.

## Usage
You can upload an image of a music sheet to the application. The application will convert the image to musicxml and play the music.
You can find note sheet images directly from the internet. We also add some note sheet examples into `/examples directory.

## Important Note
We use `oemer` library to convert image to `musicxml`. It works on local without any problem. However, it does not work on server. 
We are trying to solve this problem. Therefore, we cannot use `docker` to build the project for now.

## Team Members
    
- Yasemin Akın
- Oğulcan Karakollukçu
- Denizcan Özdemir
- Alphan Tulukcu
- İlhami Uluğtürkkan
