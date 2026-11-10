import {z} from 'zod';

// exactly 24 hex characters, always lowercased. Mongo accepts other spellings of the same id
// (capitals, or any 12-character string), and those would not compare equal to req.user.id,
// so "is this my own account?" checks could be fooled. One spelling only, so string compares are safe.
const objectId = z.string()
    .regex(/^[0-9a-f]{24}$/i, {message: 'invalid id'})
    .transform(id => id.toLowerCase());

// for partial (PATCH) schemas: reject a body with nothing to update
function atLeastOneField(schema) {
    return schema.refine(obj => Object.keys(obj).length > 0, {message: 'no valid fields to update'});
}

// a point on the map (pins, and where a time diff was checked)
const location = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});

export {objectId, atLeastOneField, location};
