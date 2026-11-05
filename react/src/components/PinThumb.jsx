import {ImageOff} from 'lucide-react';
import {apiUrl} from '../api/client.js';

// first photo of the pin, or an icon when it has none
export default function PinThumb({pin, size = 56}) {
    const first = pin.image?.[0];
    return (
        <div className="pin-thumb" style={{width: size, height: size}}>
            {first
                ? <img src={apiUrl(`/pin/${pin._id}/images/${first}`)} alt="" loading="lazy" />
                : <span role="img" aria-label="אין תמונות"><ImageOff size={Math.round(size * 0.42)} aria-hidden="true" /></span>}
        </div>
    );
}
