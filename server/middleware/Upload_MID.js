import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// images live on disk under server/uploads/pins/<pin _id>/ — one folder per pin so it's
// easy to find a pin's images by hand. The pin only stores the file names.
// in Docker, mount the uploads folder as a volume so images survive a rebuild.
const PIN_IMAGES_DIR = path.join(import.meta.dirname, '..', 'uploads', 'pins');
fs.mkdirSync(PIN_IMAGES_DIR, {recursive: true});

// pinId always comes from a loaded pin document (never from the URL), so it's a safe folder name
function pinImagesDir(pinId) {
    return path.join(PIN_IMAGES_DIR, pinId.toString());
}

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // what the phone may send per image
const MAX_STORED_SIZE = 5 * 1024 * 1024;  // what we keep on disk per image
const MAX_DIMENSION = 2560;               // longest side in px — plenty for a phone/desktop screen
const MAX_IMAGES_PER_PIN = 10;

// formats we accept in; everything is stored as jpg
const INPUT_FORMATS = ['jpeg', 'png', 'webp', 'heif'];

// names we generate: uuid + extension. Anything else is never touched on disk
const FILE_NAME_RE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

// kept in memory (not disk) so nothing is written until the image is checked and compressed
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: MAX_UPLOAD_SIZE, files: MAX_IMAGES_PER_PIN},
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        }
        cb(null, true);
    },
}).array('images', MAX_IMAGES_PER_PIN);

class BadImageError extends Error {}

// phone photo -> jpg under MAX_STORED_SIZE:
//  - rotate() applies the phone's EXIF orientation so the photo isn't sideways
//  - resize only shrinks, never enlarges
//  - flatten gives transparent PNGs a white background (jpg has no transparency)
//  - sharp drops EXIF by default, so the phone's GPS / device info isn't stored
// if it's still too big, lower the quality, then the size, until it fits
async function compressImage(buffer) {
    let meta;
    try {
        meta = await sharp(buffer).metadata(); // also our "is this really an image" check
    } catch {
        throw new BadImageError('one or more files are not real images');
    }
    if (!INPUT_FORMATS.includes(meta.format)) {
        throw new BadImageError(`unsupported image format: ${meta.format}`);
    }

    let dimension = MAX_DIMENSION;
    let quality = 82;
    let output;
    for (let attempt = 0; attempt < 8; attempt++) {
        try {
            output = await sharp(buffer, {failOn: 'error'})
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

// requires isPinUnitOrAdmin earlier in the chain (sets req.pin), so nothing is processed
// for a user who can't touch the pin. Compresses every image, saves it to the pin's folder
// and puts the file names on req.uploaded_images.
// Expects multipart/form-data with the files under "images".
function uploadPinImages(req, res, next) {
    upload(req, res, async (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                const messages = {
                    LIMIT_FILE_SIZE: `each image must be under ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`,
                    LIMIT_FILE_COUNT: `up to ${MAX_IMAGES_PER_PIN} images at a time`,
                    LIMIT_UNEXPECTED_FILE: `only image files, sent in the "images" field`,
                };
                return res.status(400).json({message: messages[err.code] || err.message});
            }
            return res.status(500).json({message: `Server error: ${err.message}`});
        }

        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).json({message: 'no images sent (field name must be "images")'});
        }

        // checked before compressing so we don't do the work for nothing
        if (req.pin.image.length + files.length > MAX_IMAGES_PER_PIN) {
            return res.status(400).json({
                message: `a pin can have up to ${MAX_IMAGES_PER_PIN} images (it has ${req.pin.image.length})`
            });
        }

        const dir = pinImagesDir(req.pin._id);
        const saved = [];
        try {
            // compress them all first: if any one is bad, nothing gets written
            // (one at a time to keep memory use down)
            const compressed = [];
            for (const file of files) {
                compressed.push(await compressImage(file.buffer));
            }

            await fs.promises.mkdir(dir, {recursive: true});
            for (const buffer of compressed) {
                const name = crypto.randomUUID() + '.jpg';
                await fs.promises.writeFile(path.join(dir, name), buffer);
                saved.push(name);
            }
        } catch (e) {
            removePinImageFiles(req.pin._id, saved);
            if (e instanceof BadImageError) {
                return res.status(400).json({message: e.message});
            }
            return res.status(500).json({message: `Server error: ${e.message}`});
        }

        req.uploaded_images = saved;
        next();
    });
}

// for routes with :filename — only names we generated AND that belong to req.pin
function isPinImage(req, res, next) {
    const name = req.params.filename;
    if (!FILE_NAME_RE.test(name) || !req.pin.image.includes(name)) {
        return res.status(404).json({message: 'image not found'});
    }
    next();
}

export {uploadPinImages, isPinImage, removePinImageFiles, removePinImagesDir, pinImagesDir};
