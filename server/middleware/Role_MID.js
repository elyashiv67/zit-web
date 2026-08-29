function validValues(req, res, next) {

    const {level, name} = req.body;

    if (name === undefined || level === undefined) {
        return res.status(400).json({message: "Need to add all data"});
    }

    if (typeof name !== 'string') {
        return res.status(400).json({message: "Name must be a string"});
    }

    if (typeof level !== 'number') {
        return res.status(400).json({message: "Level must be a number"});
    }

    next();

}

export {validValues};