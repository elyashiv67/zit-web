import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import db_connect from './config/db_config.js';
import mainRoutes from './routes/Main_R.js';

dotenv.config();
const app = express();
app.use(express.json());
app.use(morgan('dev'));

app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: true,
}))

const port = process.env.PORT;
const api = process.env.HOST;



app.use('/' , mainRoutes);

// unknown route -> JSON 404 instead of express's HTML page
app.use((req, res) => {
    res.status(404).json({message: `route not found: ${req.method} ${req.originalUrl}`});
});

// catches malformed JSON bodies and anything thrown outside a controller's try/catch
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({message: 'invalid JSON body'});
    }
    console.error(err);
    res.status(err.status || 500).json({message: 'Server error'});
});


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