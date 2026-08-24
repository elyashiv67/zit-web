import express from 'express';
import {getAllUnits, getUnitById, createUnit, updateUnit, deleteUnit} from '../controllers/Units_C.js';
import {ValidId, isAdmin} from "../middleware/global_MID.js";
import {validValues} from "../middleware/Unit_MID.js";
import {CheckLogin} from "../middleware/Auth_MID.js";

const router = express.Router();

router.get('/', CheckLogin, getAllUnits);
router.get('/:id', CheckLogin, ValidId, getUnitById);
router.post('/', CheckLogin, isAdmin, validValues, createUnit);
router.patch('/:id', CheckLogin, isAdmin, ValidId, updateUnit);
router.delete('/:id', CheckLogin, isAdmin, ValidId, deleteUnit);

export default router;