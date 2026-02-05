import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Flexible schema - accept various formats from hackathon tester
const flexibleRequestSchema = z.object({
    // conversation_id is optional - we'll generate one if missing
    conversation_id: z.string().optional(),

    // message can be string OR object with content
    message: z.union([
        z.string().min(1),
        z.object({
            content: z.string().optional(),
            text: z.string().optional(),
            body: z.string().optional()
        }).transform(obj => obj.content || obj.text || obj.body || '')
    ]),

    // timestamp is optional - we'll use current time if missing
    timestamp: z.string().optional(),

    // history is optional
    history: z.array(z.any()).optional()
}).passthrough(); // Allow additional fields

export const validateMessageRequest = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        logger.debug('Raw request body', { body: JSON.stringify(req.body) });

        // Parse and transform the request
        const parsed = flexibleRequestSchema.parse(req.body);

        // Normalize the request body
        req.body = {
            conversation_id: parsed.conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: typeof parsed.message === 'string' ? parsed.message : String(parsed.message),
            timestamp: parsed.timestamp || new Date().toISOString(),
            history: parsed.history || []
        };

        // Handle case where message is still empty - try to extract from raw body
        if (!req.body.message || req.body.message === '[object Object]') {
            const rawBody = req.body;
            // Try common field names
            const possibleMessage = rawBody.text || rawBody.content || rawBody.body ||
                rawBody.scam_message || rawBody.input || rawBody.query;
            if (possibleMessage) {
                req.body.message = String(possibleMessage);
            }
        }

        logger.debug('Normalized request body', { body: req.body });

        if (!req.body.message || req.body.message.length === 0) {
            res.status(400).json({
                error: 'Validation Error',
                message: 'No message content found in request'
            });
            return;
        }

        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            logger.warn('Validation error', { errors: error.errors, body: req.body });
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
