import TimeDiff from '../modules/time_diff.js';
import {getUnitId} from '../middleware/global_MID.js';

// errors thrown here go to the error handler (Error_MID.js). Newest first everywhere.

async function getAllTimeDiffs(req, res) {
    const diffs = await TimeDiff.find().sort({createdAt: -1});
    return res.status(200).json(diffs);
}

// the logged-in user's own history
async function getMyTimeDiffs(req, res) {
    const diffs = await TimeDiff.find({owner: req.user.id}).sort({createdAt: -1});
    return res.status(200).json(diffs);
}

async function getAllTimeDiffsByUnit(req, res) {
    const diffs = await TimeDiff.find({assigned_unit: getUnitId(req.user)}).sort({createdAt: -1});
    return res.status(200).json(diffs);
}

// the owner always (even after moving to another unit), anyone in the record's unit, or an admin
async function getTimeDiffById(req, res) {
    const diff = await TimeDiff.findById(req.valid_id);
    if (!diff)
        return res.status(404).json({message: 'time diff not found'});

    const allowed = req.user.is_admin
        || diff.owner.equals(req.user.id)
        || diff.assigned_unit.equals(getUnitId(req.user));
    if (!allowed)
        return res.status(403).json({message: 'user is not authorized'});

    return res.status(200).json(diff);
}

async function addTimeDiff(req, res) {
    const {real_time, dvr_time, dvr_lastSave} = req.valid_body;

    const newDiff = await TimeDiff.create({
        owner: req.user.id,
        assigned_unit: getUnitId(req.user),
        real_time,
        dvr_time,
        offset_ms: dvr_time.getTime() - real_time.getTime(),
        dvr_lastSave,
    });

    return res.status(201).json({message: 'Time diff added successfully.', timeDiff: newDiff});
}

// only the owner or an admin
async function deleteTimeDiff(req, res) {
    const diff = await TimeDiff.findById(req.valid_id);
    if (!diff)
        return res.status(404).json({message: 'time diff not found'});

    if (!req.user.is_admin && !diff.owner.equals(req.user.id))
        return res.status(403).json({message: 'user is not authorized'});

    await diff.deleteOne();
    return res.status(200).json({message: 'Time diff deleted successfully.', id: diff._id});
}

export {getAllTimeDiffs, getMyTimeDiffs, getAllTimeDiffsByUnit, getTimeDiffById, addTimeDiff, deleteTimeDiff};
