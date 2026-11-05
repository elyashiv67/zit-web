import {Navigate, Outlet, useLocation} from 'react-router';
import {useAuth} from './AuthContext.jsx';
import PageSkeleton from '../components/PageSkeleton.jsx';
import ErrorState from '../components/ErrorState.jsx';

// guards every page except the time diff. ?next= brings the user back after login
export function RequireAuth({admin = false}) {
    const {user, status, refresh} = useAuth();
    const location = useLocation();

    if (status === 'loading') return <PageSkeleton />;
    if (status === 'unknown') return <ErrorState message="אין חיבור לשרת. בדקו את החיבור ונסו שוב" onRetry={refresh} />;
    if (!user) {
        const next = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?next=${next}`} replace />;
    }
    if (admin && !user.is_admin) return <Navigate to="/" replace />;
    return <Outlet />;
}
