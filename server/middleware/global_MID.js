// req.user.unit is the populated unit document (or a bare id)
function getUnitId(user) {
    return user.unit && user.unit._id ? user.unit._id : user.unit;
}

// these require CheckLogin earlier in the chain (sets req.user)
function isAdmin(req, res, next) {
    if (!req.user)
        return res.status(401).json({message: 'need to login'});
    if (req.user.is_admin)
        return next();
    return res.status(403).json({message: 'user is not authorized'});
}

// also requires validate() earlier in the chain (sets req.valid_id)
function isSelfOrAdmin(req, res, next) {
    if (!req.user)
        return res.status(401).json({message: 'need to login'});
    if (req.valid_id === req.user.id || req.user.is_admin)
        return next();
    return res.status(403).json({message: 'user is not authorized'});
}

export {isAdmin, isSelfOrAdmin, getUnitId};
