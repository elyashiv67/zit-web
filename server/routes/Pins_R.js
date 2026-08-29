import express from 'express';
import {addPin, deletePin, getAllPins, getAllPinsByUnit, getPinById, updatePin} from "../controllers/Pins_C.js";
import {CheckLogin} from "../middleware/Auth_MID.js";
import {isAdmin, ValidId} from "../middleware/global_MID.js";
import {isPinOwnerOrAdmin, ValidateAddPin, ValidateUpdatePin} from "../middleware/Pin_MID.js";

const router = express.Router();

router.get('/', CheckLogin, isAdmin, getAllPins);
router.get('/allUnit', CheckLogin, getAllPinsByUnit);
router.get('/:id', CheckLogin, isAdmin, ValidId, getPinById);
router.post('/addPin', CheckLogin, ValidateAddPin, addPin);
router.patch('/:id', CheckLogin, ValidId,isPinOwnerOrAdmin, ValidateUpdatePin, updatePin);
router.delete('/:id', CheckLogin , ValidId,isPinOwnerOrAdmin, deletePin);

export default router;