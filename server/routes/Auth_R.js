import express from "express";
import {CheckLogin, LogInByPass, LogOut} from '../middleware/Auth_MID.js';
import {isAdmin, ValidateLogin, ValidateRegister} from "../middleware/global_MID.js";
import {registerUser} from "../controllers/Users_C.js";

const router = express.Router();

router.post("/login",ValidateLogin ,LogInByPass);
router.post("/logout", LogOut);
router.post("/register",CheckLogin, isAdmin, ValidateRegister, registerUser);
router.post('/reg',ValidateRegister,registerUser);



export default router;