import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import JSZip from 'jszip';

const ffmpeg = new FFmpeg();

export const convertFilesToMp4 = async (files, onProgress) => {

    // 1. LOAD THE ENGINE
    if (!ffmpeg.loaded) {
        // Check if SharedArrayBuffer is supported (required for FFmpeg WASM)
        if (!window.crossOriginIsolated) {
            console.error("SharedArrayBuffer is not available. Please check server headers (Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy).");
            throw new Error("SharedArrayBuffer is not available. See console for details.");
        }

        // Construct the absolute path to your public files
        const baseURL = new URL('/ffmpeg-core.js', document.location).href;
        const wasmURL = new URL('/ffmpeg-core.wasm', document.location).href;

        console.log("Attempting to load FFmpeg Core from:", baseURL);
        console.log("Attempting to load FFmpeg WASM from:", wasmURL);

        try {
            await ffmpeg.load({
                coreURL: await toBlobURL(baseURL, 'text/javascript'),
                wasmURL: await toBlobURL(wasmURL, 'application/wasm'),
            });
            console.log("FFmpeg Loaded Successfully!");
        } catch (error) {
            console.error("FFmpeg Load Failed! Check the Network Tab in DevTools.");
            console.error(error);
            throw error; // Stop here if it fails
        }
    }

    // 2. ATTACH PROGRESS LISTENER
    ffmpeg.on('progress', ({ progress }) => {
        const percentage = Math.round(progress * 100);
        if (onProgress) onProgress(percentage);
    });

    const convertedVideos = [];
    const zip = new JSZip(); // Initialize ZIP

    // 3. START CONVERSION LOOP
    for (const file of files) {
        if (onProgress) onProgress(0);

        // Write file to memory
        await ffmpeg.writeFile('input_video', await fetchFile(file));

        // Convert (standard MP4 settings)
        await ffmpeg.exec([
            '-i', 'input_video',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',  // SPEED TRICK 1
            '-c:a', 'aac',
            'output.mp4'
        ]);

        // Read result
        const data = await ffmpeg.readFile('output.mp4');
        const outputName = file.name.split('.')[0] + '.mp4';

        // Add to ZIP
        zip.file(outputName, data);

        // Create individual download URL (optional, keeps existing functionality)
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

        convertedVideos.push({
            originalName: file.name,
            newUrl: url,
            size: data.byteLength
        });

        // Cleanup memory
        await ffmpeg.deleteFile('input_video');
        await ffmpeg.deleteFile('output.mp4');
    }

    // 3. GENERATE ZIP AND TRIGGER DOWNLOAD (Optional)
    // This creates a single ZIP blob of all converted files
    if (convertedVideos.length > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);

        // Automatically trigger download of the ZIP (or return this URL to the UI)
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = 'converted_videos.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // If you want to return the zip URL to the component instead of auto-downloading:
        // return { convertedVideos, zipUrl };
    }

    return convertedVideos;
};
//הפונקציה הזאת מחזירה מערך של אובייקטים עם המידע הבא:
// originalName: שם הקובץ המקורי
// newUrl: הקישור לקובץ החדש
// size: גודל הקובץ החדש
//אני צריך לעבוד על המהירות של ההמרה ולתת למשתמש  אפשרות להוריד את הקבצים החדשים
//כמו כן אני רוצה להוסיף אפשרות להוריד את כל הקבצים החדשים בבת אחת כקובץ זיפ
//ולתמוך בסוגי קבצים שונים כמו: mp4, avi, mov, mkv, webm, flv, wmv, m4v, 3gp, mpg, mpeg, וכו'