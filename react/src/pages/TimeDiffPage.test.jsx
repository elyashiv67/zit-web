import {describe, expect, it, vi} from 'vitest';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {makeUser, renderApp} from '../test/utils.jsx';

const setInput = (label, value) => fireEvent.change(screen.getByLabelText(label), {target: {value}});
// inputs normalize their value (10:00 vs 10:00:00.000), so compare the time it means
const expectTime = (label, local) => expect(new Date(screen.getByLabelText(label).value)).toEqual(new Date(local));

describe('time diff page (public)', () => {
    it('opens on / without login and needs no API call except the session check', async () => {
        const {server} = renderApp('/');
        expect(await screen.findByRole('heading', {name: 'הפרש זמנים', level: 1})).toBeInTheDocument();
        expect(screen.getByText('הזינו את זמן ה-DVR ואת זמן האמת')).toBeInTheDocument();
        await waitFor(() => expect(server.calls.map(c => c.path)).toEqual(['/auth/me']));
    });

    it('shows how far ahead the DVR is', async () => {
        renderApp('/');
        setInput('זמן DVR', '2026-11-04T10:03:25');
        setInput('זמן אמת', '2026-11-04T10:00:00');
        expect(screen.getByText('ה-DVR מקדים ב-')).toBeInTheDocument();
        expect(screen.getByTestId('offset')).toHaveTextContent('00:03:25');
    });

    it('shows days when the DVR is behind by more than a day', async () => {
        renderApp('/');
        setInput('זמן DVR', '2026-11-01T08:00:00');
        setInput('זמן אמת', '2026-11-04T10:00:00');
        expect(screen.getByText('ה-DVR מאחר ב-')).toBeInTheDocument();
        expect(screen.getByTestId('offset')).toHaveTextContent('02:00:00');
        expect(screen.getByText('ועוד 3 ימים')).toBeInTheDocument();
    });

    it('"current time" fills the real time with now', async () => {
        vi.useFakeTimers({toFake: ['Date']});
        vi.setSystemTime(new Date('2026-11-04T12:00:00'));
        renderApp('/');
        fireEvent.click(screen.getByRole('button', {name: /הכנסת השעה הנוכחית/}));
        expectTime('זמן אמת', '2026-11-04T12:00:00');
        vi.useRealTimers();
    });

    it('event calculator: typing the real event time fills the DVR time, and the other way', async () => {
        renderApp('/');
        setInput('זמן DVR', '2026-11-04T10:03:25');
        setInput('זמן אמת', '2026-11-04T10:00:00');
        setInput('זמן האירוע במציאות', '2026-11-03T22:15:00');
        expectTime('זמן האירוע ב-DVR', '2026-11-03T22:18:25');
        expect(screen.getByTestId('event-dvr')).toHaveTextContent('03/11/2026 22:18:25');

        setInput('זמן האירוע ב-DVR', '2026-11-04T01:03:25');
        expectTime('זמן האירוע במציאות', '2026-11-04T01:00:00');
    });

    it('days since the last DVR save', async () => {
        vi.useFakeTimers({toFake: ['Date']});
        vi.setSystemTime(new Date('2026-11-04T12:00:00'));
        renderApp('/');
        setInput('תאריך השמירה האחרונה', '2026-10-30');
        expect(screen.getByText('לפני 5 ימים')).toBeInTheDocument();
        setInput('תאריך השמירה האחרונה', '2026-11-04');
        expect(screen.getByText('נשמר היום')).toBeInTheDocument();
        vi.useRealTimers();
    });

    it('logged out: offers to log in instead of saving', async () => {
        renderApp('/');
        const link = await screen.findByRole('link', {name: /התחברו כדי לשמור/});
        expect(link).toHaveAttribute('href', '/login?next=%2F');
    });

    it('values survive a trip to the login page (sessionStorage)', async () => {
        const first = renderApp('/');
        setInput('זמן DVR', '2026-11-04T10:03:25');
        first.unmount();
        renderApp('/');
        expectTime('זמן DVR', '2026-11-04T10:03:25');
    });

    it('logged in: saves name/real/DVR/last-save to history', async () => {
        const {server} = renderApp('/', {user: makeUser(), api: {'POST /timeDiff': {status: 201, body: {timeDiff: {}}}}});
        const save = await screen.findByRole('button', {name: /שמירה להיסטוריה/});
        expect(save).toBeDisabled();
        setInput('שם (מצלמה / מקום)', '  מצלמה כניסה ');
        setInput('זמן DVR', '2026-11-04T10:03:25');
        setInput('זמן אמת', '2026-11-04T10:00:00');
        setInput('תאריך השמירה האחרונה', '2026-10-30');
        await userEvent.click(save);
        expect(await screen.findByText('ההפרש נשמר בהיסטוריה')).toBeInTheDocument();
        expect(server.callsTo('POST', '/timeDiff')[0].body).toEqual({
            name: 'מצלמה כניסה',
            real_time: new Date('2026-11-04T10:00:00').toISOString(),
            dvr_time: new Date('2026-11-04T10:03:25').toISOString(),
            dvr_lastSave: '2026-10-30',
        });
    });

    it('saving without a name is blocked: the name field says why and gets the focus', async () => {
        const {server} = renderApp('/', {user: makeUser(), api: {'POST /timeDiff': {status: 201, body: {timeDiff: {}}}}});
        setInput('זמן DVR', '2026-11-04T10:03:25');
        setInput('זמן אמת', '2026-11-04T10:00:00');
        setInput('שם (מצלמה / מקום)', '   ');
        await userEvent.click(await screen.findByRole('button', {name: /שמירה להיסטוריה/}));
        const nameInput = screen.getByLabelText('שם (מצלמה / מקום)');
        expect(nameInput).toHaveAccessibleDescription('צריך לתת שם לפני השמירה, כדי שכולם יבינו מה נבדק');
        expect(nameInput).toHaveFocus();
        expect(server.callsTo('POST', '/timeDiff')).toHaveLength(0);
        // typing clears the error
        await userEvent.type(nameInput, 'א');
        expect(nameInput).not.toHaveAttribute('aria-invalid');
    });

    it('the name survives a trip to the login page too', async () => {
        const first = renderApp('/');
        setInput('שם (מצלמה / מקום)', 'מצלמה כניסה');
        first.unmount();
        renderApp('/');
        expect(screen.getByLabelText('שם (מצלמה / מקום)')).toHaveValue('מצלמה כניסה');
    });

    it('a failed save shows the reason', async () => {
        renderApp('/', {user: makeUser(), api: {'POST /timeDiff': {status: 503, body: {message: 'database is unavailable, try again in a moment'}}}});
        setInput('שם (מצלמה / מקום)', 'מצלמה כניסה');
        setInput('זמן DVR', '2026-11-04T10:03:25');
        setInput('זמן אמת', '2026-11-04T10:00:00');
        await userEvent.click(await screen.findByRole('button', {name: /שמירה להיסטוריה/}));
        expect(await screen.findByText('השרת לא זמין כרגע. נסו שוב בעוד רגע')).toBeInTheDocument();
    });
});
