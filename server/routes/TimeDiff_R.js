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
import {paging} from "../middleware/Paging_MID.js";
import {addTimeDiffSchema} from "../schemas/TimeDiff_S.js";

// the calculator itself runs in the browser and needs no login;
// these routes only save / read the logged-in user's history
const router = express.Router();

// lists are paged: ?page=1&limit=20 -> {items, page, limit, total, pages}
router.get('/', CheckLogin, isAdmin, paging, getAllTimeDiffs);
router.get('/my', CheckLogin, paging, getMyTimeDiffs);
router.get('/allUnit', CheckLogin, paging, getAllTimeDiffsByUnit);
router.get('/:id', CheckLogin, validate(), getTimeDiffById);
router.post('/', CheckLogin, validate(addTimeDiffSchema), addTimeDiff);
router.delete('/:id', CheckLogin, validate(), deleteTimeDiff);

export default router;
