import {Link} from 'react-router';
import {Compass} from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';

export default function NotFoundPage() {
    return (
        <div className="page">
            <EmptyState icon={Compass} title="הדף הזה לא קיים"
                action={<Link to="/" className="btn btn-primary">חזרה להפרש זמנים</Link>} />
        </div>
    );
}
