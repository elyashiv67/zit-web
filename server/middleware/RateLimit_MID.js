import {rateLimit, ipKeyGenerator} from 'express-rate-limit';

// only failed attempts count (skipSuccessfulRequests), so normal users never hit these.
// NOTE: behind nginx / a Docker proxy, set app.set('trust proxy', 1) in index.js or every
// request will look like it comes from the proxy's IP.
const WINDOW_MS = 15 * 60 * 1000;

function limiter(limit, keyGenerator) {
    return rateLimit({
        windowMs: WINDOW_MS,
        limit,
        keyGenerator,
        skipSuccessfulRequests: true,
        standardHeaders: 'draft-8', // RateLimit + Retry-After headers for the frontend
        legacyHeaders: false,
        message: {message: 'too many failed attempts, try again in 15 minutes'},
    });
}

// per username from one IP: stops guessing one user's password
// without locking out everyone else in the same office (same IP)
const loginLimiter = limiter(5, req => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip)}:${username}`;
});

// per IP: stops one machine from trying many usernames
const loginIpLimiter = limiter(30, req => ipKeyGenerator(req.ip));

// wrong current_password on the change-password route; requires CheckLogin earlier
const passwordLimiter = limiter(5, req => `user:${req.user.id}`);

export {loginLimiter, loginIpLimiter, passwordLimiter};
