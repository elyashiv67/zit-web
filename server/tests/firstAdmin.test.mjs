// First admin on a fresh database (Docker deploy without Atlas): FIRST_ADMIN_USERNAME / FIRST_ADMIN_PASSWORD
// create roles, a unit, a job title and one admin when the database has no users yet, and nothing otherwise.
// Starts the real server several times on its own database (TEST_FIRST_ADMIN_DB, default "zit_test_first_admin"),
// which is dropped before and after. Run: npm run test:first-admin (also part of npm test).
import 'dotenv/config';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';

const SERVER_DIR = path.join(import.meta.dirname, '..');
const DB_NAME = process.env.TEST_FIRST_ADMIN_DB || 'zit_test_first_admin';
const PORT = '4598';
const BASE = `http://localhost:${PORT}`;
const UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'zit-first-admin-'));

const conn = await mongoose.createConnection(process.env.DB, {dbName: DB_NAME}).asPromise();
const realDbName = new URL(process.env.DB.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.slice(1);
if (conn.name === realDbName || !/test/i.test(conn.name)) {
    console.error(`refusing to run: test database "${conn.name}" must contain "test" and differ from the real one`);
    process.exit(1);
}
const db = conn.db;
const count = name => db.collection(name).countDocuments();

let passed = 0, failed = 0;
const check = (name, ok, extra = '') => {
    if (ok) passed++; else failed++;
    console.log(`${ok ? '✓' : '✗'} ${name}${!ok && extra ? `  (${extra})` : ''}`);
};

// start the server with extra env; resolves once /health answers, or with the exit code if it stops first
function startServer(extraEnv) {
    const env = {...process.env, NODE_ENV: 'test', PORT, DB_NAME, UPLOADS_DIR, ...extraEnv};
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete env[k];
    const proc = spawn(process.execPath, ['index.js'], {cwd: SERVER_DIR, env, stdio: ['ignore', 'pipe', 'pipe']});
    const out = {log: ''};
    proc.stdout.on('data', d => { out.log += d; });
    proc.stderr.on('data', d => { out.log += d; });
    const exited = new Promise(resolve => proc.on('exit', code => resolve({exitCode: code})));
    const ready = (async () => {
        for (let i = 0; i < 60; i++) {
            try { if ((await fetch(`${BASE}/health`)).ok) return {}; } catch { /* not up yet */ }
            await new Promise(r => setTimeout(r, 500));
        }
        return {timeout: true};
    })();
    return Promise.race([ready, exited]).then(r => ({...r, proc, out, exited}));
}
async function stopServer(s) {
    if (s.exitCode === undefined) { s.proc.kill(); await s.exited; }
}
async function login(username, password) {
    const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, password}),
    });
    const cookie = res.headers.getSetCookie()[0]?.split(';')[0];
    return {status: res.status, cookie};
}

const ADMIN = {FIRST_ADMIN_USERNAME: 'FirstBoss', FIRST_ADMIN_PASSWORD: 'first-admin-pass-1'};

