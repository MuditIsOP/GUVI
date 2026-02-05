import { GeminiService } from './geminiService.js';
import { ScamDetectionResult, ConversationMessage } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class ScamDetector {
    private geminiService: GeminiService;

    constructor() {
        this.geminiService = new GeminiService();
    }

    async detectScam(
        message: string,
        history: ConversationMessage[]
    ): Promise<ScamDetectionResult> {
        const detectionPrompt = `You are an expert scam detection AI specialized in detecting fraud attempts, especially in the Indian context.

CONVERSATION HISTORY:
${history.length > 0 ? history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n') : '(No prior history)'}

NEW MESSAGE TO ANALYZE: "${message}"

SCAM CATEGORIES TO DETECT:

**Financial Scams (India-specific):**
- KYC update scams (bank, Paytm, PhonePe)
- UPI fraud (fake payment requests, QR code scams)
- RBI/bank impersonation
- Income tax refund scams
- Electricity/gas bill disconnection threats
- Insurance claim scams
- Loan pre-approval scams with processing fees

**Prize/Lottery Scams:**
- Lucky draw winners
- International lottery
- Gift card rewards

**Job/Business Scams:**
- Work from home with upfront fees
- Data entry jobs
- Forex/crypto trading schemes
- MLM/pyramid schemes

**Tech Support Scams:**
- Computer virus alerts
- Account suspension threats
- Software license expiry

**Social Engineering:**
- Relative in emergency
- Romance scams
- Charity fraud

**Key Indicators:**
1. Urgency/time pressure ("Act NOW", "expires in 24 hours")
2. Requests for money, OTP, PIN, bank details
3. Too-good-to-be-true offers
4. Poor grammar/spelling
5. Suspicious links (bit.ly, tinyurl, random domains)
6. Requests to move to WhatsApp/Telegram
7. Authority impersonation
8. Guaranteed returns on investment

RESPOND ONLY IN THIS EXACT JSON FORMAT (no markdown, no code blocks, no explanations):
{
  "isScam": true or false,
  "confidence": 0.0 to 1.0,
  "scamType": "category name",
  "indicators": ["indicator1", "indicator2"],
  "recommendedStrategy": "brief engagement strategy"
}`;

        try {
            const response = await this.geminiService.sendSimpleMessage(
                `${detectionPrompt}\n\nAnalyze this message: "${message}"`
            );

            // Parse the JSON response - handle various formats
            let jsonStr = response;

            // Remove markdown code blocks if present
            jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

            // Find JSON object
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                logger.warn('Could not parse scam detection response', { response });
                throw new Error('Invalid JSON response from Gemini');
            }

            const result = JSON.parse(jsonMatch[0]);

            logger.info('Scam detection completed', {
                isScam: result.isScam,
                confidence: result.confidence,
                scamType: result.scamType,
                indicatorCount: result.indicators?.length || 0
            });

            return {
                isScam: result.isScam ?? false,
                confidence: Math.min(Math.max(result.confidence ?? 0.5, 0), 1),
                scamType: result.scamType || 'unknown',
                indicators: result.indicators ?? [],
                recommendedStrategy: result.recommendedStrategy ?? 'engage cautiously'
            };
        } catch (error) {
            logger.error('Scam detection error', error);

            // Use keyword-based fallback detection
            const fallbackResult = this.fallbackDetection(message);
            return fallbackResult;
        }
    }

    private fallbackDetection(message: string): ScamDetectionResult {
        const lowerMessage = message.toLowerCase();

        const scamKeywords = [
            // Prize/lottery
            'congratulations', 'winner', 'lottery', 'prize', 'won',
            // Urgency
            'urgent', 'immediately', 'expire', 'suspended', 'blocked',
            // Financial
            'bank account', 'upi', 'transfer', 'payment', 'otp', 'pin',
            'kyc', 'verify', 'update your',
            // Offers
            'guaranteed', 'risk free', 'double your money', 'investment opportunity',
            // Job scams
            'work from home', 'earn money', 'part time job', 'data entry',
            // Authority
            'rbi', 'income tax', 'police', 'government'
        ];

        const indicators: string[] = [];
        let matchCount = 0;

        for (const keyword of scamKeywords) {
            if (lowerMessage.includes(keyword)) {
                indicators.push(`Contains "${keyword}"`);
                matchCount++;
            }
        }

        // Check for URLs
        if (/https?:\/\/|bit\.ly|tinyurl/i.test(message)) {
            indicators.push('Contains suspicious URL');
            matchCount++;
        }

        // Check for phone numbers/UPI
        if (/\+91|@\w+|upi/i.test(message)) {
            indicators.push('Contains payment information');
            matchCount++;
        }

        const isScam = matchCount >= 2;
        const confidence = Math.min(0.5 + (matchCount * 0.1), 0.95);

        return {
            isScam,
            confidence,
            scamType: 'unknown',
            indicators: indicators.slice(0, 5),
            recommendedStrategy: isScam ? 'engage with curiosity' : 'monitor'
        };
    }
}

// Singleton instance
export const scamDetector = new ScamDetector();
