import express from "express";
import { getAllRoles , getRoleById , createRole , updateRole , deleteRole } from '../controllers/Roles_C.js';
import {ValidId} from "../middleware/global_MID.js";
import {validValues} from "../middleware/Role_MID.js";

const router = express.Router();

router.get('/', getAllRoles);
router.get('/:id', ValidId, getRoleById);
router.post('/', validValues, createRole);
router.patch('/:id', ValidId, updateRole);
router.delete('/:id', ValidId, deleteRole);

export default router;