import React, { useState, useCallback } from 'react';
import FileUploader from "../FileUploader/FileUploader.jsx";

function FileContainer() {
    const [files, setFiles] = useState([]);
    const handleFilesUpdate = useCallback((newFiles) => {
        setFiles(newFiles);
        console.log("Files ready for FFmpeg:", newFiles);
    }, []);

    return (
        <>
            <FileUploader onFilesChange={handleFilesUpdate} />

            <p>Files in Parent: {files.length}</p>
        </>
    );
}

export default FileContainer;