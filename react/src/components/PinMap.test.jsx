import {describe, expect, it, vi} from 'vitest';
import {render, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {makePin} from '../test/utils.jsx';

// the other page tests use a stand-in map (src/test/setup.jsx); this one renders the real Leaflet map
const {default: PinMap} = await vi.importActual('./PinMap.jsx');

const renderMap = props => render(<MemoryRouter><PinMap {...props} /></MemoryRouter>);

// PinMap doesn't expose its Leaflet map; an init hook records every map Leaflet creates
const {default: L} = await import('leaflet');
const maps = [];
L.Map.addInitHook(function () { maps.push(this); });
const lastMap = () => maps.at(-1);

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

    it('a pin with a marker shows its icon on its color', async () => {
        const {container} = renderMap({pins: [
            makePin({_id: 'a', name: 'צומת', marker: {icon: 'cctv', color: 'blue'}}),
            makePin({_id: 'b', name: 'חנות', location: {lat: 32.61, lng: 35.3}, marker: {icon: 'store', color: 'yellow'}}),
        ]});
        await waitFor(() => expect(container.querySelectorAll('.map-marker')).toHaveLength(2));
        const [cctv, store] = container.querySelectorAll('.map-marker');
        expect(cctv).toHaveAttribute('data-icon', 'cctv');
        expect(cctv).toHaveAttribute('data-color', 'blue');
        expect(cctv.style.getPropertyValue('--c')).toBe('#1A73E8');
        expect(cctv.querySelector('svg.lucide-cctv')).not.toBeNull();
        // yellow gets the dark icon
        expect(store).toHaveClass('map-marker-dark');
        expect(store.querySelector('svg.lucide-store')).not.toBeNull();
        // the names still show, one per pin
        expect([...container.querySelectorAll('.map-label')].map(l => l.textContent)).toEqual(['צומת', 'חנות']);
    });

    it('a pin without a marker, or with one the app does not know, stays the plain red dot', async () => {
        const {container} = renderMap({pins: [
            makePin({_id: 'a', name: 'ישן'}),
            makePin({_id: 'b', name: 'מוזר', location: {lat: 32.61, lng: 35.3}, marker: {icon: 'tank', color: 'blue'}}),
        ]});
        await waitFor(() => expect(container.querySelectorAll('.map-pin')).toHaveLength(2));
        expect(container.querySelector('.map-marker')).toBeNull();
        expect(container.querySelectorAll('.map-label')).toHaveLength(2);
    });

    it('the mouse wheel zooms only when asked (wheelZoom), so small maps in a page do not trap scrolling', async () => {
        const {container, unmount} = renderMap({pins: [makePin({_id: 'a'})], wheelZoom: true});
        await waitFor(() => expect(container.querySelector('.map-pin')).not.toBeNull());
        expect(lastMap().scrollWheelZoom.enabled()).toBe(true);
        unmount();

        const second = renderMap({pins: [makePin({_id: 'a'})]});
        await waitFor(() => expect(second.container.querySelector('.map-pin')).not.toBeNull());
        expect(lastMap().scrollWheelZoom.enabled()).toBe(false);
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
