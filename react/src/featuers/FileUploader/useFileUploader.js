import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

const useFileUploader = () => {
    const [files, setFiles] = useState([]);

    const onDrop = useCallback((acceptedFiles) => {
        // We simply store the File objects.
        // Do NOT read them into memory here (it will crash the browser for large videos).
        setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
    }, [])

    const removeFile = useCallback((fileToRemove) => {
        setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        // Optional: Limit strictly to video files
        accept: {
            'video/*': []
        }
    })

    return { getRootProps, getInputProps, isDragActive, files, removeFile }
}

export default useFileUploader;