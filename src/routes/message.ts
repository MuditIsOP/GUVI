import { Router, Request, Response } from 'express';
import { scamDetector } from '../services/scamDetector.js';
import { agentEngine } from '../services/agentEngine.js';
import { intelExtractor } from '../services/intelExtractor.js';
import { stateManager } from '../utils/stateManager.js';
import { IncomingRequest, APIResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Message handler function - shared between / and /message
const handleMessage = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
        const request: IncomingRequest = req.body;

        logger.info('Processing message', {
            conversationId: request.conversation_id,
            messageLength: request.message.length
        });

        // Get or create conversation state
        const state = stateManager.getOrCreateState(request.conversation_id);

        // Check if conversation is still active
        const isActive = stateManager.isActiveConversation(request.conversation_id);

        // Run scam detection
        const detectionResult = await scamDetector.detectScam(
            request.message,
            state.history
        );

        // Update scam type in state
        if (detectionResult.scamType && detectionResult.scamType !== 'unknown') {
            stateManager.updateScamType(request.conversation_id, detectionResult.scamType);
        }

        // Add scammer message to history
        stateManager.addMessage(request.conversation_id, {
            role: 'scammer',
            content: request.message,
            timestamp: request.timestamp
        });

        // Extract intelligence from scammer's message
        const updatedIntel = intelExtractor.extractIntelligence(
            request.message,
            state.intelligence
        );
        stateManager.updateIntelligence(request.conversation_id, updatedIntel);

        // Generate agent response if conversation is active and it's a scam
        let agentResponse = '';
        const currentScamType = stateManager.getState(request.conversation_id)?.scamType || 'default';

        if (isActive && detectionResult.isScam) {
            agentResponse = await agentEngine.generateResponse(
                request.message,
                state.history,
                currentScamType
            );

            // Add agent response to history
            stateManager.addMessage(request.conversation_id, {
                role: 'agent',
                content: agentResponse,
                timestamp: new Date().toISOString()
            });
        } else if (!detectionResult.isScam) {
            agentResponse = 'Message does not appear to be a scam. No engagement necessary.';
        } else {
            agentResponse = 'Conversation has reached its limit.';
            stateManager.markCompleted(request.conversation_id);
        }

        // Get updated state for metrics
        const updatedState = stateManager.getState(request.conversation_id);
        const conversationState = !isActive ? 'timeout' :
            (updatedState?.turnCount || 0) >= 15 ? 'completed' : 'active';

        // Build response matching EXACT hackathon expected format
        const response: APIResponse = {
            scam_detected: detectionResult.isScam,
            confidence_score: Math.round(detectionResult.confidence * 100) / 100,
            agent_response: agentResponse,
            engagement_metrics: {
                turn_number: updatedState?.turnCount || 1,
                engagement_duration_seconds: stateManager.getEngagementDuration(request.conversation_id),
                conversation_state: conversationState
            },
            extracted_intelligence: updatedIntel
        };

        const processingTime = Date.now() - startTime;
        logger.info('Message processed successfully', {
            conversationId: request.conversation_id,
            processingTimeMs: processingTime,
            scamDetected: detectionResult.isScam,
            scamType: currentScamType,
            turnNumber: updatedState?.turnCount
        });

        res.json(response);
    } catch (error) {
        logger.error('Message processing error', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process message'
        });
    }
};

// Register handler at both / and /message for hackathon compatibility
router.post('/', handleMessage);
router.post('/message', handleMessage);
// Get conversation status
router.get('/conversation/:id', (req: Request, res: Response): void => {
    const { id } = req.params;
    const state = stateManager.getState(id);

    if (!state) {
        res.status(404).json({
            error: 'Not Found',
            message: 'Conversation not found'
        });
        return;
    }

    res.json({
        conversation_id: state.conversationId,
        turn_count: state.turnCount,
        is_active: state.isActive,
        scam_type: state.scamType,
        duration_seconds: stateManager.getEngagementDuration(id),
        extracted_intelligence: state.intelligence,
        history_length: state.history.length
    });
});

// Get system stats
router.get('/stats', (_req: Request, res: Response): void => {
    res.json({
        active_conversations: stateManager.getActiveConversationCount(),
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

export default router;
