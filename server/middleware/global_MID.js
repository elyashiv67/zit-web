// req.user.unit comes from the session and may be a populated doc or a bare id
function getUnitId(user) {
    return user.unit && user.unit._id ? user.unit._id : user.unit;
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

// requires validate() earlier in the chain (sets req.valid_id)
function isSelfOrAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({message: `need to login`});
    }
    if (req.valid_id === req.session.user.id.toString() || req.session.user.is_admin) {
        return next();
    }
    return res.status(403).json({message: `user is not authorized`});
}

export {isAdmin, isSelfOrAdmin, getUnitId};
