import {createBrowserRouter} from 'react-router';
import AppLayout from './layout/AppLayout.jsx';
import {RequireAuth} from './auth/RequireAuth.jsx';
import TimeDiffPage from './pages/TimeDiffPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import PinsPage from './pages/PinsPage.jsx';
import PinDetailPage from './pages/PinDetailPage.jsx';
import {EditPinPage, NewPinPage} from './pages/PinFormPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// "/" (the time diff calculator) and /login are open to everyone; everything else needs a login
export const routes = [{
    element: <AppLayout />,
    children: [
        {path: '/', element: <TimeDiffPage />},
        {path: '/login', element: <LoginPage />},
        {
            element: <RequireAuth />,
            children: [
                {path: '/pins', element: <PinsPage />},
                {path: '/pins/new', element: <NewPinPage />},
                {path: '/pins/:id', element: <PinDetailPage />},
                {path: '/pins/:id/edit', element: <EditPinPage />},
                {path: '/history', element: <HistoryPage />},
                {path: '/profile', element: <ProfilePage />},
            ],
        },
        {
            element: <RequireAuth admin />,
            children: [{path: '/admin', element: <AdminPage />}],
        },
        {path: '*', element: <NotFoundPage />},
    ],
}];

export const router = createBrowserRouter(routes, {basename: '/zit-web/'});
