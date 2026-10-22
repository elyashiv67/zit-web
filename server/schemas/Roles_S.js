import {z} from 'zod';
import {atLeastOneField} from './common_S.js';

const roleKeys = {
    level: z.number().int().positive(),
    name: z.enum(['admin', 'user']),
};

const createRoleSchema = z.object({
    level: roleKeys.level,
    name: roleKeys.name,
});

const updateRoleSchema = atLeastOneField(createRoleSchema.partial());

export {createRoleSchema, updateRoleSchema};
