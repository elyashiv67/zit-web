import {describe, expect, it, vi} from 'vitest';
import {render, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {makePin} from '../test/utils.jsx';

// the other page tests use a stand-in map (src/test/setup.jsx); this one renders the real Leaflet map
const {default: PinMap} = await vi.importActual('./PinMap.jsx');

const renderMap = props => render(<MemoryRouter><PinMap {...props} /></MemoryRouter>);

describe('PinMap (real Leaflet)', () => {
    it('every pin shows its name under the dot, without a tap', async () => {
        const {container} = renderMap({pins: [
            makePin({_id: 'a', name: 'שער ראשי', location: {lat: 32.6, lng: 35.29}}),
            makePin({_id: 'b', name: 'חניון', location: {lat: 32.61, lng: 35.3}}),
        ]});
        await waitFor(() => expect(container.querySelectorAll('.map-label')).toHaveLength(2));
        const labels = [...container.querySelectorAll('.map-label')];
        expect(labels.map(l => l.textContent)).toEqual(['שער ראשי', 'חניון']);
        // below the dot, and not a tap target (Leaflet marks interactive tooltips with this class)
        expect(labels.every(l => l.classList.contains('leaflet-tooltip-bottom'))).toBe(true);
        expect(labels.some(l => l.classList.contains('leaflet-interactive'))).toBe(false);
        // the dots are still there, one per pin
        expect(container.querySelectorAll('.map-pin')).toHaveLength(2);
    });

    it('picking a location in the form shows only the picked dot, no labels', async () => {
        const {container} = renderMap({picked: {lat: 32.6, lng: 35.29}, onPick: () => {}});
        await waitFor(() => expect(container.querySelectorAll('.map-pin-picked')).toHaveLength(1));
        expect(container.querySelector('.map-label')).toBeNull();
    });

    it('zoomed out to a whole region, the names hide and only the dots stay', async () => {
        // jsdom has no layout (every box is 0x0), so give the map a phone-sized box for fitBounds to work with
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(380);
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(420);
        // two pins ~400km apart: fitting both needs a far zoom
        const {container} = renderMap({pins: [
            makePin({_id: 'a', name: 'צפון', location: {lat: 33.2, lng: 35.5}}),
            makePin({_id: 'b', name: 'דרום', location: {lat: 29.55, lng: 34.95}}),
        ]});
        await waitFor(() => expect(container.querySelector('.pin-map')).toHaveClass('pin-map-far'));
        expect(container.querySelectorAll('.map-pin')).toHaveLength(2);
    });
});
