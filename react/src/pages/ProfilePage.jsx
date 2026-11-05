import {useState} from 'react';
import {useNavigate} from 'react-router';
import {Building2, CircleAlert, IdCard, KeyRound, LoaderCircle, LogOut, Mail, Phone, Save, Shield, UserRound} from 'lucide-react';
import {api} from '../api/client.js';
import {useAuth} from '../auth/AuthContext.jsx';
import {useToast} from '../components/Toast.jsx';
import {Field, PasswordField} from '../components/Field.jsx';
import {validatePasswordChange, validateUser} from '../lib/validation.js';
import './ProfilePage.css';

function Details({user}) {
    const rows = [
        {icon: UserRound, label: 'שם משתמש', value: user.user_name, ltr: true},
        {icon: Shield, label: 'תפקיד', value: user.is_admin ? 'מנהל' : 'משתמש'},
        {icon: Building2, label: 'יחידה', value: [user.unit?.station, user.unit?.merhav, user.unit?.district].filter(Boolean).join(', ')},
        {icon: IdCard, label: 'מספר אישי', value: user.police_id, ltr: true},
    ];
    return (
        <dl className="details">
            {rows.map(({icon: Icon, label, value, ltr}) => (
                <div className="details-row" key={label}>
                    <dt><Icon size={18} aria-hidden="true" /> {label}</dt>
                    <dd className={ltr ? 'nums' : undefined}>{value}</dd>
                </div>
            ))}
        </dl>
    );
}

function EditDetails({user}) {
    const {refresh} = useAuth();
    const toast = useToast();
    const [form, setForm] = useState({name: user.name, phone: user.phone, email: user.email});
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const set = key => e => setForm(f => ({...f, [key]: e.target.value}));
    const changed = Object.keys(form).filter(k => form[k].trim() !== (user[k] ?? ''));

    const submit = async e => {
        e.preventDefault();
        const found = validateUser(form);
        setErrors(found);
        if (Object.keys(found).length || !changed.length) return;
        setBusy(true);
        try {
            await api(`/user/${user.id}`, {method: 'PATCH', body: Object.fromEntries(changed.map(k => [k, form[k].trim()]))});
            await refresh();
            toast.success('הפרטים עודכנו');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <form className="section form" onSubmit={submit} noValidate aria-labelledby="edit-title">
            <h2 id="edit-title" className="section-title">פרטים אישיים</h2>
            <Field label="שם מלא" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
            <Field label="טלפון" value={form.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" autoComplete="tel" dir="ltr" />
            <Field label="אימייל" value={form.email} onChange={set('email')} error={errors.email} type="email" autoComplete="email" dir="ltr" />
            <button type="submit" className="btn btn-primary" disabled={busy || !changed.length}>
                {busy ? <LoaderCircle size={20} className="spin" aria-hidden="true" /> : <Save size={20} aria-hidden="true" />}
                שמירת הפרטים
            </button>
        </form>
    );
}

function ChangePassword({user}) {
    const toast = useToast();
    const empty = {current: '', next: '', confirm: ''};
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = key => e => setForm(f => ({...f, [key]: e.target.value}));

    const submit = async e => {
        e.preventDefault();
        const found = validatePasswordChange(form);
        setErrors(found);
        setFormError('');
        if (Object.keys(found).length) return;
        setBusy(true);
        try {
            // the server signs out every other device and keeps this one logged in
            await api(`/user/${user.id}/password`, {method: 'PATCH', body: {current_password: form.current, new_password: form.next}});
            setForm(empty);
            toast.success('הסיסמה שונתה. מכשירים אחרים נותקו');
        } catch (err) {
            setFormError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <form className="section form" onSubmit={submit} noValidate aria-labelledby="pass-title">
            <h2 id="pass-title" className="section-title"><KeyRound size={20} aria-hidden="true" /> שינוי סיסמה</h2>
            {formError && <div className="form-error" role="alert"><CircleAlert size={20} aria-hidden="true" /> {formError}</div>}
            <PasswordField label="סיסמה נוכחית" value={form.current} onChange={set('current')} error={errors.current} autoComplete="current-password" />
            <PasswordField label="סיסמה חדשה" value={form.next} onChange={set('next')} error={errors.next} autoComplete="new-password" />
            <PasswordField label="אימות הסיסמה החדשה" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
            <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <LoaderCircle size={20} className="spin" aria-hidden="true" />}
                שינוי הסיסמה
            </button>
        </form>
    );
}

export default function ProfilePage() {
    const {user, logout} = useAuth();
    const navigate = useNavigate();
    const [leaving, setLeaving] = useState(false);

    // leave the protected page first, so the login guard doesn't redirect to /login on the way out
    const signOut = async () => {
        setLeaving(true);
        navigate('/', {replace: true});
        await logout();
    };

    return (
        <div className="page">
            <div className="page-head profile-head">
                <div className="avatar" aria-hidden="true">{user.name.trim().charAt(0)}</div>
                <div>
                    <h1 className="page-title">{user.name}</h1>
                    <p className="page-sub profile-contact">
                        <span><Phone size={15} aria-hidden="true" /> <span className="nums">{user.phone}</span></span>
                        <span><Mail size={15} aria-hidden="true" /> <span className="nums">{user.email}</span></span>
                    </p>
                </div>
            </div>
            <section className="section"><Details user={user} /></section>
            <EditDetails user={user} />
            <ChangePassword user={user} />
            <button type="button" className="btn btn-outline-ink btn-block" onClick={signOut} disabled={leaving}>
                <LogOut size={20} aria-hidden="true" /> התנתקות
            </button>
        </div>
    );
}
