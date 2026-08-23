import express from "express";
import roleRouter from '../routes/Roles_R.js';
import unitRouter from '../routes/Units_R.js';

const router = express.Router();

router.use('/role', roleRouter);
router.use('/unit', unitRouter);

export default router;