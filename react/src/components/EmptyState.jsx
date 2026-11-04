// shown when a list has nothing in it: an icon, one line on what's missing, and what to do next
export default function EmptyState({icon: Icon, title, text, action}) {
    return (
        <div className="empty-state">
            {Icon && <Icon size={40} strokeWidth={1.6} aria-hidden="true" />}
            <p className="empty-title">{title}</p>
            {text && <p className="empty-text">{text}</p>}
            {action}
        </div>
    );
}
