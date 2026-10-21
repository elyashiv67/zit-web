import express from "express";
import { CheckLogin, LogInByPass, LogOut, GetMe } from '../middleware/Auth_MID.js';
import { isAdmin } from "../middleware/global_MID.js";
import { validate } from "../middleware/Validate_MID.js";
import { loginSchema } from "../schemas/Auth_S.js";
import { registerUserSchema } from "../schemas/Users_S.js";
import { registerUser } from "../controllers/Users_C.js";

const router = express.Router();

router.post("/login", validate(loginSchema), LogInByPass);
router.post("/logout", LogOut);
router.get("/me", CheckLogin, GetMe);
router.post("/register", CheckLogin, isAdmin, validate(registerUserSchema), registerUser);
router.post('/reg', CheckLogin, isAdmin, validate(registerUserSchema), registerUser);



export default router;
