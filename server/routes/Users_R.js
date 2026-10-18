import express from "express";
import {deleteUser, getAllUsers, getUserById, updateUser} from '../controllers/Users_C.js';
import {isSelfOrAdmin} from "../middleware/global_MID.js";
import {CheckLogin} from "../middleware/Auth_MID.js";
import {validate} from "../middleware/Validate_MID.js";
import {updateUserSchema} from "../schemas/Users_S.js";

const router = express.Router();

router.get('/', CheckLogin, getAllUsers);
router.get('/:id', CheckLogin, validate(), getUserById);
router.patch("/:id", CheckLogin, validate(updateUserSchema), isSelfOrAdmin, updateUser);
router.delete("/:id", CheckLogin, validate(), isSelfOrAdmin, deleteUser);

export default router;
