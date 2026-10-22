import bcrypt from 'bcrypt';
import User from '../modules/users.js';
import Role from '../modules/roles.js';
import Unit from '../modules/units.js';
import {startSession, endSession} from '../middleware/Auth_MID.js';

// errors thrown here go to the error handler (Error_MID.js): duplicates -> 409 with `field`

// role / unit ids in a body must point to real documents
async function findMissingRef({role, unit}) {
    if (role && !(await Role.exists({_id: role}))) return 'role';
    if (unit && !(await Unit.exists({_id: unit}))) return 'unit';
    return null;
}

async function getAdminRoleId() {
    return (await Role.findOne({name: 'admin'}).select('_id'))?._id ?? null;
}

async function countAdmins(adminRoleId) {
    return User.countDocuments({role: adminRoleId});
}

// The system must never be left without an admin. Checking only before a change isn't enough:
// two admins demoting / deleting each other at the same moment both see "2 admins" and both
// go through. So every change that removes an admin is checked again AFTER it runs, and undone
// if no admin is left. At worst both requests undo themselves; an admin always remains.

async function getAllUsers(req, res) {
    const users = await User.find().select('-pass');
    return res.status(200).json(users);
}

async function getUserById(req, res) {
    const user = await User.findById(req.valid_id).populate('role').populate('unit').select('-pass');
    if (!user)
        return res.status(404).json({message: 'User not found'});
    return res.status(200).json(user);
}

async function registerUser(req, res) {
    const data = req.valid_body;

    const missing = await findMissingRef(data);
    if (missing)
        return res.status(400).json({message: `${missing} not found`, field: missing});

    const newUser = await User.create({...data, pass: await bcrypt.hash(data.pass, 10)});
    return res.status(201).json({message: 'User created successfully', user: newUser});
}

async function deleteUser(req, res) {
    const id = req.valid_id;
    const adminRoleId = await getAdminRoleId();

    const user = await User.findById(id);
    if (!user)
        return res.status(404).json({message: 'User not found'});

    const wasAdmin = adminRoleId && user.role.equals(adminRoleId);
    if (wasAdmin && await countAdmins(adminRoleId) <= 1)
        return res.status(409).json({message: 'Cannot delete the last admin'});

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted)
        return res.status(404).json({message: 'User not found'});

    if (wasAdmin && await countAdmins(adminRoleId) === 0) {
        await User.collection.insertOne(deleted.toObject()); // put the exact document back
        return res.status(409).json({message: 'Cannot delete the last admin'});
    }

    // users who delete themselves are logged out now, not on their next request
    if (id === req.user.id)
        await endSession(req, res);

    return res.status(200).json({message: 'User deleted successfully', id});
}

async function updateUser(req, res) {
    const id = req.valid_id;
    const updateValues = req.valid_body;

    // role / unit only reach here for admins (adminUpdateUserSchema)
    const missing = await findMissingRef(updateValues);
    if (missing)
        return res.status(400).json({message: `${missing} not found`, field: missing});

    const user = await User.findById(id);
    if (!user)
        return res.status(404).json({message: 'User not found'});

    const adminRoleId = await getAdminRoleId();
    const demotesAdmin = updateValues.role && adminRoleId
        && user.role.equals(adminRoleId) && !adminRoleId.equals(updateValues.role);
    if (demotesAdmin && await countAdmins(adminRoleId) <= 1)
        return res.status(409).json({message: 'Cannot change the role of the last admin'});

    // CheckLogin reloads the user on every request, so the changes apply to their
    // permissions and /auth/me right away
    const updatedUser = await User.findByIdAndUpdate(id, updateValues, {returnDocument: 'after', runValidators: true})
        .populate('role').populate('unit');
    if (!updatedUser)
        return res.status(404).json({message: 'User not found'});

    if (demotesAdmin && await countAdmins(adminRoleId) === 0) {
        await User.updateOne({_id: id}, {role: adminRoleId});
        return res.status(409).json({message: 'Cannot change the role of the last admin'});
    }

    return res.status(200).json({message: 'User updated successfully', user: updatedUser});
}

// own password: current_password required, this device stays logged in, others are signed out.
// admin resetting someone else's: no current_password, that user is signed out everywhere.
async function changePassword(req, res) {
    const id = req.valid_id;
    const {current_password, new_password} = req.valid_body;
    const isSelf = id === req.user.id;

    const user = await User.findById(id);
    if (!user)
        return res.status(404).json({message: 'User not found'});

    // 400 not 401 here: the frontend treats 401 as "go to the login page"
    if (isSelf) {
        if (!current_password)
            return res.status(400).json({message: 'current_password is required', field: 'current_password'});
        if (!(await bcrypt.compare(current_password, user.pass)))
            return res.status(400).json({message: 'current password is wrong', field: 'current_password'});
    }

    if (await bcrypt.compare(new_password, user.pass))
        return res.status(400).json({message: 'new password must be different from the current one', field: 'new_password'});

    user.pass = await bcrypt.hash(new_password, 10);
    user.pass_changed_at = new Date();
    await user.save();

    // a fresh session (new id, login time after pass_changed_at) keeps this device logged in
    if (isSelf)
        await startSession(req, user);

    return res.status(200).json({message: 'Password changed successfully', id});
}

export {getAllUsers, getUserById, registerUser, deleteUser, updateUser, changePassword};
