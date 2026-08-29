import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {EncNumber, DecryptNumber} from "../environment/Auth_ENV.js";
import {getUserById_auth, getUserByName_auth} from "../controllers/Auth_C.js";

const cookieName = 'zit-auth';

function EncWithSalt(str) {
    return bcrypt.hash(str, 10);
}



async function CheckLogin(req, res, next) {
    try {
        if (!req.session.user) {
            if (!req.cookies[cookieName]) {
                // in frontend to know to go to login page
                return res.status(423).send({error: "need to login"});
            }
            let failReason = await LogInByCookie(req, res, next);
            if (res.LoggedIn === false) {
                return res.status(401).json({message: `need to sign in failReason: ${failReason}`});
            }
        }
        // build req.user
        req.user = {
            id: req.session.user.id,
            name: req.session.user.name,
            user_name: req.session.user.user_name,
            TZ: req.session.user.TZ,
            police_id: req.session.user.police_id,
            phone: req.session.user.phone,
            email: req.session.user.email,
            role: req.session.user.role,
            unit: req.session.user.unit,
            is_admin: req.session.user.is_admin
        };

        next();
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: "server error in checkLogin"});
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
        req.user = isExist;
        const logged_in = await LogIn(req, res, next);
        if(!logged_in)
            return

        res.LoggedIn = true;

    } catch (err) {
        return `Something went wrong in LogIn error: ${err.message}`
    }
    // next();
}

async function LogInByPass(req, res) {
    try {
        const {uname , userPass} = req.validLoginValues;

        let user = await getUserByName_auth(uname);
        if (!user) {
            return res.status(401).json({message: "User not found"});
        }
        let passMatch = await bcrypt.compare(userPass, user.pass);
        // let passMatch = req.body.password === user.user_pass;
        if (!passMatch) {
            return res.status(402).json({message: "pass dont match"});
        }
        req.user = user;
        const logged_in = await LogIn(req, res);
        if (!logged_in)
            return res.status(400).json({message: "logged_in failed"});


        // console.log(req.session.user_email);
        return res.status(200).json({message: "Successfully logged in"});

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
        //build session user for auth
        req.session.user = {
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

        // build req.user for model call for db
        req.user = {
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

async function LogOut(req, res) {
    try {
        req.session.destroy();
        res.clearCookie(cookieName);

        return res.status(200).json({message: "Logged out successfully"});
    } catch (e) {
        return res.status(500).json({ message: `Server error: ${e.message}` });
    }
}



export {CheckLogin, LogInByPass, LogOut}