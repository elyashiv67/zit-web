import express from 'express';
import {getAllUnits, getUnitById, createUnit, updateUnit, deleteUnit} from '../controllers/Units_C.js';
import {ValidId} from "../middleware/global_MID.js";
import {validValues} from "../middleware/Unit_MID.js";

const router = express.Router();

router.get('/', getAllUnits);
router.get('/:id', ValidId, getUnitById);
router.post('/', validValues, createUnit);
router.patch('/:id', ValidId, updateUnit);
router.delete('/:id', ValidId, deleteUnit);

export default router;