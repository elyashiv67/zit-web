import {MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents} from 'react-leaflet';
import {createElement, useEffect, useState} from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {Link} from 'react-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {findMarker, MARKER_ICONS} from '../lib/markers.js';
import './PinMap.css';

// Afula — where the map opens when there's nothing to show yet
const DEFAULT_CENTER = [32.6074, 35.2892];

// a CSS dot instead of Leaflet's default PNG marker (whose image paths break in Vite builds).
// Pins without a chosen marker (or with one this app doesn't know) keep it
const pinIcon = L.divIcon({className: 'map-pin', iconSize: [22, 22], iconAnchor: [11, 11]});
const pickedIcon = L.divIcon({className: 'map-pin map-pin-picked', iconSize: [28, 28], iconAnchor: [14, 14]});

// Leaflet wants the icon as an HTML string. Rendering the lucide icon into a detached element with the
// React the app already loads keeps react-dom/server (~60KB gzipped) out of the bundle.
// Done once for all icons when this (lazy) module loads: React can't flush a render from inside another render
function iconSvg(Icon) {
    const box = document.createElement('div');
    const root = createRoot(box);
    flushSync(() => root.render(createElement(Icon, {size: 17, strokeWidth: 2.25, 'aria-hidden': true})));
    const svg = box.innerHTML;
    root.unmount();
    return svg;
}
const ICON_SVGS = Object.fromEntries(MARKER_ICONS.map(({key, Icon}) => [key, iconSvg(Icon)]));

// a chosen marker: the icon on its color, 32px, anchored at its center like the dot
const MARKER_SIZE = 32;
const markerIcons = new Map();
function markerIcon(marker) {
    const found = findMarker(marker);
    if (!found) return pinIcon;
    const key = `${found.icon.key}-${found.color.key}`;
    if (!markerIcons.has(key)) {
        const svg = ICON_SVGS[found.icon.key];
        markerIcons.set(key, L.divIcon({
            className: 'map-marker-wrap',
            html: `<div class="map-marker${found.color.darkIcon ? ' map-marker-dark' : ''}" data-icon="${found.icon.key}"`
                + ` data-color="${found.color.key}" style="--c:${found.color.hex}">${svg}</div>`,
            iconSize: [MARKER_SIZE, MARKER_SIZE],
            iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
        }));
    }
    return markerIcons.get(key);
}

// the name starts right at the bottom edge of whichever icon the pin has (both are anchored at their center)
const labelOffset = pin => [0, findMarker(pin.marker) ? MARKER_SIZE / 2 : 11];

function FitToPins({points}) {
    const map = useMap();
    const key = points.map(p => p.join(',')).join('|');
    useEffect(() => {
        if (points.length === 1) map.setView(points[0], 15);
        else if (points.length > 1) map.fitBounds(points, {padding: [30, 30]});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, key]);
    return null;
}

// below this zoom (a whole region) the names would pile on top of each other, so only the dots show
const LABELS_MIN_ZOOM = 10;

// rendered before FitToPins, and also reads the zoom on mount, so the first fit is never missed
function TrackZoom({onZoom}) {
    const map = useMapEvents({zoomend: () => onZoom(map.getZoom())});
    useEffect(() => onZoom(map.getZoom()), [map, onZoom]);
    return null;
}

function ClickToPick({onPick}) {
    useMapEvents({click: e => onPick({lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6)})});
    return null;
}

// pins: [{_id, name, location}]  — or `picked` + `onPick` to choose a location in the pin form.
// wheelZoom: the mouse wheel zooms the map. Off by default, so a small map inside a page doesn't catch the page scroll
export default function PinMap({pins = [], picked, onPick, height = 220, wheelZoom = false}) {
    const points = picked ? [[picked.lat, picked.lng]] : pins.map(p => [p.location.lat, p.location.lng]);
    const [zoom, setZoom] = useState(13);

    return (
        <div className={`pin-map ${zoom < LABELS_MIN_ZOOM ? 'pin-map-far' : ''}`} style={{height}}>
            <MapContainer center={points[0] ?? DEFAULT_CENTER} zoom={13} scrollWheelZoom={wheelZoom} style={{height: '100%'}}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <TrackZoom onZoom={setZoom} />
                <FitToPins points={points} />
                {onPick && <ClickToPick onPick={onPick} />}
                {picked && <Marker position={[picked.lat, picked.lng]} icon={pickedIcon} />}
                {!picked && pins.map(pin => (
                    <Marker key={pin._id} position={[pin.location.lat, pin.location.lng]} icon={markerIcon(pin.marker)}>
                        {/* the name always shows under the icon; it ignores taps, so tapping the icon still opens the popup */}
                        <Tooltip permanent direction="bottom" offset={labelOffset(pin)} className="map-label">{pin.name}</Tooltip>
                        <Popup>
                            <Link to={`/pins/${pin._id}`} className="map-popup-link">{pin.name}</Link>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
