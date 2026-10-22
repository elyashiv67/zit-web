// end-to-end route test — run it with `npm test` (tests/run.mjs starts the server on a
// separate test database, seeds it and passes the ids below through env)
import fsx from 'node:fs';
import sharp from 'sharp';

const {BASE, ADMIN_ROLE, USER_ROLE, HOME_UNIT: AFULA, UPLOADS_DIR} = process.env;
const SESSION_COOKIE = 'zit.sid';
const FAKE_ID = '0123456789abcdef01234567';
const R = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');

let pass = 0, fail = 0;
const failures = [];

class Client {
    constructor(name) { this.name = name; this.cookies = {}; }
    async req(method, path, body, rawBody) {
        const headers = {};
        const c = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
        if (c) headers.cookie = c;
        const isForm = body instanceof FormData;
        if (!isForm && (body !== undefined || rawBody !== undefined)) headers['content-type'] = 'application/json';
        const res = await fetch(BASE + path, {
            method, headers,
            body: rawBody !== undefined ? rawBody : isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
        });
        this.lastType = res.headers.get('content-type');
        this.lastHeaders = res.headers;
        if (this.raw) { this.raw = false; return {status: res.status, data: Buffer.from(await res.arrayBuffer())}; }
        for (const sc of res.headers.getSetCookie()) {
            const [kv] = sc.split(';');
            const i = kv.indexOf('=');
            const k = kv.slice(0, i), v = kv.slice(i + 1);
            if (v === '' || /Expires=Thu, 01 Jan 1970/i.test(sc)) delete this.cookies[k]; else this.cookies[k] = v;
        }
        let data = null;
        const text = await res.text();
        try { data = JSON.parse(text); } catch { data = text; }
        return {status: res.status, data};
    }
}

