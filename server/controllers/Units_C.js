import Unit from '../modules/units.js';
import User from '../modules/users.js';
import Pin from '../modules/pins.js';

// errors thrown here go to the error handler (Error_MID.js): duplicates -> 409, bad ids -> 400

async function getAllUnits(req, res) {
    const units = await Unit.find();
    return res.status(200).json(units);
}

async function getUnitById(req, res) {
    const unit = await Unit.findById(req.valid_id);
    if (!unit)
        return res.status(404).json({message: 'Unit not found'});
    return res.status(200).json(unit);
}

async function createUnit(req, res) {
    const newUnit = await Unit.create(req.valid_body);
    return res.status(201).json({message: 'Unit created successfully', unit: newUnit});
}

async function updateUnit(req, res) {
    const updatedUnit = await Unit.findByIdAndUpdate(req.valid_id, req.valid_body, {returnDocument: 'after', runValidators: true});
    if (!updatedUnit)
        return res.status(404).json({message: 'Unit not found'});
    return res.status(200).json({message: 'Unit updated successfully', unit: updatedUnit});
}

async function deleteUnit(req, res) {
    const id = req.valid_id;

    if (await User.exists({unit: id}))
        return res.status(409).json({message: 'Cannot delete unit: still assigned to one or more users'});

    // pins belong to the unit, so they'd be left with no one able to manage them
    if (await Pin.exists({assigned_unit: id}))
        return res.status(409).json({message: 'Cannot delete unit: it still has pins'});

    const deletedUnit = await Unit.findByIdAndDelete(id);
    if (!deletedUnit)
        return res.status(404).json({message: 'Unit not found'});
    return res.status(200).json({message: 'Unit deleted successfully', id: deletedUnit._id});
}

export {getAllUnits, getUnitById, createUnit, updateUnit, deleteUnit};
