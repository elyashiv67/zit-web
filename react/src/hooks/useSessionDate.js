import {useCallback, useState} from 'react';

// a Date kept in sessionStorage, so the calculator keeps its values when the user goes to log in and comes back
export function useSessionDate(key) {
    const [value, setValue] = useState(() => {
        try {
            const raw = sessionStorage.getItem(key);
            const date = raw ? new Date(raw) : null;
            return date && !Number.isNaN(date.getTime()) ? date : null;
        } catch {
            return null;
        }
    });

    const set = useCallback(date => {
        setValue(date);
        try {
            if (date) sessionStorage.setItem(key, date.toISOString());
            else sessionStorage.removeItem(key);
        } catch {
            // private mode / storage blocked: the value still works for this visit
        }
    }, [key]);

    return [value, set];
}

// the same for a plain string (the name of what is being checked)
export function useSessionText(key) {
    const [value, setValue] = useState(() => {
        try {
            return sessionStorage.getItem(key) ?? '';
        } catch {
            return '';
        }
    });

    const set = useCallback(text => {
        setValue(text);
        try {
            if (text) sessionStorage.setItem(key, text);
            else sessionStorage.removeItem(key);
        } catch {
            // private mode / storage blocked: the value still works for this visit
        }
    }, [key]);

    return [value, set];
}

// the same for a map point {lat, lng} (where the DVR is); anything else in storage counts as no point
export function useSessionPoint(key) {
    const [value, setValue] = useState(() => {
        try {
            const point = JSON.parse(sessionStorage.getItem(key));
            return Number.isFinite(point?.lat) && Number.isFinite(point?.lng) ? {lat: point.lat, lng: point.lng} : null;
        } catch {
            return null;
        }
    });

    const set = useCallback(point => {
        setValue(point);
        try {
            if (point) sessionStorage.setItem(key, JSON.stringify({lat: point.lat, lng: point.lng}));
            else sessionStorage.removeItem(key);
        } catch {
            // private mode / storage blocked: the value still works for this visit
        }
    }, [key]);

    return [value, set];
}
