import User from '../modules/users.js';

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

export { getUserById_auth , getUserByName_auth }