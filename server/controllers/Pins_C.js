import Pin from '../modules/pins.js';

async function getAllPins(req,res){
    try {
        const pins = await Pin.find();

        if(pins.length === 0)
            return res.status(404).json({message: "No pins found"});

        return res.status(200).json(pins);
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

async function getAllPinsByUnit(req,res){
    try {
        const unitId = req.user.unit && req.user.unit._id ? req.user.unit._id : req.user.unit;

        const pins = await Pin.find({assigned_unit: unitId});

        if(pins.length === 0)
            return res.status(404).json({message: "No pins found"});

        return res.status(200).json(pins);
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

async function getPinById(req,res){
    try {
        const id = req.valid_id;
        const pin = await Pin.findById(id);

        if(!pin)
            return res.status(404).json({message: "No pin found"});

        return res.status(200).json(pin);
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

async function addPin(req,res){
    try {
        const values = req.validPinValues;

        const newPin = await Pin.create(values);

        return res.status(201).json({
            message: `Pin added successfully.`,
            id: newPin._id});

    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

async function updatePin(req,res){
    try {
        // req.pin is loaded by isPinOwnerOrAdmin; save() runs schema validators
        req.pin.set(req.validPinUpdateValues);
        const updatedPin = await req.pin.save();

        return res.status(200).json({
            message: `Pin updated successfully.`,
            id: updatedPin._id,
        });
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

async function deletePin(req,res){
    try {
        // req.pin is loaded by isPinOwnerOrAdmin
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