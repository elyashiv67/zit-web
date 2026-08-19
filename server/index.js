import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import db_connect from './config/db_config.js';

dotenv.config();
const app = express();
app.use(express.json());
app.use(morgan('dev'));

const port = process.env.PORT;
const api = process.env.HOST;






const start = async () => {
    await db_connect();
    app.listen(port, () => {
        console.log(`Server is running on port ${port} ✅ \nhttp://${api}:${port}`);
    });
};

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});