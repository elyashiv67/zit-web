// Runs once, on the first start with an EMPTY mongo-data volume (the mongo image runs it with mongosh).
// Creates the app's own user: read/write on the Zit database only (not root).
// ZIT_APP_PASSWORD comes from deploy/mongo.env and must match the password inside DB= in deploy/api.env.
if (!process.env.ZIT_APP_PASSWORD) throw new Error('ZIT_APP_PASSWORD is not set in deploy/mongo.env');

db.getSiblingDB('Zit').createUser({
    user: 'zit_app',
    pwd: process.env.ZIT_APP_PASSWORD,
    roles: [{role: 'readWrite', db: 'Zit'}],
});
