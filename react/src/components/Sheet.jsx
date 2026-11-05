import {X} from 'lucide-react';

// a form that slides up from the bottom on phones (centered on wide screens)
export default function Sheet({open, title, onClose, children}) {
    if (!open) return null;
    return (
        <div className="dialog-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="dialog sheet" role="dialog" aria-modal="true" aria-label={title}
                onKeyDown={e => e.key === 'Escape' && onClose()}>
                <div className="section-head">
                    <h2 className="dialog-title">{title}</h2>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="סגירה" autoFocus>
                        <X size={22} aria-hidden="true" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
