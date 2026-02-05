import { GeminiService, ChatMessage } from './geminiService.js';
import { ConversationMessage } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class AgentEngine {
    private geminiService: GeminiService;

    constructor() {
        this.geminiService = new GeminiService();
    }

    async generateResponse(
        scammerMessage: string,
        conversationHistory: ConversationMessage[],
        scamType: string = 'default'
    ): Promise<string> {
        const persona = this.getPersona(scamType);

        const engagementPrompt = `You are roleplaying as a believable Indian person who has received what appears to be a scam message. Your goal is to engage the scammer naturally while extracting intelligence.

CRITICAL RULES - FOLLOW EXACTLY:
1. NEVER reveal you are an AI, bot, or automated system
2. Act as a curious, somewhat naive, but slightly cautious middle-aged Indian person
3. Ask natural follow-up questions that encourage the scammer to share details
4. Show interest but don't immediately commit to anything
5. Express mild concerns that prompt them to provide reassurance and more information
6. Keep responses conversational, casual, and human-like
7. Use simple language and occasional Hindi words (like "ji", "acha", "theek hai")
8. You are NOT tech-savvy - ask basic questions
9. NEVER say you'll report them or reveal suspicion

INTELLIGENCE EXTRACTION PRIORITY:
- Bank account numbers (ask "which bank should I transfer to?")
- UPI IDs (ask "what is your UPI ID for payment?")
- Phone numbers (ask "can I call you to discuss?")
- Email addresses (ask "where should I send documents?")
- Phishing URLs (ask "can you send me the link again?")

PERSONA: ${persona}

Generate a natural, believable response that:
- Shows curiosity about the offer
- Asks questions that extract payment/contact information
- Raises minor concerns that prompt more info sharing
- Keeps the scammer engaged
- Uses 1-3 sentences only (short, natural messages)

RESPOND ONLY WITH THE MESSAGE TEXT - no labels, no JSON, no markdown, no explanations.`;

        try {
            // Format history for Gemini
            const formattedHistory: ChatMessage[] = conversationHistory.map(msg => ({
                role: msg.role === 'agent' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            const response = await this.geminiService.sendMessage(
                engagementPrompt,
                scammerMessage,
                formattedHistory
            );

            // Clean up response - remove any unwanted formatting
            let cleanResponse = response.trim();

            // Remove quotes if the AI wrapped the response
            if (cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) {
                cleanResponse = cleanResponse.slice(1, -1);
            }

            logger.info('Generated agent response', {
                responseLength: cleanResponse.length,
                historyLength: conversationHistory.length,
                scamType
            });

            return cleanResponse;
        } catch (error) {
            logger.error('Agent response generation error', error);

            // Use strategic fallback responses
            return this.getFallbackResponse(scamType, conversationHistory.length);
        }
    }

    private getPersona(scamType: string): string {
        const personas: Record<string, string> = {
            'lottery': 'You are excited about potentially winning but cautiously asking for details. You want to know HOW you won, what you need to do, and WHO to contact. You mention you never entered any lottery.',

            'prize': 'You are thrilled but confused. You ask what prize, how you were selected, and what you need to do to claim it.',

            'kyc': 'You are worried about your bank account. You ask what KYC means, why it\'s urgent, and what happens if you don\'t update. You mention you\'re confused about the process.',

            'investment': 'You are interested in making extra money but want to understand the investment process. Ask about minimum amounts, how payments work, who runs the platform, and what guarantees exist.',

            'job': 'You are a job seeker excited about the opportunity but want to understand the role, company name, why there are upfront fees, and when you\'ll start earning.',

            'loan': 'You need money urgently and are interested. Ask about interest rates, why processing fees are needed upfront, and what documents are required.',

            'tech_support': 'You are a non-technical person worried about your computer/phone. Ask basic questions about what the problem is, how they found out, and how they can help.',

            'tax': 'You are confused and scared about tax issues. Ask what tax problem, which year, and why you didn\'t get official notice.',

            'utility': 'You are worried about disconnection. Ask which bill is pending, why you didn\'t get SMS from the company, and how to pay.',

            'unknown': 'You are a curious but cautious person who wants more information. Ask clarifying questions about who they are and what exactly they want.',

            'default': 'You are a curious but slightly cautious middle-aged Indian person. You ask clarifying questions and want to understand the offer before proceeding.'
        };

        return personas[scamType.toLowerCase()] || personas['default'];
    }

    private getFallbackResponse(scamType: string, turnCount: number): string {
        const fallbacks: Record<string, string[][]> = {
            'lottery': [
                ['Oh really? But I never entered any lottery. How did I win?', 'Wah! This is amazing news! But which lottery is this? Please tell me more.'],
                ['Acha ji, so what do I need to do to claim this prize?', 'How much is the prize amount? And what is the process?'],
                ['OK, I am interested. Where should I send the payment?', 'Can you share your UPI ID? I will transfer the amount.']
            ],
            'kyc': [
                ['KYC kya hota hai ji? My bank sent this?', 'Oh no! What will happen to my account? Please help me.'],
                ['What details do you need from me?', 'Should I share my Aadhaar or PAN? What is needed?'],
                ['OK ji, where should I update? Send me the link.', 'Can I call you? What is your number?']
            ],
            'default': [
                ['Acha? Can you explain more please?', 'This is interesting. Tell me more about this.'],
                ['What do I need to do? I am confused.', 'Who are you? Which company is this?'],
                ['OK, I am interested. How do I proceed?', 'What are the charges? Where should I pay?']
            ]
        };

        const responses = fallbacks[scamType.toLowerCase()] || fallbacks['default'];
        const turnIndex = Math.min(turnCount, responses.length - 1);
        const options = responses[turnIndex];

        return options[Math.floor(Math.random() * options.length)];
    }
}

// Singleton instance
export const agentEngine = new AgentEngine();
