import {RefreshCw, WifiOff} from 'lucide-react';

// a load that failed: what went wrong and a retry button. icon defaults to "no connection"
export default function ErrorState({message, onRetry, icon: Icon = WifiOff}) {
    return (
        <div className="empty-state" role="alert">
            <Icon size={40} strokeWidth={1.6} aria-hidden="true" />
            <p className="empty-title">{message}</p>
            {onRetry && (
                <button type="button" className="btn btn-ghost" onClick={onRetry}>
                    <RefreshCw size={18} aria-hidden="true" /> נסו שוב
                </button>
            )}
        </div>
    );
}
