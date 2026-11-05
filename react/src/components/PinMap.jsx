import {MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents} from 'react-leaflet';
import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './PinMap.css';

// Afula — where the map opens when there's nothing to show yet
const DEFAULT_CENTER = [32.6074, 35.2892];

// a CSS dot instead of Leaflet's default PNG marker (whose image paths break in Vite builds)
const pinIcon = L.divIcon({className: 'map-pin', iconSize: [22, 22], iconAnchor: [11, 11]});
const pickedIcon = L.divIcon({className: 'map-pin map-pin-picked', iconSize: [28, 28], iconAnchor: [14, 14]});

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

// pins: [{_id, name, location}]  — or `picked` + `onPick` to choose a location in the pin form
export default function PinMap({pins = [], picked, onPick, height = 220}) {
    const points = picked ? [[picked.lat, picked.lng]] : pins.map(p => [p.location.lat, p.location.lng]);
    const [zoom, setZoom] = useState(13);

    return (
        <div className={`pin-map ${zoom < LABELS_MIN_ZOOM ? 'pin-map-far' : ''}`} style={{height}}>
            <MapContainer center={points[0] ?? DEFAULT_CENTER} zoom={13} scrollWheelZoom={false} style={{height: '100%'}}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <TrackZoom onZoom={setZoom} />
                <FitToPins points={points} />
                {onPick && <ClickToPick onPick={onPick} />}
                {picked && <Marker position={[picked.lat, picked.lng]} icon={pickedIcon} />}
                {!picked && pins.map(pin => (
                    <Marker key={pin._id} position={[pin.location.lat, pin.location.lng]} icon={pinIcon}>
                        {/* the name always shows under the dot; it ignores taps, so tapping the dot still opens the popup */}
                        {/* offset = the dot's radius (22px icon anchored at its center), so the name starts at its bottom edge */}
                        <Tooltip permanent direction="bottom" offset={[0, 11]} className="map-label">{pin.name}</Tooltip>
                        <Popup>
                            <Link to={`/pins/${pin._id}`} className="map-popup-link">{pin.name}</Link>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
