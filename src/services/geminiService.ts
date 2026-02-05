import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
            ],
            generationConfig: {
                temperature: 0.8,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            },
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
                logger.debug('Sending message to Gemini', {
                    attempt,
                    messageLength: userMessage.length,
                    historyLength: conversationHistory.length
                });

                // Start chat with system instruction
                const chat = this.model.startChat({
                    history: conversationHistory,
                    systemInstruction: systemPrompt,
                });

                const result = await chat.sendMessage(userMessage);
                const response = result.response;
                const text = response.text();

                logger.debug('Received response from Gemini', {
                    responseLength: text.length
                });

                return text;
            } catch (error: any) {
                lastError = error;
                logger.warn(`Gemini API attempt ${attempt} failed`, { error: error.message });

                if (attempt < maxRetries) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt) * 500;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        logger.error('Gemini API failed after all retries', lastError);
        throw new Error('Failed to communicate with Gemini API');
    }

    async sendSimpleMessage(prompt: string): Promise<string> {
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.model.generateContent(prompt);
                const response = result.response;
                return response.text();
            } catch (error: any) {
                lastError = error;
                logger.warn(`Gemini simple message attempt ${attempt} failed`, { error: error.message });

                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 500;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        logger.error('Gemini API failed after all retries', lastError);
        throw new Error('Failed to communicate with Gemini API');
    }
}

// Singleton instance
export const geminiService = new GeminiService();