try {
    // 1) empty database + FIRST_ADMIN_* -> everything a first login needs
    await conn.dropDatabase();
    let s = await startServer(ADMIN);
    check('server starts on an empty database', !s.timeout && s.exitCode === undefined, s.out.log.slice(-300));
    check('roles admin and user created', await db.collection('roles').countDocuments({name: {$in: ['admin', 'user']}}) === 2);
    check('one unit and one job title created', await count('units') === 1 && await count('jobtitles') === 1);
    check('exactly one user created', await count('users') === 1);
    const {status, cookie} = await login('firstboss', ADMIN.FIRST_ADMIN_PASSWORD);
    check('first admin can log in (username is case-insensitive)', status === 200, String(status));
    const me = await (await fetch(`${BASE}/auth/me`, {headers: {Cookie: cookie ?? ''}})).json();
    check('first admin is an admin', me.user?.is_admin === true, JSON.stringify(me));
    check('the log says what to do next, without the password',
        /first admin "firstboss" created/i.test(s.out.log) && !s.out.log.includes(ADMIN.FIRST_ADMIN_PASSWORD));
    const stored = await db.collection('users').findOne({user_name: 'firstboss'});
    check('password is stored as a bcrypt hash (cost 12)', /^\$2[aby]\$12\$/.test(stored?.pass ?? ''));

    // the owner's plan: create a real admin as the first admin, log in as it, delete the first admin
    const api = (method, url, ck, body) => fetch(`${BASE}${url}`, {
        method, headers: {'Content-Type': 'application/json', Cookie: ck ?? ''}, body: body && JSON.stringify(body),
    });
    const roles = await (await api('GET', '/role', cookie)).json();
    const units = await (await api('GET', '/unit', cookie)).json();
    const titles = await (await api('GET', '/jobTitle', cookie)).json();
    const created = await api('POST', '/auth/register', cookie, {
        name: 'real admin', user_name: 'real_admin', pass: 'real-admin-pass-1', TZ: '123456782', police_id: 'p1',
        phone: '0501234567', email: 'real@example.com', role: roles.find(r => r.name === 'admin')._id,
        unit: units[0]._id, job_title: titles[0]._id,
    });
    check('first admin creates a real admin', created.status === 201, String(created.status));
    const real = await login('real_admin', 'real-admin-pass-1');
    check('real admin can log in', real.status === 200, String(real.status));
    const deleted = await api('DELETE', `/user/${stored._id}`, real.cookie);
    check('real admin deletes the first admin', deleted.status === 200, String(deleted.status));
    check('first admin can no longer log in', (await login('firstboss', ADMIN.FIRST_ADMIN_PASSWORD)).status === 401);
    await stopServer(s);

    // FIRST_ADMIN_* still set, but users exist -> the deleted first admin does not come back
    s = await startServer(ADMIN);
    check('restart after deleting it: the first admin is not recreated',
        await count('users') === 1 && !(await db.collection('users').findOne({user_name: 'firstboss'})));
    await stopServer(s);

    // 2) start over on an empty database, then restart with the same settings -> nothing new
    await conn.dropDatabase();
    s = await startServer(ADMIN);
    await stopServer(s);
    s = await startServer(ADMIN);
    check('restart: still one user, two roles, one unit, one job title',
        await count('users') === 1 && await count('roles') === 2 && await count('units') === 1 && await count('jobtitles') === 1);
    check('restart: nothing logged about a first admin', !/first admin/i.test(s.out.log));
    await stopServer(s);

    // 3) users exist -> FIRST_ADMIN_* is ignored, even with another username
    s = await startServer({...ADMIN, FIRST_ADMIN_USERNAME: 'someone_else'});
    check('database with users: no second admin', await count('users') === 1 && !(await db.collection('users').findOne({user_name: 'someone_else'})));
    await stopServer(s);

    // 4) existing roles / unit / job title are reused, not duplicated
    await conn.dropDatabase();
    const now = {createdAt: new Date(), updatedAt: new Date()};
    await db.collection('roles').insertMany([{name: 'admin', level: 1, ...now}, {name: 'user', level: 2, ...now}]);
    const {insertedId: unitId} = await db.collection('units').insertOne({district: 'd', merhav: 'm', station: 's', ...now});
    const {insertedId: titleId} = await db.collection('jobtitles').insertOne({name: 'existing title', ...now});
    s = await startServer(ADMIN);
    const user = await db.collection('users').findOne({});
    check('existing roles, unit and job title are reused',
        await count('roles') === 2 && await count('units') === 1 && await count('jobtitles') === 1
        && String(user?.unit) === String(unitId) && String(user?.job_title) === String(titleId));
    await stopServer(s);

    // 5) no FIRST_ADMIN_PASSWORD -> nothing is created
    await conn.dropDatabase();
    s = await startServer({FIRST_ADMIN_USERNAME: undefined, FIRST_ADMIN_PASSWORD: undefined});
    check('without FIRST_ADMIN_PASSWORD: no user, no roles', await count('users') === 0 && await count('roles') === 0);
    await stopServer(s);

    // 6) the same password rule as everywhere else: 8+ characters
    s = await startServer({...ADMIN, FIRST_ADMIN_PASSWORD: '6752'});
    check('a short FIRST_ADMIN_PASSWORD stops the server with a clear message',
        s.exitCode === 1 && /FIRST_ADMIN_PASSWORD/.test(s.out.log) && !s.out.log.includes('6752'), s.out.log.slice(-300));
    await stopServer(s);
} finally {
    await conn.dropDatabase();
    await conn.close();
    fs.rmSync(UPLOADS_DIR, {recursive: true, force: true});
}

console.log(`\nfirst admin: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
