import {useId, useState} from 'react';
import {Building2, ChevronDown, CircleAlert, KeyRound, LoaderCircle, Pencil, Plus, Shield, Trash2, UserPlus, UserRound, Users} from 'lucide-react';
import {api} from '../api/client.js';
import {useAuth} from '../auth/AuthContext.jsx';
import {useAsync, useDelayedFlag} from '../hooks/useAsync.js';
import {usePagedList} from '../hooks/usePagedList.js';
import {useToast} from '../components/Toast.jsx';
import {Field, PasswordField} from '../components/Field.jsx';
import {ListSkeleton} from '../components/Skeleton.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Sheet from '../components/Sheet.jsx';
import {validatePasswordChange, validateUnit, validateUser} from '../lib/validation.js';

const roleLabel = role => (role?.name === 'admin' ? 'מנהל' : 'משתמש');
const unitLabel = unit => (unit ? `${unit.station}, ${unit.merhav}` : 'ללא יחידה');

// the error sits outside the label and is linked with aria-describedby, so the field's name stays just the label
function SelectField({label, value, onChange, error, options, placeholder}) {
    const id = useId();
    return (
        <div className="field">
            <label htmlFor={id} className="field-label">{label}</label>
            <select id={id} className={`input ${error ? 'input-invalid' : ''}`} value={value} onChange={onChange}
                aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined}>
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {error && <span id={`${id}-error`} className="field-error">{error}</span>}
        </div>
    );
}

function FormError({text}) {
    if (!text) return null;
    return <div className="form-error" role="alert"><CircleAlert size={20} aria-hidden="true" /> {text}</div>;
}

const USER_FIELDS = ['name', 'user_name', 'TZ', 'police_id', 'phone', 'email', 'role', 'unit'];

// create (user = null) or edit a user. Editing sends only the fields that changed
function UserForm({user, roles, units, onSaved}) {
    const toast = useToast();
    const creating = !user;
    const [form, setForm] = useState(() => Object.fromEntries(
        [...USER_FIELDS, ...(creating ? ['pass'] : [])].map(k => [k, user?.[k] ?? ''])));
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = key => e => setForm(f => ({...f, [key]: e.target.value}));

    const submit = async e => {
        e.preventDefault();
        const found = validateUser(form, {requirePassword: creating});
        setErrors(found);
        setFormError('');
        if (Object.keys(found).length) return;

        const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k === 'pass' ? v : v.trim()]));
        const body = creating ? trimmed : Object.fromEntries(Object.entries(trimmed).filter(([k, v]) => v !== (user[k] ?? '')));
        if (!creating && !Object.keys(body).length) {
            onSaved(null);
            return;
        }
        setBusy(true);
        try {
            const res = creating
                ? await api('/auth/register', {method: 'POST', body})
                : await api(`/user/${user._id}`, {method: 'PATCH', body});
            toast.success(creating ? 'המשתמש נוצר' : 'המשתמש עודכן');
            onSaved(res.user);
        } catch (err) {
            setFormError(err.message);
            setBusy(false);
        }
    };

    return (
        <form className="form" onSubmit={submit} noValidate>
            <FormError text={formError} />
            <Field label="שם מלא" value={form.name} onChange={set('name')} error={errors.name} />
            <Field label="שם משתמש" value={form.user_name} onChange={set('user_name')} error={errors.user_name} autoCapitalize="none" dir="ltr" />
            {creating && <PasswordField label="סיסמה ראשונית" value={form.pass} onChange={set('pass')} error={errors.pass} autoComplete="new-password" />}
            <div className="form-row">
                <Field label="תעודת זהות" value={form.TZ} onChange={set('TZ')} error={errors.TZ} inputMode="numeric" dir="ltr" />
                <Field label="מספר אישי" value={form.police_id} onChange={set('police_id')} error={errors.police_id} dir="ltr" />
            </div>
            <div className="form-row">
                <Field label="טלפון" value={form.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" dir="ltr" />
                <Field label="אימייל" value={form.email} onChange={set('email')} error={errors.email} type="email" dir="ltr" />
            </div>
            <div className="form-row">
                <SelectField label="תפקיד" value={form.role} onChange={set('role')} error={errors.role} placeholder="בחירת תפקיד"
                    options={roles.map(r => ({value: r._id, label: roleLabel(r)}))} />
                <SelectField label="יחידה" value={form.unit} onChange={set('unit')} error={errors.unit} placeholder="בחירת יחידה"
                    options={units.map(u => ({value: u._id, label: unitLabel(u)}))} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <LoaderCircle size={20} className="spin" aria-hidden="true" />}
                {creating ? 'יצירת המשתמש' : 'שמירת השינויים'}
            </button>
        </form>
    );
}

