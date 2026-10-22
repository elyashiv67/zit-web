import {z} from 'zod';
import {atLeastOneField} from './common_S.js';

// assigned_unit and creator are never taken from the body — they come from the logged-in user.
// image is managed only through the /pin/:id/images routes (upload / delete)
const pinKeys = {
    name: z.string().trim().min(1).max(100),
    location: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
    }),
    dvr: z.object({
        user_name: z.string().trim().min(1).optional(),
        password: z.string().min(1).optional(),
    }),
};

const addPinSchema = z.object({
    name: pinKeys.name,
    location: pinKeys.location,
    dvr: pinKeys.dvr.optional(),
});

const updatePinSchema = atLeastOneField(z.object({
    name: pinKeys.name,
    location: pinKeys.location,
    dvr: pinKeys.dvr,
}).partial());

export {addPinSchema, updatePinSchema};
