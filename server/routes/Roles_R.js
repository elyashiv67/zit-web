import express from "express";
import {getAllRoles, getRoleById, createRole, updateRole, deleteRole} from '../controllers/Roles_C.js';
import {ValidId, isAdmin} from "../middleware/global_MID.js";
import {validValues} from "../middleware/Role_MID.js";
import {CheckLogin} from "../middleware/Auth_MID.js";

const router = express.Router();

router.get('/', CheckLogin, getAllRoles);
router.get('/:id', CheckLogin, ValidId, getRoleById);
router.post('/', CheckLogin, isAdmin, validValues, createRole);
router.patch('/:id', CheckLogin, isAdmin, ValidId, updateRole);
router.delete('/:id', CheckLogin, isAdmin, ValidId, deleteRole);

export default router;