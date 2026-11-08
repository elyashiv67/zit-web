import mongoose from 'mongoose';
import User from '../modules/users.js';

// a user that doesn't exist -> null. DB errors are NOT caught here on purpose: CheckLogin
// must not mistake a lost DB connection for a deleted user and log everyone out.
async function getUserByName_auth(uname) {
    return User.findOne({user_name: uname.toLowerCase()}).populate('role').populate('unit').populate('job_title');
}

async function getUserById_auth(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return User.findById(id).populate('role').populate('unit').populate('job_title');
}

// replaces the stored hash only (e.g. a stronger bcrypt cost after a login). Not a password change:
// pass_changed_at stays, so the user's other devices stay logged in
async function replacePasswordHash_auth(id, hash) {
    await User.updateOne({_id: id}, {$set: {pass: hash}});
}

export {getUserById_auth, getUserByName_auth, replacePasswordHash_auth};
