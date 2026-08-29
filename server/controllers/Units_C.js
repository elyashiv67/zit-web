import Unit from '../modules/units.js';
import User from '../modules/users.js';

async function getAllUnits(req, res) {
    try {
        const units = await Unit.find();

        if (units.length === 0)
            return res.status(404).json({message: 'No units found'});

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
        const {district, merhav, station} = req.body;
        const newUnit = await Unit.create({district, merhav, station});

        return res.status(201).json({
            message: "Successfully created unit",
            newUnit: newUnit
        });
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function updateUnit(req, res) {
    try {
        const id = req.valid_id;
        const {district, merhav, station} = req.body;
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
            return res.status(404).json({message: `unit was not updated`});

        return res.status(200).json({
            message: "Successfully updated unit",
            updatedUnit
        });

    } catch (err) {
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

        const deletedUnit = await Unit.findByIdAndDelete(id);

        if (!deletedUnit)
            return res.status(404).json({message: `unit was not found`});

        return res.status(200).json({
            message: "Successfully deleted unit",
            deletedUnit
        });
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

export {getAllUnits, getUnitById, createUnit, updateUnit, deleteUnit};
