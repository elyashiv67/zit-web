import Unit from '../modules/units.js';
import User from '../modules/users.js';
import Pin from '../modules/pins.js';

async function getAllUnits(req, res) {
    try {
        const units = await Unit.find();

        return res.status(200).json(units);
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function getUnitById(req, res) {
    try {
        const id = req.valid_id;
        const unit = await Unit.findById(id);

        if (!unit)
            return res.status(404).json({message: `no unit found`});

        return res.status(200).json(unit);
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function createUnit(req, res) {
    try {
        const {district, merhav, station} = req.valid_body;
        const newUnit = await Unit.create({district, merhav, station});

        return res.status(201).json({
            message: "Successfully created unit",
            unit: newUnit
        });
    } catch (e) {
        if (e.code === 11000) {
            const field = Object.keys(e.keyPattern)[0];
            return res.status(409).json({message: `${field} already exists`, field});
        }
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function updateUnit(req, res) {
    try {
        const id = req.valid_id;
        const {district, merhav, station} = req.valid_body;
        const updateData = {
            ...(district !== undefined && {district}),
            ...(merhav !== undefined && {merhav}),
            ...(station !== undefined && {station})
        };

        const updatedUnit = await Unit.findByIdAndUpdate(
            id,
            updateData,
            {new: true, runValidators: true}
        );

        if (!updatedUnit)
            return res.status(404).json({message: `unit was not found`});

        return res.status(200).json({
            message: "Successfully updated unit",
            unit: updatedUnit
        });

    } catch (err) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({message: `${field} already exists`, field});
        }
        return res.status(500).json({message: `Server error: ${err.message}`});
    }
}

async function deleteUnit(req, res) {
    try {
        const id = req.valid_id;

        const inUse = await User.exists({unit: id});
        if (inUse) {
            return res.status(409).json({message: 'Cannot delete unit: still assigned to one or more users'});
        }

        // pins belong to the unit, so they'd be left with no one able to manage them
        const hasPins = await Pin.exists({assigned_unit: id});
        if (hasPins) {
            return res.status(409).json({message: 'Cannot delete unit: it still has pins'});
        }

        const deletedUnit = await Unit.findByIdAndDelete(id);

        if (!deletedUnit)
            return res.status(404).json({message: `unit was not found`});

        return res.status(200).json({
            message: "Successfully deleted unit",
            id: deletedUnit._id
        });
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

export {getAllUnits, getUnitById, createUnit, updateUnit, deleteUnit};
