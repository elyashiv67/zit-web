import express from 'express';
import {getAllUnits, getUnitById, createUnit, updateUnit, deleteUnit} from '../controllers/Units_C.js';
import {isAdmin} from "../middleware/global_MID.js";
import {CheckLogin} from "../middleware/Auth_MID.js";
import {validate} from "../middleware/Validate_MID.js";
import {createUnitSchema, updateUnitSchema} from "../schemas/Units_S.js";

const router = express.Router();

router.get('/', CheckLogin, getAllUnits);
router.get('/:id', CheckLogin, validate(), getUnitById);
router.post('/', CheckLogin, isAdmin, validate(createUnitSchema), createUnit);
router.patch('/:id', CheckLogin, isAdmin, validate(updateUnitSchema), updateUnit);
router.delete('/:id', CheckLogin, isAdmin, validate(), deleteUnit);

export default router;