async function t(label, client, method, path, body, expectStatus, check, rawBody) {
    const r = await client.req(method, path, body, rawBody);
    let ok = r.status === expectStatus;
    let why = ok ? '' : `status ${r.status} != ${expectStatus}`;
    if (ok && check) {
        try {
            const res = check(r.data);
            if (res !== true && res !== undefined) { ok = false; why = String(res); }
        } catch (e) { ok = false; why = e.message; }
    }
    if (ok) pass++; else { fail++; failures.push(`${label}: ${why} :: ${JSON.stringify(r.data).slice(0, 200)}`); }
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(r.status).padEnd(3)} ${method.padEnd(6)} ${path.padEnd(32)} ${label}${ok ? '' : '  <-- ' + why}`);
    return r;
}
const cloneClient = (c, name, drop = [], set = {}) => { const n = new Client(name); n.cookies = {...c.cookies, ...set}; drop.forEach(k => delete n.cookies[k]); return n; };
const must = (cond, msg) => { if (!cond) throw new Error(msg); return true; };
const isArr = d => must(Array.isArray(d), 'expected array');

let userN = 0;
function userBody(tag, role, unit) {
    const n = ++userN;
    return {
        name: `__test ${tag}`, user_name: `__test_${tag}_${R}`, pass: 'secret123',
        TZ: `9${R}${n}`, police_id: `p${R}${n}`,
        phone: `05${R}${n}`,
        email: `__test_${tag}_${R}@Test.com`, role, unit,
    };
}

const anon = new Client('anon');
const admin = new Client('admin');
const u1 = new Client('user1');   // Afula
const u2 = new Client('user2');   // other unit
const ids = {};

console.log('\n== general');
await t('unknown route -> JSON 404', anon, 'GET', '/nope', undefined, 404, d => must(d.message, 'no message'));
await t('malformed JSON -> 400', anon, 'POST', '/auth/login', undefined, 400, d => must(d.message === 'invalid JSON body', d.message), '{bad');

console.log('\n== auth / register');
await t('login: empty body -> 400 + errors', anon, 'POST', '/auth/login', {}, 400, d => must(Array.isArray(d.errors), 'no errors[]'));
await t('login: unknown user -> 401', anon, 'POST', '/auth/login', {username: '__nobody__', password: 'x'}, 401);
await t('me: not logged in -> 401', anon, 'GET', '/auth/me', undefined, 401);
await t('register (admin-only) w/o login -> 401', anon, 'POST', '/auth/register', userBody('x', USER_ROLE, AFULA), 401);
await t('reg w/o login -> 401', anon, 'POST', '/auth/reg', userBody('x', ADMIN_ROLE, AFULA), 401);

// test admin is inserted straight into the DB by the runner (/reg is admin-only now)
let r;
const adminBody = {user_name: process.env.TEST_ADMIN};
ids.admin = process.env.TEST_ADMIN_ID;
if (!adminBody.user_name) { console.log('TEST_ADMIN not set — aborting'); process.exit(1); }
await t('login wrong pass -> 401', admin, 'POST', '/auth/login', {username: adminBody.user_name, password: 'wrongpass'}, 401);
await t('no session cookie for visitors who are not logged in', anon, 'GET', '/auth/me', undefined, 401, () => must(!anon.lastHeaders.getSetCookie().length, 'cookie was set'));
await t('login admin', admin, 'POST', '/auth/login', {username: adminBody.user_name, password: 'secret123'}, 200,
    d => must(d.user?.is_admin === true && !('pass' in d.user), 'bad user payload'));
{
    const sc = admin.lastHeaders.getSetCookie().find(c => c.startsWith(SESSION_COOKIE + '=')) || '';
    await t('session cookie is HttpOnly + SameSite=Lax', anon, 'GET', '/health', undefined, 200, () => must(/HttpOnly/i.test(sc) && /SameSite=Lax/i.test(sc), sc));
}
await t('security headers (helmet)', anon, 'GET', '/health', undefined, 200, () => must(anon.lastHeaders.get('x-content-type-options') === 'nosniff', 'no helmet headers'));
await t('username is case-insensitive', new Client('upper'), 'POST', '/auth/login', {username: adminBody.user_name.toUpperCase(), password: 'secret123'}, 200);
{
    const before = admin.cookies[SESSION_COOKIE];
    await t('login again rotates the session id (fixation)', admin, 'POST', '/auth/login', {username: adminBody.user_name, password: 'secret123'}, 200, () => must(admin.cookies[SESSION_COOKIE] !== before, 'same id'));
    await t('the old session id no longer works', cloneClient(admin, 'old-id', [], {[SESSION_COOKIE]: before}), 'GET', '/auth/me', undefined, 401);
}
await t('me (admin)', admin, 'GET', '/auth/me', undefined, 200, d => must(d.user?.id === ids.admin, 'wrong id'));
await t('register: bad body -> 400', admin, 'POST', '/auth/register', {name: 'a', phone: 'abc'}, 400, d => must(d.errors.length > 3, 'few errors'));

console.log('\n== units');
await t('list units (logged out) -> 401', anon, 'GET', '/unit', undefined, 401);
await t('list units', admin, 'GET', '/unit', undefined, 200, isArr);
r = await t('create unit B (same district+merhav as Afula)', admin, 'POST', '/unit', {district: 'Tzafon', merhav: 'Amakim', station: `__test B ${R}`}, 201, d => must(d.unit?._id, 'no unit'));
ids.unitB = r.data.unit?._id;
await t('create exact duplicate unit -> 409', admin, 'POST', '/unit', {district: 'Tzafon', merhav: 'Amakim', station: `__test B ${R}`}, 409);
await t('create unit bad body -> 400', admin, 'POST', '/unit', {district: ''}, 400);
await t('get unit B', admin, 'GET', `/unit/${ids.unitB}`, undefined, 200, d => must(d._id === ids.unitB, 'wrong unit'));
await t('get unit bad id -> 400', admin, 'GET', '/unit/123', undefined, 400);
await t('get unit missing -> 404', admin, 'GET', `/unit/${FAKE_ID}`, undefined, 404);
await t('patch unit B', admin, 'PATCH', `/unit/${ids.unitB}`, {station: `__test B2 ${R}`}, 200, d => must(d.unit?.station === `__test B2 ${R}`, 'not updated'));
await t('patch unit empty body -> 400', admin, 'PATCH', `/unit/${ids.unitB}`, {}, 400);
await t('patch unit missing -> 404', admin, 'PATCH', `/unit/${FAKE_ID}`, {station: 'x'}, 404);
await t('delete unit in use (Afula) -> 409', admin, 'DELETE', `/unit/${AFULA}`, undefined, 409);

console.log('\n== roles');
await t('list roles', admin, 'GET', '/role', undefined, 200, d => must(Array.isArray(d) && d.length >= 2, 'expected 2 roles'));
await t('get role', admin, 'GET', `/role/${USER_ROLE}`, undefined, 200, d => must(d.name === 'user', 'wrong role'));
await t('get role missing -> 404', admin, 'GET', `/role/${FAKE_ID}`, undefined, 404);
await t('role level must be a positive integer -> 400', admin, 'POST', '/role', {name: 'user', level: 1.5}, 400);
await t('create role duplicate name -> 409', admin, 'POST', '/role', {name: 'user', level: 99}, 409);
await t('create role bad enum -> 400', admin, 'POST', '/role', {name: 'boss', level: 3}, 400);
await t('patch role (no-op, same level)', admin, 'PATCH', `/role/${USER_ROLE}`, {level: 2}, 200, d => must(d.role?.level === 2, 'bad role'));
await t('patch role missing -> 404', admin, 'PATCH', `/role/${FAKE_ID}`, {level: 5}, 404);
await t('delete role missing -> 404', admin, 'DELETE', `/role/${FAKE_ID}`, undefined, 404);

console.log('\n== users');
const u1Body = userBody('u1', USER_ROLE, AFULA);
r = await t('admin registers user1 (Afula)', admin, 'POST', '/auth/register', u1Body, 201, d => must(!('pass' in d.user), 'pass leaked'));
ids.u1 = r.data.user?._id;
await t('register duplicate -> 409', admin, 'POST', '/auth/register', u1Body, 409, d => must(d.field, 'no field'));
await t('register same username in capitals -> 409', admin, 'POST', '/auth/register', {...userBody('dup', USER_ROLE, AFULA), user_name: u1Body.user_name.toUpperCase()}, 409, d => must(d.field === 'user_name', d.message));
await t('/reg works for admin', admin, 'POST', '/auth/reg', userBody('r', USER_ROLE, AFULA), 201, d => must(!('pass' in d.user), 'pass leaked'));
const u2Body = userBody('u2', USER_ROLE, ids.unitB);
r = await t('admin registers user2 (unit B)', admin, 'POST', '/auth/register', u2Body, 201);
ids.u2 = r.data.user?._id;
// only safe once a test user holds the role — otherwise this really deletes it
if (ids.u1) await t('delete role in use -> 409', admin, 'DELETE', `/role/${USER_ROLE}`, undefined, 409);
else { console.log('SKIP  delete role in use (user1 not created) — aborting'); process.exit(1); }
await t('login user1', u1, 'POST', '/auth/login', {username: u1Body.user_name, password: 'secret123'}, 200, d => must(d.user.is_admin === false, 'should not be admin'));
await t('login user2', u2, 'POST', '/auth/login', {username: u2Body.user_name, password: 'secret123'}, 200);
await t('user1 cannot use /auth/register -> 403', u1, 'POST', '/auth/register', userBody('zz', USER_ROLE, AFULA), 403);
await t('list users (admin)', admin, 'GET', '/user', undefined, 200, d => must(Array.isArray(d) && d.every(u => !('pass' in u)), 'pass leaked'));
await t('list users (user) -> 403', u1, 'GET', '/user', undefined, 403);
await t('get self', u1, 'GET', `/user/${ids.u1}`, undefined, 200, d => must(d._id === ids.u1 && !('pass' in d) && d.role?.name === 'user', 'bad user'));
await t('get other user -> 403', u1, 'GET', `/user/${ids.u2}`, undefined, 403);
await t('admin gets other user', admin, 'GET', `/user/${ids.u1}`, undefined, 200);
await t('patch self', u1, 'PATCH', `/user/${ids.u1}`, {name: '__test u1 renamed'}, 200, d => must(d.user?.name === '__test u1 renamed' && !('pass' in d.user), 'not updated'));
await t('me reflects self-update', u1, 'GET', '/auth/me', undefined, 200, d => must(d.user.name === '__test u1 renamed', 'session stale'));
await t('patch self duplicate email -> 409', u1, 'PATCH', `/user/${ids.u1}`, {email: u2Body.email}, 409);
await t('patch self bad phone -> 400', u1, 'PATCH', `/user/${ids.u1}`, {phone: 'abc'}, 400);
await t('patch other user -> 403', u1, 'PATCH', `/user/${ids.u2}`, {name: 'x'}, 403);
await t('patch user missing (admin) -> 404', admin, 'PATCH', `/user/${FAKE_ID}`, {name: 'x'}, 404);

console.log('\n== admin edits user');
await t('admin: role that does not exist -> 400', admin, 'PATCH', `/user/${ids.u1}`, {role: FAKE_ID}, 400, d => must(d.field === 'role', d.message));
await t('admin: unit that does not exist -> 400', admin, 'PATCH', `/user/${ids.u1}`, {unit: FAKE_ID}, 400, d => must(d.field === 'unit', d.message));
await t('register with missing unit -> 400', admin, 'POST', '/auth/register', userBody('mu', USER_ROLE, FAKE_ID), 400, d => must(d.field === 'unit', d.message));
await t('admin cannot set password via PATCH', admin, 'PATCH', `/user/${ids.u1}`, {pass: 'hacked123'}, 400);
await t('user: role/unit stripped, only unit -> 400', u1, 'PATCH', `/user/${ids.u1}`, {unit: ids.unitB}, 400);
await t('user: role/unit stripped, name kept', u1, 'PATCH', `/user/${ids.u1}`, {role: ADMIN_ROLE, unit: ids.unitB, name: '__test u1 renamed'}, 200,
    d => must(d.user.role._id === USER_ROLE && d.user.unit._id === AFULA, 'user changed own role/unit'));

console.log('\n== changes apply to live sessions');
await t('admin moves user1 to unit B', admin, 'PATCH', `/user/${ids.u1}`, {unit: ids.unitB}, 200, d => must(d.user.unit._id === ids.unitB, 'not moved'));
await t('user1 /me shows unit B without relogin', u1, 'GET', '/auth/me', undefined, 200, d => must(d.user.unit._id === ids.unitB, `unit ${d.user.unit?._id}`));
await t('admin moves user1 back to Afula', admin, 'PATCH', `/user/${ids.u1}`, {unit: AFULA}, 200);
await t('admin makes user1 admin', admin, 'PATCH', `/user/${ids.u1}`, {role: ADMIN_ROLE}, 200);
await t('user1 is admin immediately (GET /user)', u1, 'GET', '/user', undefined, 200, isArr);
await t('admin makes user1 user again', admin, 'PATCH', `/user/${ids.u1}`, {role: USER_ROLE}, 200);
await t('user1 lost admin immediately -> 403', u1, 'GET', '/user', undefined, 403);
const u4 = new Client('user4'), u4Body = userBody('u4', USER_ROLE, AFULA);
r = await t('register temp user4', admin, 'POST', '/auth/register', u4Body, 201);
ids.u4 = r.data.user?._id;
await t('login user4', u4, 'POST', '/auth/login', {username: u4Body.user_name, password: 'secret123'}, 200);
await t('user4 works', u4, 'GET', '/auth/me', undefined, 200);
await t('admin deletes user4', admin, 'DELETE', `/user/${ids.u4}`, undefined, 200);
await t('deleted user4 locked out at once -> 401', u4, 'GET', '/auth/me', undefined, 401, d => must(/no longer exists/.test(d.message), d.message));
await t('user4 cookies cleared -> plain 401', u4, 'GET', '/pin/allUnit', undefined, 401, d => must(d.message === 'need to login', d.message));

console.log('\n== passwords');
const u1b = new Client('user1-phone');
await t('user1 logs in on a 2nd device', u1b, 'POST', '/auth/login', {username: u1Body.user_name, password: 'secret123'}, 200);
await t('own change w/o current_password -> 400', u1, 'PATCH', `/user/${ids.u1}/password`, {new_password: 'newpass456'}, 400, d => must(d.field === 'current_password', d.message));
await t('own change wrong current -> 400 (not 401)', u1, 'PATCH', `/user/${ids.u1}/password`, {current_password: 'nope', new_password: 'newpass456'}, 400);
await t('new password too short -> 400', u1, 'PATCH', `/user/${ids.u1}/password`, {current_password: 'secret123', new_password: '123'}, 400);
await t('new same as current -> 400', u1, 'PATCH', `/user/${ids.u1}/password`, {current_password: 'secret123', new_password: 'secret123'}, 400, d => must(d.field === 'new_password', d.message));
await t('user1 cannot change user2 password -> 403', u1, 'PATCH', `/user/${ids.u2}/password`, {current_password: 'secret123', new_password: 'newpass456'}, 403);
const u1BeforeChange = u1.cookies[SESSION_COOKIE];
await t('user1 changes own password', u1, 'PATCH', `/user/${ids.u1}/password`, {current_password: 'secret123', new_password: 'newpass456'}, 200);
await t('this device stays logged in', u1, 'GET', '/auth/me', undefined, 200);
await t('2nd device signed out -> 401', u1b, 'GET', '/auth/me', undefined, 401, d => must(/password was changed/.test(d.message), d.message));
await t('this device got a new session id', u1, 'GET', '/auth/me', undefined, 200, () => must(u1.cookies[SESSION_COOKIE] !== u1BeforeChange, 'session id not rotated'));
await t('login with old password -> 401', new Client('x'), 'POST', '/auth/login', {username: u1Body.user_name, password: 'secret123'}, 401);
await t('login with new password', u1b, 'POST', '/auth/login', {username: u1Body.user_name, password: 'newpass456'}, 200);
await t('admin resets user2 password (no current)', admin, 'PATCH', `/user/${ids.u2}/password`, {new_password: 'reset789'}, 200);
await t('user2 signed out after reset -> 401', u2, 'GET', '/auth/me', undefined, 401);
await t('user2 logs in with reset password', u2, 'POST', '/auth/login', {username: u2Body.user_name, password: 'reset789'}, 200);
await t('admin own change needs current -> 400', admin, 'PATCH', `/user/${ids.admin}/password`, {new_password: 'whatever1'}, 400);
for (let i = 1; i <= 5; i++)
    await t(`wrong current #${i}`, u2, 'PATCH', `/user/${ids.u2}/password`, {current_password: 'bad', new_password: 'another1'}, 400);
