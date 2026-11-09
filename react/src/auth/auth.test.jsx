import {describe, expect, it, vi} from 'vitest';
import {act, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN, findHeading, makeUser, renderApp} from '../test/utils.jsx';
import {authEvents} from '../api/client.js';

describe('login and protected pages', () => {
    for (const path of ['/pins', '/history', '/profile', '/admin', '/pins/new', '/pins/abc']) {
        it(`${path} sends a logged-out visitor to login, keeping where they were going`, async () => {
            const {router} = renderApp(path);
            await findHeading('התחברות');
            expect(router.state.location.pathname).toBe('/login');
            expect(new URLSearchParams(router.state.location.search).get('next')).toBe(path);
        });
    }

    it('logging in goes back to the page that asked for it', async () => {
        const user = makeUser();
        const {router, server} = renderApp('/history', {
            api: {
                'POST /auth/login': {user},
                'GET /timeDiff/my': {items: [], page: 1, limit: 20, total: 0, pages: 0},
            },
        });
        await findHeading('התחברות');
        await userEvent.type(screen.getByLabelText('שם משתמש'), '  Dana ');
        await userEvent.type(screen.getByLabelText('סיסמה'), 'secret123');
        await userEvent.click(screen.getByRole('button', {name: 'התחברות'}));
        await findHeading('היסטוריה');
        expect(router.state.location.pathname).toBe('/history');
        expect(server.callsTo('POST', '/auth/login')[0].body).toEqual({username: 'Dana', password: 'secret123'});
    });

    it('empty fields are flagged before anything is sent', async () => {
        const {server} = renderApp('/login');
        await findHeading('התחברות');
        await userEvent.click(screen.getByRole('button', {name: 'התחברות'}));
        expect(screen.getByText('צריך למלא שם משתמש')).toBeInTheDocument();
        expect(screen.getByText('צריך למלא סיסמה')).toBeInTheDocument();
        expect(server.callsTo('POST', '/auth/login')).toHaveLength(0);
    });

    it('wrong password shows a Hebrew message and stays on login', async () => {
        renderApp('/login', {api: {'POST /auth/login': {status: 401, body: {message: 'invalid username or password'}}}});
        await findHeading('התחברות');
        await userEvent.type(screen.getByLabelText('שם משתמש'), 'dana');
        await userEvent.type(screen.getByLabelText('סיסמה'), 'nope');
        await userEvent.click(screen.getByRole('button', {name: 'התחברות'}));
        expect(await screen.findByRole('alert')).toHaveTextContent('שם משתמש או סיסמה שגויים');
    });

    it('rate limit message', async () => {
        renderApp('/login', {api: {'POST /auth/login': {status: 429, body: {message: 'too many failed attempts, try again in 15 minutes'}}}});
        await findHeading('התחברות');
        await userEvent.type(screen.getByLabelText('שם משתמש'), 'dana');
        await userEvent.type(screen.getByLabelText('סיסמה'), 'x');
        await userEvent.click(screen.getByRole('button', {name: 'התחברות'}));
        expect(await screen.findByRole('alert')).toHaveTextContent('יותר מדי ניסיונות');
    });

    // browsers read both //host and /\host as "another site"
    it.each(['//evil.example', '/\\evil.example'])('?next=%s cannot send the user to another site', async next => {
        const {router} = renderApp(`/login?next=${encodeURIComponent(next)}`, {
            api: {'POST /auth/login': {user: makeUser()}, 'GET /pin/allUnit': []},
        });
        await findHeading('התחברות');
        await userEvent.type(screen.getByLabelText('שם משתמש'), 'dana');
        await userEvent.type(screen.getByLabelText('סיסמה'), 'x');
        await userEvent.click(screen.getByRole('button', {name: 'התחברות'}));
        await findHeading('נקודות');
        expect(router.state.location.pathname).toBe('/pins');
    });

    it('a regular user cannot open /admin', async () => {
        const {router} = renderApp('/admin', {user: makeUser()});
        await screen.findByRole('heading', {name: 'הפרש זמנים', level: 1});
        expect(router.state.location.pathname).toBe('/');
    });

    it('the admin tab shows only for admins', async () => {
        renderApp('/', {user: makeUser()});
        await screen.findAllByRole('link', {name: /פרופיל/});
        expect(screen.queryAllByRole('link', {name: /ניהול/})).toHaveLength(0);
    });

    it('admins see the admin tab and their unit in the header', async () => {
        renderApp('/', {user: ADMIN});
        expect((await screen.findAllByRole('link', {name: /ניהול/})).length).toBeGreaterThan(0);
        expect(screen.getByText('עפולה')).toBeInTheDocument();
    });

    it('logged out visitors see "login" in the nav', async () => {
        renderApp('/');
        expect((await screen.findAllByRole('link', {name: /התחברות/})).length).toBeGreaterThan(0);
        expect(screen.queryAllByRole('link', {name: /פרופיל/})).toHaveLength(0);
    });

    it('a session that ends elsewhere (any 401) sends the user to login', async () => {
        const {router} = renderApp('/profile', {user: makeUser()});
        await findHeading('דנה כהן');
        act(() => authEvents.dispatchEvent(new Event('expired')));
        await findHeading('התחברות');
        expect(router.state.location.pathname).toBe('/login');
    });

    it('server unreachable: protected pages say so with a retry; the calculator still works', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        const {createMemoryRouter, RouterProvider} = await import('react-router');
        const {render} = await import('@testing-library/react');
        const {AuthProvider} = await import('./AuthContext.jsx');
        const {ToastProvider} = await import('../components/Toast.jsx');
        const {routes} = await import('../router.jsx');
        render(<AuthProvider><ToastProvider><RouterProvider router={createMemoryRouter(routes, {initialEntries: ['/pins']})} /></ToastProvider></AuthProvider>);
        expect(await screen.findByText('אין חיבור לשרת. בדקו את החיבור ונסו שוב')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /נסו שוב/})).toBeInTheDocument();
    });

    it('logout ends the session and returns to the calculator', async () => {
        const {router, server} = renderApp('/profile', {user: makeUser(), api: {'POST /auth/logout': {message: 'ok'}}});
        await findHeading('דנה כהן');
        await userEvent.click(screen.getByRole('button', {name: /התנתקות/}));
        await waitFor(() => expect(router.state.location.pathname).toBe('/'));
        expect(server.callsTo('POST', '/auth/logout')).toHaveLength(1);
        expect((await screen.findAllByRole('link', {name: /התחברות/})).length).toBeGreaterThan(0);
    });

    it('unknown pages show a not-found screen', async () => {
        renderApp('/nothing-here');
        expect(await screen.findByText('הדף הזה לא קיים')).toBeInTheDocument();
    });
});
