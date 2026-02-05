// Conversation message types
export interface ConversationMessage {
    role: 'scammer' | 'agent';
    content: string;
    timestamp: string;
}

// Incoming API request structure
export interface IncomingRequest {
    conversation_id: string;
    message: string;
    timestamp: string;
    history?: ConversationMessage[];
}

// Extracted intelligence from scammer messages
export interface ExtractedIntelligence {
    bank_accounts: string[];
    upi_ids: string[];
    phone_numbers: string[];
    phishing_urls: string[];
    email_addresses: string[];
}

// Metrics for engagement tracking
export interface EngagementMetrics {
    turn_number: number;
    engagement_duration_seconds: number;
    conversation_state: 'active' | 'completed' | 'timeout';
}

// Complete API response structure (matches hackathon expected format)
export interface APIResponse {
    scam_detected: boolean;
    confidence_score: number;
    agent_response: string;
    engagement_metrics: EngagementMetrics;
    extracted_intelligence: ExtractedIntelligence;
}

// Internal conversation state
export interface ConversationState {
    conversationId: string;
    history: ConversationMessage[];
    startTime: number;
    turnCount: number;
    intelligence: ExtractedIntelligence;
    isActive: boolean;
    scamType: string;
}

// Scam detection result
export interface ScamDetectionResult {
    isScam: boolean;
    confidence: number;
    scamType: string;
    indicators: string[];
    recommendedStrategy: string;
}
