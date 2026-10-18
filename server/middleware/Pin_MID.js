import Pin from '../modules/pins.js';


// requires validate() (sets req.valid_id) and CheckLogin (sets req.user) earlier in the
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


export {isPinOwnerOrAdmin};
