import express from 'express';
import {addPin, deletePin, getAllPins, getAllPinsByUnit, getPinById, updatePin} from "../controllers/Pins_C.js";
import {CheckLogin} from "../middleware/Auth_MID.js";
import {isAdmin} from "../middleware/global_MID.js";
import {isPinUnitOrAdmin} from "../middleware/Pin_MID.js";
import {validate} from "../middleware/Validate_MID.js";
import {addPinSchema, updatePinSchema} from "../schemas/Pins_S.js";

const router = express.Router();

router.get('/', CheckLogin, isAdmin, getAllPins);
router.get('/allUnit', CheckLogin, getAllPinsByUnit);
router.get('/:id', CheckLogin, validate(), isPinUnitOrAdmin, getPinById);
router.post('/', CheckLogin, validate(addPinSchema), addPin);
router.patch('/:id', CheckLogin, validate(updatePinSchema), isPinUnitOrAdmin, updatePin);
router.delete('/:id', CheckLogin, validate(), isPinUnitOrAdmin, deletePin);

export default router;
