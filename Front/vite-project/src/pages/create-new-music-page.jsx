import React, { useState, useEffect } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import 'react-piano/dist/styles.css';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import MusicNotation from './MusicNotation'; // Import the MusicNotation component

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
  const [musicXmlUrl, setMusicXmlUrl] = useState(null);
  const [midiUrl, setMidiUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNotes, setActiveNotes] = useState([]);
  const [musicXML, setMusicXML] = useState(null);
  const size = useWindowSize();

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
      setMusicXmlUrl(`http://localhost:3000/download/${data.musicxml}`);
      setMidiUrl(`http://localhost:3000/download/${data.midi}`);

      // Fetch the musicXML content
      const musicXmlResponse = await fetch(`http://localhost:3000/download/${data.musicxml}`);
      const musicXmlContent = await musicXmlResponse.text();
      setMusicXML(musicXmlContent); // Set the musicXML for visualization
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

  const playMidi = async (url) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const midi = new Midi(arrayBuffer);
    const now = Tone.now();

    midi.tracks.forEach(track => {
      const synth = new Tone.Synth().toDestination();
      track.notes.forEach((note, i) => {
        const startTime = note.time + now + (i * 0.01); // Ensure strictly increasing start times
        const endTime = startTime + note.duration;

        synth.triggerAttackRelease(note.name, note.duration, startTime, note.velocity);

        setActiveNotes(prevNotes => [...prevNotes, MidiNumbers.fromNote(note.name)]);
        Tone.Transport.scheduleOnce(() => {
          setActiveNotes(prevNotes => prevNotes.filter(n => n !== MidiNumbers.fromNote(note.name)));
        }, endTime);
      });
    });

    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stopMidi = () => {
    Tone.Transport.stop();
    setActiveNotes([]);
    setIsPlaying(false);
  };

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
        <div className="bg-gradient-to-b from-[#FFFFFF] to-[#BA8BB8] rounded-t-lg md:rounded-lg shadow-lg p-8 w-full md:max-w-3xl min-h-screen md:min-h-0 md:p-20 lg:p-32">
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
            {musicXML && (
              <div className="relative mt-4 w-full flex flex-col items-center">
                <MusicNotation musicXML={musicXML} />
                {musicXmlUrl && (
                  <div className="mt-4">
                    <a href={musicXmlUrl} download className="text-blue-500 underline">
                      Download MusicXML
                    </a>
                  </div>
                )}
                {midiUrl && (
                  <div className="mt-4 flex flex-col items-center">
                    {!isPlaying ? (
                      <button
                        onClick={() => playMidi(midiUrl)}
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
                      playNote={() => {}} // Empty function as we don't want to play notes directly
                      stopNote={() => {}} // Empty function as we don't want to stop notes directly
                      activeNotes={activeNotes}
                      width={size.width < 1024 ? size.width - 50 : 700}
                      keyboardShortcuts={keyboardShortcuts}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateNewMusicPage;
