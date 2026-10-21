import Pin from '../modules/pins.js';
import path from 'path';
import {getUnitId} from '../middleware/global_MID.js';
import {removePinImageFiles, removePinImagesDir, pinImagesDir} from '../middleware/Upload_MID.js';

async function getAllPins(req,res){
    try {
        const pins = await Pin.find();

        return res.status(200).json(pins);
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

async function getAllPinsByUnit(req,res){
    try {
        const pins = await Pin.find({assigned_unit: getUnitId(req.user)});

        return res.status(200).json(pins);
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

async function getPinById(req,res){
    // req.pin is loaded (with dvr.password) by isPinUnitOrAdmin
    return res.status(200).json(req.pin);
}

async function addPin(req,res){
    try {
        // unit and creator come from the logged-in user, never from the body
        const newPin = await Pin.create({
            ...req.valid_body,
            creator: req.user.id,
            creator_name: req.user.name,
            assigned_unit: getUnitId(req.user)
        });

        return res.status(201).json({
            message: `Pin added successfully.`,
            pin: newPin});

    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

async function updatePin(req,res){
    try {
        // req.pin is loaded by isPinUnitOrAdmin; save() runs schema validators
        const {dvr, ...updates} = req.valid_body;
        // dot-notation paths so a partial dvr update only touches the keys sent
        // (setting updates.dvr = {...} would replace the whole subdoc)
        if (dvr) {
            if (dvr.user_name !== undefined) updates['dvr.user_name'] = dvr.user_name;
            if (dvr.password !== undefined) updates['dvr.password'] = dvr.password;
        }
        req.pin.set(updates);
        const updatedPin = await req.pin.save();

        return res.status(200).json({
            message: `Pin updated successfully.`,
            pin: updatedPin,
        });
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

async function deletePin(req,res){
    try {
        // req.pin is loaded by isPinUnitOrAdmin
        await req.pin.deleteOne();
        removePinImagesDir(req.pin._id);

        return res.status(200).json({
            message: `Pin deleted successfully.`,
            id: req.pin._id
        });
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

// files are saved by uploadPinImages; this only records their names on the pin
async function addPinImages(req, res) {
    try {
        req.pin.image.push(...req.uploaded_images);
        const updatedPin = await req.pin.save();

        return res.status(201).json({
            message: 'Images added successfully.',
            pin: updatedPin
        });
    } catch (e) {
        removePinImageFiles(req.pin._id, req.uploaded_images);
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

// isPinImage has already checked the name belongs to this pin
async function getPinImage(req, res) {
    return res.sendFile(path.join(pinImagesDir(req.pin._id), req.params.filename), (err) => {
        if (err && !res.headersSent)
            res.status(404).json({message: 'image not found'});
    });
}

async function deletePinImage(req, res) {
    try {
        const name = req.params.filename;
        req.pin.image.pull(name);
        const updatedPin = await req.pin.save();
        removePinImageFiles(req.pin._id, [name]);

        return res.status(200).json({
            message: 'Image deleted successfully.',
            pin: updatedPin
        });
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

export {getAllPins,getAllPinsByUnit ,getPinById, addPin, updatePin, deletePin, addPinImages, getPinImage, deletePinImage};
