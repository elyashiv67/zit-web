import mongoose from 'mongoose';

function ValidId(req, res, next) {
    const id = req.body.id || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(401).json({message: `id is not valid`});
    }
    req.valid_id = id;
    next();
}

function isAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({message: `need to login`});
    }
    if (req.session.user.is_admin) {
        return next();
    }

    return res.status(403).json({message: `user is not authorized`});
}


function ValidateLogin(req, res, next) {
    try {
        const {username, password} = req.body;

        if (typeof username !== 'string' || username.trim().length === 0 || username.length > 100) {
            return res.status(400).json({message: "invalid username"});
        }
        if (typeof password !== 'string' || password.length === 0 || password.length > 100) {
            return res.status(400).json({message: "invalid password"});
        }
        req.validLoginValues = {uname:username, userPass:password};

        next();
    } catch (err) {
        res.status(500).json({message: `Server error: ${err.message}`});
    }
}


function ValidateRegister(req, res, next) {
    try {
        const {name, user_name, pass, TZ, police_id, phone, email, role, unit} = req.body;

        if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
            return res.status(400).json({message: "invalid name"});
        }
        if (typeof user_name !== 'string' || user_name.trim().length === 0 || user_name.length > 100) {
            return res.status(400).json({message: "invalid user_name"});
        }
        if (typeof pass !== 'string' || pass.length < 6 || pass.length > 100) {
            return res.status(400).json({message: "invalid pass"});
        }
        if (typeof TZ !== 'string' || TZ.trim().length === 0) {
            return res.status(400).json({message: "invalid TZ"});
        }
        if (typeof police_id !== 'string' || police_id.trim().length === 0) {
            return res.status(400).json({message: "invalid police_id"});
        }
        if (typeof phone !== 'string' || !/^\d{1,10}$/.test(phone)) {
            return res.status(400).json({message: "invalid phone"});
        }
        if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({message: "invalid email"});
        }
        if (!mongoose.Types.ObjectId.isValid(role)) {
            return res.status(400).json({message: "invalid role"});
        }
        if (!mongoose.Types.ObjectId.isValid(unit)) {
            return res.status(400).json({message: "invalid unit"});
        }

        req.validRegisterValues = {
            name: name.trim(),
            user_name: user_name.trim(),
            pass,
            TZ: TZ.trim(),
            police_id: police_id.trim(),
            phone,
            email: email.trim().toLowerCase(),
            role,
            unit
        };

        next();
    } catch (err) {
        res.status(500).json({message: `Server error: ${err.message}`});
    }
}


// if i need more updated fields add them here before update length check
function ValidateUpdate(req, res, next) {
    try {
        const {name, phone, email} = req.body;
        const updates = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
                return res.status(400).json({message: "invalid name"});
            }
            updates.name = name.trim();
        }
        if (phone !== undefined) {
            if (typeof phone !== 'string' || !/^\d{1,10}$/.test(phone)) {
                return res.status(400).json({message: "invalid phone"});
            }
            updates.phone = phone;
        }
        if (email !== undefined) {
            if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({message: "invalid email"});
            }
            updates.email = email.trim().toLowerCase();
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({message: "no valid fields to update"});
        }

        req.validUpdateValues = updates;
        next();
    } catch (err) {
        res.status(500).json({message: `Server error: ${err.message}`});
    }
}

function isSelfOrAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({message: `need to login`});
    }
    if (req.valid_id === req.session.user.id.toString() || req.session.user.is_admin) {
        return next();
    }
    return res.status(403).json({message: `user is not authorized`});
}

export {ValidId , ValidateLogin, ValidateRegister, ValidateUpdate, isAdmin, isSelfOrAdmin};