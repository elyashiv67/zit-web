import TimeDiff from '../modules/time_diff.js';
import {getUnitId} from '../middleware/global_MID.js';
import {findPage} from '../middleware/Paging_MID.js';

// errors thrown here go to the error handler (Error_MID.js).
// Lists are paged (?page=&limit=, see Paging_MID.js), newest first.

const NEWEST_FIRST = {createdAt: -1, _id: -1};

async function getAllTimeDiffs(req, res) {
    return res.status(200).json(await findPage(TimeDiff, {}, req.paging, {sort: NEWEST_FIRST}));
}

// the logged-in user's own history
async function getMyTimeDiffs(req, res) {
    return res.status(200).json(await findPage(TimeDiff, {owner: req.user.id}, req.paging, {sort: NEWEST_FIRST}));
}

async function getAllTimeDiffsByUnit(req, res) {
    const filter = {assigned_unit: getUnitId(req.user)};
    return res.status(200).json(await findPage(TimeDiff, filter, req.paging, {sort: NEWEST_FIRST}));
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
