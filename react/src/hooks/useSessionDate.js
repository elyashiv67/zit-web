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
