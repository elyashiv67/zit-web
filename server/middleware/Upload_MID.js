import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import env from '../config/env.js';

// images live on disk under <uploads>/pins/<pin _id>/ — one folder per pin so it's
// easy to find a pin's images by hand. The pin only stores the file names.
// in Docker, mount the uploads folder as a volume so images survive a rebuild.
const UPLOADS_DIR = env.UPLOADS_DIR ?? path.join(import.meta.dirname, '..', 'uploads');
const PIN_IMAGES_DIR = path.join(UPLOADS_DIR, 'pins');
fs.mkdirSync(PIN_IMAGES_DIR, {recursive: true});

// incoming files are streamed here first (not kept in memory), so a slow phone upload or many
// uploads at once cost disk space, not RAM. They are always deleted after the request.
const INCOMING_DIR = path.join(os.tmpdir(), 'zit-incoming');
fs.mkdirSync(INCOMING_DIR, {recursive: true});

// pinId always comes from a loaded pin document (never from the URL), so it's a safe folder name
function pinImagesDir(pinId) {
    return path.join(PIN_IMAGES_DIR, pinId.toString());
}

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // what the phone may send per image
const MAX_STORED_SIZE = 5 * 1024 * 1024;  // what we keep on disk per image
const MAX_DIMENSION = 2560;               // longest side in px — plenty for a phone/desktop screen
const MAX_IMAGES_PER_PIN = 10;
// a small file can still be a huge image (decompression bomb) — sharp's default allows ~268MP,
// about 1GB of memory once decoded. 100MP covers every normal phone photo.
const MAX_PIXELS = 100_000_000;
// decoding is the memory-heavy part (up to ~300MB for a 100MP photo), so only this many images
// are compressed at the same time across all requests; the rest wait their turn
const MAX_PARALLEL_COMPRESSIONS = 2;

// formats we accept in; everything is stored as jpg
const INPUT_FORMATS = ['jpeg', 'png', 'webp', 'heif'];

// names we generate: uuid + extension. Anything else is never touched on disk
const FILE_NAME_RE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

const upload = multer({
    storage: multer.diskStorage({destination: INCOMING_DIR}), // random file names
    limits: {fileSize: MAX_UPLOAD_SIZE, files: MAX_IMAGES_PER_PIN},
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        }
        cb(null, true);
    },
}).array('images', MAX_IMAGES_PER_PIN);

class BadImageError extends Error {}

// a tiny semaphore: at most MAX_PARALLEL_COMPRESSIONS run fn at once. A finished one hands its
// slot straight to the next waiting one, so the count can never go over the limit.
let activeCompressions = 0;
const waitingCompressions = [];
async function withCompressionSlot(fn) {
    if (activeCompressions < MAX_PARALLEL_COMPRESSIONS) activeCompressions++;
    else await new Promise(resolve => waitingCompressions.push(resolve));
    try {
        return await fn();
    } finally {
        const next = waitingCompressions.shift();
        if (next) next(); else activeCompressions--;
    }
}

// phone photo (a file path) -> jpg buffer under MAX_STORED_SIZE:
//  - rotate() applies the phone's EXIF orientation so the photo isn't sideways
//  - resize only shrinks, never enlarges
//  - flatten gives transparent PNGs a white background (jpg has no transparency)
//  - sharp drops EXIF by default, so the phone's GPS / device info isn't stored
// if it's still too big, lower the quality, then the size, until it fits
async function compressImage(file) {
    let meta;
    try {
        // reading the header decodes nothing, so no pixel limit here; ours is checked below
        meta = await sharp(file, {limitInputPixels: false}).metadata(); // also our "is this really an image" check
    } catch {
        throw new BadImageError('one or more files are not real images');
    }
    if (!INPUT_FORMATS.includes(meta.format)) {
        throw new BadImageError(`unsupported image format: ${meta.format}`);
    }
    if (meta.width * meta.height > MAX_PIXELS) {
        throw new BadImageError(`image is too large (max ${MAX_PIXELS / 1_000_000} megapixels)`);
    }

    let dimension = MAX_DIMENSION;
    let quality = 82;
    let output;
    for (let attempt = 0; attempt < 8; attempt++) {
        try {
            output = await sharp(file, {failOn: 'error', limitInputPixels: MAX_PIXELS})
                .rotate()
                .resize({width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true})
                .flatten({background: '#ffffff'})
                .jpeg({quality, mozjpeg: true})
                .toBuffer();
        } catch {
            // iPhone HEIC photos need a codec sharp doesn't ship with
            throw new BadImageError(meta.format === 'heif'
                ? 'HEIC photos are not supported — set the camera to "Most Compatible" or upload as jpg'
                : 'one or more images could not be read');
        }
        if (output.length <= MAX_STORED_SIZE) return output;

        if (quality > 52) quality -= 15;
        else dimension = Math.round(dimension * 0.75);
    }
    return output;
}

