import {useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';

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

function CreateNewMusicbox() {
  const [imagePreviews, setImagePreviews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false); // Add loading state

  // const size = useWindowSize();
  const navigate = useNavigate();

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
      setCurrentIndex(0); // Reset to the first image when new images are uploaded
    });
    // Reset the input value to allow uploading the same file again
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

    setLoading(true); // Set loading state to true

    try {
      const response = await fetch('localhost:3000/process-images', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setImagePreviews([]);
      setCurrentIndex(0);
      console.log(data)
      navigate('/musicbox', { state: { data } });

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false); // Set loading state to false
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
        <div className="bg-gradient-to-b from-[#FFFFFF] to-[#BA8BB8] rounded-t-lg md:rounded-lg shadow-lg p-8 md:max-w-7.5xl min-h-screen md:min-h-0 md:p-20 lg:p-32">
          <div className="flex flex-col items-center">
            <h2 className="text-[#1E1E1E] text-lg md:text-2xl mb-6 text-center">Create Musicbox</h2>
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
                <div className="spinner"></div> {/* Spinner CSS class defined in global CSS */}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateNewMusicbox;
