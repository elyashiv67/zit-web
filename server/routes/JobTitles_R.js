import express from "express";
import {getAllJobTitles, createJobTitle, updateJobTitle, deleteJobTitle} from '../controllers/JobTitles_C.js';
import {isAdmin} from "../middleware/global_MID.js";
import {CheckLogin} from "../middleware/Auth_MID.js";
import {validate} from "../middleware/Validate_MID.js";
import {jobTitleSchema} from "../schemas/JobTitles_S.js";

// everyone logged in can read the list; only admins manage it
const router = express.Router();

router.get('/', CheckLogin, getAllJobTitles);
router.post('/', CheckLogin, isAdmin, validate(jobTitleSchema), createJobTitle);
router.patch('/:id', CheckLogin, isAdmin, validate(jobTitleSchema), updateJobTitle);
router.delete('/:id', CheckLogin, isAdmin, validate(), deleteJobTitle);

export default router;
