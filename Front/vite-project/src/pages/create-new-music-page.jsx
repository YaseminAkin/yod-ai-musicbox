function createNewMusic() {

    return (
        <>
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#502B4E]">
                <h1 className="text-white text-3xl font-bold mb-2 p-10 text-center">MUSICBOX</h1>
                <div className="bg-gradient-to-b from-[#FFFFFF] to-[#BA8BB8] rounded-t-lg shadow-lg p-8 w-full min-h-screen p-60">
                    <h2 className="text-[#1E1E1E] text-lg mb-6 text-center">Create new Musicbox</h2>
                    <div className="flex flex-col items-center">
                        <button className="bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full mb-4 w-72">
                            Scan with Camera
                        </button>
                        <button className="bg-[#512C4F] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full w-72">
                            Import the files
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default createNewMusic