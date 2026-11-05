import {useState} from 'react';
import {useNavigate, useParams} from 'react-router';
import {Camera, CircleAlert, LoaderCircle, LocateFixed, Save} from 'lucide-react';
import {api} from '../api/client.js';
import {useAsync} from '../hooks/useAsync.js';
import {useToast} from '../components/Toast.jsx';
import {Field, PasswordField} from '../components/Field.jsx';
import LazyPinMap from '../components/LazyPinMap.jsx';
import PageSkeleton from '../components/PageSkeleton.jsx';
import ErrorState from '../components/ErrorState.jsx';
import {MAX_IMAGES_PER_PIN, uploadPinImages} from '../lib/pinImages.js';
import {onlyDigits, validatePin} from '../lib/validation.js';

function toForm(pin) {
    const owner = pin?.dvr_owner;
    return {
        name: pin?.name ?? '',
        lat: pin ? String(pin.location.lat) : '',
        lng: pin ? String(pin.location.lng) : '',
        dvrUser: pin?.dvr?.user_name ?? '',
        dvrPass: pin?.dvr?.password ?? '',
        ownerName: owner?.name ?? '',
        ownerId: owner?.id_number ?? '',
        ownerPhone: owner?.phone ?? '',
        ownerNotes: owner?.notes ?? '',
    };
}

// the dvr_owner body: only the filled fields, or null when there is no owner (validatePin made sure a name exists)
function ownerFrom(form) {
    const owner = {
        name: form.ownerName.trim(),
        id_number: onlyDigits(form.ownerId),
        phone: onlyDigits(form.ownerPhone),
        notes: form.ownerNotes.trim(),
    };
    if (!owner.name) return null;
    return Object.fromEntries(Object.entries(owner).filter(([, value]) => value));
}

