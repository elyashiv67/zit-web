import {z} from 'zod';
import {atLeastOneField} from './common_S.js';

// owner and assigned_unit are never taken from the body — they come from the logged-in user
const pinKeys = {
    name: z.string().trim().min(1).max(100),
    location: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
    }),
    image: z.array(z.string().trim().min(1)),
    dvr: z.object({
        user_name: z.string().trim().min(1).optional(),
        password: z.string().min(1).optional(),
    }),
};

const addPinSchema = z.object({
    name: pinKeys.name,
    location: pinKeys.location,
    image: pinKeys.image.optional(),
    dvr: pinKeys.dvr.optional(),
});

const updatePinSchema = atLeastOneField(z.object({
    name: pinKeys.name,
    location: pinKeys.location,
    image: pinKeys.image,
    dvr: pinKeys.dvr,
}).partial());

export {addPinSchema, updatePinSchema};
