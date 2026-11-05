import {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router';
import {
    Camera, Contact, Copy, Eye, EyeOff, ImageOff, KeyRound, MapPinOff, Navigation, Pencil, Phone, Trash2, UserRound, X,
} from 'lucide-react';
import {api, apiUrl} from '../api/client.js';
import {useAsync} from '../hooks/useAsync.js';
import {useToast} from '../components/Toast.jsx';
import {Skeleton} from '../components/Skeleton.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LazyPinMap from '../components/LazyPinMap.jsx';
import PageSkeleton from '../components/PageSkeleton.jsx';
import {MAX_IMAGES_PER_PIN, uploadPinImages} from '../lib/pinImages.js';
import {formatDate} from '../lib/timeMath.js';
import './PinDetailPage.css';

function DvrBox({dvr}) {
    const toast = useToast();
    const [visible, setVisible] = useState(false);
    if (!dvr?.user_name && !dvr?.password) {
        return <p className="section-text">אין פרטי DVR לנקודה הזאת.</p>;
    }
    const copy = async (text, what) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${what} הועתק`);
        } catch {
            toast.error('ההעתקה לא הצליחה');
        }
    };
    return (
        <dl className="dvr-box">
            {dvr.user_name && (
                <div className="dvr-row">
                    <dt>שם משתמש</dt>
                    <dd className="nums">{dvr.user_name}</dd>
                    <button type="button" className="icon-btn" onClick={() => copy(dvr.user_name, 'שם המשתמש')} aria-label="העתקת שם המשתמש">
                        <Copy size={18} aria-hidden="true" />
                    </button>
                </div>
            )}
            {dvr.password && (
                <div className="dvr-row">
                    <dt>סיסמה</dt>
                    <dd className="nums" data-testid="dvr-password">{visible ? dvr.password : '••••••••'}</dd>
                    <button type="button" className="icon-btn" onClick={() => setVisible(v => !v)}
                        aria-label={visible ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'} aria-pressed={visible}>
                        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                    <button type="button" className="icon-btn" onClick={() => copy(dvr.password, 'הסיסמה')} aria-label="העתקת הסיסמה">
                        <Copy size={18} aria-hidden="true" />
                    </button>
                </div>
            )}
        </dl>
    );
}

// who owns the DVR, with a tap-to-call phone
function OwnerBox({owner}) {
    if (!owner?.name) {
        return <p className="section-text">לא נשמר בעל DVR לנקודה הזאת.</p>;
    }
    return (
        <dl className="dvr-box">
            <div className="dvr-row">
                <dt>שם</dt>
                <dd>{owner.name}</dd>
            </div>
            {owner.id_number && (
                <div className="dvr-row">
                    <dt>ת״ז</dt>
                    <dd className="nums">{owner.id_number}</dd>
                </div>
            )}
            {owner.phone && (
                <div className="dvr-row">
                    <dt>טלפון</dt>
                    <dd className="nums">{owner.phone}</dd>
                    <a className="icon-btn" href={`tel:${owner.phone}`} aria-label={`התקשרות אל ${owner.name}`}>
                        <Phone size={18} aria-hidden="true" />
                    </a>
                </div>
            )}
            {owner.notes && (
                <div className="dvr-row owner-notes">
                    <dt>הערות</dt>
                    <dd>{owner.notes}</dd>
                </div>
            )}
        </dl>
    );
}

function Gallery({pin, onChange}) {
    const toast = useToast();
    const [uploading, setUploading] = useState(0);
    const [open, setOpen] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const room = MAX_IMAGES_PER_PIN - pin.image.length;

    const upload = async e => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (!files.length) return;
        if (files.length > room) {
            toast.error(room ? `אפשר להוסיף עוד ${room} תמונות בלבד` : 'בנקודה כבר יש 10 תמונות');
            return;
        }
        setUploading(files.length);
        try {
            onChange(await uploadPinImages(pin._id, files));
            toast.success(files.length === 1 ? 'התמונה נוספה' : `${files.length} תמונות נוספו`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploading(0);
        }
    };

    const remove = async () => {
        setDeleting(true);
        try {
            const {pin: updated} = await api(`/pin/${pin._id}/images/${toDelete}`, {method: 'DELETE'});
            onChange(updated);
            toast.success('התמונה נמחקה');
            setOpen(null);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
            setToDelete(null);
        }
    };

    return (
        <section className="section" aria-labelledby="gallery-title">
            <div className="section-head">
                <h2 id="gallery-title" className="section-title">תמונות</h2>
                <span className="nums">{pin.image.length}/{MAX_IMAGES_PER_PIN}</span>
            </div>

            {pin.image.length === 0 && !uploading ? (
                <div className="gallery-empty">
                    <ImageOff size={36} strokeWidth={1.6} aria-hidden="true" />
                    <span>אין עדיין תמונות</span>
                </div>
            ) : (
                <ul className="gallery">
                    {pin.image.map(file => (
                        <li key={file}>
                            <button type="button" className="gallery-item" onClick={() => setOpen(file)} aria-label="הגדלת התמונה">
                                <img src={apiUrl(`/pin/${pin._id}/images/${file}`)} alt="" loading="lazy" />
                            </button>
                        </li>
                    ))}
                    {Array.from({length: uploading}, (_, i) => (
                        <li key={`up-${i}`} data-testid="uploading-tile"><Skeleton height="100%" radius={12} style={{aspectRatio: '1'}} /></li>
                    ))}
                </ul>
            )}

            {room > 0 && (
                <label className={`btn btn-ghost ${uploading ? 'is-disabled' : ''}`}>
                    <Camera size={20} aria-hidden="true" />
                    {uploading ? 'מעלה...' : 'הוספת תמונות'}
                    <input type="file" accept="image/*" multiple className="visually-hidden" onChange={upload} disabled={uploading > 0}
                        data-testid="image-input" />
                </label>
            )}

            {open && (
                <div className="lightbox" role="dialog" aria-modal="true" aria-label="תמונה"
                    onKeyDown={e => e.key === 'Escape' && setOpen(null)}>
                    <img src={apiUrl(`/pin/${pin._id}/images/${open}`)} alt="" />
                    <div className="lightbox-bar">
                        <button type="button" className="btn btn-danger" onClick={() => setToDelete(open)}>
                            <Trash2 size={20} aria-hidden="true" /> מחיקה
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setOpen(null)} autoFocus>
                            <X size={20} aria-hidden="true" /> סגירה
                        </button>
                    </div>
                </div>
            )}

            <ConfirmDialog open={Boolean(toDelete)} title="למחוק את התמונה?" text="אי אפשר לשחזר תמונה שנמחקה."
                confirmLabel="מחיקת התמונה" danger busy={deleting} onConfirm={remove} onCancel={() => setToDelete(null)} />
        </section>
    );
}

export default function PinDetailPage() {
    const {id} = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const {data: pin, error, reload, setData} = useAsync(signal => api(`/pin/${id}`, {signal}), [id]);
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (error && !pin) {
        return (
            <div className="page">
                {error.status === 404
                    ? <ErrorState icon={MapPinOff} message="הנקודה לא נמצאה. ייתכן שהיא נמחקה" />
                    : <ErrorState message={error.message} onRetry={reload} />}
            </div>
        );
    }
    if (!pin) return <PageSkeleton />;

    // keep the decrypted DVR password the detail page loaded; image changes come back without it
    const applyPin = updated => setData(old => ({...updated, dvr: old.dvr}));

    const removePin = async () => {
        setDeleting(true);
        try {
            await api(`/pin/${pin._id}`, {method: 'DELETE'});
            toast.success('הנקודה נמחקה');
            navigate('/pins', {replace: true});
        } catch (err) {
            toast.error(err.message);
            setDeleting(false);
            setConfirming(false);
        }
    };

    const {lat, lng} = pin.location;
    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1 className="page-title">{pin.name}</h1>
                    <p className="page-sub pin-sub">
                        <UserRound size={16} aria-hidden="true" /> {pin.creator_name}
                        <span className="nums">{formatDate(new Date(pin.createdAt))}</span>
                    </p>
                </div>
                <Link to={`/pins/${pin._id}/edit`} className="icon-btn icon-btn-ink" aria-label="עריכת הנקודה">
                    <Pencil size={22} aria-hidden="true" />
                </Link>
            </div>

            <LazyPinMap pins={[pin]} height={200} />
            <a className="btn btn-outline-ink" href={`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`} target="_blank" rel="noreferrer">
                <Navigation size={20} aria-hidden="true" /> ניווט ב-Waze
            </a>

            <section className="section" aria-labelledby="dvr-title">
                <h2 id="dvr-title" className="section-title"><KeyRound size={20} aria-hidden="true" /> פרטי DVR</h2>
                <DvrBox dvr={pin.dvr} />
            </section>

            <section className="section" aria-labelledby="owner-title">
                <h2 id="owner-title" className="section-title"><Contact size={20} aria-hidden="true" /> בעל ה-DVR</h2>
                <OwnerBox owner={pin.dvr_owner} />
            </section>

            <Gallery pin={pin} onChange={applyPin} />

            <button type="button" className="btn btn-danger-ink btn-block" onClick={() => setConfirming(true)}>
                <Trash2 size={20} aria-hidden="true" /> מחיקת הנקודה
            </button>
            <ConfirmDialog open={confirming} title="למחוק את הנקודה?" text="הנקודה וכל התמונות שלה יימחקו לכל מי שביחידה."
                confirmLabel="מחיקת הנקודה" danger busy={deleting} onConfirm={removePin} onCancel={() => setConfirming(false)} />
        </div>
    );
}
