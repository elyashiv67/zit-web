import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {EncNumber, DecryptNumber} from "../environment/Auth_ENV.js";
import {getUserById_auth, getUserByName_auth} from "../controllers/Auth_C.js";

const cookieName = 'zit-auth';

function EncWithSalt(str) {
    return bcrypt.hash(str, 10);
}



// the user object kept in the session and on req.user
function buildSessionUser(user) {
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
        is_admin: user.role.name === "admin"
    };
}

// logged in before the password was changed -> must log in again
function loggedInBeforePassChange(user, loginTimeMs) {
    return user.pass_changed_at && loginTimeMs < user.pass_changed_at.getTime();
}

function endLogin(req, res) {
    req.session.destroy(() => {});
    res.clearCookie(cookieName);
}

async function CheckLogin(req, res, next) {
    try {
        if (!req.session.user) {
            if (!req.cookies[cookieName]) {
                // in frontend: 401 -> go to login page
                return res.status(401).json({message: "need to login"});
            }
            let failReason = await LogInByCookie(req, res, next);
            if (res.LoggedIn === false) {
                res.clearCookie(cookieName);
                return res.status(401).json({message: `need to sign in failReason: ${failReason}`});
            }
        } else {
            // re-checked on every request so a deleted user is locked out right away and
            // role / unit changes apply without logging in again
            const user = await getUserById_auth(req.session.user.id);
            if (!user || !user.role || !user.unit) {
                endLogin(req, res);
                return res.status(401).json({message: "user no longer exists, need to login"});
            }
            if (loggedInBeforePassChange(user, req.session.login_at ?? 0)) {
                endLogin(req, res);
                return res.status(401).json({message: "password was changed, need to login"});
            }
            req.session.user = buildSessionUser(user);
        }

        req.user = {...req.session.user};

        next();
    } catch (err) {
        console.log(err);
        return res.status(500).json({message: "server error in checkLogin"});
    }
}

async function LogInByCookie(req, res, next) {
    try {
        res.LoggedIn = false;
        const token = req.cookies[cookieName];
        if (!token) {
            return "Token not found"
        }
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return `Invalid Token: ${err.message}`
        }
        let user_id = DecryptNumber(decoded.id)
        let isExist = await getUserById_auth(user_id);
        if (!isExist) {
            return "User not found"
        }
        // iat is in seconds; a token from the same second as the change still counts as new
        if (isExist.pass_changed_at && decoded.iat < Math.floor(isExist.pass_changed_at.getTime() / 1000)) {
            return "Password was changed"
        }
        req.user = isExist;
        const logged_in = await LogIn(req, res, next);
        if(!logged_in)
            return "Failed to log in"

        res.LoggedIn = true;

    } catch (err) {
        return `Something went wrong in LogIn error: ${err.message}`
    }
    // next();
}

async function LogInByPass(req, res) {
    try {
        const {username: uname, password: userPass} = req.valid_body;

        let user = await getUserByName_auth(uname);
        if (!user) {
            return res.status(401).json({message: "invalid username or password"});
        }
        let passMatch = await bcrypt.compare(userPass, user.pass);
        // let passMatch = req.body.password === user.user_pass;
        if (!passMatch) {
            return res.status(401).json({message: "invalid username or password"});
        }
        req.user = user;
        const logged_in = await LogIn(req, res);
        if (!logged_in)
            return res.status(400).json({message: "logged_in failed"});


        // console.log(req.session.user_email);
        return res.status(200).json({message: "Successfully logged in", user: req.session.user});

    } catch (err) {
        console.log(`in loginByPass : ${err}`);
        return res.status(500).json({message: "Something went wrong in LogInByPass"});
    }

}

async function SetLoginToken(req, res) {
    try {
        let user_id = req.user.id;
        // console.log("SetLoginToken",user);
        // console.log(jwtSecret);
        const maxAge = 30 * 24 * 60 * 60; // 30 days in sec
        let encId = EncNumber(user_id);
        // console.log("enc id = " + encId);
        // console.log("dec id = " + DecryptNumber(encId));
        res.token = jwt.sign(
            {
                id: encId
            },
            process.env.JWT_SECRET,
            {
                expiresIn: maxAge,
            }
        );
        res.cookie(cookieName, res.token, {
            httpOnly: true,
            maxAge: maxAge * 1000, //  in ms
        });
        return {ok: true}
    } catch (err) {
        // return  res.status(500).json({message:"Something went wrong in SetLoginToken"});
        return {
            ok: false,
            error: err
        }
    }
    // next();
}

async function SetLoginSession(req, res) {
    try {
        // console.log(req.user);
        let user = await getUserById_auth(req.user.id);
        if (!user) {
            // return res.status(401).json({message: "not logged in , in login session"});
            return {ok: false};
        }
        //build session user for auth, and req.user for model call for db
        req.session.user = buildSessionUser(user);
        req.session.login_at = Date.now();
        req.user = buildSessionUser(user);
        // console.log(user);

        return {ok: true};

    } catch (err) {
        // console.log(err);
        return {
            ok: false,
            error: err
        }
    }
    // next();
}

async function LogIn(req, res) {
    try {
        const token = await SetLoginToken(req, res);
        if (!token.ok)
            return false


        const session = await SetLoginSession(req, res);
        if (!session.ok)
            return false

        return true

    } catch (err) {
        // return res.status(500).json({message: "Something went wrong in LogIn"});
        return false
    }
}

// after users change their own password: new cookie + login time so this device stays
// logged in while every other device has to log in again
async function RefreshLogin(req, res) {
    const token = await SetLoginToken(req, res);
    req.session.login_at = Date.now();
    return token.ok;
}

// returns the logged-in user (from the session) so the frontend can restore state on page load
function GetMe(req, res) {
    return res.status(200).json({user: req.user});
}

async function LogOut(req, res) {
    try {
        req.session.destroy();
        res.clearCookie(cookieName);

        return res.status(200).json({message: "Logged out successfully"});
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}



export {CheckLogin, LogInByPass, LogOut, GetMe, RefreshLogin}