await t('6th wrong current -> 429', u2, 'PATCH', `/user/${ids.u2}/password`, {current_password: 'bad', new_password: 'another1'}, 429, d => must(/too many/.test(d.message), d.message));

console.log('\n== login rate limit');
const rl = new Client('attacker'), victim = `__test_nobody_${R}`;
for (let i = 1; i <= 5; i++)
    await t(`failed login #${i}`, rl, 'POST', '/auth/login', {username: victim, password: 'guess' + i}, 401);
await t('6th failed login same user -> 429', rl, 'POST', '/auth/login', {username: victim, password: 'guess6'}, 429, d => must(/too many/.test(d.message), d.message));
await t('other users from same IP still log in', new Client('y'), 'POST', '/auth/login', {username: u2Body.user_name, password: 'reset789'}, 200);

console.log('\n== pins');
await t('list pins (user) -> 403', u1, 'GET', '/pin', undefined, 403);
await t('list pins (admin)', admin, 'GET', '/pin', undefined, 200, isArr);
await t('unit pins empty -> 200 []', u1, 'GET', '/pin/allUnit', undefined, 200, isArr);
r = await t('user1 adds pin', u1, 'POST', '/pin', {name: `__test pin ${R}`, location: {lat: 32.6, lng: 35.3}, dvr: {user_name: 'dvr', password: 'dvrpass'}, owner: ids.u2}, 201,
    d => must(d.pin?.creator === ids.u1 && d.pin.creator_name === '__test u1 renamed' && d.pin.assigned_unit === AFULA, 'creator/unit not from session'));
