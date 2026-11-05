// One-time: every user must have a job title. Creates the title "חוקר זיט" (if missing) and gives it to
// every user who has none. Safe to run again: the second run changes nothing.
// Usage (from server/): node scripts/add-job-titles.mjs
// Uses DB (and DB_NAME, if set) from .env, the same database the server uses.
import 'dotenv/config';
import mongoose from 'mongoose';

const TITLE = 'חוקר זיט';

const {DB, DB_NAME} = process.env;
if (!DB) {
    console.error('DB is not set (.env)');
    process.exit(1);
}

await mongoose.connect(DB, DB_NAME ? {dbName: DB_NAME} : {});
const db = mongoose.connection.db;
try {
    const now = new Date();
    const title = await db.collection('jobtitles').findOneAndUpdate(
        {name: TITLE},
        {$setOnInsert: {name: TITLE, createdAt: now, updatedAt: now, __v: 0}},
        {upsert: true, returnDocument: 'after'},
    );
    const {modifiedCount} = await db.collection('users').updateMany(
        {$or: [{job_title: {$exists: false}}, {job_title: null}]},
        {$set: {job_title: title._id, updatedAt: now}},
    );
    console.log(`database "${db.databaseName}": title "${TITLE}" ${title._id}, updated ${modifiedCount} users`);
} finally {
    await mongoose.disconnect();
}