function ResetPassword({user, onDone}) {
    const toast = useToast();
    const [form, setForm] = useState({next: '', confirm: ''});
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const submit = async e => {
        e.preventDefault();
        const found = validatePasswordChange({...form, current: ''}, {needCurrent: false});
        setErrors(found);
        if (Object.keys(found).length) return;
        setBusy(true);
        try {
            await api(`/user/${user._id}/password`, {method: 'PATCH', body: {new_password: form.next}});
            toast.success(`הסיסמה של ${user.name} אופסה, והמשתמש נותק מכל המכשירים`);
            onDone();
        } catch (err) {
            toast.error(err.message);
            setBusy(false);
        }
    };

    return (
        <form className="form" onSubmit={submit} noValidate>
            <PasswordField label="סיסמה חדשה" value={form.next} onChange={e => setForm(f => ({...f, next: e.target.value}))} error={errors.next} autoComplete="new-password" />
            <PasswordField label="אימות הסיסמה" value={form.confirm} onChange={e => setForm(f => ({...f, confirm: e.target.value}))} error={errors.confirm} autoComplete="new-password" />
            <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? <LoaderCircle size={20} className="spin" aria-hidden="true" /> : <KeyRound size={20} aria-hidden="true" />}
                איפוס הסיסמה
            </button>
        </form>
    );
}

