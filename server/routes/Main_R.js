import express from "express";
import roleRouter from '../routes/Roles_R.js';
import unitRouter from '../routes/Units_R.js';
import userRouter from '../routes/Users_R.js';
import authRouter from '../routes/Auth_R.js';
import pinRouter from '../routes/Pins_R.js';

const router = express.Router();

router.use('/role', roleRouter);
router.use('/unit', unitRouter);
router.use('/user', userRouter);
router.use('/auth', authRouter);
router.use('/pin', pinRouter);

export default router;