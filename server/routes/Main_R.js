import express from "express";
import roleRouter from '../routes/Roles_R.js'

const router = express.Router();

router.use('/role', roleRouter);

export default router;