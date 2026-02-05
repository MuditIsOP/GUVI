import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Schema for conversation message
const conversationMessageSchema = z.object({
    role: z.enum(['scammer', 'agent']),
    content: z.string().min(1, 'Content cannot be empty'),
    timestamp: z.string()
});

// Schema for incoming request
const incomingRequestSchema = z.object({
    conversation_id: z.string().min(1, 'conversation_id is required'),
    message: z.string().min(1, 'message cannot be empty'),
    timestamp: z.string(),
    history: z.array(conversationMessageSchema).optional()
});

export const validateMessageRequest = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        incomingRequestSchema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            logger.warn('Validation error', { errors: error.errors });
            res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid request format',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message
                }))
            });
            return;
        }

        logger.error('Unexpected validation error', error);
        res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid request format'
        });
    }
};
