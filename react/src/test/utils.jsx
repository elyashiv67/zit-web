import {render, screen} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {vi} from 'vitest';
import {AuthProvider} from '../auth/AuthContext.jsx';
import {ToastProvider} from '../components/Toast.jsx';
import {routes} from '../router.jsx';

export const UNIT = {_id: 'unit1', district: 'צפון', merhav: 'עמקים', station: 'עפולה'};
export const ROLES = [{_id: 'roleAdmin', name: 'admin', level: 1}, {_id: 'roleUser', name: 'user', level: 2}];
export const TITLES = [{_id: 'jt1', name: 'חוקר זיט'}, {_id: 'jt2', name: 'ראש צוות'}];

export function makeUser(overrides = {}) {
    return {
        id: 'u1', name: 'דנה כהן', user_name: 'dana', TZ: '123', police_id: '555', phone: '0501234567',
        email: 'dana@test.local', role: ROLES[1], unit: UNIT, job_title: TITLES[0], is_admin: false, ...overrides,
    };
}
export const ADMIN = makeUser({id: 'admin1', name: 'אבי לוי', user_name: 'avi', role: ROLES[0], is_admin: true});

export function makePin(overrides = {}) {
    return {
        _id: 'pin1', name: 'שער ראשי', location: {lat: 32.6, lng: 35.29}, image: [], dvr: {user_name: 'dvradmin'},
        creator: 'u1', creator_name: 'דנה כהן', assigned_unit: 'unit1', createdAt: '2026-11-01T10:00:00Z', ...overrides,
    };
}

/**
 * A fake API. handlers: {'GET /auth/me': {status, body} | (req) => ({status, body}) | body}
 * Every call is recorded in server.calls as {method, path, body}. Unknown routes answer 404.
 */
export function mockServer(handlers = {}) {
    const server = {calls: [], handlers: {...handlers}};
    server.on = (key, handler) => { server.handlers[key] = handler; };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init = {}) => {
        const method = init.method ?? 'GET';
        const full = String(url).replace(/^\/api/, '');
        const [path, query = ''] = full.split('?');
        let body = init.body;
        if (typeof body === 'string') body = JSON.parse(body);
        const req = {method, path, query: Object.fromEntries(new URLSearchParams(query)), body, init};
        server.calls.push(req);

        const handler = server.handlers[`${method} ${path}`];
        let res = typeof handler === 'function' ? await handler(req) : handler;
        if (res === undefined) res = {status: 404, body: {message: 'route not found'}};
        if (!('status' in res && 'body' in res)) res = {status: 200, body: res};
        return new Response(JSON.stringify(res.body), {status: res.status, headers: {'Content-Type': 'application/json'}});
    });
    server.callsTo = (method, path) => server.calls.filter(c => c.method === method && c.path === path);
    return server;
}

// logged in as `user` (null = logged out). Pass more API handlers in `api`
export function renderApp(path, {user = null, api = {}} = {}) {
    const server = mockServer({
        'GET /auth/me': user ? {user} : {status: 401, body: {message: 'need to login'}},
        ...api,
    });
    const router = createMemoryRouter(routes, {initialEntries: [path]});
    const utils = render(
        <AuthProvider>
            <ToastProvider>
                <RouterProvider router={router} />
            </ToastProvider>
        </AuthProvider>,
    );
    return {...utils, server, router};
}

export const findHeading = name => screen.findByRole('heading', {name, level: 1});
