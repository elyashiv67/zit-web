import {useDelayedFlag} from '../hooks/useAsync.js';
import {ListSkeleton, Skeleton} from './Skeleton.jsx';

// whole-page placeholder; renders nothing for the first 300ms so fast loads don't flash
export default function PageSkeleton({thumb = false}) {
    const show = useDelayedFlag(true);
    if (!show) return null;
    return (
        <div className="page" data-testid="page-skeleton">
            <Skeleton width="40%" height={26} style={{marginBottom: 16}} />
            <ListSkeleton rows={4} thumb={thumb} />
        </div>
    );
}
