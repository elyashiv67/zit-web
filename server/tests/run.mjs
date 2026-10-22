// npm test — end-to-end test of every route.
// Runs a real server on its own database (TEST_DB_NAME, default "zit_test") on the same
// MongoDB as .env, and its own temp uploads folder, so real data is never touched.
// The test database is dropped before and after.
import 'dotenv/config';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SERVER_DIR = path.join(import.meta.dirname, '..');
const DB_NAME = process.env.TEST_DB_NAME || 'zit_test';
const PORT = process.env.TEST_PORT || '4599';
const UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'zit-test-uploads-'));

const conn = await mongoose.createConnection(process.env.DB, {dbName: DB_NAME}).asPromise();
const realDbName = new URL(process.env.DB.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.slice(1);
if (conn.name === realDbName || !/test/i.test(conn.name)) {
    console.error(`refusing to run: test database "${conn.name}" must contain "test" and differ from the real one`);
    process.exit(1);
}

// seed: the two roles, one unit and an admin to log in with
await conn.dropDatabase();
const db = conn.db;
const now = {createdAt: new Date(), updatedAt: new Date(), __v: 0};
const {insertedIds: roleIds} = await db.collection('roles').insertMany([
    {name: 'admin', level: 1, ...now},
    {name: 'user', level: 2, ...now},
]);
const {insertedId: unitId} = await db.collection('units').insertOne({district: 'Tzafon', merhav: 'Amakim', station: 'Afula', ...now});
const {insertedId: adminId} = await db.collection('users').insertOne({
    name: 'test admin', user_name: 'test_admin', pass: await bcrypt.hash('secret123', 10),
    TZ: '000000001', police_id: 'p0001', phone: '0500000001', email: 'test_admin@test.com',
    role: roleIds[0], unit: unitId, ...now,
});

const testEnv = {
    ...process.env,
    NODE_ENV: 'test', PORT, DB_NAME, UPLOADS_DIR,
    BASE: `http://localhost:${PORT}`,
    TEST_ADMIN: 'test_admin', TEST_ADMIN_ID: adminId.toString(),
    ADMIN_ROLE: roleIds[0].toString(), USER_ROLE: roleIds[1].toString(), HOME_UNIT: unitId.toString(),
};

const server = spawn(process.execPath, ['index.js'], {cwd: SERVER_DIR, env: testEnv, stdio: ['ignore', 'pipe', 'inherit']});
let serverLog = '';
server.stdout.on('data', d => { serverLog += d; });

let exitCode = 1;
try {
    await waitForServer(testEnv.BASE);
    exitCode = await new Promise(resolve => {
        spawn(process.execPath, [path.join(import.meta.dirname, 'routes.test.mjs')], {cwd: SERVER_DIR, env: testEnv, stdio: 'inherit'})
            .on('exit', code => resolve(code ?? 1));
    });
} catch (e) {
    console.error(e.message, '\n', serverLog);
} finally {
    server.kill();
    await conn.dropDatabase();
    await conn.close();
    fs.rmSync(UPLOADS_DIR, {recursive: true, force: true});
}
process.exit(exitCode);

async function waitForServer(base) {
    for (let i = 0; i < 60; i++) {
        try {
            if ((await fetch(`${base}/health`)).ok) return;
        } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('test server did not start in 30s');
}
