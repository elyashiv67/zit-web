import {useState} from 'react';
import {Navigate, useNavigate, useSearchParams} from 'react-router';
import {CircleAlert, LoaderCircle, LogIn} from 'lucide-react';
import {useAuth} from '../auth/AuthContext.jsx';
import {Field, PasswordField} from '../components/Field.jsx';

// only same-site paths, so ?next= can't send the user to another website
function safeNext(next) {
    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/pins';
}

export default function LoginPage() {
    const {user, login} = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = safeNext(params.get('next'));

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to={next} replace />;

    const submit = async e => {
        e.preventDefault();
        const found = {};
        if (!username.trim()) found.username = 'צריך למלא שם משתמש';
        if (!password) found.password = 'צריך למלא סיסמה';
        setErrors(found);
        setFormError('');
        if (Object.keys(found).length) return;

        setBusy(true);
        try {
            await login(username.trim(), password);
            navigate(next, {replace: true});
        } catch (err) {
            setFormError(err.message);
            setBusy(false);
        }
    };

    return (
        <div className="page">
            <section className="section" aria-labelledby="login-title">
                <h1 id="login-title" className="section-title" style={{fontSize: 24, fontWeight: 800}}>התחברות</h1>
                <p className="section-text">הפרש הזמנים פתוח לכולם. נקודות, היסטוריה וניהול דורשים התחברות.</p>
                <form className="form" onSubmit={submit} noValidate>
                    {formError && (
                        <div className="form-error" role="alert">
                            <CircleAlert size={20} aria-hidden="true" /> {formError}
                        </div>
                    )}
                    <Field label="שם משתמש" value={username} onChange={e => setUsername(e.target.value)}
                        error={errors.username} autoComplete="username" autoCapitalize="none" dir="ltr" />
                    <PasswordField label="סיסמה" value={password} onChange={e => setPassword(e.target.value)}
                        error={errors.password} autoComplete="current-password" />
                    <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                        {busy ? <LoaderCircle size={20} className="spin" aria-hidden="true" /> : <LogIn size={20} aria-hidden="true" />}
                        התחברות
                    </button>
                </form>
            </section>
        </div>
    );
}
