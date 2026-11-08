import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import env from './config/env.js';
import {sessionMiddleware} from './config/session.js';
import mainRoutes from './routes/Main_R.js';
import {notFound, errorHandler} from './middleware/Error_MID.js';

// built after the DB connects: the session store reuses mongoose's connection
function createApp() {
    const app = express();

    // behind nginx / Docker: trust that many proxies so req.ip (rate limits) and
    // secure cookies use the real client, not the proxy
    app.set('trust proxy', env.TRUST_PROXY);

    app.use(helmet());
    if (env.NODE_ENV !== 'test')
        app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
    // compressed bodies are refused: no client sends them, and inflating is extra work and attack surface
    app.use(express.json({inflate: false}));
    // nothing from the API may be kept by shared caches or proxies (user data, DVR logins).
    // Pin images replace this with a private browser cache (controllers/Pins_C.js)
    app.use((req, res, next) => {
        res.set('Cache-Control', 'private, no-store');
        next();
    });
    app.use(sessionMiddleware());

    // for Docker / uptime checks — public, says nothing about users
    app.get('/health', (req, res) => {
        const dbUp = mongoose.connection.readyState === 1;
        res.status(dbUp ? 200 : 503).json({status: dbUp ? 'ok' : 'db down'});
    });

    app.use('/', mainRoutes);

    app.use(notFound);
    app.use(errorHandler);

    return app;
}

export default createApp;
