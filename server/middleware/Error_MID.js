// unknown route -> JSON 404 instead of express's HTML page
function notFound(req, res) {
    res.status(404).json({message: `route not found: ${req.method} ${req.originalUrl}`});
}

// Express 5 sends every error thrown in a route (or a rejected async handler) here, so the
// controllers don't need their own try/catch. Known errors get a clear status; anything
// else is logged and the client only sees "Server error" (no internal details leak out).
function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);

    if (err.type === 'entity.parse.failed')
        return res.status(400).json({message: 'invalid JSON body'});
    if (err.type === 'entity.too.large')
        return res.status(413).json({message: 'request body is too large'});

    // unique index violation
    if (err.code === 11000) {
        const fields = Object.keys(err.keyPattern ?? {});
        const message = fields.length > 1
            ? `this combination of ${fields.join(', ')} already exists`
            : `${fields[0]} already exists`;
        return res.status(409).json({message, field: fields[0], fields});
    }
    // DB unreachable: 503 so the frontend can show "try again" (not a login redirect, not a bug)
    if (['MongoNotConnectedError', 'MongoServerSelectionError', 'MongoNetworkError', 'MongoNetworkTimeoutError'].includes(err.name)
        || /buffering timed out/.test(err.message)) {
        console.error(`${req.method} ${req.originalUrl}: database unavailable (${err.name})`);
        return res.status(503).json({message: 'database is unavailable, try again in a moment'});
    }
    if (err.name === 'CastError')
        return res.status(400).json({message: `invalid ${err.path}`});
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({path: e.path, message: e.message}));
        return res.status(400).json({message: errors[0]?.message ?? 'invalid data', errors});
    }

    console.error(`${req.method} ${req.originalUrl} failed:`, err);
    res.status(500).json({message: 'Server error'});
}

export {notFound, errorHandler};
