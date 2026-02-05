import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiKey: process.env.API_KEY || 'your-secure-api-key-change-this',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    conversationTTL: parseInt(process.env.CONVERSATION_TTL || '3600', 10),
    maxConversationTurns: parseInt(process.env.MAX_CONVERSATION_TURNS || '15', 10),
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.70'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    logLevel: process.env.LOG_LEVEL || 'info'
};

// Validate required configuration
export function validateConfig(): void {
    if (!config.geminiApiKey || config.geminiApiKey === 'your-gemini-api-key-here') {
        console.warn('⚠️  Warning: GEMINI_API_KEY is not set. AI API calls will fail.');
    }

    if (config.apiKey === 'your-secure-api-key-change-this') {
        console.warn('⚠️  Warning: Using default API key. Change this in production!');
    }
}
