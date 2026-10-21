import Pin from '../modules/pins.js';
import {getUnitId} from './global_MID.js';


// requires validate() (sets req.valid_id) and CheckLogin (sets req.user) earlier in the
// chain. Pins belong to a unit, not a user: anyone in the pin's unit (or an admin) gets
// through. Loads the pin WITH dvr.password (viewing a pin is how the unit gets the DVR
// login) and leaves it on req.pin so the controller can reuse it instead of re-fetching.
async function isPinUnitOrAdmin(req, res, next) {
    try {
        const pin = await Pin.findById(req.valid_id).select('+dvr.password');
        if (!pin) {
            return res.status(404).json({message: "pin not found"});
        }

        if (!req.user.is_admin && !pin.assigned_unit.equals(getUnitId(req.user))) {
            return res.status(403).json({message: "user is not authorized"});
        }

        req.pin = pin;
        next();
    } catch (err) {
        return res.status(500).json({message: `Server error: ${err.message}`});
    }
}


export {isPinUnitOrAdmin};
