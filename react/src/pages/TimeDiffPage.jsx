import {useRef, useState} from 'react';
import {Link} from 'react-router';
import {CalendarClock, Clock, LoaderCircle, LogIn, Save, TimerReset} from 'lucide-react';
import {api} from '../api/client.js';
import {useAuth} from '../auth/AuthContext.jsx';
import {Field} from '../components/Field.jsx';
import {useToast} from '../components/Toast.jsx';
import {useSessionDate, useSessionText} from '../hooks/useSessionDate.js';
import {
    daysSince, daysText, directionText, dvrTimeFor, formatClock, formatDateTime,
    fromLocalInput, offsetParts, realTimeFor, toLocalInput,
} from '../lib/timeMath.js';
import './TimeDiffPage.css';

function DateTimeInput({label, value, onChange, withTime = true}) {
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            <input
                className="input"
                type={withTime ? 'datetime-local' : 'date'}
                step="1"
                value={toLocalInput(value, withTime)}
                onChange={e => onChange(fromLocalInput(e.target.value))}
            />
        </label>
    );
}

function Readout({parts}) {
    if (!parts) {
        return (
            <div className="readout readout-empty">
                <Clock size={28} aria-hidden="true" />
                <span>הזינו את זמן ה-DVR ואת זמן האמת</span>
            </div>
        );
    }
    return (
        <div className="readout" aria-live="polite">
            <span className="readout-direction">{directionText(parts.direction)}</span>
            {parts.direction !== 'synced' && (
                <>
                    <span className="readout-clock nums" data-testid="offset">{formatClock(parts)}</span>
                    {parts.days > 0 && <span className="readout-days">ועוד {daysText(parts.days)}</span>}
                </>
            )}
        </div>
    );
}

// Public page — the calculator works without login; logged-in users can also save the result to their history
export default function TimeDiffPage() {
    const {user} = useAuth();
    const toast = useToast();

    const [dvrTime, setDvrTime] = useSessionDate('zit.dvrTime');
    const [realTime, setRealTime] = useSessionDate('zit.realTime');
    const [lastSave, setLastSave] = useSessionDate('zit.lastSave');
    // the history title, so others in the unit know what was checked. Required to save
    const [name, setName] = useSessionText('zit.diffName');
    const [nameError, setNameError] = useState('');
    const nameRef = useRef(null);
    // the event calculator: the user types in one box and the other one is computed from it
    const [event, setEvent] = useState({source: null, time: null});
    const [saving, setSaving] = useState(false);

    const parts = offsetParts(realTime, dvrTime);
    const eventReal = event.source === 'real' ? event.time : (event.source === 'dvr' ? realTimeFor(realTime, dvrTime, event.time) : null);
    const eventDvr = event.source === 'dvr' ? event.time : (event.source === 'real' ? dvrTimeFor(realTime, dvrTime, event.time) : null);
    const sinceSave = lastSave ? daysSince(lastSave) : null;

    const save = async () => {
        if (!name.trim()) {
            setNameError('צריך לתת שם לפני השמירה, כדי שכולם יבינו מה נבדק');
            nameRef.current?.focus();
            return;
        }
        setSaving(true);
        try {
            await api('/timeDiff', {
                method: 'POST',
                body: {
                    name: name.trim(),
                    real_time: realTime.toISOString(),
                    dvr_time: dvrTime.toISOString(),
                    ...(lastSave && {dvr_lastSave: toLocalInput(lastSave, false)}),
                },
            });
            toast.success('ההפרש נשמר בהיסטוריה');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="page time-page">
            <section className="section" aria-labelledby="diff-title">
                <h1 id="diff-title" className="section-title time-title">הפרש זמנים</h1>
                <Field label="שם (מצלמה / מקום)" ref={nameRef} value={name} maxLength={100}
                    placeholder="למשל: מצלמה כניסה ראשית" hint="יופיע ככותרת בהיסטוריה. חובה לשמירה" error={nameError}
                    onChange={e => { setName(e.target.value); setNameError(''); }} />
                <DateTimeInput label="זמן DVR" value={dvrTime} onChange={setDvrTime} />
                <DateTimeInput label="זמן אמת" value={realTime} onChange={setRealTime} />
                <button type="button" className="btn btn-primary" onClick={() => setRealTime(new Date())}>
                    <TimerReset size={20} aria-hidden="true" /> הכנסת השעה הנוכחית
                </button>
                <Readout parts={parts} />
            </section>

            <hr className="red-line time-line" />

            <section className="section" aria-labelledby="event-title">
                <h2 id="event-title" className="section-title">חישוב זמן אירוע</h2>
                <p className="section-text">הזינו את זמן האירוע באחד השדות, והשני יחושב לבד.</p>
                {!parts && <p className="field-hint">קודם צריך למלא את זמן ה-DVR ואת זמן האמת למעלה.</p>}
                <DateTimeInput label="זמן האירוע במציאות" value={eventReal}
                    onChange={time => setEvent({source: 'real', time})} />
                <DateTimeInput label="זמן האירוע ב-DVR" value={eventDvr}
                    onChange={time => setEvent({source: 'dvr', time})} />
                {eventDvr && parts && (
                    <div className="event-result">
                        <CalendarClock size={22} aria-hidden="true" />
                        <span>לחפש ב-DVR את</span>
                        <strong className="nums" data-testid="event-dvr">{formatDateTime(eventDvr)}</strong>
                    </div>
                )}
            </section>

            <section className="section" aria-labelledby="save-title">
                <h2 id="save-title" className="section-title">שמירה אחרונה ב-DVR</h2>
                <DateTimeInput label="תאריך השמירה האחרונה" value={lastSave} onChange={setLastSave} withTime={false} />
                {sinceSave !== null && (
                    <p className="since-save">
                        {sinceSave === 0 ? 'נשמר היום' : sinceSave > 0 ? `לפני ${daysText(sinceSave)}` : 'התאריך עוד לא הגיע'}
                    </p>
                )}
            </section>

            {user ? (
                <button type="button" className="btn btn-outline-ink btn-block" onClick={save} disabled={!parts || saving}>
                    {saving ? <LoaderCircle size={20} className="spin" aria-hidden="true" /> : <Save size={20} aria-hidden="true" />}
                    שמירה להיסטוריה
                </button>
            ) : (
                <Link to="/login?next=%2F" className="btn btn-outline-ink btn-block">
                    <LogIn size={20} aria-hidden="true" /> התחברו כדי לשמור להיסטוריה
                </Link>
            )}
        </div>
    );
}
