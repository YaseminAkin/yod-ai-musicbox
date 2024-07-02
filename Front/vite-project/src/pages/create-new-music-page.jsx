import { useState, useEffect } from 'react';

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

function CreateNewMusic() {

    const size = useWindowSize();

    return (
        <>
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#502B4E]">
                <h1 className="text-white text-3xl md:text-5xl font-bold mb-2 p-10 text-center">MUSICBOX</h1>
                <div className="bg-gradient-to-b from-[#FFFFFF] to-[#BA8BB8] rounded-t-lg md:rounded-lg shadow-lg p-8 w-full md:max-w-3xl min-h-screen md:min-h-0 md:p-20 lg:p-32">
                    <h2 className="text-[#1E1E1E] text-lg md:text-2xl mb-6 text-center">Create new Musicbox</h2>
                    <div className="flex flex-col items-center">
                        {size.width < 1024 && (
                        <button className="bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full mb-4 w-72 md:w-80 lg:w-96">
                            Use Camera
                        </button>
                        )}
                        <button className="bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full w-72 md:w-80 lg:w-96">
                            Import files
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default CreateNewMusic;
