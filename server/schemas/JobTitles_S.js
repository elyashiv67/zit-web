import {z} from 'zod';

const jobTitleSchema = z.object({
    name: z.string().trim().min(1).max(50),
});

export {jobTitleSchema};
