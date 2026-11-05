import {z} from 'zod';
import {atLeastOneField} from './common_S.js';

// the map marker: one icon on one color, from these lists only (the app shows the same lists)
const MARKER_ICONS = ['cctv', 'video', 'webcam', 'camera', 'eye', 'store', 'building', 'pin'];
const MARKER_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'brown', 'black'];

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
    marker: z.object({
        icon: z.enum(MARKER_ICONS),
        color: z.enum(MARKER_COLORS),
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
    marker: pinKeys.marker.optional(),
});

// in dvr, a key that isn't sent is kept and null removes it.
// dvr_owner and marker are replaced as a whole (keys not sent are removed), and null removes them
const updatePinSchema = atLeastOneField(z.object({
    name: pinKeys.name,
    location: pinKeys.location,
    dvr: z.object({
        user_name: pinKeys.dvrUserName.nullable(),
        password: pinKeys.dvrPassword.nullable(),
    }).partial(),
    dvr_owner: pinKeys.dvrOwner.nullable(),
    marker: pinKeys.marker.nullable(),
}).partial());

export {addPinSchema, updatePinSchema, MARKER_ICONS, MARKER_COLORS};
