import {z} from 'zod';

const authKeys = {
    username: z.string().trim().toLowerCase().min(1).max(100), // usernames are case-insensitive
    password: z.string().min(1).max(100),
};

const loginSchema = z.object({
    username: authKeys.username,
    password: authKeys.password,
});

export {loginSchema};
