import {RouterProvider} from 'react-router';
import {AuthProvider} from './auth/AuthContext.jsx';
import {ToastProvider} from './components/Toast.jsx';
import {router} from './router.jsx';

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <RouterProvider router={router} />
            </ToastProvider>
        </AuthProvider>
    );
}