ids.pin = r.data.pin?._id;
await t('add pin bad location -> 400', u1, 'POST', '/pin', {name: 'x', location: {lat: 999, lng: 0}}, 400);
await t('old /pin/addPin gone -> 404', u1, 'POST', '/pin/addPin', {name: 'x', location: {lat: 1, lng: 1}}, 404);
await t('unit list hides dvr password', u1, 'GET', '/pin/allUnit', undefined, 200, d => must(d.length === 1 && d[0].dvr && !('password' in d[0].dvr), 'password leaked in list'));
await t('admin list hides dvr password', admin, 'GET', '/pin', undefined, 200, d => must(d.every(p => !p.dvr || !('password' in p.dvr)), 'password leaked'));
await t('get pin (same unit) shows password', u1, 'GET', `/pin/${ids.pin}`, undefined, 200, d => must(d.dvr?.password === 'dvrpass', 'no password'));
{
    // straight from the test database: the stored value must not be the plain password
    const {default: mongoose} = await import('mongoose');
    const conn = await mongoose.createConnection(process.env.DB, {dbName: process.env.DB_NAME}).asPromise();
    const raw = await conn.db.collection('pins').findOne({_id: new mongoose.Types.ObjectId(ids.pin)});
    await conn.close();
    await t('dvr password is encrypted in the DB', anon, 'GET', '/health', undefined, 200,
        () => must(/^v1:/.test(raw.dvr.password) && !raw.dvr.password.includes('dvrpass'), `stored as ${raw.dvr.password}`));
}
await t('pin JSON has no extra "id" field', u1, 'GET', `/pin/${ids.pin}`, undefined, 200, d => must(!('id' in d), 'id added'));
await t('get pin other unit -> 403', u2, 'GET', `/pin/${ids.pin}`, undefined, 403);
await t('get pin admin', admin, 'GET', `/pin/${ids.pin}`, undefined, 200);
await t('get pin missing -> 404', u1, 'GET', `/pin/${FAKE_ID}`, undefined, 404);
await t('patch pin dvr user only (owner)', u1, 'PATCH', `/pin/${ids.pin}`, {dvr: {user_name: 'dvr2'}}, 200, d => must(d.pin?.dvr?.user_name === 'dvr2', 'not updated'));
await t('dvr password kept after partial update', u1, 'GET', `/pin/${ids.pin}`, undefined, 200, d => must(d.dvr.password === 'dvrpass' && d.dvr.user_name === 'dvr2', 'password lost'));
await t('dvr password cleared with null', u1, 'PATCH', `/pin/${ids.pin}`, {dvr: {password: null}}, 200);
await t('password gone, user_name kept', u1, 'GET', `/pin/${ids.pin}`, undefined, 200, d => must(!('password' in d.dvr) && d.dvr.user_name === 'dvr2', JSON.stringify(d.dvr)));
await t('dvr password set again', u1, 'PATCH', `/pin/${ids.pin}`, {dvr: {password: 'dvrpass'}}, 200);
await t('patch pin other user -> 403', u2, 'PATCH', `/pin/${ids.pin}`, {name: 'x'}, 403);
await t('patch pin empty -> 400', u1, 'PATCH', `/pin/${ids.pin}`, {}, 400);
await t('admin patches pin', admin, 'PATCH', `/pin/${ids.pin}`, {name: `__test pin2 ${R}`}, 200);
await t('delete pin other unit -> 403', u2, 'DELETE', `/pin/${ids.pin}`, undefined, 403);

