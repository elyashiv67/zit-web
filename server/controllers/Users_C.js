import bcrypt from 'bcrypt';
import User from '../modules/users.js';
import Role from '../modules/roles.js';
import Unit from '../modules/units.js';
import {RefreshLogin} from '../middleware/Auth_MID.js';

// role / unit ids in a body must point to real documents
async function findMissingRef({role, unit}) {
    if (role && !(await Role.exists({_id: role}))) return 'role';
    if (unit && !(await Unit.exists({_id: unit}))) return 'unit';
    return null;
}

// true when this user is an admin and the only one left — so the system is never locked out
async function isLastAdmin(userId) {
    const adminRole = await Role.findOne({name: 'admin'});
    if (!adminRole) return false;

    const user = await User.findById(userId);
    if (!user || !user.role.equals(adminRole._id)) return false;

    return (await User.countDocuments({role: adminRole._id})) <= 1;
}

async function getAllUsers(req, res) {
    try {
        const users = await User.find().select('-pass');

        return res.status(200).json(users);
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function getUserById(req, res) {
    try {
        const id = req.valid_id;
        const user = await User.findById(id).populate('role').populate('unit').select('-pass');

        if (!user)
            return res.status(404).json({message: 'User not found'});

        return res.status(200).json(user);
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function registerUser(req, res) {
    try {
        const data = req.valid_body;

        const missing = await findMissingRef(data);
        if (missing)
            return res.status(400).json({message: `${missing} not found`, field: missing});

        const hashedPass = await bcrypt.hash(data.pass, 10);

        const newUser = await User.create({
            ...data,
            pass: hashedPass
        });

        return res.status(201).json({message: "User created successfully", user: newUser});

    } catch (err) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({message: `${field} already exists`, field});
        }
        return res.status(500).json({message: `Server error: ${err.message}`});
    }
}

async function deleteUser(req, res) {
    try {
        const id = req.valid_id;

        if (await isLastAdmin(id))
            return res.status(409).json({message: 'Cannot delete the last admin'});

        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser)
            return res.status(404).json({message: 'User not found'});

        return res.status(200).json({message: "User deleted successfully", id});

    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

async function updateUser(req, res) {
    try {
        const id = req.valid_id;
        const updateValues = req.valid_body;

        // role / unit only reach here for admins (adminUpdateUserSchema)
        const missing = await findMissingRef(updateValues);
        if (missing)
            return res.status(400).json({message: `${missing} not found`, field: missing});

        if (updateValues.role && await isLastAdmin(id)) {
            const newRole = await Role.findById(updateValues.role);
            if (newRole.name !== 'admin')
                return res.status(409).json({message: 'Cannot change the role of the last admin'});
        }

        // CheckLogin reloads the session from the DB on every request, so the
        // changes show in /auth/me (and apply to permissions) right away
        const updatedUser = await User.findByIdAndUpdate(id, updateValues, {new: true, runValidators: true})
            .populate('role').populate('unit');

        if (!updatedUser)
            return res.status(404).json({message: 'User not found'});

        return res.status(200).json({message: "User updated successfully", user: updatedUser});

    } catch (e) {
        if (e.code === 11000) {
            const field = Object.keys(e.keyPattern)[0];
            return res.status(409).json({message: `${field} already exists`, field});
        }
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

// own password: current_password required, this device stays logged in, others are signed out.
// admin resetting someone else's: no current_password, that user is signed out everywhere.
async function changePassword(req, res) {
    try {
        const id = req.valid_id;
        const {current_password, new_password} = req.valid_body;
        const isSelf = id === req.user.id.toString();

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

        if (isSelf)
            await RefreshLogin(req, res);

        return res.status(200).json({message: 'Password changed successfully', id});
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

export {getAllUsers, getUserById, registerUser , deleteUser , updateUser, changePassword};
