import Groq from 'groq-sdk';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Model to use - Llama 3.3 70B is fast and capable
const MODEL_NAME = 'llama-3.3-70b-versatile';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export class GroqService {
    private client: Groq;

    constructor() {
        this.client = new Groq({
            apiKey: config.groqApiKey,
        });
    }

    async sendMessage(
        systemPrompt: string,
        userMessage: string,
        conversationHistory: ChatMessage[] = []
    ): Promise<string> {
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.debug('Sending message to Groq', {
                    attempt,
                    model: MODEL_NAME,
                    messageLength: userMessage.length,
                    historyLength: conversationHistory.length
                });

                // Build messages array
                const messages: ChatMessage[] = [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory,
                    { role: 'user', content: userMessage }
                ];

                const completion = await this.client.chat.completions.create({
                    model: MODEL_NAME,
                    messages: messages,
                    temperature: 0.8,
                    max_tokens: 1024,
                    top_p: 0.95,
                });

                const text = completion.choices[0]?.message?.content || '';

                logger.debug('Received response from Groq', {
                    responseLength: text.length
                });

                return text;
            } catch (error: any) {
                lastError = error;
                logger.warn(`Groq API attempt ${attempt} failed`, { error: error.message });

                if (attempt < maxRetries) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt) * 500;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        logger.error('Groq API failed after all retries', lastError);
        throw new Error('Failed to communicate with Groq API');
    }

    async sendSimpleMessage(prompt: string): Promise<string> {
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const completion = await this.client.chat.completions.create({
                    model: MODEL_NAME,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 1024,
                });

                return completion.choices[0]?.message?.content || '';
            } catch (error: any) {
                lastError = error;
                logger.warn(`Groq simple message attempt ${attempt} failed`, { error: error.message });

                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 500;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        logger.error('Groq API failed after all retries', lastError);
        throw new Error('Failed to communicate with Groq API');
    }
}

// Singleton instance
export const groqService = new GroqService();

// Re-export as geminiService for backward compatibility
export const geminiService = groqService;
