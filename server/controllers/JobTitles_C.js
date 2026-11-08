import JobTitle from "../modules/job_titles.js";
import User from "../modules/users.js";

// errors thrown here go to the error handler (Error_MID.js): duplicates -> 409, bad ids -> 400

// by name in Hebrew order (Hebrew names first), for the admin's list and the user form's dropdown
async function getAllJobTitles(req, res) {
    const titles = await JobTitle.find().collation({locale: 'he'}).sort({name: 1});
    return res.status(200).json(titles);
}

async function createJobTitle(req, res) {
    const jobTitle = await JobTitle.create(req.valid_body);
    return res.status(201).json({message: 'Job title added successfully', jobTitle});
}

// renaming changes it for every user who has it (they hold its id)
async function updateJobTitle(req, res) {
    const jobTitle = await JobTitle.findByIdAndUpdate(req.valid_id, req.valid_body, {returnDocument: 'after', runValidators: true});
    if (!jobTitle)
        return res.status(404).json({message: 'Job title not found'});
    return res.status(200).json({message: 'Job title updated successfully', jobTitle});
}

async function deleteJobTitle(req, res) {
    const id = req.valid_id;

    // every user must have a title, so one still in use can't go
    if (await User.exists({job_title: id}))
        return res.status(409).json({message: 'Cannot delete job title: still assigned to one or more users'});

    const deleted = await JobTitle.findByIdAndDelete(id);
    if (!deleted)
        return res.status(404).json({message: 'Job title not found'});
    return res.status(200).json({message: 'Job title deleted successfully', id: deleted._id});
}

export {getAllJobTitles, createJobTitle, updateJobTitle, deleteJobTitle};
