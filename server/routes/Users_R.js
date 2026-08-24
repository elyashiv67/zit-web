import express from "express";
import {deleteUser, getAllUsers, getUserById, updateUser} from '../controllers/Users_C.js';
import {ValidId, ValidateUpdate, isSelfOrAdmin} from "../middleware/global_MID.js";
import {CheckLogin} from "../middleware/Auth_MID.js";

const router = express.Router();

router.get('/', CheckLogin, getAllUsers);
router.get('/:id', CheckLogin, ValidId, getUserById);
router.patch("/:id", CheckLogin, ValidId, isSelfOrAdmin, ValidateUpdate, updateUser);
router.delete("/:id", CheckLogin, ValidId, isSelfOrAdmin, deleteUser);

export default router;
