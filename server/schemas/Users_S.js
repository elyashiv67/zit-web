import {z} from 'zod';
import {objectId, atLeastOneField} from './common_S.js';

const userKeys = {
    name: z.string().trim().min(1).max(100),
    user_name: z.string().trim().toLowerCase().min(1).max(100), // case-insensitive: Admin = admin
    pass: z.string().min(6).max(100),
    TZ: z.string().trim().min(1),
    police_id: z.string().trim().min(1),
    phone: z.string().regex(/^\d{1,10}$/, {message: 'phone must be 1-10 digits'}),
    email: z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {message: 'invalid email'}),
    role: objectId,
    unit: objectId,
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
