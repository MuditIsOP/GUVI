import { ConversationState, ConversationMessage, ExtractedIntelligence } from '../types/index.js';
import { config } from '../config/env.js';
import { logger } from './logger.js';

export class StateManager {
    private states: Map<string, ConversationState> = new Map();
    private readonly TTL: number;

    constructor() {
        this.TTL = config.conversationTTL * 1000; // Convert to milliseconds

        // Run cleanup every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    getOrCreateState(conversationId: string): ConversationState {
        // Check if state exists and is not expired
        const existingState = this.states.get(conversationId);

        if (existingState) {
            // Check if expired
            if (Date.now() - existingState.startTime > this.TTL) {
                logger.info(`Conversation ${conversationId} expired, creating new state`);
                this.states.delete(conversationId);
            } else {
                return existingState;
            }
        }

        // Create new state
        const newState: ConversationState = {
            conversationId,
            history: [],
            startTime: Date.now(),
            turnCount: 0,
            intelligence: {
                bank_accounts: [],
                upi_ids: [],
                phone_numbers: [],
                phishing_urls: [],
                email_addresses: []
            },
            isActive: true,
            scamType: 'unknown'
        };

        this.states.set(conversationId, newState);
        logger.info(`Created new conversation state`, { conversationId });

        return newState;
    }

    addMessage(conversationId: string, message: ConversationMessage): void {
        const state = this.getOrCreateState(conversationId);
        state.history.push(message);

        // Increment turn count only for scammer messages
        if (message.role === 'scammer') {
            state.turnCount++;
        }
    }

    updateIntelligence(conversationId: string, intelligence: ExtractedIntelligence): void {
        const state = this.states.get(conversationId);
        if (state) {
            state.intelligence = intelligence;
        }
    }

    updateScamType(conversationId: string, scamType: string): void {
        const state = this.states.get(conversationId);
        if (state) {
            state.scamType = scamType;
        }
    }

    getState(conversationId: string): ConversationState | undefined {
        return this.states.get(conversationId);
    }

    getEngagementDuration(conversationId: string): number {
        const state = this.states.get(conversationId);
        if (!state) return 0;
        return Math.floor((Date.now() - state.startTime) / 1000);
    }

    isActiveConversation(conversationId: string): boolean {
        const state = this.states.get(conversationId);
        if (!state) return true; // New conversations are active

        // Check TTL
        if (Date.now() - state.startTime > this.TTL) {
            state.isActive = false;
            return false;
        }

        // Check max turns
        if (state.turnCount >= config.maxConversationTurns) {
            state.isActive = false;
            return false;
        }

        return state.isActive;
    }

    markCompleted(conversationId: string): void {
        const state = this.states.get(conversationId);
        if (state) {
            state.isActive = false;
        }
    }

    cleanup(): void {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [id, state] of this.states.entries()) {
            if (now - state.startTime > this.TTL) {
                this.states.delete(id);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.info(`Cleaned up ${cleanedCount} expired conversations`);
        }
    }

    getActiveConversationCount(): number {
        return this.states.size;
    }
}

// Singleton instance
export const stateManager = new StateManager();
