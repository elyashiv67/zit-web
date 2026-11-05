// One place that talks to the server. In dev, Vite proxies /api to the server (vite.config.js),
// so the session cookie is same-origin. Set VITE_API_URL when the API lives somewhere else.
const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

export function apiUrl(path) {
    return BASE + path;
}

// fired on every 401 so the auth layer can drop the user and send them to login
export const authEvents = new EventTarget();

export class ApiError extends Error {
    constructor(status, message, data) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

// the server answers in English; these are the messages a user can actually run into
const KNOWN = {
    'invalid username or password': 'שם משתמש או סיסמה שגויים',
    'too many failed attempts, try again in 15 minutes': 'יותר מדי ניסיונות. נסו שוב בעוד 15 דקות',
    'account has no role or unit, contact an admin': 'לחשבון אין הרשאה או יחידה. פנו למנהל המערכת',
    'current password is wrong': 'הסיסמה הנוכחית שגויה',
    'new password must be different from the current one': 'הסיסמה החדשה חייבת להיות שונה מהנוכחית',
    'Cannot delete the last admin': 'אי אפשר למחוק את המנהל האחרון',
    // the role is the permission (admin / user); "תפקיד" is the job title
    'Cannot change the role of the last admin': 'אי אפשר לשנות את ההרשאה של המנהל האחרון',
    'Cannot delete job title: still assigned to one or more users': 'אי אפשר למחוק תפקיד שמשויך למשתמשים',
    'Cannot delete unit: it still has pins': 'אי אפשר למחוק יחידה שיש בה נקודות',
    'Cannot delete unit: still assigned to one or more users': 'אי אפשר למחוק יחידה שיש בה משתמשים',
    'password was changed, need to login': 'הסיסמה שונתה. התחברו מחדש',
    'user no longer exists, need to login': 'המשתמש כבר לא קיים',
};

const FIELD_NAMES = {
    user_name: 'שם המשתמש', TZ: 'תעודת הזהות', police_id: 'המספר האישי',
    phone: 'הטלפון', email: 'האימייל', name: 'השם', station: 'התחנה', job_title: 'התפקיד',
};

function messageFor(status, data) {
    const raw = data?.message ?? '';
    if (KNOWN[raw]) return KNOWN[raw];
    if (raw.startsWith('a pin can have up to')) return 'לנקודה יכולות להיות עד 10 תמונות';
    switch (status) {
        case 400: return 'חלק מהפרטים לא תקינים. בדקו ונסו שוב';
        case 401: return 'צריך להתחבר כדי להמשיך';
        case 403: return 'אין לך הרשאה לפעולה הזאת';
        case 404: return 'לא נמצא. ייתכן שזה נמחק';
        case 409:
            if (data?.fields?.length > 1) return 'השילוב הזה כבר קיים';
            if (data?.field) return `${FIELD_NAMES[data.field] ?? data.field} כבר קיים במערכת`;
            return 'הפעולה נחסמה כי היא מתנגשת בנתונים קיימים';
        case 413: return 'הקובץ גדול מדי';
        case 429: return 'יותר מדי ניסיונות. נסו שוב מאוחר יותר';
        case 503: return 'השרת לא זמין כרגע. נסו שוב בעוד רגע';
        default: return 'משהו השתבש בשרת. נסו שוב';
    }
}

// api('/pin/allUnit'), api('/pin', {method: 'POST', body: {...}}), body can also be FormData
export async function api(path, {method = 'GET', body, signal} = {}) {
    const init = {method, credentials: 'include', signal, headers: {}};
    if (body instanceof FormData) {
        init.body = body;
    } else if (body !== undefined) {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
    }

    let res;
    try {
        res = await fetch(apiUrl(path), init);
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        throw new ApiError(0, 'אין חיבור לשרת. בדקו את החיבור ונסו שוב', null);
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
        // a wrong password on the login form is a 401 too, but it isn't an expired session
        if (res.status === 401 && path !== '/auth/login') authEvents.dispatchEvent(new Event('expired'));
        throw new ApiError(res.status, messageFor(res.status, data), data);
    }
    return data;
}
