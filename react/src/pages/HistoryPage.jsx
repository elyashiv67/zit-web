import {useState} from 'react';
import {Link} from 'react-router';
import {CalendarClock, ChevronDown, History, LoaderCircle, Trash2, UserRound} from 'lucide-react';
import {api} from '../api/client.js';
import {useAuth} from '../auth/AuthContext.jsx';
import {useDelayedFlag} from '../hooks/useAsync.js';
import {usePagedList} from '../hooks/usePagedList.js';
import {useToast} from '../components/Toast.jsx';
import {ListSkeleton} from '../components/Skeleton.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import {daysText, directionText, formatClock, formatDateTime, partsFromMs} from '../lib/timeMath.js';

function HistoryItem({item, canDelete, onDelete, mine}) {
    const parts = partsFromMs(item.offset_ms);
    return (
        <li className="row-card">
            <div className="history-icon" aria-hidden="true"><CalendarClock size={22} /></div>
            <div className="row-main">
                <span className="row-title">
                    {directionText(parts.direction)}
                    {parts.direction !== 'synced' && <> <span className="nums">{formatClock(parts)}</span></>}
                    {parts.days > 0 && <> ועוד {daysText(parts.days)}</>}
                </span>
                <span className="row-meta">
                    <span>אמת <span className="nums">{formatDateTime(new Date(item.real_time))}</span></span>
                    <span>DVR <span className="nums">{formatDateTime(new Date(item.dvr_time))}</span></span>
                    {mine && <span className="chip"><UserRound size={14} aria-hidden="true" /> שלי</span>}
                </span>
            </div>
            {canDelete && (
                <button type="button" className="icon-btn" onClick={() => onDelete(item)} aria-label="מחיקת הרשומה">
                    <Trash2 size={20} aria-hidden="true" />
                </button>
            )}
        </li>
    );
}

export default function HistoryPage() {
    const {user} = useAuth();
    const toast = useToast();
    const [scope, setScope] = useState('my');
    const list = usePagedList(scope === 'my' ? '/timeDiff/my' : '/timeDiff/allUnit');
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const firstLoad = list.loading && list.items.length === 0;
    const showSkeleton = useDelayedFlag(firstLoad);

    const remove = async () => {
        setDeleting(true);
        try {
            await api(`/timeDiff/${toDelete._id}`, {method: 'DELETE'});
            list.removeItem(toDelete._id);
            toast.success('הרשומה נמחקה');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
            setToDelete(null);
        }
    };

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1 className="page-title">היסטוריה</h1>
                    {!firstLoad && !list.error && <p className="page-sub">{list.total} חישובים שמורים</p>}
                </div>
            </div>

            <div className="tabs" role="tablist" aria-label="של מי ההיסטוריה">
                <button type="button" role="tab" className="tab" aria-selected={scope === 'my'} onClick={() => setScope('my')}>שלי</button>
                <button type="button" role="tab" className="tab" aria-selected={scope === 'unit'} onClick={() => setScope('unit')}>כל היחידה</button>
            </div>

            {list.error && list.items.length === 0 ? (
                <ErrorState message={list.error.message} onRetry={list.retry} />
            ) : firstLoad ? (
                showSkeleton ? <ListSkeleton rows={5} /> : null
            ) : list.items.length === 0 ? (
                <EmptyState icon={History} title="עוד אין חישובים שמורים"
                    text="אחרי חישוב הפרש זמנים, לחצו על ״שמירה להיסטוריה״."
                    action={<Link to="/" className="btn btn-primary">לחישוב הפרש זמנים</Link>} />
            ) : (
                <>
                    <ul className="list plain-list">
                        {list.items.map(item => (
                            <HistoryItem key={item._id} item={item} mine={scope === 'unit' && item.owner === user.id}
                                canDelete={user.is_admin || item.owner === user.id} onDelete={setToDelete} />
                        ))}
                    </ul>
                    {list.page < list.pages && (
                        <button type="button" className="btn btn-outline-ink" onClick={list.loadMore} disabled={list.loading}>
                            {list.loading ? <LoaderCircle size={20} className="spin" aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
                            עוד חישובים
                        </button>
                    )}
                </>
            )}

            <ConfirmDialog open={Boolean(toDelete)} title="למחוק את הרשומה?" confirmLabel="מחיקה" danger busy={deleting}
                onConfirm={remove} onCancel={() => setToDelete(null)} />
        </div>
    );
}
