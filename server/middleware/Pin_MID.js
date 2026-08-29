import Pin from '../modules/pins.js';


function isLatLng(loc) {
    return typeof loc === 'object' && loc !== null && !Array.isArray(loc)
        && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)
        && loc.lat >= -90 && loc.lat <= 90
        && loc.lng >= -180 && loc.lng <= 180;
}

function ValidateAddPin(req, res, next) {
    try {
        const {name, location, image, dvr} = req.body;

        if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
            return res.status(400).json({message: "invalid name"});
        }
        if (!isLatLng(location)) {
            return res.status(400).json({message: "invalid location"});
        }

        // owner and assigned_unit come from the logged-in user (CheckLogin runs first
        // in the route) — never trusted from the body. unit may be a populated doc.
        const unit = req.user.unit && req.user.unit._id ? req.user.unit._id : req.user.unit;

        const validPin = {
            name: name.trim(),
            owner: req.user.id,
            location: {lat: location.lat, lng: location.lng},
            assigned_unit: unit
        };

        // image: optional (schema default []); if sent it must be an array of non-empty strings
        if (image !== undefined) {
            if (!Array.isArray(image) || !image.every(s => typeof s === 'string' && s.trim().length > 0)) {
                return res.status(400).json({message: "invalid image"});
            }
            validPin.image = image.map(s => s.trim());
        }

        // dvr: optional (schema has no required fields); if sent it must be an object
        // with string user_name / password when those keys are present
        if (dvr !== undefined) {
            if (typeof dvr !== 'object' || dvr === null || Array.isArray(dvr)) {
                return res.status(400).json({message: "invalid dvr"});
            }
            if (dvr.user_name !== undefined && (typeof dvr.user_name !== 'string' || dvr.user_name.trim().length === 0)) {
                return res.status(400).json({message: "invalid dvr.user_name"});
            }
            if (dvr.password !== undefined && (typeof dvr.password !== 'string' || dvr.password.length === 0)) {
                return res.status(400).json({message: "invalid dvr.password"});
            }
            validPin.dvr = {};
            if (dvr.user_name !== undefined) validPin.dvr.user_name = dvr.user_name.trim();
            if (dvr.password !== undefined) validPin.dvr.password = dvr.password;
        }

        req.validPinValues = validPin;
        next();
    } catch (err) {
        return res.status(500).json({message: `Server error: ${err.message}`});
    }
}


// partial update: only fields present in the body are validated and forwarded.
// owner and assigned_unit are not updatable here (owner never changes; unit is
// derived from the session in ValidateAddPin, not trusted from the body).
function ValidateUpdatePin(req, res, next) {
    try {
        const {name, location, image, dvr} = req.body;
        const updates = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
                return res.status(400).json({message: "invalid name"});
            }
            updates.name = name.trim();
        }

        if (location !== undefined) {
            if (!isLatLng(location)) {
                return res.status(400).json({message: "invalid location"});
            }
            updates.location = {lat: location.lat, lng: location.lng};
        }

        if (image !== undefined) {
            if (!Array.isArray(image) || !image.every(s => typeof s === 'string' && s.trim().length > 0)) {
                return res.status(400).json({message: "invalid image"});
            }
            updates.image = image.map(s => s.trim());
        }

        if (dvr !== undefined) {
            if (typeof dvr !== 'object' || dvr === null || Array.isArray(dvr)) {
                return res.status(400).json({message: "invalid dvr"});
            }
            if (dvr.user_name !== undefined && (typeof dvr.user_name !== 'string' || dvr.user_name.trim().length === 0)) {
                return res.status(400).json({message: "invalid dvr.user_name"});
            }
            if (dvr.password !== undefined && (typeof dvr.password !== 'string' || dvr.password.length === 0)) {
                return res.status(400).json({message: "invalid dvr.password"});
            }
            // dot-notation paths so a partial dvr update only touches the keys sent
            // (setting updates.dvr = {...} would replace the whole subdoc)
            if (dvr.user_name !== undefined) updates['dvr.user_name'] = dvr.user_name.trim();
            if (dvr.password !== undefined) updates['dvr.password'] = dvr.password;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({message: "no valid fields to update"});
        }

        req.validPinUpdateValues = updates;
        next();
    } catch (err) {
        return res.status(500).json({message: `Server error: ${err.message}`});
    }
}


// requires ValidId (sets req.valid_id) and CheckLogin (sets req.user) earlier in the
// chain. Loads the pin, allows through only its owner or an admin, and leaves the
// loaded document on req.pin so the controller can reuse it instead of re-fetching.
async function isPinOwnerOrAdmin(req, res, next) {
    try {
        const pin = await Pin.findById(req.valid_id);
        if (!pin) {
            return res.status(404).json({message: "pin not found"});
        }

        if (!req.user.is_admin && !(pin.owner && pin.owner.equals(req.user.id))) {
            return res.status(403).json({message: "user is not authorized"});
        }

        req.pin = pin;
        next();
    } catch (err) {
        return res.status(500).json({message: `Server error: ${err.message}`});
    }
}


export {ValidateAddPin, ValidateUpdatePin, isPinOwnerOrAdmin, isLatLng};
