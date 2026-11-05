import {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import {CircleAlert, CircleCheck} from 'lucide-react';

const ToastContext = createContext(null);

// short confirmation / error at the bottom of the screen: toast.success('נשמר'), toast.error(err.message)
export function ToastProvider({children}) {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(1);

    const push = useCallback((kind, text) => {
        const id = nextId.current++;
        setToasts(list => [...list, {id, kind, text}]);
        setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 4000);
    }, []);

    const api = useMemo(() => ({
        success: text => push('success', text),
        error: text => push('error', text),
    }), [push]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toast-stack" aria-live="polite">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
                        {t.kind === 'error'
                            ? <CircleAlert size={20} aria-hidden="true" />
                            : <CircleCheck size={20} aria-hidden="true" />}
                        <span>{t.text}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
    return ctx;
}
