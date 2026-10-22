import 'dotenv/config';
import {z} from 'zod';

// every setting the server reads, checked once at startup so a missing / bad value stops the
// server with a clear message instead of failing later on some request
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    HOST: z.string().min(1).default('localhost'),
    PORT: z.coerce.number().int().positive(),
    DB: z.string().min(1),
    // overrides the database name in DB (the tests use this to run on their own database)
    DB_NAME: z.string().min(1).optional(),
    SESSION_SECRET: z.string().min(1),
    // key for DVR passwords stored in the DB (config/secretBox.js)
    DVR_SECRET: z.string().min(32, 'must be at least 32 random characters'),
    // HTTPS-only cookies. Defaults to on in production; set COOKIE_SECURE=false if production runs on plain http
    COOKIE_SECURE: z.stringbool().optional(),
    // number of proxies in front of the server (nginx / Docker = 1) so req.ip is the user's real IP
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    UPLOADS_DIR: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    // only names and rules are printed, never the values (they may be secrets)
    const lines = parsed.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`);
    console.error(`Invalid environment variables (.env):\n${lines.join('\n')}`);
    process.exit(1);
}

const env = parsed.data;
env.COOKIE_SECURE ??= env.NODE_ENV === 'production';

if (env.SESSION_SECRET.length < 32) {
    if (env.NODE_ENV === 'production') {
        console.error('SESSION_SECRET must be at least 32 characters in production');
        process.exit(1);
    }
    console.warn('⚠ SESSION_SECRET is short — use at least 32 random characters before going to production');
}

if (env.NODE_ENV === 'production' && env.COOKIE_SECURE && env.TRUST_PROXY === 0)
    console.warn('⚠ COOKIE_SECURE is on but TRUST_PROXY=0: behind nginx / Docker set TRUST_PROXY=1, or logins will not get a cookie');

export default env;
