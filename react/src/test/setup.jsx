import '@testing-library/jest-dom/vitest';
import {afterEach, vi} from 'vitest';
import {cleanup} from '@testing-library/react';

// Leaflet needs a real browser canvas; pages are tested with a stand-in that shows what it was given
vi.mock('../components/PinMap.jsx', () => ({
    default: ({pins = [], picked, onPick}) => (
        <div data-testid="map" data-pins={pins.length} data-picked={picked ? `${picked.lat},${picked.lng}` : ''}>
            {onPick && <button type="button" onClick={() => onPick({lat: 32.5, lng: 35.1})}>pick on map</button>}
        </div>
    ),
}));

afterEach(() => {
    cleanup();
    globalThis.sessionStorage?.clear();
    vi.restoreAllMocks();
});
