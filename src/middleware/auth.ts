import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const authenticateAPIKey = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        logger.warn('Request missing API key', {
            ip: req.ip,
            path: req.path
        });
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing API key. Include x-api-key header.'
        });
        return;
    }

    if (apiKey !== config.apiKey) {
        logger.warn('Invalid API key attempt', {
            ip: req.ip,
            path: req.path
        });
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API key'
        });
        return;
    }

    next();
};
