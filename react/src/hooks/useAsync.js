import {useCallback, useEffect, useRef, useState} from 'react';

// Loads data for a page: const {data, error, loading, reload, setData} = useAsync(signal => api('/x', {signal}), [deps])
// A newer load cancels the older one, so a slow old answer never overwrites a newer one.
export function useAsync(load, deps) {
    const [state, setState] = useState({data: undefined, error: null, loading: true});
    const controllerRef = useRef(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const run = useCallback(load, deps);

    const reload = useCallback(async () => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setState(s => ({...s, loading: true, error: null}));
        try {
            const data = await run(controller.signal);
            if (!controller.signal.aborted) setState({data, error: null, loading: false});
        } catch (error) {
            if (!controller.signal.aborted && error.name !== 'AbortError') setState(s => ({...s, error, loading: false}));
        }
    }, [run]);

    useEffect(() => {
        reload();
        return () => controllerRef.current?.abort();
    }, [reload]);

    const setData = useCallback(update => {
        setState(s => ({...s, data: typeof update === 'function' ? update(s.data) : update}));
    }, []);

    return {...state, reload, setData};
}

// true only once `active` has stayed true for `delay` ms — skeletons don't flash on fast loads
export function useDelayedFlag(active, delay = 300) {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        if (!active) return undefined;
        const t = setTimeout(() => setShown(true), delay);
        return () => {
            clearTimeout(t);
            setShown(false);
        };
    }, [active, delay]);
    return active && shown;
}
