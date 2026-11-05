import {DEFAULT_MARKER, findMarker, MARKER_COLORS, MARKER_ICONS} from '../lib/markers.js';
import './MarkerPicker.css';

// the marker as it looks on the map: the color fills the circle, the icon sits on top
export function MarkerBadge({marker, size = 32}) {
    const found = findMarker(marker) ?? findMarker(DEFAULT_MARKER);
    const {Icon} = found.icon;
    return (
        <span className={`marker-badge ${found.color.darkIcon ? 'marker-badge-dark' : ''}`}
            style={{'--c': found.color.hex, width: size, height: size}} aria-hidden="true">
            <Icon size={Math.round(size * 0.53)} strokeWidth={2.25} />
        </span>
    );
}

// value: {icon, color} (keys from lib/markers.js), or null for a pin that has no marker yet: then nothing
// is shown as chosen, and the first pick fills the other half from the default. onChange gets {icon, color}
export default function MarkerPicker({value, onChange}) {
    const chosen = findMarker(value);
    const fallback = findMarker(DEFAULT_MARKER);
    const current = chosen ?? fallback;
    return (
        <div className="marker-picker">
            <span className="field-label" id="marker-icon-label">סמל</span>
            <div className="marker-options" role="group" aria-labelledby="marker-icon-label">
                {MARKER_ICONS.map(({key, Icon, label}) => (
                    <button key={key} type="button" className="marker-icon-opt" aria-label={label}
                        aria-pressed={key === chosen?.icon.key} onClick={() => onChange({icon: key, color: current.color.key})}>
                        <Icon size={22} aria-hidden="true" />
                    </button>
                ))}
            </div>

            <span className="field-label" id="marker-color-label">צבע</span>
            <div className="marker-options" role="group" aria-labelledby="marker-color-label">
                {MARKER_COLORS.map(({key, hex, label, darkIcon}) => (
                    <button key={key} type="button" className={`marker-color-opt ${darkIcon ? 'marker-color-light' : ''}`}
                        style={{'--c': hex}} aria-label={label} aria-pressed={key === chosen?.color.key}
                        onClick={() => onChange({icon: current.icon.key, color: key})} />
                ))}
            </div>

            <div className="marker-preview">
                {chosen
                    ? <MarkerBadge marker={value} size={48} />
                    : <span className="marker-preview-dot" aria-hidden="true" />}
                <span className="marker-preview-text">
                    <span className="field-label">כך זה ייראה במפה</span>
                    <strong data-testid="marker-preview-text">
                        {chosen ? `${chosen.icon.label}, ${chosen.color.label}` : 'נקודה אדומה רגילה. בחרו סמל וצבע'}
                    </strong>
                </span>
            </div>
        </div>
    );
}
