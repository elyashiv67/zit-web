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
        // the page starts fresh for the next check, also after a refresh
        expect(screen.getByLabelText('שם (מצלמה / מקום)')).toHaveValue('');
        expect(screen.getByLabelText('זמן DVR')).toHaveValue('');
        expect(screen.getByLabelText('זמן אמת')).toHaveValue('');
        expect(screen.getByLabelText('תאריך השמירה האחרונה')).toHaveValue('');
        expect(screen.getByText('הזינו את זמן ה-DVR ואת זמן האמת')).toBeInTheDocument();
        expect(sessionStorage.getItem('zit.diffName')).toBeNull();
        expect(sessionStorage.getItem('zit.dvrTime')).toBeNull();
    });

    it('a failed save keeps everything the user typed', async () => {
        renderApp('/', {user: makeUser(), api: {'POST /timeDiff': {status: 503, body: {message: 'down'}}}});
        setInput('שם (מצלמה / מקום)', 'מצלמה כניסה');
        setInput('זמן DVR', '2026-11-04T10:03:25');
        setInput('זמן אמת', '2026-11-04T10:00:00');
        await userEvent.click(await screen.findByRole('button', {name: /שמירה להיסטוריה/}));
        await screen.findByText('השרת לא זמין כרגע. נסו שוב בעוד רגע');
        expect(screen.getByLabelText('שם (מצלמה / מקום)')).toHaveValue('מצלמה כניסה');
        expectTime('זמן DVR', '2026-11-04T10:03:25');
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

describe('time diff location (where the DVR is)', () => {
    const fakeGps = (latitude, longitude) => Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {getCurrentPosition: ok => ok({coords: {latitude, longitude}})},
    });
    const fillDiff = () => {
        setInput('שם (מצלמה / מקום)', 'מצלמה כניסה');
        setInput('זמן DVR', '2026-11-04T10:03:25');
        setInput('זמן אמת', '2026-11-04T10:00:00');
    };
    const saveOk = {'POST /timeDiff': {status: 201, body: {timeDiff: {}}}};

    it('logged out: no location section (only saved diffs have one)', async () => {
        renderApp('/');
        await screen.findByRole('link', {name: /התחברו כדי לשמור/});
        expect(screen.queryByRole('button', {name: /המיקום שלי/})).not.toBeInTheDocument();
    });

    it('no map until it is needed, so the page stays light', async () => {
        renderApp('/', {user: makeUser()});
        await screen.findByRole('button', {name: /המיקום שלי/});
        expect(screen.queryByTestId('map')).not.toBeInTheDocument();
    });

    it('"my location" puts the phone location on the map and saves it with the diff', async () => {
        fakeGps(32.61234567, 35.29876543);
        const {server} = renderApp('/', {user: makeUser(), api: saveOk});
        await userEvent.click(await screen.findByRole('button', {name: /המיקום שלי/}));
        expect(await screen.findByTestId('map')).toHaveAttribute('data-picked', '32.612346,35.298765');
        fillDiff();
        await userEvent.click(screen.getByRole('button', {name: /שמירה להיסטוריה/}));
        await screen.findByText('ההפרש נשמר בהיסטוריה');
        expect(server.callsTo('POST', '/timeDiff')[0].body.location).toEqual({lat: 32.612346, lng: 35.298765});
        // cleared with the rest, ready for the next camera
        expect(screen.queryByTestId('map')).not.toBeInTheDocument();
        expect(sessionStorage.getItem('zit.diffLocation')).toBeNull();
    });

    it('a location can be picked on the map instead', async () => {
        const {server} = renderApp('/', {user: makeUser(), api: saveOk});
        await userEvent.click(await screen.findByRole('button', {name: /בחירה במפה/}));
        await userEvent.click(await screen.findByRole('button', {name: 'pick on map'}));
        expect(screen.getByTestId('map')).toHaveAttribute('data-picked', '32.5,35.1');
        fillDiff();
        await userEvent.click(screen.getByRole('button', {name: /שמירה להיסטוריה/}));
        await screen.findByText('ההפרש נשמר בהיסטוריה');
        expect(server.callsTo('POST', '/timeDiff')[0].body.location).toEqual({lat: 32.5, lng: 35.1});
    });

    it('the location can be removed, and then none is sent', async () => {
        fakeGps(32.6, 35.29);
        const {server} = renderApp('/', {user: makeUser(), api: saveOk});
        await userEvent.click(await screen.findByRole('button', {name: /המיקום שלי/}));
        await userEvent.click(screen.getByRole('button', {name: /הסרת המיקום/}));
        expect(screen.queryByTestId('map')).not.toBeInTheDocument();
        fillDiff();
        await userEvent.click(screen.getByRole('button', {name: /שמירה להיסטוריה/}));
        await screen.findByText('ההפרש נשמר בהיסטוריה');
        expect(server.callsTo('POST', '/timeDiff')[0].body).not.toHaveProperty('location');
    });

    it('no location permission: says so, and the diff can still be saved without one', async () => {
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            value: {getCurrentPosition: (ok, fail) => fail({code: 1})},
        });
        renderApp('/', {user: makeUser()});
        await userEvent.click(await screen.findByRole('button', {name: /המיקום שלי/}));
        expect(await screen.findByText('לא הצלחנו לקבל מיקום. בדקו שהרשאת המיקום פתוחה')).toBeInTheDocument();
        expect(screen.queryByTestId('map')).not.toBeInTheDocument();
    });

    it('the location survives a trip to another page (sessionStorage)', async () => {
        fakeGps(32.6, 35.29);
        const first = renderApp('/', {user: makeUser()});
        await userEvent.click(await screen.findByRole('button', {name: /המיקום שלי/}));
        first.unmount();
        renderApp('/', {user: makeUser()});
        expect(await screen.findByTestId('map')).toHaveAttribute('data-picked', '32.6,35.29');
    });
});
