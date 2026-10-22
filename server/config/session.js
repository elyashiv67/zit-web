import session from 'express-session';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import env from './env.js';

const SESSION_COOKIE = 'zit.sid';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days without a visit -> logged out

const cookieOptions = {
    httpOnly: true,         // not readable from JS
    sameSite: 'lax',        // not sent on cross-site POST / PATCH / DELETE (CSRF)
    secure: env.COOKIE_SECURE,
    path: '/',
};

// sessions are stored in MongoDB (collection "sessions"), so they survive restarts and are
// really gone after logout. Only logged-in users get one (saveUninitialized: false).
// rolling: every visit pushes the 30 days forward — this replaces the old remember-me JWT.
function sessionMiddleware() {
    return session({
        name: SESSION_COOKIE,
        secret: env.SESSION_SECRET,
        store: MongoStore.create({
            client: mongoose.connection.getClient(),
            collectionName: 'sessions',
            touchAfter: 24 * 60 * 60, // write the new expiry to the DB at most once a day
        }),
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {...cookieOptions, maxAge: SESSION_MAX_AGE},
    });
}

function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
}

export {sessionMiddleware, clearSessionCookie, SESSION_COOKIE};
