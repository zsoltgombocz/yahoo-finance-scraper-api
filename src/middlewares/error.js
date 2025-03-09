import dotenv from 'dotenv';

dotenv.config();

export default function (err, _req, res, _next) {
    if (err.message && err.message.includes('ERR_CONNECTION_REFUSED')) {
        return res.status(503).json({
            type: 'ERR_CONNECTION_REFUSED',
            message: 'The service you are trying to reach is unavailable.'
        });
    }

    return res.status(500).json({
        message: err.message || 'Internal Server Error',
        stack: process.env.ENV === 'local' ? err.stack : undefined
    });
}