import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import 'react-piano/dist/styles.css';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

function CreateNewMusicPage() {
  const [imagePreviews, setImagePreviews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [midiUrl, setMidiUrl] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNotes, setActiveNotes] = useState([]);
  const [noteQueue, setNoteQueue] = useState([]);
  const [midiDuration, setMidiDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [piano, setPiano] = useState(null);
  const size = useWindowSize();

  useEffect(() => {
    const sampler = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3"
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).toDestination();
    setPiano(sampler);
  }, []);

  const handleImageUpload = (event) => {
    const files = event.target.files;
    const fileArray = Array.from(files);
    const imageUrls = fileArray.map(file => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      return new Promise((resolve) => {
        reader.onloadend = () => {
          resolve(reader.result);
        };
      });
    });

    Promise.all(imageUrls).then(results => {
      setImagePreviews(results);
      setCurrentIndex(0); // Reset to the first image when new images are uploaded
    });
  };

  const handleImportClick = () => {
    document.getElementById('fileInput').click();
  };

  const selectImage = (index) => {
    setCurrentIndex(index);
  };

  const deleteImage = (index) => {
    const newImagePreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newImagePreviews);
    if (currentIndex >= newImagePreviews.length) {
      setCurrentIndex(newImagePreviews.length - 1);
    }
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    imagePreviews.forEach((image, index) => {
      formData.append('images', dataURItoBlob(image), `image${index}.png`);
    });

    try {
      const response = await fetch('http://localhost:3000/process-images', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setMidiUrl(`http://localhost:3000/download/${data.midi}`);
      setPdfUrl(`http://localhost:3000/download/${data.pdf}`);
      setImagePreviews([]); // Clear image previews
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const dataURItoBlob = (dataURI) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const loadMidi = async (url) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const midi = new Midi(arrayBuffer);

    const newNoteQueue = [];
    midi.tracks.forEach(track => {
      track.notes.forEach(note => {
        newNoteQueue.push({
          name: note.name,
          time: note.time,
          duration: note.duration,
          velocity: note.velocity,
        });
      });
    });

    setNoteQueue(newNoteQueue);
    setMidiDuration(midi.duration);
    return newNoteQueue;
  };

  const playMidi = async (url, startTime = 0) => {
    console.log("Starting MIDI playback");

    await Tone.start();
    console.log("Tone.js context started");

    const newNoteQueue = await loadMidi(url);

    // Clear any existing scheduled events before scheduling new ones
    Tone.Transport.cancel();

    newNoteQueue.forEach(note => {
      if (note.time >= startTime) {
        Tone.Transport.schedule(time => {
          piano.triggerAttackRelease(note.name, note.duration, time, note.velocity);
        }, note.time - startTime);
      }
    });

    // Reset active notes for piano roll animation
    setActiveNotes([]);

    // Set the transport position and start it
    Tone.Transport.position = `${startTime}i`;
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stopMidi = () => {
    Tone.Transport.pause();
    setCurrentTime(Tone.Transport.seconds);
    setIsPlaying(false);
  };

  const resetMidi = async () => {
    await stopMidi();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setCurrentTime(0);
    setNoteQueue([]);
    setActiveNotes([]);
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      resetMidi(); // Ensure MIDI stops when component unmounts or dependencies change
    };
  }, []);

  // Ensure the piano roll is synchronized with the playback
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        const currentTime = Tone.Transport.seconds;
        const active = noteQueue.filter(note =>
          note.time <= currentTime && note.time + note.duration > currentTime
        ).map(note => MidiNumbers.fromNote(note.name));

        setActiveNotes(active);

        // If current time exceeds the midi duration, stop the midi
        if (currentTime >= midiDuration) {
          resetMidi();
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isPlaying, noteQueue, midiDuration]);

  const keyMap = {
    'a': 'C4',
    'w': 'C#4',
    's': 'D4',
    'e': 'D#4',
    'd': 'E4',
    'f': 'F4',
    't': 'F#4',
    'g': 'G4',
    'y': 'G#4',
    'h': 'A4',
    'u': 'A#4',
    'j': 'B4',
    'k': 'C5'
  };

  const handleKeyDown = (event) => {
    const note = keyMap[event.key];
    if (note && piano) {
      piano.triggerAttack(note);
      setActiveNotes((prev) => [...prev, MidiNumbers.fromNote(note)]);
    }
  };

  const handleKeyUp = (event) => {
    const note = keyMap[event.key];
    if (note && piano) {
      piano.triggerRelease(note);
      setActiveNotes((prev) => prev.filter((n) => n !== MidiNumbers.fromNote(note)));
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [piano]);

  const firstNote = MidiNumbers.fromNote('A0');
  const lastNote = MidiNumbers.fromNote('C8');
  const keyboardShortcuts = KeyboardShortcuts.create({
    firstNote: firstNote,
    lastNote: lastNote,
    keyboardConfig: KeyboardShortcuts.HOME_ROW,
  });

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#502B4E]">
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-2 p-10 text-center">MUSICBOX</h1>
        <div className="bg-gradient-to-b from-[#FFFFFF] to-[#BA8BB8] rounded-t-lg md:rounded-lg shadow-lg p-8 w-full md:max-w-7.5xl min-h-screen md:min-h-0 md:p-20 lg:p-32">
          <h2 className="text-[#1E1E1E] text-lg md:text-2xl mb-6 text-center">Create new Musicbox</h2>
          <div className="flex flex-col items-center">
            {imagePreviews.length === 0 && (
              <>
                {size.width < 1024 && (
                  <button className="bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full mb-4 w-72 md:w-80 lg:w-96">
                    Scan with Camera
                  </button>
                )}
                <button
                  onClick={handleImportClick}
                  className="bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full w-72 md:w-80 lg:w-96"
                >
                  Import the files
                </button>
              </>
            )}
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              multiple
            />
            {imagePreviews.length > 0 && (
              <div className="relative mt-4 w-full flex flex-col items-center">
                <div className="flex overflow-x-scroll w-full max-w-lg mt-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative m-2">
                      <img
                        src={preview}
                        alt={`Thumbnail ${index}`}
                        className={`w-24 h-24 object-cover cursor-pointer rounded-lg ${currentIndex === index ? 'border-4 border-purple-700' : ''}`}
                        onClick={() => selectImage(index)}
                      />
                      <button
                        onClick={() => deleteImage(index)}
                        className="absolute top-0 right-0 bg-gray-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSubmit}
                  className="mt-4 bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full"
                >
                  Submit Images
                </button>
              </div>
            )}
            {pdfUrl && (
              <div className="relative mt-4 w-full flex flex-col items-center">
                <h3 className="text-[#1E1E1E] text-lg md:text-xl mb-2 text-center">PDF Preview</h3>
                <div className="border border-gray-300 shadow-lg rounded-lg p-4 bg-white w-full max-w-lg" style={{ height: '500px' }}>
                  <Worker workerUrl={`https://unpkg.com/pdfjs-dist@2.11.338/build/pdf.worker.min.js`}>
                    <Viewer fileUrl={pdfUrl} />
                  </Worker>
                </div>
              </div>
            )}
            {midiUrl && (
              <div className="relative mt-4 w-full flex flex-col items-center">
                <div className="mt-4 flex flex-col items-center">
                  {!isPlaying ? (
                    <button
                      onClick={() => {
                        playMidi(midiUrl, currentTime); // Start new playback from currentTime
                      }}
                      className="bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full mb-4"
                    >
                      Play MIDI
                    </button>
                  ) : (
                    <button
                      onClick={stopMidi}
                      className="bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full mb-4"
                    >
                      Stop MIDI
                    </button>
                  )}
                  <Piano
                    noteRange={{ first: firstNote, last: lastNote }}
                    playNote={() => { }} // Empty function as we don't want to play notes directly
                    stopNote={() => { }} // Empty function as we don't want to stop notes directly
                    activeNotes={activeNotes}
                    keyboardShortcuts={keyboardShortcuts}
                    width={1750}
                    height={155}
                    className="piano mt-4"
                  />
                  <div
                    className="relative overflow-hidden"
                    style={{
                      width: '100%',
                      height: '700px',
                      backgroundColor: 'black',
                      border: '2px solid gray',
                      borderRadius: '0.5rem',
                    }}
                  >
                    {noteQueue.map((note, index) => (
                      <div
                        key={index}
                        className="absolute bg-purple-700 text-white text-center rounded note"
                        style={{
                          left: `${(MidiNumbers.fromNote(note.name) - firstNote) / (lastNote - firstNote) * 98}%`,
                          top: `${(note.time - Tone.now()) * 98}%`,
                          width: '2%',
                          height: '5rem',
                          transition: `top ${note.duration}s linear`,
                        }}
                      >
                        {note.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateNewMusicPage;
