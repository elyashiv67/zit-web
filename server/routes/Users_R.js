import express from "express";
import {changePassword, deleteUser, getAllUsers, getUserById, updateUser} from '../controllers/Users_C.js';
import {isAdmin, isSelfOrAdmin} from "../middleware/global_MID.js";
import {CheckLogin} from "../middleware/Auth_MID.js";
import {validate} from "../middleware/Validate_MID.js";
import {adminUpdateUserSchema, changePasswordSchema, updateUserSchema} from "../schemas/Users_S.js";
import {passwordLimiter} from "../middleware/RateLimit_MID.js";

const router = express.Router();

router.get('/', CheckLogin, isAdmin, getAllUsers);
router.get('/:id', CheckLogin, validate(), isSelfOrAdmin, getUserById);
// admins may also change role / unit / user_name / TZ / police_id
router.patch("/:id", CheckLogin, validate(req => req.user.is_admin ? adminUpdateUserSchema : updateUserSchema), isSelfOrAdmin, updateUser);
router.patch("/:id/password", CheckLogin, validate(changePasswordSchema), isSelfOrAdmin, passwordLimiter, changePassword);
router.delete("/:id", CheckLogin, validate(), isSelfOrAdmin, deleteUser);

export default router;
