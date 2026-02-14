import React, { useEffect } from 'react'
import useFileUploader from './useFileUploader';
import './FileUploader.css';

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Accept a callback prop so the parent knows about the files
function FileUploader({ onFilesChange }) {
    const { getRootProps, getInputProps, isDragActive, files, removeFile } = useFileUploader();

    // NOTIFY PARENT: Whenever 'files' changes, tell the parent component
    useEffect(() => {
        if (onFilesChange) {
            onFilesChange(files);
        }
    }, [files, onFilesChange]);

    return (
        <div className="file-uploader-wrapper">
            <div {...getRootProps()} className={`file-uploader-container ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                {
                    isDragActive ?
                        <p className="file-uploader-text">Drop the video files here ...</p> :
                        <p className="file-uploader-text">Drag 'n' drop video files here, or click to select</p>
                }
            </div>

            {files.length > 0 && (
                <div className="file-uploader-files">
                    <h4>Ready to Convert:</h4>
                    <ul>
                        {files.map((file, index) => (
                            <li key={index}>
                                <div>
                                    <span className="file-name">{file.name}</span>
                                    <span className="file-size">{formatBytes(file.size)}</span>
                                </div>
                                <button className="file-remove-btn" onClick={() => removeFile(file)}>
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default FileUploader;