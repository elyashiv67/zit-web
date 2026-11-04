// Same rules as the server's Zod schemas (server/schemas), so mistakes show up next to the field
// before anything is sent. The server still checks everything.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{1,10}$/;

export function validatePin(form) {
    const errors = {};
    const name = form.name.trim();
    if (!name) errors.name = 'צריך לתת לנקודה שם';
    else if (name.length > 100) errors.name = 'השם ארוך מדי (עד 100 תווים)';
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (form.lat === '' || Number.isNaN(lat) || lat < -90 || lat > 90) errors.lat = 'קו רוחב בין ‎-90 ל-90';
    if (form.lng === '' || Number.isNaN(lng) || lng < -180 || lng > 180) errors.lng = 'קו אורך בין ‎-180 ל-180';
    if (form.dvrUser.length > 100) errors.dvrUser = 'עד 100 תווים';
    if (form.dvrPass.length > 100) errors.dvrPass = 'עד 100 תווים';
    return errors;
}

// only the keys present in `form` are checked, so the profile form (name/phone/email) can use it too
export function validateUser(form, {requirePassword = false} = {}) {
    const errors = {};
    const has = key => key in form;
    if (has('name') && !form.name.trim()) errors.name = 'צריך למלא שם';
    if (has('user_name') && !form.user_name.trim()) errors.user_name = 'צריך למלא שם משתמש';
    if (requirePassword && form.pass.length < 6) errors.pass = 'לפחות 6 תווים';
    if (has('TZ') && !form.TZ.trim()) errors.TZ = 'צריך למלא תעודת זהות';
    if (has('police_id') && !form.police_id.trim()) errors.police_id = 'צריך למלא מספר אישי';
    if (has('phone') && !PHONE_RE.test(form.phone)) errors.phone = 'עד 10 ספרות, בלי מקפים';
    if (has('email') && !EMAIL_RE.test(form.email.trim())) errors.email = 'כתובת אימייל לא תקינה';
    if (has('role') && !form.role) errors.role = 'צריך לבחור תפקיד';
    if (has('unit') && !form.unit) errors.unit = 'צריך לבחור יחידה';
    return errors;
}

export function validatePasswordChange({current, next, confirm}, {needCurrent = true} = {}) {
    const errors = {};
    if (needCurrent && !current) errors.current = 'צריך למלא את הסיסמה הנוכחית';
    if (next.length < 6) errors.next = 'לפחות 6 תווים';
    else if (next.length > 100) errors.next = 'עד 100 תווים';
    if (confirm !== next) errors.confirm = 'הסיסמאות לא זהות';
    return errors;
}

export function validateUnit(form) {
    const errors = {};
    for (const key of ['district', 'merhav', 'station']) {
        if (!form[key].trim()) errors[key] = 'צריך למלא';
    }
    return errors;
}