console.log('\n== pins belong to the unit');
const u3 = new Client('user3');   // Afula, did not create the pin
const u3Body = userBody('u3', USER_ROLE, AFULA);
r = await t('admin registers user3 (Afula)', admin, 'POST', '/auth/register', u3Body, 201);
ids.u3 = r.data.user?._id;
await t('login user3', u3, 'POST', '/auth/login', {username: u3Body.user_name, password: 'secret123'}, 200);
await t('unit-mate patches pin', u3, 'PATCH', `/pin/${ids.pin}`, {name: `__test pin3 ${R}`}, 200);
r = await t('user2 adds pin in unit B', u2, 'POST', '/pin', {name: `__test pinB ${R}`, location: {lat: 32, lng: 35}}, 201,
    d => must(d.pin?.assigned_unit === ids.unitB, 'wrong unit'));
ids.pinB = r.data.pin?._id;

console.log('\n== time diff');
await t('save w/o login -> 401', anon, 'POST', '/timeDiff', {real_time: '2026-10-21T10:00:00Z', dvr_time: '2026-10-21T09:58:30Z'}, 401);
r = await t('user1 saves diff', u1, 'POST', '/timeDiff', {real_time: '2026-10-21T10:00:00Z', dvr_time: '2026-10-21T09:58:30Z', pin: ids.pin}, 201,
    d => must(d.timeDiff?.offset_ms === -90000 && d.timeDiff.owner === ids.u1 && !('pin' in d.timeDiff), `bad record ${JSON.stringify(d.timeDiff)}`));
ids.td1 = r.data.timeDiff?._id;
r = await t('user1 saves diff w/ lastSave', u1, 'POST', '/timeDiff', {real_time: '2026-10-21T10:00:00Z', dvr_time: '2026-10-22T10:00:00Z', dvr_lastSave: '2026-10-01'}, 201,
    d => must(d.timeDiff?.offset_ms === 86400000 && d.timeDiff.dvr_lastSave, 'bad record'));
ids.td2 = r.data.timeDiff?._id;
r = await t('user2 saves diff', u2, 'POST', '/timeDiff', {real_time: '2026-10-21T10:00:00Z', dvr_time: '2026-10-21T10:00:05Z'}, 201);
ids.td3 = r.data.timeDiff?._id;
await t('save bad dates -> 400', u1, 'POST', '/timeDiff', {real_time: 'nope', dvr_time: 'x'}, 400);
for (const bad of [null, true, 0, 1700000000000, '2026-10-21T10:00:00', '2026-13-40'])
    await t(`save real_time ${JSON.stringify(bad)} -> 400`, u1, 'POST', '/timeDiff', {real_time: bad, dvr_time: '2026-10-21T10:00:00Z'}, 400);
r = await t('date with +03:00 offset is converted', u1, 'POST', '/timeDiff', {real_time: '2026-10-21T13:00:00+03:00', dvr_time: '2026-10-21T10:00:00Z'}, 201,
    d => must(d.timeDiff.offset_ms === 0, `offset ${d.timeDiff.offset_ms}`));
