import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface ApiError extends Error {
    statusCode?: number;
    details?: unknown;
}

export const errorHandler = (
    err: ApiError,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    logger.error('Error handling request', {
        error: message,
        statusCode,
        path: req.path,
        method: req.method,
        details: err.details
    });

    res.status(statusCode).json({
        error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error',
        message: statusCode >= 500 ? 'An unexpected error occurred' : message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
