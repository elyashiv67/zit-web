import React, { useState, useCallback } from 'react';
import FileUploader from "../FileUploader/FileUploader.jsx";
import { convertFilesToMp4 } from "../HelpFunctions/FFmpeg.js";

function FileContainer() {
    const [files, setFiles] = useState([]);
    const [progress, setProgress] = useState(0);
    const [isConverting, setIsConverting] = useState(false);

    const handleStartConversion = async () => {
        setIsConverting(true);

        // We pass 'setProgress' directly as the 'onProgress' callback
        // The converter will call setProgress(1), setProgress(2), ... setProgress(100)
        let convertedFiles = await convertFilesToMp4(files, setProgress);
        console.log("Converted Files:", convertedFiles);

        setIsConverting(false);
        setProgress(0); // Reset after done
    };

    const handleFilesUpdate = useCallback((newFiles) => {
        setFiles(newFiles);
        console.log("Files ready for FFmpeg:", newFiles);
    }, []);

    return (
        <>
            <FileUploader onFilesChange={handleFilesUpdate} />

            <p>Files in Parent: {files.length}</p>
            {isConverting && (
                <div style={{ marginTop: 20, width: '100%', maxWidth: 400 }}>
                    <p>Converting... {progress}%</p>
                    <div style={{
                        width: '100%',
                        height: '10px',
                        backgroundColor: '#eee',
                        borderRadius: '5px'
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor: '#4caf50',
                            borderRadius: '5px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            )}

            <button onClick={handleStartConversion}>
                Convert
            </button>
        </>
    );
}

export default FileContainer;