import {useCallback, useEffect, useState} from 'react';
import {api} from '../api/client.js';

export const PAGE_SIZE = 20;

const EMPTY = {items: [], page: 0, pages: 0, total: 0, loading: true, error: null};

// For the server's paged lists ({items, page, pages, total}): page 1 replaces, "load more" appends.
// Switching to another path shows an empty, loading list right away instead of the old path's items.
export function usePagedList(path) {
    const [state, setState] = useState({...EMPTY, path});

    const load = useCallback(async (page, signal) => {
        setState(s => (s.path === path ? {...s, loading: true, error: null} : {...EMPTY, path}));
        try {
            const res = await api(`${path}?page=${page}&limit=${PAGE_SIZE}`, {signal});
            setState(s => ({
                path,
                items: page === 1 || s.path !== path ? res.items : [...s.items, ...res.items],
                page: res.page, pages: res.pages, total: res.total, loading: false, error: null,
            }));
        } catch (error) {
            if (error.name !== 'AbortError') setState(s => ({...s, path, loading: false, error}));
        }
    }, [path]);

    useEffect(() => {
        const controller = new AbortController();
        load(1, controller.signal);
        return () => controller.abort();
    }, [load]);

    const current = state.path === path ? state : {...EMPTY, path};
    return {
        ...current,
        loadMore: () => load(current.page + 1),
        retry: () => load(current.page || 1),
        removeItem: id => setState(s => ({...s, items: s.items.filter(i => i._id !== id), total: s.total - 1})),
        updateItem: item => setState(s => ({...s, items: s.items.map(i => (i._id === item._id ? item : i))})),
        reload: () => load(1),
    };
}
