import {NavLink, Outlet, Link} from 'react-router';
import {Clock, History, LogIn, MapPin, Shield, UserRound} from 'lucide-react';
import {useAuth} from '../auth/AuthContext.jsx';
import Logo from '../assets/logo-2/default.svg?react';
import './AppLayout.css';

function navItems(user) {
    const items = [
        {to: '/', label: 'הפרש זמנים', icon: Clock, end: true},
        {to: '/pins', label: 'נקודות', icon: MapPin},
        {to: '/history', label: 'היסטוריה', icon: History},
    ];
    if (user?.is_admin) items.push({to: '/admin', label: 'ניהול', icon: Shield});
    items.push(user
        ? {to: '/profile', label: 'פרופיל', icon: UserRound}
        : {to: '/login', label: 'התחברות', icon: LogIn});
    return items;
}

// one list of links: a bottom tab bar on phones, the header menu on wide screens
function Nav({items, className}) {
    return (
        <nav className={className} aria-label="ניווט ראשי">
            {items.map(({to, label, icon: Icon, end}) => (
                <NavLink key={to} to={to} end={end} className="nav-link">
                    <Icon size={22} aria-hidden="true" />
                    <span>{label}</span>
                </NavLink>
            ))}
        </nav>
    );
}

export default function AppLayout() {
    const {user} = useAuth();
    const items = navItems(user);

    return (
        <div className="app">
            <a href="#main" className="skip-link">דילוג לתוכן</a>
            <header className="app-header">
                <Link to="/" className="brand" aria-label="ZitWeb, הפרש זמנים">
                    <Logo className="brand-logo" aria-hidden="true" />
                    <span className="brand-text">
                        <span className="brand-name">ZitWeb</span>
                        {user?.unit?.station && <span className="brand-unit">{user.unit.station}</span>}
                    </span>
                </Link>
                <Nav items={items} className="nav-top" />
            </header>
            <main id="main" className="app-main">
                <Outlet />
            </main>
            <Nav items={items} className="nav-bottom" />
        </div>
    );
}