function removePinImageFiles(pinId, fileNames) {
    for (const name of fileNames) {
        if (!FILE_NAME_RE.test(name)) continue;
        fs.unlink(path.join(pinImagesDir(pinId), name), () => {});
    }
}

// whole folder, for when the pin itself is deleted
function removePinImagesDir(pinId) {
    fs.rm(pinImagesDir(pinId), {recursive: true, force: true}, () => {});
}

const UPLOAD_ERRORS = {
    LIMIT_FILE_SIZE: `each image must be under ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`,
    LIMIT_FILE_COUNT: `up to ${MAX_IMAGES_PER_PIN} images at a time`,
    LIMIT_UNEXPECTED_FILE: 'only image files, sent in the "images" field',
};

// multer's callback as a promise; the files end up on req.files
// (on an error multer deletes the files it already wrote)
function receiveFiles(req, res) {
    return new Promise((resolve, reject) => upload(req, res, err => err ? reject(err) : resolve()));
}

// compress them all first: if any one is bad, nothing gets written. One image at a time per
// request, and at most MAX_PARALLEL_COMPRESSIONS across the server, to keep memory use down.
async function compressAll(files) {
    const compressed = [];
    for (const file of files)
        compressed.push(await withCompressionSlot(() => compressImage(file.path)));
    return compressed;
}

async function saveToPinFolder(pinId, buffers) {
    const names = [];
    try {
        await fs.promises.mkdir(pinImagesDir(pinId), {recursive: true});
        for (const buffer of buffers) {
            const name = crypto.randomUUID() + '.jpg';
            await fs.promises.writeFile(path.join(pinImagesDir(pinId), name), buffer);
            names.push(name);
        }
    } catch (e) {
        removePinImageFiles(pinId, names);
        throw e;
    }
    return names;
}

// requires isPinUnitOrAdmin earlier in the chain (sets req.pin), so nothing is processed
// for a user who can't touch the pin. Compresses every image, saves it to the pin's folder
// and puts the file names on req.uploaded_images.
// Expects multipart/form-data with the files under "images".
async function uploadPinImages(req, res, next) {
    try {
        await receiveFiles(req, res);
    } catch (err) {
        if (err instanceof multer.MulterError)
            return res.status(400).json({message: UPLOAD_ERRORS[err.code] || err.message});
        throw err;
    }

    const files = req.files || [];
    try {
        if (files.length === 0)
            return res.status(400).json({message: 'no images sent (field name must be "images")'});

        // quick check before compressing so we don't do the work for nothing;
        // addPinImages checks again atomically when it saves
        if (req.pin.image.length + files.length > MAX_IMAGES_PER_PIN)
            return res.status(400).json({message: `a pin can have up to ${MAX_IMAGES_PER_PIN} images (it has ${req.pin.image.length})`});

        let compressed;
        try {
            compressed = await compressAll(files);
        } catch (e) {
            if (e instanceof BadImageError)
                return res.status(400).json({message: e.message});
            throw e;
        }

        req.uploaded_images = await saveToPinFolder(req.pin._id, compressed);
    } finally {
        for (const file of files) fs.unlink(file.path, () => {});
    }
    next();
}

// for routes with :filename — only names we generated AND that belong to req.pin
function isPinImage(req, res, next) {
    const name = req.params.filename;
    if (!FILE_NAME_RE.test(name) || !req.pin.image.includes(name)) {
        return res.status(404).json({message: 'image not found'});
    }
    next();
}

export {uploadPinImages, isPinImage, removePinImageFiles, removePinImagesDir, pinImagesDir, MAX_IMAGES_PER_PIN};
