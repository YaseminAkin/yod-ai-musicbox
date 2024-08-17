import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Tone from 'tone';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';

function CreateNewMusicbox() {
  const [imagePreviews, setImagePreviews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeNotes, setActiveNotes] = useState([]);
  const [piano, setPiano] = useState(null);
  const navigate = useNavigate();
  const containerRef = useRef(null); // Reference to the outer container
  const pianoWrapperRef = useRef(null); // Reference to the Piano's wrapper div
  const [pianoWidth, setPianoWidth] = useState(0); // State to hold the Piano's width

  // Function to update the Piano's width based on the wrapper div's width
  // Function to update the Piano's width based on the wrapper div's width
  const updatePianoWidth = () => {
    if (pianoWrapperRef.current && loading) { // Only update width when loading is true
      setPianoWidth(pianoWrapperRef.current.offsetWidth);
    }
  };

  // useEffect to set the initial width and add event listener for window resize
  useEffect(() => {
    if (loading) {
      updatePianoWidth(); // Set initial width when loading is true

      // Update width on window resize
      window.addEventListener('resize', updatePianoWidth);

      // Cleanup event listener on component unmount
      return () => {
        window.removeEventListener('resize', updatePianoWidth);
      };
    }
  }, [loading]);

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

  const keyMap = {
    'a': 'A3',
    'w': 'A#3',
    's': 'B3',
    'd': 'C4',
    'r': 'C#4',
    'f': 'D4',
    't': 'D#4',
    'g': 'E4',
    'h': 'F4',
    'u': 'F#4',
    'j': 'G4',
    'i': 'G#4',
    'k': 'A4',
    'o': 'A#4',
    'l': 'B4',
    ';': 'C5',
    "[": 'C#5',
    "'": 'D5',
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

  const firstNote = MidiNumbers.fromNote('A3');
  const lastNote = MidiNumbers.fromNote('D5');
  const keyboardShortcuts = KeyboardShortcuts.create({
    firstNote: firstNote,
    lastNote: lastNote,
    keyboardConfig: KeyboardShortcuts.HOME_ROW,
  });

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
      setImagePreviews(prevPreviews => [...prevPreviews, ...results]);
      setCurrentIndex(0);
    });

    event.target.value = null;
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

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/process-images', {
        method: 'POST',
        credentials: 'include', // Include cookies for session management
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setImagePreviews([]);
      setCurrentIndex(0);
      console.log(data);
      navigate('/musicbox', { state: { data } });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
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

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#502B4E]">
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-2 p-10 text-center">MUSICBOX</h1>
        <div
            className="bg-gradient-to-b from-[#FFFFFF] to-[#BA8BB8] rounded-t-lg md:rounded-lg shadow-lg p-8 md:max-w-7.5xl min-h-screen md:min-h-0 md:p-20 lg:p-16"
            style={{
              width: '100%',
              maxWidth: '1000px',
              height: '100%',
              maxHeight: '500px',
            }}
        >
          <h2 className="text-xl md:text-3xl font-semibold mb-6 text-center">Welcome to the Musicbox</h2>
          <div className="flex flex-col items-center">
            <h2 className="text-[#1E1E1E] text-lg md:text-2xl mb-6 text-center">Create a New Musicbox</h2>
            <div className="flex overflow-x-scroll w-full max-w-lg ">
              {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative m-2">
                    <img
                        src={preview}
                        alt={`Thumbnail ${index}`}
                        className={`w-24 h-24 object-cover cursor-pointer rounded-lg ${currentIndex === index ? 'border-4 border-[#512C4F]' : ''}`}
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
                onClick={handleImportClick}
                className="bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full w-72 md:w-80 lg:w-96"
            >
              {imagePreviews.length === 0 ? "Import Sheet Music" : "Import More Sheet Music"}
            </button>
            {imagePreviews.length > 0 && (
                <button
                    onClick={handleSubmit}
                    className="mt-4 bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full"
                >
                  Submit Images
                </button>
            )}
            <input
                type="file"
                id="fileInput"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                multiple
            />
            {loading && (
                <div className="mt-4 flex justify-center items-center">
                  <div className="spinner"></div>
                </div>
            )}
          </div>
        </div>
        {loading && (
          <>
              <h1 className="text-white text-3xl md:text-5xl font-bold mb-2 p-10 text-center">
                Piano
              </h1>
              <div
                ref={containerRef}
                className="bg-gradient-to-b from-white to-[#BA8BB8] rounded-t-lg md:rounded-lg shadow-lg p-8 md:max-w-7xl md:p-20 lg:p-16 mx-auto"
                style={{
                  width: '100%',
                  maxWidth: '1000px',
                  height: '500px', // Fixed height for the container
                }}
              >
                <h2 className="text-md md:text-lg mt-2 mb-4 text-center">
                  While the Musicbox is processed, you can enjoy playing the piano!
                </h2>
                <div
                  ref={pianoWrapperRef}
                  className="h-1/2" // Sets height to 50% of the parent container
                >
                  {/* Render the Piano only after the width is determined */}
                  {pianoWidth > 0 && (
                    <Piano
                      noteRange={{ first: firstNote, last: lastNote }}
                      playNote={() => {}} // Empty function as we don't want to play notes directly
                      stopNote={() => {}} // Empty function as we don't want to stop notes directly
                      activeNotes={activeNotes}
                      keyboardShortcuts={keyboardShortcuts}
                      width={pianoWidth} // Set the Piano's width to match its wrapper's width
                    />
                  )}
                </div>
              </div>
          </>
        )}
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-2 p-10 text-center">FAQ</h1>
        <div
            className="bg-gradient-to-b from-[#BA8BB8] to-[#FFFFFF] rounded-t-lg md:rounded-lg shadow-lg p-8 md:max-w-7.5xl min-h-screen md:p-20 "
            style={{
              width: '100%',
              maxWidth: '1000px',
              height: '100%',
              maxHeight: '3000px',
              marginBottom: '5rem',
            }}
        >
          {/* FAQ Section */}
          <div className="mt-12">
            <div className="">
              <h3 className="text-lg md:text-2xl font-semibold">What is Musicbox?</h3>
              <p className="text-md md:text-lg mt-2">
                Musicbox is a platform that allows you to upload sheet music images and convert them into visual music
                representations.
              </p>
              <h3 className="text-lg md:text-2xl font-semibold mt-6">How do I upload my sheet music?</h3>
              <p className="text-md md:text-lg mt-2">
                Click on the "Import Sheet Music" button and select the images you want to upload from your device. You
                can upload multiple images at once.
              </p>
              <h3 className="text-lg md:text-2xl font-semibold mt-6">What file formats are supported?</h3>
              <p className="text-md md:text-lg mt-2">
                Currently, Musicbox supports all standard image formats such as JPG, PNG etc.
              </p>
              <h3 className="text-lg md:text-2xl font-semibold mt-6">How do I save the Musicbox?</h3>
              <p className="text-md md:text-lg mt-2">
                To save the Musicbox, simply click on the "Save the PDF" button located in the top-right corner of the
                image
                thumbnail.
              </p>
              <h3 className="text-lg md:text-2xl font-semibold mt-6">How long does processing take?</h3>
              <p className="text-md md:text-lg mt-2">
                Processing time may vary depending on the number of images uploaded, but it typically takes just a few
                seconds.
              </p>
            </div>
          </div>
          {/* Developers Info Section */}
          <div className="mt-12 flex flex-col items-center">
            <h2 className="text-xl md:text-3xl font-semibold mb-6">Meet the Developers</h2>
            <div className="flex flex-wrap justify-center space-x-4">
              {[
                {name: 'Alphan Tulukcu', image: './public/alphan_pp.jpeg'},
                {name: 'İlhami Uluğtürkkan', image: './public/1672949164378.jpeg'},
                {name: 'Yasemin Akın', image: './public/1693345488450.jpeg'},
                {name: 'Oğulcan Karakollukçu', image: './public/1676894646838.jpeg'},
                {name: 'Denizcan Özdemir', image: './public/1654705359785.jpeg'},
              ].map((developer, index) => (
                  <div key={index} className="flex flex-col items-center mb-4">
                    <img
                        src={developer.image}
                        alt={developer.name}
                        className="w-24 h-24 rounded-full object-cover mb-2"
                    />
                    <h3 className="text-lg md:text-xl">{developer.name}</h3>
                  </div>
              ))}
            </div>
          </div>
          {/* Developers Info Section */}
          <div className="mt-12 flex flex-col items-center">
            <h2 className="text-xl md:text-3xl font-semibold mb-6">Powered by</h2>
            <div className="flex flex-wrap justify-center space-x-4">
              {[
                {name: 'Amazon Web Services', image: './public/aws-logo-logo-png-transparent.png'},
              ].map((developer, index) => (
                  <div key={index} className="flex flex-col items-center mb-4">
                    <img
                        src={developer.image}
                        alt={developer.name}
                        className="w-40 h-40 object-cover mb-2"
                    />
                    <h3 className="text-lg md:text-xl">{developer.name}</h3>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default CreateNewMusicbox;
