import { useState, useEffect } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import 'react-piano/dist/styles.css';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { useNavigate, useLocation } from 'react-router-dom';
import '@react-pdf-viewer/core/lib/styles/index.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import MusicNotation from './MusicNotation';

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

function Musicbox() {
  const location = useLocation();
  const { data } = location.state || {};

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNotes, setActiveNotes] = useState([]);
  const [noteQueue, setNoteQueue] = useState([]);
  const [midiDuration, setMidiDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [piano, setPiano] = useState(null);
  const [midi, setMidi] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [musicXML, setMusicXML] = useState(null);
  const [soundProfile, setSoundProfile] = useState('Piano'); // State to track sound profile
  const size = useWindowSize();

  const navigate = useNavigate();

  // Sound profiles setup
  const soundProfiles = {
    Piano: {
      baseUrl: "https://tonejs.github.io/audio/salamander/",
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
      }
    },
    Synth: {
      baseUrl: "https://tonejs.github.io/audio/synth/",
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
      }
    }
  };

  useEffect(() => {
    const sampler = new Tone.Sampler(
        soundProfiles[soundProfile].urls, {
          baseUrl: soundProfiles[soundProfile].baseUrl,
          onload: () => console.log(`${soundProfile} samples loaded!`)
        }
      ).toDestination();
    setPiano(sampler);
    setMidi(`http://localhost:3000/download/${data.midi}`);
    setPdf(`http://localhost:3000/download/${data.pdf}`);
    // Fetch the musicXML content
    const musicXmlResponse = (`http://localhost:3000/download/${data.musicxml}`);
    fetch(musicXmlResponse)
      .then(response => response.text())
      .then(text => {
        const musicXmlContent = text; // Set the musicXML content
        setMusicXML(musicXmlContent); // Set the musicXML for visualization
      })
      .catch(error => {
        console.error('Error fetching the musicXML:', error);
      });
  }, [data, soundProfile]); // Re-initiate the sampler when soundProfile changes

  const loadMidi = async (url) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const midi = new Midi(arrayBuffer);

    const newNoteQueue = [];
    midi.tracks.forEach(track => {
      track.notes.forEach(note => {
        const isSharpOrFlat = note.name.includes('#') || note.name.includes('b');
        newNoteQueue.push({
          name: note.name,
          time: note.time,
          duration: note.duration,
          velocity: note.velocity,
          width: isSharpOrFlat ? 1 : 2, // Set width based on note name
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
      if(soundProfile === 'Piano')
      {
        Tone.Transport.schedule(time => {
            piano.triggerAttackRelease(note.name, note.duration, time, note.velocity);
          }, note.time);
      }
      else
      {
        Tone.Transport.schedule(time => {
            const synth = new Tone.Synth().toDestination();
            synth.triggerAttackRelease(note.name, note.duration, time, note.velocity);
          }, note.time);
      }

    });

    // Reset active notes for piano roll animation
    setActiveNotes([]);

    // Set the transport position and start it
    Tone.Transport.position = `${startTime}i`;
    Tone.Transport.start();

    setTimeout(() => {
      setIsPlaying(true);
    }, 500);
  };

  const stopMidi = () => {
    Tone.Transport.pause();
    setCurrentTime(Tone.Transport.seconds); // Save the exact current position
    setIsPlaying(false);
  };

  const resetMidi = async () => {
    await stopMidi();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setCurrentTime(0); // Reset the position to the beginning
    setNoteQueue([]);
    setMidiDuration(0);
    setActiveNotes([]);
  };

  useEffect(() => {
    return () => {
      resetMidi(); // Ensure MIDI stops when component unmounts or dependencies change
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        const currentTime = Tone.Transport.seconds;
        const active = noteQueue.filter(note =>
          note.time <= currentTime && note.time + note.duration > currentTime
        ).map(note => MidiNumbers.fromNote(note.name));

        setActiveNotes(active);

        // If current time exceeds the midi duration, stop the midi and reset everything
        if (currentTime >= midiDuration) {
          resetMidi();
//           playMidi(midi, 0); // Automatically restart the MIDI and the flow from the beginning
        }
      }, 50); // Shorter interval for smoother updates

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

  const handleDownloadPDF = () => {
    const renderingArea = document.getElementById("rendering-area"); // Target the full content

    html2canvas(renderingArea, { scale: 2, useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        
        // Calculate dimensions to fit the content in a portrait PDF
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "pt",
            format: [canvas.width, canvas.height],
        });

        // Adding the image to the PDF
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save("music-notation.pdf");
    });
};


  const resetAllStates = () => {
    setMidi(null);
    setPdf(null);
    setMp3(null);
    setMusicXML(null);
    setIsPlaying(false);
    setActiveNotes([]);
    setNoteQueue([]);
    setMidiDuration(0);
    resetMidi();
  };

  const resetAllStatesAndNavigate = () => {
    resetAllStates();
    navigate('/');
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#502B4E]">
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-2 p-10 text-center">MUSICBOX</h1>
        <button
          onClick={resetAllStatesAndNavigate}
          className="absolute top-4 right-4 bg-white hover:bg-purple-700 text-[#502B4E] font-bold py-2 px-4 rounded-full"
        >
          Create New Musicbox
        </button>
        <div className="bg-gradient-to-b from-[#FFFFFF] to-[#BA8BB8] rounded-t-lg md:rounded-lg shadow-lg p-8 md:max-w-7.5xl min-h-screen md:min-h-0 md:p-20 lg:p-32">
          <div className="flex flex-col items-center">
            {musicXML && (
              <div className="relative w-full flex flex-col items-center">
                <h3 className="text-[#1E1E1E] text-lg md:text-xl mb-2 text-center">Digital Notation</h3>
                <div
                  id='pdf-content' className="border border-gray-300 shadow-lg rounded-lg p-6 bg-white w-full max-w-4xl flex items-center justify-center"
                  style={{ height: '500px', width: '800px', overflow: 'auto' }} // Increased height and padding for a larger display
                >
                  <MusicNotation musicXML={musicXML}></MusicNotation>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg shadow"
                >
                  Download as PDF
                </button>
              </div>
            )}
            {midi && (
              <div className="relative mt-4 w-full flex flex-col items-center">
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => setSoundProfile('Piano')}
                    className={`${soundProfile === 'Piano' ? 'bg-gradient-to-b from-[#FFFFFF] to-[#BA8BB8]' : 'bg-[#512C4F]'} hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full`}
                  >
                    Piano
                  </button>
                  <button
                    onClick={() => setSoundProfile('Synth')}
                    className={`${soundProfile === 'Synth' ? 'bg-gradient-to-b from-[#FFFFFF] to-[#BA8BB8]' : 'bg-[#512C4F]'} hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full`}
                  >
                    Synth
                  </button>
                </div>
                <div className="mt-4 flex flex-col items-center">
                  {!isPlaying ? (
                    <button
                      onClick={() => {
                        playMidi(midi, currentTime); // Start new playback from currentTime
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
                    width={size.width > 768 ? 1750 : size.width * 0.9} // Responsive width
                    height={size.width > 768 ? 155 : 80} // Responsive height
                    className="piano mt-4"
                  />
                  <div
                    className="relative overflow-hidden"
                    style={{
                      width: '100%',
                      height: '600px', // Adjust height for mobile
                      backgroundColor: '#191327',
                      border: '2px solid gray',
                      borderRadius: '0.5rem',
                    }}
                  >
                    {noteQueue.map((note, index) => {

                      return (
                        <div
                          key={index}
                          className="absolute bg-purple-700 text-white text-center rounded note"
                          style={{
                            left: `${(MidiNumbers.fromNote(note.name) - firstNote) / (lastNote - firstNote) * 98.5}%`,
                            top: `${((note.time - Tone.Transport.seconds))* 75}%`,
                            width: `${note.width}%`,
                            height: `${note.duration * 15}rem`,
                            fontSize: `0.8rem`,
                            transition: 'top 0.1s linear', // Smooth transition for smoother movement
                          }}
                        >
                          {note.name}
                        </div>
                      );
                    })}
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

export default Musicbox;
