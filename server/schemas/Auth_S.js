import {z} from 'zod';

const authKeys = {
    username: z.string().trim().min(1).max(100),
    password: z.string().min(1).max(100),
};

const loginSchema = z.object({
    username: authKeys.username,
    password: authKeys.password,
});

export {loginSchema};