await t('remove it', u1, 'DELETE', `/timeDiff/${r.data.timeDiff?._id}`, undefined, 200);
await t('my history (newest first)', u1, 'GET', '/timeDiff/my', undefined, 200, d => must(d.length === 2 && d[0]._id === ids.td2, 'wrong order/count'));
await t('unit history', u1, 'GET', '/timeDiff/allUnit', undefined, 200, d => must(d.some(x => x._id === ids.td1) && !d.some(x => x._id === ids.td3), 'unit filter wrong'));
await t('all history (user) -> 403', u1, 'GET', '/timeDiff', undefined, 403);
await t('all history (admin)', admin, 'GET', '/timeDiff', undefined, 200, d => must(d.length >= 3, 'missing'));
await t('get diff same unit', u1, 'GET', `/timeDiff/${ids.td1}`, undefined, 200);
await t('get diff other unit -> 403', u2, 'GET', `/timeDiff/${ids.td1}`, undefined, 403);
await t('get diff missing -> 404', u1, 'GET', `/timeDiff/${FAKE_ID}`, undefined, 404);
await t('admin moves user1 to unit B', admin, 'PATCH', `/user/${ids.u1}`, {unit: ids.unitB}, 200);
await t('owner in a new unit still reads own diff', u1, 'GET', `/timeDiff/${ids.td2}`, undefined, 200);
await t('old unit-mate still reads it (record unit)', u3, 'GET', `/timeDiff/${ids.td2}`, undefined, 200);
await t('new unit-mate cannot -> 403', u2, 'GET', `/timeDiff/${ids.td2}`, undefined, 403);
await t('admin moves user1 back', admin, 'PATCH', `/user/${ids.u1}`, {unit: AFULA}, 200);
await t('delete other user diff -> 403', u2, 'DELETE', `/timeDiff/${ids.td1}`, undefined, 403);
await t('owner deletes diff', u1, 'DELETE', `/timeDiff/${ids.td1}`, undefined, 200, d => must(d.id === ids.td1, 'wrong id'));
await t('admin deletes diff', admin, 'DELETE', `/timeDiff/${ids.td3}`, undefined, 200);

console.log('\n== pin images (compression)');
const IMG_DIR = `${UPLOADS_DIR}/pins`;
const pinDir = () => `${IMG_DIR}/${ids.pin}`;
const dirCount = () => fsx.existsSync(pinDir()) ? fsx.readdirSync(pinDir()).length : 0;
const stored = name => fsx.readFileSync(`${pinDir()}/${name}`);
const MB = 1024 * 1024;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const JPG = await sharp({create: {width: 200, height: 100, channels: 3, background: '#3366cc'}}).jpeg().toBuffer();
// 12MP noise at high quality ≈ a big phone photo (noise barely compresses)
const PHONE = await sharp(Buffer.from(Array.from({length: 4032 * 3024 * 3}, () => Math.random() * 256 | 0)), {raw: {width: 4032, height: 3024, channels: 3}})
    .jpeg({quality: 92}).withExifMerge({IFD0: {Copyright: '__test', Make: 'TestPhone'}}).toBuffer();
// 400x200 stored landscape, EXIF says "rotate 90°" -> should come out 200x400 portrait
const SIDEWAYS = await sharp({create: {width: 400, height: 200, channels: 3, background: '#cc3333'}})
    .jpeg().withMetadata({orientation: 6}).toBuffer();
console.log(`      (phone test photo: ${(PHONE.length / MB).toFixed(1)}MB)`);
const form = (...files) => {
    const fd = new FormData();
    for (const [buf, type, name, field = 'images'] of files) fd.append(field, new Blob([buf], {type}), name);
    return fd;
};
r = await t('upload 2 images (png + jpg)', u1, 'POST', `/pin/${ids.pin}/images`, form([PNG, 'image/png', 'a.png'], [JPG, 'image/jpeg', '../../evil.jpg']), 201,
    d => must(d.pin.image.length === 2 && d.pin.image.every(n => /^[0-9a-f-]{36}\.jpg$/.test(n)), `bad names ${d.pin?.image}`));
