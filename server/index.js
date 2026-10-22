import mongoose from 'mongoose';
import env from './config/env.js';
import db_connect from './config/db_config.js';
import createApp from './app.js';

const start = async () => {
    await db_connect();
    const server = createApp().listen(env.PORT, () => {
        console.log(`Server is running on port ${env.PORT} ✅ \nhttp://${env.HOST}:${env.PORT}`);
    });

    // Docker stop / Ctrl+C: finish the requests in progress, then close the DB
    const shutdown = (signal) => {
        console.log(`${signal} received, shutting down`);
        server.close(async () => {
            await mongoose.disconnect();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10_000).unref(); // don't hang forever on a stuck request
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
};

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
