import {useState} from 'react';
import {useToast} from '../components/Toast.jsx';

// "my location": asks the phone for its position and hands it to onFound as {lat, lng} (6 decimals, about 10cm).
// Failures (no GPS, permission denied, timeout) are explained in a toast.
export function useMyLocation(onFound) {
    const toast = useToast();
    const [locating, setLocating] = useState(false);

    const locate = () => {
        if (!navigator.geolocation) {
            toast.error('המכשיר לא תומך במיקום');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                setLocating(false);
                onFound({lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6)});
            },
            () => {
                setLocating(false);
                toast.error('לא הצלחנו לקבל מיקום. בדקו שהרשאת המיקום פתוחה');
            },
            {enableHighAccuracy: true, timeout: 15000},
        );
    };

    return {locate, locating};
}
