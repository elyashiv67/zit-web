import mongoose from 'mongoose';

function ValidId(req, res, next) {
    const id = req.body.id || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(401).json({message: `id is not valid`});
    }
    req.valid_id = id;
    next();
}


export {ValidId};