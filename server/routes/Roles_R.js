import express from "express";
import {getAllRoles, getRoleById, createRole, updateRole, deleteRole} from '../controllers/Roles_C.js';
import {isAdmin} from "../middleware/global_MID.js";
import {CheckLogin} from "../middleware/Auth_MID.js";
import {validate} from "../middleware/Validate_MID.js";
import {createRoleSchema, updateRoleSchema} from "../schemas/Roles_S.js";

const router = express.Router();

router.get('/', CheckLogin, getAllRoles);
router.get('/:id', CheckLogin, validate(), getRoleById);
router.post('/', CheckLogin, isAdmin, validate(createRoleSchema), createRole);
router.patch('/:id', CheckLogin, isAdmin, validate(updateRoleSchema), updateRole);
router.delete('/:id', CheckLogin, isAdmin, validate(), deleteRole);

export default router;
