// @vitest-environment node
// Contract test: the app's own API client and helpers against a REAL server on the separate test database.
// Run with `npm run test:contract` (server/tests/run.mjs seeds zit_test, starts the server and sets BASE).
// Skipped in the normal `npm test`, which uses the fake server.
import {beforeAll, describe, expect, it, vi} from 'vitest';
import {offsetParts, partsFromMs, toLocalInput} from '../lib/timeMath.js';

const {BASE, TEST_ADMIN, JOB_TITLE} = process.env;
const ADMIN_PASSWORD = 'secret123';
// a real 1x1 PNG, so the server's image pipeline (sharp) actually runs
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
const R = String(Date.now()).slice(-6);

// Node's fetch has no cookie jar; a browser would keep the zit.sid cookie, so do the same here.
// A plain assignment, not vi.spyOn: the shared setup restores all mocks after every test
function useCookieJar() {
    const realFetch = globalThis.fetch;
    const jar = new Map();
    globalThis.fetch = async (url, init = {}) => {
        const headers = new Headers(init.headers);
        if (jar.size) headers.set('cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '));
        const res = await realFetch(url, {...init, headers});
        for (const sc of res.headers.getSetCookie()) {
            const [kv] = sc.split(';');
            const i = kv.indexOf('=');
            const [k, v] = [kv.slice(0, i), kv.slice(i + 1)];
            if (!v || /Expires=Thu, 01 Jan 1970/i.test(sc)) jar.delete(k); else jar.set(k, v);
        }
        return res;
    };
    return jar;
}