function PinForm({pin}) {
    const navigate = useNavigate();
    const toast = useToast();
    const editing = Boolean(pin);
    const [form, setForm] = useState(() => toForm(pin));
    const [files, setFiles] = useState([]);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const [locating, setLocating] = useState(false);

    const set = key => e => setForm(f => ({...f, [key]: e.target.value}));
    const locationErrors = validatePin(form);
    const picked = !locationErrors.lat && !locationErrors.lng ? {lat: Number(form.lat), lng: Number(form.lng)} : null;

    const useMyLocation = () => {
        if (!navigator.geolocation) {
            toast.error('המכשיר לא תומך במיקום');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                setForm(f => ({...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6)}));
                setLocating(false);
            },
            () => {
                toast.error('לא הצלחנו לקבל מיקום. בדקו שהרשאת המיקום פתוחה');
                setLocating(false);
            },
            {enableHighAccuracy: true, timeout: 15000},
        );
    };

    const submit = async e => {
        e.preventDefault();
        const found = validatePin(form);
        setErrors(found);
        setFormError('');
        if (Object.keys(found).length) return;

        const body = {name: form.name.trim(), location: {lat: Number(form.lat), lng: Number(form.lng)}};
        if (editing) {
            // an emptied DVR field is removed on the server (null); an untouched one isn't sent
            const dvr = {};
            if (form.dvrUser !== (pin.dvr?.user_name ?? '')) dvr.user_name = form.dvrUser || null;
            if (form.dvrPass !== (pin.dvr?.password ?? '')) dvr.password = form.dvrPass || null;
            if (Object.keys(dvr).length) body.dvr = dvr;
            // the server replaces the owner as a whole, so send it only when something changed (null removes it)
            const owner = ownerFrom(form);
            if (JSON.stringify(owner) !== JSON.stringify(ownerFrom(toForm(pin)))) body.dvr_owner = owner;
        } else {
            if (form.dvrUser || form.dvrPass) {
                body.dvr = {...(form.dvrUser && {user_name: form.dvrUser}), ...(form.dvrPass && {password: form.dvrPass})};
            }
            const owner = ownerFrom(form);
            if (owner) body.dvr_owner = owner;
        }

        setBusy(true);
        try {
            const {pin: saved} = editing
                ? await api(`/pin/${pin._id}`, {method: 'PATCH', body})
                : await api('/pin', {method: 'POST', body});
            if (files.length) {
                try {
                    await uploadPinImages(saved._id, files);
                } catch (err) {
                    toast.error(`הנקודה נשמרה, אבל התמונות לא עלו: ${err.message}`);
                    navigate(`/pins/${saved._id}`, {replace: true});
                    return;
                }
            }
            toast.success(editing ? 'הנקודה עודכנה' : 'הנקודה נוספה');
            navigate(`/pins/${saved._id}`, {replace: true});
        } catch (err) {
            setFormError(err.message);
            setBusy(false);
        }
    };

    return (
        <div className="page">
            <h1 className="page-title">{editing ? 'עריכת נקודה' : 'נקודה חדשה'}</h1>
            <form className="form" onSubmit={submit} noValidate>
                {formError && <div className="form-error" role="alert"><CircleAlert size={20} aria-hidden="true" /> {formError}</div>}

                <section className="section">
                    <Field label="שם הנקודה" value={form.name} onChange={set('name')} error={errors.name} maxLength={100} />
                </section>

                <section className="section" aria-labelledby="loc-title">
                    <h2 id="loc-title" className="section-title">מיקום</h2>
                    <p className="section-text">לחצו על המפה, או השתמשו במיקום הנוכחי שלכם.</p>
                    <LazyPinMap picked={picked} onPick={({lat, lng}) => setForm(f => ({...f, lat: String(lat), lng: String(lng)}))} height={240} />
                    <button type="button" className="btn btn-ghost" onClick={useMyLocation} disabled={locating}>
                        {locating ? <LoaderCircle size={20} className="spin" aria-hidden="true" /> : <LocateFixed size={20} aria-hidden="true" />}
                        המיקום שלי
                    </button>
                    <div className="form-row">
                        <Field label="קו רוחב" value={form.lat} onChange={set('lat')} error={errors.lat} inputMode="decimal" dir="ltr" />
                        <Field label="קו אורך" value={form.lng} onChange={set('lng')} error={errors.lng} inputMode="decimal" dir="ltr" />
                    </div>
                </section>

                <section className="section" aria-labelledby="dvr-title">
                    <h2 id="dvr-title" className="section-title">פרטי DVR</h2>
                    <p className="section-text">לא חובה. רק מי שביחידה יכול לראות את הסיסמה.</p>
                    <Field label="שם משתמש" value={form.dvrUser} onChange={set('dvrUser')} error={errors.dvrUser}
                        autoComplete="off" autoCapitalize="none" dir="ltr" />
                    <PasswordField label="סיסמה" value={form.dvrPass} onChange={set('dvrPass')} error={errors.dvrPass} autoComplete="new-password" />
                </section>

                <section className="section" aria-labelledby="owner-title">
                    <h2 id="owner-title" className="section-title">בעל ה-DVR</h2>
                    <p className="section-text">לא חובה. אם ממלאים, צריך לפחות שם.</p>
                    <Field label="שם הבעלים" value={form.ownerName} onChange={set('ownerName')} error={errors.ownerName} maxLength={100} autoComplete="off" />
                    <div className="form-row">
                        <Field label="ת״ז (לא חובה)" value={form.ownerId} onChange={set('ownerId')} error={errors.ownerId}
                            inputMode="numeric" autoComplete="off" dir="ltr" />
                        <Field label="טלפון (לא חובה)" type="tel" value={form.ownerPhone} onChange={set('ownerPhone')} error={errors.ownerPhone}
                            inputMode="tel" autoComplete="off" dir="ltr" />
                    </div>
                    <Field label="הערות (לא חובה)" multiline rows={3} value={form.ownerNotes} onChange={set('ownerNotes')}
                        error={errors.ownerNotes} maxLength={500} placeholder="למשל: זמין רק בבוקר, לפנות דרך המשמרת" />
                </section>

                {!editing && (
                    <section className="section" aria-labelledby="img-title">
                        <h2 id="img-title" className="section-title">תמונות</h2>
                        <label className="btn btn-ghost">
                            <Camera size={20} aria-hidden="true" />
                            {files.length ? `נבחרו ${files.length} תמונות` : 'צילום או בחירת תמונות'}
                            <input type="file" accept="image/*" multiple className="visually-hidden" data-testid="new-pin-images"
                                onChange={e => setFiles(Array.from(e.target.files ?? []).slice(0, MAX_IMAGES_PER_PIN))} />
                        </label>
                        <p className="field-hint">עד {MAX_IMAGES_PER_PIN} תמונות. תמונות גדולות מהטלפון מתכווצות לבד.</p>
                    </section>
                )}

                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                    {busy ? <LoaderCircle size={20} className="spin" aria-hidden="true" /> : <Save size={20} aria-hidden="true" />}
                    {editing ? 'שמירת השינויים' : 'הוספת הנקודה'}
                </button>
            </form>
        </div>
    );
}

export function NewPinPage() {
    return <PinForm />;
}

export function EditPinPage() {
    const {id} = useParams();
    const {data: pin, error, reload} = useAsync(signal => api(`/pin/${id}`, {signal}), [id]);
    if (error) return <div className="page"><ErrorState message={error.message} onRetry={reload} /></div>;
    if (!pin) return <PageSkeleton />;
    return <PinForm pin={pin} />;
}
