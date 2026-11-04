import Pin from '../modules/pins.js';
import path from 'path';
import {getUnitId} from '../middleware/global_MID.js';
import {removePinImageFiles, removePinImagesDir, pinImagesDir, MAX_IMAGES_PER_PIN} from '../middleware/Upload_MID.js';

// errors thrown here go to the error handler (Error_MID.js)

async function getAllPins(req, res) {
    const pins = await Pin.find();
    return res.status(200).json(pins);
}

async function getAllPinsByUnit(req, res) {
    const pins = await Pin.find({assigned_unit: getUnitId(req.user)});
    return res.status(200).json(pins);
}

async function getPinById(req, res) {
    // req.pin is loaded (with dvr.password) by isPinUnitOrAdmin
    return res.status(200).json(req.pin);
}

async function addPin(req, res) {
    // unit and creator come from the logged-in user, never from the body
    const newPin = await Pin.create({
        ...req.valid_body,
        creator: req.user.id,
        creator_name: req.user.name,
        assigned_unit: getUnitId(req.user),
    });

    return res.status(201).json({message: 'Pin added successfully.', pin: newPin});
}

async function updatePin(req, res) {
    // req.pin is loaded by isPinUnitOrAdmin; save() runs schema validators
    const {dvr, ...updates} = req.valid_body;
    // dot-notation paths so a partial dvr update only touches the keys sent
    // (setting updates.dvr = {...} would replace the whole subdoc); null removes the key
    if (dvr) {
        for (const key of ['user_name', 'password']) {
            if (dvr[key] !== undefined) updates[`dvr.${key}`] = dvr[key] ?? undefined;
        }
    }
    req.pin.set(updates);
    const updatedPin = await req.pin.save();

    return res.status(200).json({message: 'Pin updated successfully.', pin: updatedPin});
}

async function deletePin(req, res) {
    // req.pin is loaded by isPinUnitOrAdmin
    await req.pin.deleteOne();
    removePinImagesDir(req.pin._id);

    return res.status(200).json({message: 'Pin deleted successfully.', id: req.pin._id});
}

// files are saved by uploadPinImages; this records their names on the pin.
// One atomic update that only matches while the pin still has room: two uploads at the same
// moment can't both pass and go over the limit together.
async function addPinImages(req, res) {
    const names = req.uploaded_images;
    let updatedPin;
    try {
        updatedPin = await Pin.findOneAndUpdate(
            {_id: req.pin._id, [`image.${MAX_IMAGES_PER_PIN - names.length}`]: {$exists: false}},
            {$push: {image: {$each: names}}},
            {returnDocument: 'after'},
        ).select('+dvr.password');
    } catch (e) {
        removePinImageFiles(req.pin._id, names);
        throw e;
    }

    if (!updatedPin) {
        removePinImageFiles(req.pin._id, names);
        return res.status(400).json({message: `a pin can have up to ${MAX_IMAGES_PER_PIN} images`});
    }
    return res.status(201).json({message: 'Images added successfully.', pin: updatedPin});
}

// isPinImage has already checked the name belongs to this pin
async function getPinImage(req, res) {
    return res.sendFile(path.join(pinImagesDir(req.pin._id), req.params.filename), (err) => {
        if (err && !res.headersSent)
            res.status(404).json({message: 'image not found'});
    });
}

async function deletePinImage(req, res) {
    const name = req.params.filename;
    // $pull is atomic, so it can't undo an upload that finished in the meantime
    const updatedPin = await Pin.findByIdAndUpdate(req.pin._id, {$pull: {image: name}}, {returnDocument: 'after'})
        .select('+dvr.password');
    if (!updatedPin)
        return res.status(404).json({message: 'pin not found'});
    removePinImageFiles(req.pin._id, [name]);

    return res.status(200).json({message: 'Image deleted successfully.', pin: updatedPin});
}

export {getAllPins, getAllPinsByUnit, getPinById, addPin, updatePin, deletePin, addPinImages, getPinImage, deletePinImage};
