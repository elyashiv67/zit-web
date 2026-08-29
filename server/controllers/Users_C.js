import bcrypt from 'bcrypt';
import User from '../modules/users.js';

async function getAllUsers(req, res) {
    try {
        const users = await User.find().select('-pass');

        if (users.length === 0)
            return res.status(404).json({message: 'No users found.'});

        return res.status(200).json({users});
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

        return res.status(200).json({user});
    } catch (e) {
        return res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function registerUser(req, res) {
    try {
        const data = req.validRegisterValues;

        const hashedPass = await bcrypt.hash(data.pass, 10);

        const newUser = await User.create({
            ...data,
            pass: hashedPass
        });

        return res.status(201).json({message: "User created successfully", id: newUser._id});

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
        const updateValues = req.validUpdateValues;

        const updatedUser = await User.findByIdAndUpdate(id , updateValues);

        if (!updatedUser)
            return res.status(404).json({message: 'User not found'});

        return res.status(200).json({message: "User updated successfully", id});

    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

export {getAllUsers, getUserById, registerUser , deleteUser , updateUser};