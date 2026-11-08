import {Building2, Camera, Cctv, Eye, MapPin, Store, Video, Webcam} from 'lucide-react';

// How a pin looks on the map: one icon on one color. Each unit decides what they mean.
// The keys are the server's lists (server/schemas/Pins_S.js); a key the app doesn't know shows the plain red dot.

export const MARKER_ICONS = [
    {key: 'cctv', Icon: Cctv, label: 'מצלמת אבטחה'},
    {key: 'video', Icon: Video, label: 'מצלמת וידאו'},
    {key: 'webcam', Icon: Webcam, label: 'מצלמת רשת'},
    {key: 'camera', Icon: Camera, label: 'מצלמה'},
    {key: 'eye', Icon: Eye, label: 'תצפית'},
    {key: 'store', Icon: Store, label: 'חנות'},
    {key: 'building', Icon: Building2, label: 'מבנה'},
    {key: 'pin', Icon: MapPin, label: 'נקודה'},
];

// strong colors that stay visible on the map's roads and parks; on yellow a white icon is hard to see, so it gets a dark one
export const MARKER_COLORS = [
    {key: 'red', hex: '#D54845', label: 'אדום', darkIcon: false},
    {key: 'orange', hex: '#E8710A', label: 'כתום', darkIcon: false},
    {key: 'yellow', hex: '#F5C518', label: 'צהוב', darkIcon: true},
    {key: 'green', hex: '#1E8E3E', label: 'ירוק', darkIcon: false},
    {key: 'blue', hex: '#1A73E8', label: 'כחול', darkIcon: false},
    {key: 'purple', hex: '#8E44AD', label: 'סגול', darkIcon: false},
    {key: 'brown', hex: '#704A42', label: 'חום', darkIcon: false},
    {key: 'black', hex: '#050510', label: 'שחור', darkIcon: false},
];

export const DEFAULT_MARKER = {icon: 'cctv', color: 'blue'};

// the icon and color entries for a stored marker, or null when there is none or a key is unknown
export function findMarker(marker) {
    const icon = MARKER_ICONS.find(i => i.key === marker?.icon);
    const color = MARKER_COLORS.find(c => c.key === marker?.color);
    return icon && color ? {icon, color} : null;
}
