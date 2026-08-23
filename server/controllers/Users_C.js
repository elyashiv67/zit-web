import User from '../modules/users.js';

async function getAllUsers(req, res) {
    try {
        const users = User.find();

        if (users.length === 0)
            return res.status(404).json({message: 'No users found.'});

        res.status(200).json({users});
    } catch (e) {
        res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function getUserById(req, res) {
    try {
        const id = req.valid_id;
        const user = await User.findById(id).populate('role').populate('unit');

        if (!user)
            return res.status(404).json({message: 'User not found'});

        res.status(200).json({user});
    } catch (e) {
        res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function getUserByName_auth(uname) {
    try {
        const user = await User.findOne({user_name:uname}).populate('role').populate('unit');

        if (!user)
            return null

       return user;
    } catch (e) {
        return null
    }
}

async function getUserById_auth(id){
    try {
        const user = await User.findById(id).populate('role').populate('unit');

        if (!user)
            return null;

        return user;
    } catch (e) {
        return null
    }
}

export {getAllUsers, getUserById, getUserById_auth , getUserByName_auth};