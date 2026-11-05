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
    dvrUserName: z.string().trim().min(1).max(100),
    dvrPassword: z.string().min(1).max(100),
    // the person who owns the DVR (e.g. the shop owner): a name, the rest optional
    dvrOwner: z.object({
        name: z.string().trim().min(1).max(100),
        id_number: z.string().trim().regex(/^\d{1,9}$/, {message: 'id_number must be 1-9 digits'}).optional(),
        phone: z.string().trim().regex(/^\d{1,10}$/, {message: 'phone must be 1-10 digits'}).optional(),
        notes: z.string().trim().min(1).max(500).optional(),
    }),
};

const addPinSchema = z.object({
    name: pinKeys.name,
    location: pinKeys.location,
    dvr: z.object({
        user_name: pinKeys.dvrUserName.optional(),
        password: pinKeys.dvrPassword.optional(),
    }).optional(),
    dvr_owner: pinKeys.dvrOwner.optional(),
});

// in dvr, a key that isn't sent is kept and null removes it.
// dvr_owner is replaced as a whole (keys not sent are removed), and null removes it
const updatePinSchema = atLeastOneField(z.object({
    name: pinKeys.name,
    location: pinKeys.location,
    dvr: z.object({
        user_name: pinKeys.dvrUserName.nullable(),
        password: pinKeys.dvrPassword.nullable(),
    }).partial(),
    dvr_owner: pinKeys.dvrOwner.nullable(),
}).partial());

export {addPinSchema, updatePinSchema};
