import { ExtractedIntelligence } from '../types/index.js';
import { GroqService } from './groqService.js';
import { logger } from '../utils/logger.js';

export class IntelligenceExtractor {
    private groqService: GroqService;

    // Comprehensive regex patterns for intelligence extraction
    private patterns = {
        // Indian bank account: 9-18 digits
        bankAccount: /\b\d{9,18}\b/g,

        // IFSC Code: 4 letters + 0 + 6 alphanumeric
        ifscCode: /\b[A-Z]{4}0[A-Z0-9]{6}\b/gi,

        // UPI ID: various formats
        upiId: /\b[a-zA-Z0-9._-]+@(?:ybl|paytm|okaxis|oksbi|okhdfcbank|okicici|axisbank|sbi|hdfc|icici|upi|gpay|phonepe|ibl|axl|airtel|freecharge|amazonpay|slice|jupiter|cred|groww)\b/gi,

        // Phone numbers: Indian and international
        phoneNumber: /(?:\+91[-\s]?)?(?:\d{10}|\d{5}[-\s]\d{5}|\d{4}[-\s]\d{3}[-\s]\d{3})/g,

        // URLs: http/https and suspicious domains
        url: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi,

        // Short URLs (often phishing)
        shortUrl: /\b(?:bit\.ly|tinyurl\.com|goo\.gl|t\.co|is\.gd|buff\.ly|ow\.ly|tr\.im|tiny\.cc)\/\S+/gi,

        // Email addresses
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

        // WhatsApp/Telegram numbers
        whatsapp: /(?:whatsapp|telegram|wa\.me|t\.me)[:\s]*(?:\+91[-\s]?)?\d{10}/gi,

        // Crypto wallet addresses
        cryptoWallet: /\b(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b/g
    };

    constructor() {
        this.groqService = new GroqService();
    }

    extractIntelligence(
        text: string,
        existingIntel: ExtractedIntelligence
    ): ExtractedIntelligence {
        const newIntel: ExtractedIntelligence = {
            bank_accounts: this.extractAndMerge(
                text,
                this.patterns.bankAccount,
                existingIntel.bank_accounts,
                this.validateBankAccount.bind(this)
            ),
            upi_ids: this.extractAndMerge(
                text,
                this.patterns.upiId,
                existingIntel.upi_ids,
                (id) => id.includes('@')
            ),
            phone_numbers: this.extractPhoneNumbers(text, existingIntel.phone_numbers),
            phishing_urls: this.extractUrls(text, existingIntel.phishing_urls),
            email_addresses: this.extractAndMerge(
                text,
                this.patterns.email,
                existingIntel.email_addresses,
                this.validateEmail.bind(this)
            )
        };

        // Log extraction summary
        const newItemsCount = this.countNewItems(existingIntel, newIntel);
        if (newItemsCount > 0) {
            logger.info('Extracted new intelligence', {
                newItemsCount,
                totalItems: this.getTotalCount(newIntel),
                details: {
                    bankAccounts: newIntel.bank_accounts.length,
                    upiIds: newIntel.upi_ids.length,
                    phones: newIntel.phone_numbers.length,
                    urls: newIntel.phishing_urls.length,
                    emails: newIntel.email_addresses.length
                }
            });
        }

        return newIntel;
    }

    // AI-powered extraction for complex cases
    async extractWithAI(
        text: string,
        existingIntel: ExtractedIntelligence
    ): Promise<ExtractedIntelligence> {
        // First do regex extraction
        const regexIntel = this.extractIntelligence(text, existingIntel);

        try {
            const prompt = `Extract any financial/contact information from this text. Return ONLY valid JSON:
{
  "bank_accounts": ["account numbers found"],
  "upi_ids": ["upi@provider IDs found"],
  "phone_numbers": ["phone numbers found"],
  "urls": ["any URLs found"],
  "emails": ["email addresses found"]
}

Text: "${text}"

Return empty arrays if nothing found. No explanations.`;

            const response = await this.groqService.sendSimpleMessage(prompt);

            // Parse AI response
            const jsonMatch = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiResult = JSON.parse(jsonMatch[0]);

                // Merge AI results with regex results
                return {
                    bank_accounts: [...new Set([...regexIntel.bank_accounts, ...(aiResult.bank_accounts || [])])],
                    upi_ids: [...new Set([...regexIntel.upi_ids, ...(aiResult.upi_ids || [])])],
                    phone_numbers: [...new Set([...regexIntel.phone_numbers, ...(aiResult.phone_numbers || [])])],
                    phishing_urls: [...new Set([...regexIntel.phishing_urls, ...(aiResult.urls || [])])],
                    email_addresses: [...new Set([...regexIntel.email_addresses, ...(aiResult.emails || [])])]
                };
            }
        } catch (error) {
            logger.warn('AI extraction failed, using regex results', error);
        }

        return regexIntel;
    }

