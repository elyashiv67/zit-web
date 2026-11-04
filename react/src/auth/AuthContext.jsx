import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {api, ApiError, authEvents} from '../api/client.js';

const AuthContext = createContext(null);

// status: 'loading' until /auth/me answers, then 'in' or 'out'.
// 'unknown' = the server couldn't be reached, so we don't know (the time diff page still works)
export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState('loading');

    const refresh = useCallback(async () => {
        try {
            const {user} = await api('/auth/me');
            setUser(user);
            setStatus('in');
        } catch (err) {
            setUser(null);
            setStatus(err instanceof ApiError && err.status === 401 ? 'out' : 'unknown');
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // any 401 from any request: the session is gone (logged out elsewhere, password changed, user deleted)
    useEffect(() => {
        const onExpired = () => {
            setUser(null);
            setStatus('out');
        };
        authEvents.addEventListener('expired', onExpired);
        return () => authEvents.removeEventListener('expired', onExpired);
    }, []);

    const login = useCallback(async (username, password) => {
        const {user} = await api('/auth/login', {method: 'POST', body: {username, password}});
        setUser(user);
        setStatus('in');
        return user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api('/auth/logout', {method: 'POST'});
        } finally {
            setUser(null);
            setStatus('out');
        }
    }, []);

    const value = useMemo(() => ({user, status, login, logout, refresh, setUser}), [user, status, login, logout, refresh]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