function UsersTab({roles, units}) {
    const {user: me, refresh} = useAuth();
    const toast = useToast();
    const list = usePagedList('/user');
    const [sheet, setSheet] = useState(null); // {mode: 'new'|'edit'|'password', user}
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const showSkeleton = useDelayedFlag(list.loading && list.items.length === 0);
    const roleById = Object.fromEntries(roles.map(r => [r._id, r]));
    const unitById = Object.fromEntries(units.map(u => [u._id, u]));

    const saved = updated => {
        // PATCH answers with role / unit populated; the list keeps them as ids
        if (updated && sheet.mode === 'edit') list.updateItem({...updated, role: updated.role?._id ?? updated.role, unit: updated.unit?._id ?? updated.unit});
        if (updated && sheet.mode === 'new') list.reload();
        if (updated?._id === me.id) refresh();
        setSheet(null);
    };

    const remove = async () => {
        setDeleting(true);
        try {
            await api(`/user/${toDelete._id}`, {method: 'DELETE'});
            list.removeItem(toDelete._id);
            toast.success('המשתמש נמחק. הנקודות שיצר נשארות ביחידה');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
            setToDelete(null);
        }
    };

    return (
        <>
            <button type="button" className="btn btn-primary" onClick={() => setSheet({mode: 'new'})}>
                <UserPlus size={20} aria-hidden="true" /> משתמש חדש
            </button>

            {list.error && list.items.length === 0 ? (
                <ErrorState message={list.error.message} onRetry={list.retry} />
            ) : list.loading && list.items.length === 0 ? (
                showSkeleton ? <ListSkeleton rows={5} /> : null
            ) : list.items.length === 0 ? (
                <EmptyState icon={Users} title="אין משתמשים" />
            ) : (
                <ul className="list plain-list">
                    {list.items.map(u => (
                        <li key={u._id} className="row-card">
                            <div className="history-icon" aria-hidden="true">
                                {roleById[u.role]?.name === 'admin' ? <Shield size={22} /> : <UserRound size={22} />}
                            </div>
                            <div className="row-main">
                                <span className="row-title">{u.name}{u._id === me.id && ' (את/ה)'}</span>
                                <span className="row-meta">
                                    <span className="nums">{u.user_name}</span>
                                    <span><Building2 size={14} aria-hidden="true" /> {unitById[u.unit]?.station ?? 'ללא יחידה'}</span>
                                    <span className="chip">{roleLabel(roleById[u.role])}</span>
                                </span>
                            </div>
                            <button type="button" className="icon-btn" aria-label={`עריכת ${u.name}`} onClick={() => setSheet({mode: 'edit', user: u})}>
                                <Pencil size={20} aria-hidden="true" />
                            </button>
                            <button type="button" className="icon-btn" aria-label={`איפוס הסיסמה של ${u.name}`} onClick={() => setSheet({mode: 'password', user: u})}>
                                <KeyRound size={20} aria-hidden="true" />
                            </button>
                            {u._id !== me.id && (
                                <button type="button" className="icon-btn" aria-label={`מחיקת ${u.name}`} onClick={() => setToDelete(u)}>
                                    <Trash2 size={20} aria-hidden="true" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {list.page < list.pages && (
                <button type="button" className="btn btn-outline-ink" onClick={list.loadMore} disabled={list.loading}>
                    <ChevronDown size={20} aria-hidden="true" /> עוד משתמשים
                </button>
            )}

            <Sheet open={Boolean(sheet)} onClose={() => setSheet(null)}
                title={sheet?.mode === 'new' ? 'משתמש חדש' : sheet?.mode === 'password' ? `איפוס סיסמה: ${sheet.user.name}` : `עריכת ${sheet?.user?.name ?? ''}`}>
                {sheet?.mode === 'password'
                    ? <ResetPassword user={sheet.user} onDone={() => setSheet(null)} />
                    : sheet && <UserForm user={sheet.user ?? null} roles={roles} units={units} onSaved={saved} />}
            </Sheet>
            <ConfirmDialog open={Boolean(toDelete)} title={`למחוק את ${toDelete?.name ?? ''}?`}
                text="המשתמש לא יוכל להתחבר יותר. הנקודות שיצר נשארות ביחידה." confirmLabel="מחיקת המשתמש" danger busy={deleting}
                onConfirm={remove} onCancel={() => setToDelete(null)} />
        </>
    );
}

function UnitForm({unit, onSaved}) {
    const toast = useToast();
    const [form, setForm] = useState({district: unit?.district ?? '', merhav: unit?.merhav ?? '', station: unit?.station ?? ''});
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = key => e => setForm(f => ({...f, [key]: e.target.value}));

    const submit = async e => {
        e.preventDefault();
        const found = validateUnit(form);
        setErrors(found);
        setFormError('');
        if (Object.keys(found).length) return;
        const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
        setBusy(true);
        try {
            const res = unit
                ? await api(`/unit/${unit._id}`, {method: 'PATCH', body})
                : await api('/unit', {method: 'POST', body});
            toast.success(unit ? 'היחידה עודכנה' : 'היחידה נוספה');
            onSaved(res.unit);
        } catch (err) {
            setFormError(err.message);
            setBusy(false);
        }
    };

    return (
        <form className="form" onSubmit={submit} noValidate>
            <FormError text={formError} />
            <Field label="מחוז" value={form.district} onChange={set('district')} error={errors.district} />
            <Field label="מרחב" value={form.merhav} onChange={set('merhav')} error={errors.merhav} />
            <Field label="תחנה" value={form.station} onChange={set('station')} error={errors.station} />
            <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <LoaderCircle size={20} className="spin" aria-hidden="true" />}
                {unit ? 'שמירת השינויים' : 'הוספת היחידה'}
            </button>
        </form>
    );
}

function UnitsTab({units, setUnits}) {
    const toast = useToast();
    const [sheet, setSheet] = useState(null); // {unit} — unit null for a new one
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const saved = unit => {
        setUnits(list => (sheet.unit ? list.map(u => (u._id === unit._id ? unit : u)) : [...list, unit]));
        setSheet(null);
    };

    const remove = async () => {
        setDeleting(true);
        try {
            await api(`/unit/${toDelete._id}`, {method: 'DELETE'});
            setUnits(list => list.filter(u => u._id !== toDelete._id));
            toast.success('היחידה נמחקה');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
            setToDelete(null);
        }
    };

    return (
        <>
            <button type="button" className="btn btn-primary" onClick={() => setSheet({unit: null})}>
                <Plus size={20} aria-hidden="true" /> יחידה חדשה
            </button>
            {units.length === 0 ? (
                <EmptyState icon={Building2} title="אין יחידות" />
            ) : (
                <ul className="list plain-list">
                    {units.map(u => (
                        <li key={u._id} className="row-card">
                            <div className="history-icon" aria-hidden="true"><Building2 size={22} /></div>
                            <div className="row-main">
                                <span className="row-title">{u.station}</span>
                                <span className="row-meta"><span>{u.merhav}</span><span>{u.district}</span></span>
                            </div>
                            <button type="button" className="icon-btn" aria-label={`עריכת ${u.station}`} onClick={() => setSheet({unit: u})}>
                                <Pencil size={20} aria-hidden="true" />
                            </button>
                            <button type="button" className="icon-btn" aria-label={`מחיקת ${u.station}`} onClick={() => setToDelete(u)}>
                                <Trash2 size={20} aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <Sheet open={Boolean(sheet)} onClose={() => setSheet(null)} title={sheet?.unit ? `עריכת ${sheet.unit.station}` : 'יחידה חדשה'}>
                {sheet && <UnitForm unit={sheet.unit} onSaved={saved} />}
            </Sheet>
            <ConfirmDialog open={Boolean(toDelete)} title={`למחוק את ${toDelete?.station ?? ''}?`}
                text="אפשר למחוק רק יחידה שאין בה משתמשים ונקודות." confirmLabel="מחיקת היחידה" danger busy={deleting}
                onConfirm={remove} onCancel={() => setToDelete(null)} />
        </>
    );
}

export default function AdminPage() {
    const [tab, setTab] = useState('users');
    const {data, error, loading, reload, setData} = useAsync(
        async signal => {
            const [roles, units] = await Promise.all([api('/role', {signal}), api('/unit', {signal})]);
            return {roles, units};
        },
        [],
    );
    const showSkeleton = useDelayedFlag(loading && !data);
    const setUnits = update => setData(d => ({...d, units: update(d.units)}));

    return (
        <div className="page">
            <h1 className="page-title">ניהול</h1>
            <div className="tabs" role="tablist" aria-label="מה לנהל">
                <button type="button" role="tab" className="tab" aria-selected={tab === 'users'} onClick={() => setTab('users')}>משתמשים</button>
                <button type="button" role="tab" className="tab" aria-selected={tab === 'units'} onClick={() => setTab('units')}>יחידות</button>
            </div>
            {error && !data ? (
                <ErrorState message={error.message} onRetry={reload} />
            ) : !data ? (
                showSkeleton ? <ListSkeleton rows={5} /> : null
            ) : tab === 'users' ? (
                <UsersTab roles={data.roles} units={data.units} />
            ) : (
                <UnitsTab units={data.units} setUnits={setUnits} />
            )}
        </div>
    );
}
