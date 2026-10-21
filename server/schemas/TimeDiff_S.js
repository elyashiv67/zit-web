import {z} from 'zod';

// owner, assigned_unit and offset_ms are never taken from the body —
// owner/unit come from the logged-in user, offset_ms is computed from the two times
const timeDiffKeys = {
    real_time: z.coerce.date(),
    dvr_time: z.coerce.date(),
    dvr_lastSave: z.coerce.date(),
};

const addTimeDiffSchema = z.object({
    real_time: timeDiffKeys.real_time,
    dvr_time: timeDiffKeys.dvr_time,
    dvr_lastSave: timeDiffKeys.dvr_lastSave.optional(),
});

export {addTimeDiffSchema};