    private extractAndMerge(
        text: string,
        pattern: RegExp,
        existing: string[],
        validator: (item: string) => boolean
    ): string[] {
        const matches = text.match(pattern) || [];
        const validMatches = matches.filter(validator);
        const allItems = [...existing, ...validMatches];
        return [...new Set(allItems)];
    }

    private extractPhoneNumbers(text: string, existing: string[]): string[] {
        const patterns = [
            this.patterns.phoneNumber,
            this.patterns.whatsapp
        ];

        const allMatches: string[] = [...existing];

        for (const pattern of patterns) {
            const matches = text.match(pattern) || [];
            for (const match of matches) {
                // Normalize phone number
                const digits = match.replace(/\D/g, '');
                if (digits.length >= 10 && digits.length <= 15) {
                    // Format consistently
                    const formatted = digits.length === 10 ? `+91${digits}` :
                        digits.startsWith('91') ? `+${digits}` : digits;
                    allMatches.push(formatted);
                }
            }
        }

        return [...new Set(allMatches)];
    }

    private extractUrls(text: string, existing: string[]): string[] {
        const allMatches: string[] = [...existing];

        // Regular URLs
        const urls = text.match(this.patterns.url) || [];
        urls.forEach(url => {
            if (this.isSuspiciousUrl(url)) {
                allMatches.push(url);
            }
        });

        // Short URLs (always suspicious)
        const shortUrls = text.match(this.patterns.shortUrl) || [];
        allMatches.push(...shortUrls);

        return [...new Set(allMatches)];
    }

    private isSuspiciousUrl(url: string): boolean {
        const legitimate = [
            'google.com', 'facebook.com', 'twitter.com', 'linkedin.com',
            'microsoft.com', 'apple.com', 'amazon.com', 'youtube.com',
            'github.com', 'stackoverflow.com', 'wikipedia.org'
        ];

        const lower = url.toLowerCase();

        // It's suspicious if NOT a legitimate domain
        return !legitimate.some(site => lower.includes(site));
    }

    private validateBankAccount(account: string): boolean {
        const num = parseInt(account, 10);
        if (isNaN(num)) return false;

        // Exclude likely years (1900-2100)
        if (num >= 1900 && num <= 2100) return false;

        // Exclude common non-account patterns
        if (/^0+$/.test(account)) return false;
        if (/^[1-9]0{6,}$/.test(account)) return false;

        return true;
    }

    private validateEmail(email: string): boolean {
        const lower = email.toLowerCase();

        // Exclude obvious test emails
        if (lower.includes('example') || lower.includes('test@test')) return false;

        return true;
    }

    private countNewItems(
        existing: ExtractedIntelligence,
        updated: ExtractedIntelligence
    ): number {
        return (
            (updated.bank_accounts.length - existing.bank_accounts.length) +
            (updated.upi_ids.length - existing.upi_ids.length) +
            (updated.phone_numbers.length - existing.phone_numbers.length) +
            (updated.phishing_urls.length - existing.phishing_urls.length) +
            (updated.email_addresses.length - existing.email_addresses.length)
        );
    }

    getTotalCount(intel: ExtractedIntelligence): number {
        return (
            intel.bank_accounts.length +
            intel.upi_ids.length +
            intel.phone_numbers.length +
            intel.phishing_urls.length +
            intel.email_addresses.length
        );
    }
}

// Singleton instance
export const intelExtractor = new IntelligenceExtractor();