const imgs = r.data.pin?.image || [];
await t('files written to pin folder', u1, 'GET', `/pin/${ids.pin}`, undefined, 200, () => must(dirCount() === 2 && imgs.every(n => fsx.existsSync(`${pinDir()}/${n}`)), `dir has ${dirCount()}`));
r = await t(`phone photo over 5MB is compressed`, u1, 'POST', `/pin/${ids.pin}/images`, form([PHONE, 'image/jpeg', 'IMG_0001.jpg']), 201);
const phoneName = r.data.pin?.image?.[2];
{
    const out = stored(phoneName), m = await sharp(out).metadata();
    const ok = PHONE.length > 5 * MB && out.length <= 5 * MB && Math.max(m.width, m.height) <= 2560 && m.format === 'jpeg';
    console.log(`${ok ? 'PASS' : 'FAIL'}        ${(PHONE.length / MB).toFixed(1)}MB ${4032}x${3024} -> ${(out.length / MB).toFixed(2)}MB ${m.width}x${m.height} ${m.format}`);
    ok ? pass++ : (fail++, failures.push('phone photo not compressed right'));
    const noExif = !m.exif;
    console.log(`${noExif ? 'PASS' : 'FAIL'}        phone EXIF (make/copyright/GPS) stripped`);
    noExif ? pass++ : (fail++, failures.push('EXIF kept'));
}
r = await t('sideways photo is auto-rotated', u1, 'POST', `/pin/${ids.pin}/images`, form([SIDEWAYS, 'image/jpeg', 's.jpg']), 201);
{
    const m = await sharp(stored(r.data.pin.image[3])).metadata();
    const ok = m.width === 200 && m.height === 400 && !m.orientation;
    console.log(`${ok ? 'PASS' : 'FAIL'}        400x200 + orientation 6 -> ${m.width}x${m.height}`);
    ok ? pass++ : (fail++, failures.push('not rotated'));
}
await t('fake png (text with image/png type) -> 400', u1, 'POST', `/pin/${ids.pin}/images`, form([Buffer.from('not an image'), 'image/png', 'x.png']), 400, d => must(/not real images/.test(d.message), d.message));
await t('good + fake in one batch -> 400, nothing saved', u1, 'POST', `/pin/${ids.pin}/images`, form([JPG, 'image/jpeg', 'ok.jpg'], [Buffer.from('nope'), 'image/jpeg', 'bad.jpg']), 400);
await t('text/plain -> 400', u1, 'POST', `/pin/${ids.pin}/images`, form([Buffer.from('hi'), 'text/plain', 'x.txt']), 400);
await t('over 25MB upload -> 400', u1, 'POST', `/pin/${ids.pin}/images`, form([Buffer.concat([JPG, Buffer.alloc(26 * MB)]), 'image/jpeg', 'huge.jpg']), 400, d => must(/25MB/.test(d.message), d.message));
await t('wrong field name -> 400', u1, 'POST', `/pin/${ids.pin}/images`, form([PNG, 'image/png', 'a.png', 'photo']), 400);
await t('no files -> 400', u1, 'POST', `/pin/${ids.pin}/images`, new FormData(), 400);
await t('other unit upload -> 403', u2, 'POST', `/pin/${ids.pin}/images`, form([PNG, 'image/png', 'a.png']), 403);
await t('too many for the pin -> 400', u1, 'POST', `/pin/${ids.pin}/images`, form(...Array.from({length: 7}, () => [PNG, 'image/png', 'a.png'])), 400, d => must(/up to 10/.test(d.message), d.message));
{
    // a 1x1 png whose header says 20000x20000 (400MP): tiny file, ~1.2GB once decoded
    const {crc32} = await import('node:zlib');
    const bomb = Buffer.from(PNG);
    bomb.writeUInt32BE(20000, 16); bomb.writeUInt32BE(20000, 20);
    bomb.writeUInt32BE(crc32(bomb.subarray(12, 29)), 29);
    await t('decompression bomb (400MP header) -> 400', u1, 'POST', `/pin/${ids.pin}/images`, form([bomb, 'image/png', 'bomb.png']), 400, d => must(/too large/.test(d.message), d.message));
}
await t('rejected uploads left no files', u1, 'GET', `/pin/${ids.pin}`, undefined, 200, () => must(dirCount() === 4, `dir has ${dirCount()}`));
u3.raw = true;
await t('unit-mate downloads image (jpeg)', u3, 'GET', `/pin/${ids.pin}/images/${imgs[0]}`, undefined, 200, d => must(/image\/jpeg/.test(u3.lastType) && d[0] === 0xff && d[1] === 0xd8, `type ${u3.lastType}`));
await t('other unit download -> 403', u2, 'GET', `/pin/${ids.pin}/images/${imgs[0]}`, undefined, 403);
await t('logged out download -> 401', anon, 'GET', `/pin/${ids.pin}/images/${imgs[0]}`, undefined, 401);
await t('path traversal name -> 404', u3, 'GET', `/pin/${ids.pin}/images/..%2F..%2Findex.js`, undefined, 404);
await t('valid-looking name not on pin -> 404', u3, 'GET', `/pin/${ids.pin}/images/00000000-0000-0000-0000-000000000000.jpg`, undefined, 404);
await t('PATCH cannot set image list', u1, 'PATCH', `/pin/${ids.pin}`, {image: ['../../index.js']}, 400);
await t('PATCH name keeps images', u1, 'PATCH', `/pin/${ids.pin}`, {image: ['x'], name: `__test pin5 ${R}`}, 200, d => must(d.pin.image.length === 4, 'images changed'));
await t('other unit delete image -> 403', u2, 'DELETE', `/pin/${ids.pin}/images/${imgs[0]}`, undefined, 403);
await t('delete image', u3, 'DELETE', `/pin/${ids.pin}/images/${imgs[0]}`, undefined, 200, d => must(d.pin.image.length === 3 && !d.pin.image.includes(imgs[0]), 'wrong list'));
await new Promise(res => setTimeout(res, 200));
await t('deleted image gone from disk', u3, 'GET', `/pin/${ids.pin}/images/${imgs[0]}`, undefined, 404, () => must(dirCount() === 3, `dir has ${dirCount()}`));
await t('delete same image again -> 404', u3, 'DELETE', `/pin/${ids.pin}/images/${imgs[0]}`, undefined, 404);
{
    // pin has 3 images; two uploads of 4 at the same moment both pass the early check (3+4 <= 10)
    // but only one may be saved (3+4+4 = 11)
    const four = () => form(...Array.from({length: 4}, () => [JPG, 'image/jpeg', 'c.jpg']));
    const [a, b] = await Promise.all([u1.req('POST', `/pin/${ids.pin}/images`, four()), u3.req('POST', `/pin/${ids.pin}/images`, four())]);
    const statuses = [a.status, b.status].sort().join(',');
    await new Promise(res => setTimeout(res, 200));
    await t(`parallel uploads: one saved, one refused (${statuses})`, u1, 'GET', `/pin/${ids.pin}`, undefined, 200,
        d => must(statuses === '201,400' && d.image.length === 7 && dirCount() === 7, `pin ${d.image.length}, disk ${dirCount()}`));
}
{
    const incoming = (await import('node:path')).join((await import('node:os')).tmpdir(), 'zit-incoming');
    const left = fsx.existsSync(incoming) ? fsx.readdirSync(incoming).length : 0;
    await t('temp upload files are always deleted', anon, 'GET', '/health', undefined, 200, () => must(left === 0, `${left} files left in ${incoming}`));
}

