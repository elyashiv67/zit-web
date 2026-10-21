import TimeDiff from '../modules/time_diff.js';
import {getUnitId} from '../middleware/global_MID.js';

// newest first everywhere
async function getAllTimeDiffs(req, res) {
    try {
        const diffs = await TimeDiff.find().sort({createdAt: -1});

        return res.status(200).json(diffs);
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

// the logged-in user's own history
async function getMyTimeDiffs(req, res) {
    try {
        const diffs = await TimeDiff.find({owner: req.user.id}).sort({createdAt: -1});

        return res.status(200).json(diffs);
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function getAllTimeDiffsByUnit(req, res) {
    try {
        const diffs = await TimeDiff.find({assigned_unit: getUnitId(req.user)}).sort({createdAt: -1});

        return res.status(200).json(diffs);
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function getTimeDiffById(req, res) {
    try {
        const diff = await TimeDiff.findById(req.valid_id);

        if (!diff)
            return res.status(404).json({message: 'time diff not found'});

        if (!req.user.is_admin && !diff.assigned_unit.equals(getUnitId(req.user)))
            return res.status(403).json({message: 'user is not authorized'});

        return res.status(200).json(diff);
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function addTimeDiff(req, res) {
    try {
        const {real_time, dvr_time, dvr_lastSave} = req.valid_body;

        const newDiff = await TimeDiff.create({
            owner: req.user.id,
            assigned_unit: getUnitId(req.user),
            real_time,
            dvr_time,
            offset_ms: dvr_time.getTime() - real_time.getTime(),
            dvr_lastSave
        });

        return res.status(201).json({
            message: 'Time diff added successfully.',
            timeDiff: newDiff
        });
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function deleteTimeDiff(req, res) {
    try {
        const diff = await TimeDiff.findById(req.valid_id);

        if (!diff)
            return res.status(404).json({message: 'time diff not found'});

        if (!req.user.is_admin && !diff.owner.equals(req.user.id))
            return res.status(403).json({message: 'user is not authorized'});

        await diff.deleteOne();

        return res.status(200).json({
            message: 'Time diff deleted successfully.',
            id: diff._id
        });
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

export {getAllTimeDiffs, getMyTimeDiffs, getAllTimeDiffsByUnit, getTimeDiffById, addTimeDiff, deleteTimeDiff};