// every step is a round trip to the real database (Atlas), so allow more than the default 5s per test
describe.skipIf(!BASE)('frontend ↔ real server contract', {timeout: 20_000}, () => {
    let api, ApiError, apiUrl, uploadPinImages, jar;
    const ids = {};

    beforeAll(async () => {
        vi.stubEnv('VITE_API_URL', BASE);
        ({api, ApiError, apiUrl} = await import('../api/client.js'));
        ({uploadPinImages} = await import('../lib/pinImages.js'));
        jar = useCookieJar();
    });

    it('wrong password -> 401 with the Hebrew message the login page shows', async () => {
        const err = await api('/auth/login', {method: 'POST', body: {username: TEST_ADMIN, password: 'nope'}}).catch(e => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(401);
        expect(err.message).toBe('שם משתמש או סיסמה שגויים');
    });

    it('login sets the session cookie and returns the user shape the app reads', async () => {
        const {user} = await api('/auth/login', {method: 'POST', body: {username: TEST_ADMIN.toUpperCase(), password: ADMIN_PASSWORD}});
        expect(jar.has('zit.sid')).toBe(true);
        expect(user).toMatchObject({id: expect.any(String), name: expect.any(String), is_admin: true});
        expect(user.unit).toMatchObject({_id: expect.any(String), station: expect.any(String), merhav: expect.any(String)});
        expect(user.role).toMatchObject({name: 'admin'});
        // the profile shows this instead of the role
        expect(user.job_title).toEqual({_id: JOB_TITLE, name: 'test title'});
        ids.admin = user.id;
        ids.unit = user.unit._id;
        const me = await api('/auth/me');
        expect(me.user.id).toBe(user.id);
    });

    it('roles and units are plain arrays (admin dropdowns)', async () => {
        const roles = await api('/role');
        const units = await api('/unit');
        expect(roles.map(r => r.name).sort()).toEqual(['admin', 'user']);
        expect(units[0]).toMatchObject({_id: ids.unit, district: expect.any(String), station: expect.any(String)});
        ids.userRole = roles.find(r => r.name === 'user')._id;
    });

    it('admin creates a user with the exact body the admin form sends; a duplicate gives the Hebrew 409', async () => {
        const body = {
            name: 'בודק חוזה', user_name: `contract_${R}`, pass: 'secret12', TZ: `9${R}`, police_id: `c${R}`,
            phone: `05${R}`.slice(0, 10), email: `c${R}@test.local`, role: ids.userRole, unit: ids.unit, job_title: JOB_TITLE,
        };
        const {user} = await api('/auth/register', {method: 'POST', body});
        ids.user = user._id ?? user.id;
        expect(ids.user).toBeTruthy();
        const dup = await api('/auth/register', {method: 'POST', body: {...body, TZ: 'x1', police_id: 'x1', phone: '0599999999', email: 'x1@t.l'}}).catch(e => e);
        expect(dup.status).toBe(409);
        expect(dup.message).toBe('שם המשתמש כבר קיים במערכת');
    });

    it('users list is paged and keeps role / unit as ids (how the admin list maps names)', async () => {
        const res = await api('/user?page=1&limit=20');
        expect(res).toMatchObject({page: 1, limit: 20, total: expect.any(Number), pages: expect.any(Number)});
        const row = res.items.find(u => u._id === ids.user);
        expect(row).toMatchObject({role: ids.userRole, unit: ids.unit, job_title: JOB_TITLE});
        expect(row).not.toHaveProperty('pass');
    });

    it('admin edits a user with only the changed field', async () => {
        const {user} = await api(`/user/${ids.user}`, {method: 'PATCH', body: {phone: '0581234567'}});
        expect(user.phone).toBe('0581234567');
    });

    it('pin: create from the form body, read with the decrypted DVR password, clear it with null', async () => {
        const {pin} = await api('/pin', {method: 'POST', body: {name: 'נקודת חוזה', location: {lat: 32.6, lng: 35.29}, dvr: {user_name: 'dvr', password: 'pw1'}}});
        ids.pin = pin._id;
        expect(pin).toMatchObject({image: [], creator_name: expect.any(String)});
        const full = await api(`/pin/${ids.pin}`);
        expect(full.dvr).toEqual({user_name: 'dvr', password: 'pw1'});
        await api(`/pin/${ids.pin}`, {method: 'PATCH', body: {name: 'נקודת חוזה', location: {lat: 32.6, lng: 35.29}, dvr: {password: null}}});
        expect((await api(`/pin/${ids.pin}`)).dvr).toEqual({user_name: 'dvr'});
        // the DVR owner, as the form sends it: whole on change, null to remove
        await api(`/pin/${ids.pin}`, {method: 'PATCH', body: {dvr_owner: {name: 'משה כהן', phone: '0521234567', notes: 'בבוקר'}}});
        expect((await api(`/pin/${ids.pin}`)).dvr_owner).toEqual({name: 'משה כהן', phone: '0521234567', notes: 'בבוקר'});
        await api(`/pin/${ids.pin}`, {method: 'PATCH', body: {dvr_owner: {name: 'משה כהן'}}});
        expect((await api(`/pin/${ids.pin}`)).dvr_owner).toEqual({name: 'משה כהן'});
        await api(`/pin/${ids.pin}`, {method: 'PATCH', body: {dvr_owner: null}});
        expect(await api(`/pin/${ids.pin}`)).not.toHaveProperty('dvr_owner');
        // the map marker, as the picker sends it: whole on change, null back to the plain dot
        await api(`/pin/${ids.pin}`, {method: 'PATCH', body: {marker: {icon: 'store', color: 'yellow'}}});
        expect((await api('/pin/allUnit')).find(p => p._id === ids.pin).marker).toEqual({icon: 'store', color: 'yellow'});
        await api(`/pin/${ids.pin}`, {method: 'PATCH', body: {marker: null}});
        expect(await api(`/pin/${ids.pin}`)).not.toHaveProperty('marker');
        const list = await api('/pin/allUnit');
        expect(list.find(p => p._id === ids.pin)).toBeTruthy();
    });

    it('photo upload through uploadPinImages, then the <img> URL serves it, then delete', async () => {
        const file = new File([PNG], 'phone.png', {type: 'image/png'});
        const pin = await uploadPinImages(ids.pin, [file]);
        expect(pin.image).toHaveLength(1);
        const res = await fetch(apiUrl(`/pin/${ids.pin}/images/${pin.image[0]}`));
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toMatch(/image\/jpeg/);
        const {pin: after} = await api(`/pin/${ids.pin}/images/${pin.image[0]}`, {method: 'DELETE'});
        expect(after.image).toEqual([]);
    });

    it('time diff: the calculator body is accepted and history gives back the same offset', async () => {
        const real = new Date('2026-11-04T10:00:00');
        const dvr = new Date('2026-11-04T10:03:25');
        const {timeDiff} = await api('/timeDiff', {
            method: 'POST',
            body: {name: 'מצלמת חוזה', real_time: real.toISOString(), dvr_time: dvr.toISOString(), dvr_lastSave: toLocalInput(new Date('2026-10-30T00:00:00'), false),
                location: {lat: 32.612346, lng: 35.298765}},
        });
        ids.diff = timeDiff._id;
        expect(timeDiff.offset_ms).toBe(offsetParts(real, dvr).ms);
        const page = await api('/timeDiff/my?page=1&limit=20');
        const saved = page.items.find(d => d._id === ids.diff);
        expect(saved.name).toBe('מצלמת חוזה');
        // the history row gets the place back exactly, for its "save as pin" link
        expect(saved.location).toEqual({lat: 32.612346, lng: 35.298765});
        expect(partsFromMs(saved.offset_ms)).toMatchObject({direction: 'ahead', minutes: 3, seconds: 25});
        expect((await api('/timeDiff/allUnit?page=1&limit=20')).items.some(d => d._id === ids.diff)).toBe(true);
        await api(`/timeDiff/${ids.diff}`, {method: 'DELETE'});
    });

    it('a regular user gets the Hebrew 403 on admin routes, and can change their own password and stay logged in', async () => {
        jar.clear();
        await api('/auth/login', {method: 'POST', body: {username: `contract_${R}`, password: 'secret12'}});
        const forbidden = await api('/user?page=1&limit=20').catch(e => e);
        expect(forbidden.status).toBe(403);
        expect(forbidden.message).toBe('אין לך הרשאה לפעולה הזאת');
        const wrong = await api(`/user/${ids.user}/password`, {method: 'PATCH', body: {current_password: 'bad', new_password: 'secret22'}}).catch(e => e);
        expect(wrong.message).toBe('הסיסמה הנוכחית שגויה');
        await api(`/user/${ids.user}/password`, {method: 'PATCH', body: {current_password: 'secret12', new_password: 'secret22'}});
        expect((await api('/auth/me')).user.id).toBe(ids.user);
    });

    it('logout ends the session: /auth/me is 401 afterwards', async () => {
        await api('/auth/logout', {method: 'POST'});
        const err = await api('/auth/me').catch(e => e);
        expect(err.status).toBe(401);
    });

    it('cleanup as admin: delete the pin and the user', async () => {
        await api('/auth/login', {method: 'POST', body: {username: TEST_ADMIN, password: ADMIN_PASSWORD}});
        await api(`/pin/${ids.pin}`, {method: 'DELETE'});
        await api(`/user/${ids.user}`, {method: 'DELETE'});
        const gone = await api(`/pin/${ids.pin}`).catch(e => e);
        expect(gone.status).toBe(404);
    });
});
