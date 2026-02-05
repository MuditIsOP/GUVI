import { config } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

const currentLevel = logLevels[config.logLevel as LogLevel] || logLevels.info;

function formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
}

export const logger = {
    debug(message: string, data?: unknown): void {
        if (logLevels.debug >= currentLevel) {
            console.log(formatMessage('debug', message, data));
        }
    },

    info(message: string, data?: unknown): void {
        if (logLevels.info >= currentLevel) {
            console.log(formatMessage('info', message, data));
        }
    },

    warn(message: string, data?: unknown): void {
        if (logLevels.warn >= currentLevel) {
            console.warn(formatMessage('warn', message, data));
        }
    },

    error(message: string, data?: unknown): void {
        if (logLevels.error >= currentLevel) {
            console.error(formatMessage('error', message, data));
        }
    }
};
