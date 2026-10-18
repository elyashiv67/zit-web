import {z} from 'zod';
import {atLeastOneField} from './common_S.js';

const unitKeys = {
    district: z.string().trim().min(1),
    merhav: z.string().trim().min(1),
    station: z.string().trim().min(1),
};

const createUnitSchema = z.object({
    district: unitKeys.district,
    merhav: unitKeys.merhav,
    station: unitKeys.station,
});

const updateUnitSchema = atLeastOneField(createUnitSchema.partial());

export {createUnitSchema, updateUnitSchema};
