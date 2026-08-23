function validValues(req, res, next) {
    const {district, merhav, station} = req.body;

    if (district === undefined || merhav === undefined || station === undefined)
        return res.status(400).json({message: "Need to add all data"});

    if (
        typeof district !== 'string' ||
        typeof merhav !== 'string' ||
        typeof station !== 'string'
    )
        return res.status(400).json({message: "provide a valid string"});

    next()
}

export {validValues}