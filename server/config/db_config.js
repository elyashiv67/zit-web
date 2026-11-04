import mongoose from 'mongoose';
import env from './env.js';

const connectDB = async () => {
    const db = mongoose.connection;

    db.on('error', (err) => console.error('MongoDB error:', err.message));
    db.on('disconnected', () => console.warn('MongoDB disconnected — the driver keeps retrying'));
    db.on('reconnected', () => console.log('MongoDB reconnected ✅'));

    await mongoose.connect(env.DB, env.DB_NAME ? {dbName: env.DB_NAME} : {});
    console.log(`MongoDB connected (${db.name}) ✅`);
};

export default connectDB;
