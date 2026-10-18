import {z} from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine(id => mongoose.Types.ObjectId.isValid(id), {message: 'invalid id'});

// for partial (PATCH) schemas: reject a body with nothing to update
function atLeastOneField(schema) {
    return schema.refine(obj => Object.keys(obj).length > 0, {message: 'no valid fields to update'});
}

export {objectId, atLeastOneField};
