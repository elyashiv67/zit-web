import {lazy, Suspense} from 'react';
import {Skeleton} from './Skeleton.jsx';

// Leaflet is the heaviest part of the app, so it loads only on pages that show a map
const PinMap = lazy(() => import('./PinMap.jsx'));

export default function LazyPinMap(props) {
    const height = props.height ?? 220;
    return (
        <Suspense fallback={<Skeleton height={height} radius={16} />}>
            <PinMap {...props} />
        </Suspense>
    );
}
