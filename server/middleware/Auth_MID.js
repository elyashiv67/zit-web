import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {getUserById_auth, getUserByName_auth} from '../controllers/Auth_C.js';
import {clearSessionCookie} from '../config/session.js';

// The session (stored in MongoDB) only holds the user id and when the login happened.
// The user itself is reloaded on every request, so a deleted user is locked out right away
// and role / unit changes apply without logging in again.

// compared against when the username doesn't exist, so a wrong username takes as long as a
// wrong password and the response time doesn't reveal which usernames exist
const DUMMY_HASH = bcrypt.hashSync(crypto.randomUUID(), 10);

// the user object on req.user and in login / me responses
function buildReqUser(user) {
    return {
        id: user.id,
        name: user.name,
        user_name: user.user_name,
        TZ: user.TZ,
        police_id: user.police_id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        unit: user.unit,
        is_admin: user.role.name === 'admin',
    };
}

// express-session uses callbacks; this lets us await regenerate / save / destroy
function sessionCall(req, method) {
    return new Promise((resolve, reject) => req.session[method](err => err ? reject(err) : resolve()));
}

// new session id on every login (stops session fixation: an id planted before login is useless after it)
async function startSession(req, user) {
    await sessionCall(req, 'regenerate');
    req.session.user_id = user.id;
    req.session.login_at = Date.now();
    await sessionCall(req, 'save');
}

async function endSession(req, res) {
    await sessionCall(req, 'destroy');
    clearSessionCookie(res);
}

// in the frontend: 401 -> go to the login page
async function CheckLogin(req, res, next) {
    const userId = req.session.user_id;
    if (!userId)
        return res.status(401).json({message: 'need to login'});

    // a DB error throws here -> 500 from the error handler, and the session is kept
    const user = await getUserById_auth(userId);
    if (!user || !user.role || !user.unit) {
        await endSession(req, res);
        return res.status(401).json({message: 'user no longer exists, need to login'});
    }
    if (user.pass_changed_at && req.session.login_at < user.pass_changed_at.getTime()) {
        await endSession(req, res);
        return res.status(401).json({message: 'password was changed, need to login'});
    }

    req.user = buildReqUser(user);
    next();
}

async function LogInByPass(req, res) {
    const {username, password} = req.valid_body;

    const user = await getUserByName_auth(username);
    const passMatch = await bcrypt.compare(password, user?.pass ?? DUMMY_HASH);
    if (!user || !passMatch)
        return res.status(401).json({message: 'invalid username or password'});
    if (!user.role || !user.unit)
        return res.status(403).json({message: 'account has no role or unit, contact an admin'});

    await startSession(req, user);
    return res.status(200).json({message: 'Successfully logged in', user: buildReqUser(user)});
}

// returns the logged-in user so the frontend can restore state on page load
function GetMe(req, res) {
    return res.status(200).json({user: req.user});
}

// the session is deleted from the DB, so a copied cookie stops working too
async function LogOut(req, res) {
    await endSession(req, res);
    return res.status(200).json({message: 'Logged out successfully'});
}

export {CheckLogin, LogInByPass, LogOut, GetMe, startSession, endSession};
