import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config/env.js';
import messageRouter from './routes/message.js';
import { authenticateAPIKey } from './middleware/auth.js';
import { validateMessageRequest } from './middleware/validation.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Validate configuration on startup
validateConfig();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    message: {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use(morgan('combined'));

// Health check endpoint (public)
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        service: 'agentic-honeypot',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
});

// Root endpoint - GET
app.get('/', (_req: Request, res: Response) => {
    res.json({
        service: 'Agentic Honey-Pot API',
        version: '1.0.0',
        description: 'AI-powered scam detection and engagement system',
        endpoints: {
            health: 'GET /health',
            message: 'POST / or POST /api/message',
            conversation: 'GET /api/conversation/:id',
            stats: 'GET /api/stats'
        }
    });
});

// Root endpoint - POST (for hackathon compatibility)
// Apply auth and validation, then forward to message handler
app.post('/', authenticateAPIKey, validateMessageRequest);

// Protected API routes
// Apply authentication to all /api routes
app.use('/api', authenticateAPIKey);

// Apply validation only to POST /api/message
app.post('/api/message', validateMessageRequest);

// Mount the router at both root and /api
app.use('/', messageRouter);
app.use('/api', messageRouter);

// Global error handler
app.use(errorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
    });
});

// Start server - Railway requires binding to 0.0.0.0
const PORT = process.env.PORT || 3000;
const server = app.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`🚀 Agentic Honey-Pot API running on port ${PORT}`);
    logger.info(`📊 Environment: ${config.nodeEnv}`);
    logger.info(`✅ Health check: http://localhost:${PORT}/health`);
    logger.info(`🔐 API endpoint: http://localhost:${PORT}/api/message`);
    logger.info(`⚡ Rate limit: ${config.rateLimitMaxRequests} requests per ${config.rateLimitWindowMs / 1000}s`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

export default app;
