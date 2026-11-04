import {z} from 'zod';

// owner, assigned_unit and offset_ms are never taken from the body —
// owner/unit come from the logged-in user, offset_ms is computed from the two times

// ISO 8601 only: a full date-time with Z or an offset (what Date.toISOString() gives), or a
// plain date. z.coerce.date() also accepted null / true / 0 and saved them as 1970.
// A date-time without Z / offset is rejected: the server can't know which timezone it means.
const isoDate = z.union([z.iso.datetime({offset: true}), z.iso.date()], {error: 'must be an ISO date, e.g. 2026-10-21T10:00:00Z'})
    .transform(s => new Date(s));

const addTimeDiffSchema = z.object({
    real_time: isoDate,
    dvr_time: isoDate,
    dvr_lastSave: isoDate.optional(),
});

export {addTimeDiffSchema};
