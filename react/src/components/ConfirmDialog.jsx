// asks before something that can't be undone (delete pin / user / unit / image)
export default function ConfirmDialog({open, title, text, confirmLabel, danger = false, busy = false, onConfirm, onCancel}) {
    if (!open) return null;
    return (
        <div className="dialog-backdrop" onClick={e => e.target === e.currentTarget && !busy && onCancel()}>
            <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
                onKeyDown={e => e.key === 'Escape' && !busy && onCancel()}>
                <h2 id="confirm-title" className="dialog-title">{title}</h2>
                {text && <p className="dialog-text">{text}</p>}
                <div className="dialog-actions">
                    <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
                        {confirmLabel}
                    </button>
                    {/* focus lands on cancel, the safe choice */}
                    <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy} autoFocus>ביטול</button>
                </div>
            </div>
        </div>
    );
}
