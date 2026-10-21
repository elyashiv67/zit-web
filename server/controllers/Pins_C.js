import Pin from '../modules/pins.js';
import {getUnitId} from '../middleware/global_MID.js';

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

        return res.status(200).json({
            message: `Pin deleted successfully.`,
            id: req.pin._id
        });
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

export {getAllPins,getAllPinsByUnit ,getPinById, addPin, updatePin, deletePin};
