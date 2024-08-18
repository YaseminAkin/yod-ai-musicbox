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

You can write the following commands in the terminal to run the project:

**Server:**
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install git+https://github.com/BreezeWhite/oemer
```

**Client:**
```bash
cd Front/vite-project
npm install
npm run dev 
```

## Important Note
We use `oemer` library to convert image to `musicxml`. It works on local without any problem. However, it does not work on server. 
We are trying to solve this problem. Therefore, we cannot use `docker` to build the project for now.

## Team Members
    
- Yasemin Akın
- Oğulcan Karakollukçu
- Denizcan Özdemir
- Alphan Tulukcu
- İlhami Uluğtürkkan
