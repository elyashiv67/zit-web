import mongoose from 'mongoose';
import User from '../modules/users.js';

// a user that doesn't exist -> null. DB errors are NOT caught here on purpose: CheckLogin
// must not mistake a lost DB connection for a deleted user and log everyone out.
async function getUserByName_auth(uname) {
    return User.findOne({user_name: uname.toLowerCase()}).populate('role').populate('unit');
}

async function getUserById_auth(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return User.findById(id).populate('role').populate('unit');
}

export {getUserById_auth, getUserByName_auth};
