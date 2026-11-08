import express from "express";
import {getAllRoles, getRoleById} from '../controllers/Roles_C.js';
import {CheckLogin} from "../middleware/Auth_MID.js";
import {validate} from "../middleware/Validate_MID.js";

const router = express.Router();

// read-only: the two roles (admin, user) are fixed. Creating, renaming or deleting one could leave
// the system with no admin (the last-admin check only watches users), so there are no routes for it
router.get('/', CheckLogin, getAllRoles);
router.get('/:id', CheckLogin, validate(), getRoleById);

export default router;
