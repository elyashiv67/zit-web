import {useState} from 'react';
import {Link} from 'react-router';
import {Images, KeyRound, MapPinOff, Plus, Search, SearchX, UserRound} from 'lucide-react';
import {api} from '../api/client.js';
import {useAuth} from '../auth/AuthContext.jsx';
import {useAsync, useDelayedFlag} from '../hooks/useAsync.js';
import {ListSkeleton, Skeleton} from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LazyPinMap from '../components/LazyPinMap.jsx';
import PinThumb from '../components/PinThumb.jsx';
import './PinsPage.css';

// the map is the main way to find a pin here: about half the screen on a phone, never tiny, capped on big screens
const MAP_HEIGHT = 'clamp(320px, 55vh, 600px)';

export default function PinsPage() {
    const {user} = useAuth();
    // admins can switch to every unit's pins (GET /pin); everyone else sees their unit
    const [scope, setScope] = useState('unit');
    const [query, setQuery] = useState('');
    const {data: pins, error, loading, reload} = useAsync(
        signal => api(scope === 'all' ? '/pin' : '/pin/allUnit', {signal}),
        [scope],
    );
    const showSkeleton = useDelayedFlag(loading && !pins);

    const q = query.trim().toLowerCase();
    // by the pin's name or the DVR owner's name
    const visible = (pins ?? []).filter(p => !q || [p.name, p.dvr_owner?.name].some(text => text?.toLowerCase().includes(q)));

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1 className="page-title">נקודות</h1>
                    {pins && <p className="page-sub">{pins.length} נקודות {scope === 'all' ? 'בכל היחידות' : 'ביחידה'}</p>}
                </div>
            </div>

            {user.is_admin && (
                <div className="tabs" role="tablist" aria-label="אילו נקודות להציג">
                    <button type="button" role="tab" className="tab" aria-selected={scope === 'unit'} onClick={() => setScope('unit')}>היחידה שלי</button>
                    <button type="button" role="tab" className="tab" aria-selected={scope === 'all'} onClick={() => setScope('all')}>כל היחידות</button>
                </div>
            )}

            <label className="search-box">
                <Search size={20} aria-hidden="true" />
                <span className="visually-hidden">חיפוש נקודה</span>
                <input type="search" placeholder="חיפוש לפי שם נקודה או בעלים"value={query} onChange={e => setQuery(e.target.value)} />
            </label>

            {error && !pins ? (
                <ErrorState message={error.message} onRetry={reload} />
            ) : showSkeleton ? (
                <>
                    <Skeleton height={MAP_HEIGHT} radius={16} />
                    <ListSkeleton rows={3} thumb />
                </>
            ) : pins && pins.length === 0 ? (
                <EmptyState icon={MapPinOff} title="אין עדיין נקודות ביחידה"
                    text="נקודה חדשה תופיע כאן ועל המפה לכל מי שביחידה."
                    action={<Link to="/pins/new" className="btn btn-primary"><Plus size={20} aria-hidden="true" /> הוספת נקודה</Link>} />
            ) : pins ? (
                <>
                    <LazyPinMap pins={visible} height={MAP_HEIGHT} />
                    {visible.length === 0 ? (
                        <EmptyState icon={SearchX} title="לא נמצאה נקודה בשם הזה" />
                    ) : (
                        <ul className="list pin-list">
                            {visible.map(pin => (
                                <li key={pin._id}>
                                    <Link to={`/pins/${pin._id}`} className="row-card">
                                        <PinThumb pin={pin} />
                                        <div className="row-main">
                                            <span className="row-title">{pin.name}</span>
                                            <span className="row-meta">
                                                <span><Images size={15} aria-hidden="true" /> {pin.image.length} תמונות</span>
                                                {pin.dvr?.user_name && <span><KeyRound size={15} aria-hidden="true" /> DVR</span>}
                                                <span><UserRound size={15} aria-hidden="true" /> {pin.creator_name}</span>
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            ) : null}

            {/* an empty unit already shows the add button in the empty state */}
            {pins?.length > 0 && (
                <Link to="/pins/new" className="fab" aria-label="הוספת נקודה">
                    <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}