console.log('\n== cleanup through the API (deletes)');
await t('delete other user -> 403', u1, 'DELETE', `/user/${ids.u2}`, undefined, 403);
await t('user1 (pin creator) deletes self', u1, 'DELETE', `/user/${ids.u1}`, undefined, 200, () => must(!u1.cookies[SESSION_COOKIE], 'session cookie not cleared'));
await t('pin survives creator leaving, creator kept', u3, 'GET', `/pin/${ids.pin}`, undefined, 200,
    d => must(d._id === ids.pin && d.creator === ids.u1 && d.creator_name === '__test u1 renamed', 'pin/creator gone'));
await t('creator cannot be set via PATCH', u3, 'PATCH', `/pin/${ids.pin}`, {creator: ids.u3, creator_name: 'hacker', name: `__test pin4 ${R}`}, 200,
    d => must(d.pin.creator === ids.u1 && d.pin.creator_name === '__test u1 renamed', 'creator overwritten'));
await t('unit-mate deletes pin', u3, 'DELETE', `/pin/${ids.pin}`, undefined, 200, d => must(d.id === ids.pin, 'wrong id'));
await t('pin gone -> 404', u3, 'GET', `/pin/${ids.pin}`, undefined, 404);
await new Promise(res => setTimeout(res, 200));
await t('deleting pin removed its image folder', u3, 'GET', `/pin/${ids.pin}`, undefined, 404, () => must(!fsx.existsSync(pinDir()), 'folder still there'));
await t('admin deletes user2', admin, 'DELETE', `/user/${ids.u2}`, undefined, 200);
await t('pin B survives user2 leaving', admin, 'GET', `/pin/${ids.pinB}`, undefined, 200);
await t('delete unit B with pins -> 409', admin, 'DELETE', `/unit/${ids.unitB}`, undefined, 409, d => must(/pins/.test(d.message), d.message));
await t('admin deletes pin B', admin, 'DELETE', `/pin/${ids.pinB}`, undefined, 200);
await t('admin deletes unit B', admin, 'DELETE', `/unit/${ids.unitB}`, undefined, 200, d => must(d.id === ids.unitB, 'wrong id'));
await t('admin deletes user3', admin, 'DELETE', `/user/${ids.u3}`, undefined, 200);

console.log('\n== last admin');
await t('last admin cannot demote self -> 409', admin, 'PATCH', `/user/${ids.admin}`, {role: USER_ROLE}, 409, d => must(/last admin/.test(d.message), d.message));
await t('last admin cannot delete self -> 409', admin, 'DELETE', `/user/${ids.admin}`, undefined, 409, d => must(/last admin/.test(d.message), d.message));
const u5 = new Client('admin2'), u5Body = userBody('a2', ADMIN_ROLE, AFULA);
r = await t('register a 2nd admin', admin, 'POST', '/auth/register', u5Body, 201);
ids.u5 = r.data.user?._id;
await t('login 2nd admin', u5, 'POST', '/auth/login', {username: u5Body.user_name, password: 'secret123'}, 200);
for (let round = 1; round <= 3; round++) {
    // both demote each other at the same moment — at least one must stay admin
    await Promise.all([
        admin.req('PATCH', `/user/${ids.u5}`, {role: USER_ROLE}),
        u5.req('PATCH', `/user/${ids.admin}`, {role: USER_ROLE}),
    ]);
    const [m1, m2] = await Promise.all([admin.req('GET', '/auth/me'), u5.req('GET', '/auth/me')]);
    const admins = [m1, m2].filter(m => m.data.user?.is_admin).length;
    await t(`demote race #${round}: admins left = ${admins}`, anon, 'GET', '/health', undefined, 200, () => must(admins >= 1, 'no admin left!'));
    const boss = m1.data.user?.is_admin ? admin : u5; // restore both for the next round
    await boss.req('PATCH', `/user/${ids.admin}`, {role: ADMIN_ROLE});
    await boss.req('PATCH', `/user/${ids.u5}`, {role: ADMIN_ROLE});
}
await t('admin deletes 2nd admin', admin, 'DELETE', `/user/${ids.u5}`, undefined, 200);

console.log('\n== logout');
const adminPhone = new Client('admin-phone');
await t('admin logs in on a 2nd device', adminPhone, 'POST', '/auth/login', {username: adminBody.user_name, password: 'secret123'}, 200);
const copied = cloneClient(admin, 'copied-cookie');
await t('logout', admin, 'POST', '/auth/logout', undefined, 200, () => must(!admin.cookies[SESSION_COOKIE], 'cookie not cleared'));
await t('me after logout -> 401', admin, 'GET', '/auth/me', undefined, 401);
await t('a copied cookie stops working after logout', copied, 'GET', '/auth/me', undefined, 401);
await t('the other device stays logged in', adminPhone, 'GET', '/auth/me', undefined, 200);
await t('logout when not logged in -> 200', anon, 'POST', '/auth/logout', undefined, 200);

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) console.log('\nFAILURES:\n' + failures.join('\n'));
process.exit(fail ? 1 : 0);
