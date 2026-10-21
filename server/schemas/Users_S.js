import {z} from 'zod';
import {objectId, atLeastOneField} from './common_S.js';

const userKeys = {
    name: z.string().trim().min(1).max(100),
    user_name: z.string().trim().min(1).max(100),
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

// if more fields should be updatable, add them here
const updateUserSchema = atLeastOneField(z.object({
    name: userKeys.name,
    phone: userKeys.phone,
    email: userKeys.email,
}).partial());

export {registerUserSchema, updateUserSchema};
