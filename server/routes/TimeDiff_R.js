import express from 'express';
import {
    addTimeDiff,
    deleteTimeDiff,
    getAllTimeDiffs,
    getAllTimeDiffsByUnit,
    getMyTimeDiffs,
    getTimeDiffById
} from "../controllers/TimeDiff_C.js";
import {CheckLogin} from "../middleware/Auth_MID.js";
import {isAdmin} from "../middleware/global_MID.js";
import {validate} from "../middleware/Validate_MID.js";
import {addTimeDiffSchema} from "../schemas/TimeDiff_S.js";

// the calculator itself runs in the browser and needs no login;
// these routes only save / read the logged-in user's history
const router = express.Router();

router.get('/', CheckLogin, isAdmin, getAllTimeDiffs);
router.get('/my', CheckLogin, getMyTimeDiffs);
router.get('/allUnit', CheckLogin, getAllTimeDiffsByUnit);
router.get('/:id', CheckLogin, validate(), getTimeDiffById);
router.post('/', CheckLogin, validate(addTimeDiffSchema), addTimeDiff);
router.delete('/:id', CheckLogin, validate(), deleteTimeDiff);

export default router;
