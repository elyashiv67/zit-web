import {z} from 'zod';
import {objectId, atLeastOneField} from './common_S.js';
import {MAX_PASSWORD_BYTES} from '../config/passwords.js';

const userKeys = {
    name: z.string().trim().min(1).max(100),
    user_name: z.string().trim().toLowerCase().min(1).max(100), // case-insensitive: Admin = admin
    // 8+ characters; at most 72 bytes because bcrypt ignores the rest (36 Hebrew letters, 72 English)
    pass: z.string().min(8).refine(p => Buffer.byteLength(p, 'utf8') <= MAX_PASSWORD_BYTES,
        {message: `password must be at most ${MAX_PASSWORD_BYTES} bytes (36 Hebrew letters or 72 English ones)`}),
    TZ: z.string().trim().min(1),
    police_id: z.string().trim().min(1),
    phone: z.string().regex(/^\d{1,10}$/, {message: 'phone must be 1-10 digits'}),
    email: z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {message: 'invalid email'}),
    role: objectId,
    unit: objectId,
    job_title: objectId,
};

const registerUserSchema = z.object({
    name: userKeys.name,
    user_name: userKeys.user_name,
    pass: userKeys.pass,
    TZ: userKeys.TZ,
    police_id: userKeys.police_id,
    phone: userKeys.phone,
    email: userKeys.email,
    role: userKeys.role,
    unit: userKeys.unit,
    job_title: userKeys.job_title,
});

// what users may change on themselves; if more fields should be updatable, add them here
const updateUserSchema = atLeastOneField(z.object({
    name: userKeys.name,
    phone: userKeys.phone,
    email: userKeys.email,
}).partial());

// admins can change everything except the password (that has its own route)
const adminUpdateUserSchema = atLeastOneField(registerUserSchema.omit({pass: true}).partial());

// current_password is required when users change their own password (checked in the controller);
// an admin resetting someone else's password doesn't need it
const changePasswordSchema = z.object({
    current_password: z.string().min(1).max(100).optional(),
    new_password: userKeys.pass,
});

export {registerUserSchema, updateUserSchema, adminUpdateUserSchema, changePasswordSchema};
