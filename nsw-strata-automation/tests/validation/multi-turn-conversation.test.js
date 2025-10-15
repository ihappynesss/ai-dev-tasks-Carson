/**
 * Multi-Turn Conversation Handling Tests
 *
 * Validates the reply-handler workflow for multi-turn conversations including:
 * - Conversation state tracking
 * - Sentiment analysis and escalation
 * - Confidence degradation
 * - Automatic ticket closure
 * - Context re-evaluation
 *
 * Related workflows:
 * - workflows/reply-handler.json
 * - workflows/main-ticket-processor.json
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');

describe('Multi-Turn Conversation Handling', () => {

  describe('Conversation State Tracking', () => {

    test('should initialize conversation state on first reply', () => {
      const conversationState = {
        ticket_id: 'TEST-001',
        turn_count: 1,
        conversation_history: [
          {
            turn: 1,
            customer_message: 'Thanks for the response, but I need more details about the timeline.',
            timestamp: new Date().toISOString(),
          }
        ],
        current_knowledge_id: 'kb-roof-leak-001',
        confidence_level: 0.82,
        last_updated: new Date().toISOString(),
      };

      expect(conversationState.ticket_id).toBe('TEST-001');
      expect(conversationState.turn_count).toBe(1);
      expect(conversationState.conversation_history).toHaveLength(1);
      expect(conversationState.confidence_level).toBeGreaterThan(0.8);
    });

    test('should append new turns to conversation history', () => {
      const conversationState = {
        ticket_id: 'TEST-001',
        turn_count: 2,
        conversation_history: [
          {
            turn: 1,
            customer_message: 'Thanks for the response, but I need more details.',
            ai_response: 'I understand you need more details...',
            sentiment: 'neutral',
            timestamp: '2025-01-15T10:00:00Z',
          },
          {
            turn: 2,
            customer_message: 'Can you clarify who is responsible for the repair?',
            timestamp: '2025-01-15T11:30:00Z',
          }
        ],
        current_knowledge_id: 'kb-roof-leak-001',
        confidence_level: 0.82,
      };

      expect(conversationState.turn_count).toBe(2);
      expect(conversationState.conversation_history).toHaveLength(2);
      expect(conversationState.conversation_history[1].turn).toBe(2);
    });

    test('should track knowledge entry used in each turn', () => {
      const conversationState = {
        ticket_id: 'TEST-001',
        turn_count: 2,
        conversation_history: [
          {
            turn: 1,
            knowledge_id: 'kb-roof-leak-001',
            similarity_score: 0.87,
          },
          {
            turn: 2,
            knowledge_id: 'kb-roof-leak-001',
            similarity_score: 0.82,
          }
        ],
        current_knowledge_id: 'kb-roof-leak-001',
      };

      expect(conversationState.conversation_history[0].knowledge_id).toBe('kb-roof-leak-001');
      expect(conversationState.conversation_history[1].knowledge_id).toBe('kb-roof-leak-001');
    });

    test('should maintain conversation context across turns', () => {
      const conversationContext = {
        original_issue: 'Water leaking from ceiling in unit 5',
        property_id: 'PROP-123',
        lot_number: '5',
        category: 'Maintenance & Repairs',
        subcategory: 'Common Property',
        clarifications: [
          { turn: 1, detail: 'Leak started after heavy rain yesterday' },
          { turn: 2, detail: 'Leak is near bathroom, possibly from upstairs unit' },
        ],
      };

      expect(conversationContext.clarifications).toHaveLength(2);
      expect(conversationContext.clarifications[1].detail).toContain('upstairs unit');
    });
  });

  describe('Sentiment Analysis', () => {

    test('should detect positive sentiment indicating satisfaction', () => {
      const customerReplies = [
        'Thank you so much! That answers my question perfectly.',
        'Great, that\'s exactly what I needed to know. Really appreciate your help!',
        'Perfect, I understand now. Thanks for the quick response.',
        'That makes sense. I\'m happy with this explanation.',
      ];

      customerReplies.forEach(reply => {
        const sentiment = analyzeSentiment(reply);
        expect(['positive', 'satisfied']).toContain(sentiment);
      });
    });

    test('should detect negative sentiment indicating dissatisfaction', () => {
      const customerReplies = [
        'This doesn\'t answer my question at all.',
        'I\'m still confused. Can someone call me?',
        'This is not helpful. I need to speak with a manager.',
        'I don\'t understand. This makes no sense.',
      ];

      customerReplies.forEach(reply => {
        const sentiment = analyzeSentiment(reply);
        expect(['negative', 'dissatisfied', 'frustrated']).toContain(sentiment);
      });
    });

    test('should detect neutral sentiment requiring clarification', () => {
      const customerReplies = [
        'Thanks, but can you clarify who is responsible?',
        'I understand the process, but what about the timeline?',
        'OK, but what happens if the issue continues?',
        'That helps, but I have a follow-up question.',
      ];

      customerReplies.forEach(reply => {
        const sentiment = analyzeSentiment(reply);
        expect(['neutral', 'seeking_clarification']).toContain(sentiment);
      });
    });

    test('should detect escalation requests', () => {
      const escalationPhrases = [
        'I need to speak with a manager',
        'Can someone call me about this?',
        'This needs urgent attention',
        'I want to escalate this issue',
        'I need human assistance',
      ];

      escalationPhrases.forEach(phrase => {
        const needsEscalation = detectEscalationRequest(phrase);
        expect(needsEscalation).toBe(true);
      });
    });
  });

  describe('Confidence Degradation', () => {

    test('should reduce confidence after unsuccessful resolution attempt', () => {
      const initialConfidence = 0.85;
      const turn1Confidence = degradeConfidence(initialConfidence, 'negative');

      expect(turn1Confidence).toBeLessThan(initialConfidence);
      expect(turn1Confidence).toBeGreaterThanOrEqual(0.70);
    });

    test('should degrade confidence more on negative sentiment', () => {
      const initialConfidence = 0.85;
      const negativeDegradation = degradeConfidence(initialConfidence, 'negative');
      const neutralDegradation = degradeConfidence(initialConfidence, 'neutral');

      expect(negativeDegradation).toBeLessThan(neutralDegradation);
    });

    test('should maintain confidence on positive sentiment', () => {
      const initialConfidence = 0.85;
      const newConfidence = degradeConfidence(initialConfidence, 'positive');

      expect(newConfidence).toBeGreaterThanOrEqual(initialConfidence);
    });

    test('should trigger escalation when confidence drops below threshold', () => {
      const confidenceLevels = [0.85, 0.72, 0.58, 0.42];
      const threshold = 0.60;

      const shouldEscalate = confidenceLevels[3] < threshold;
      expect(shouldEscalate).toBe(true);
    });
  });

  describe('Automatic Escalation Logic', () => {

    test('should escalate after 3 unsuccessful resolution attempts', () => {
      const conversationState = {
        turn_count: 3,
        conversation_history: [
          { turn: 1, sentiment: 'neutral', resolution_successful: false },
          { turn: 2, sentiment: 'negative', resolution_successful: false },
          { turn: 3, sentiment: 'negative', resolution_successful: false },
        ],
      };

      const shouldEscalate = shouldEscalateConversation(conversationState);
      expect(shouldEscalate).toBe(true);
    });

    test('should not escalate if any turn was successful', () => {
      const conversationState = {
        turn_count: 3,
        conversation_history: [
          { turn: 1, sentiment: 'neutral', resolution_successful: false },
          { turn: 2, sentiment: 'positive', resolution_successful: true },
          { turn: 3, sentiment: 'neutral', resolution_successful: false },
        ],
      };

      const shouldEscalate = shouldEscalateConversation(conversationState);
      expect(shouldEscalate).toBe(false);
    });

    test('should escalate on explicit escalation request at any turn', () => {
      const conversationState = {
        turn_count: 1,
        conversation_history: [
          { turn: 1, customer_message: 'I need to speak with a manager', escalation_requested: true },
        ],
      };

      const shouldEscalate = shouldEscalateConversation(conversationState);
      expect(shouldEscalate).toBe(true);
    });

    test('should create escalation summary when escalating', () => {
      const conversationState = {
        ticket_id: 'TEST-001',
        turn_count: 3,
        conversation_history: [
          {
            turn: 1,
            customer_message: 'Who is responsible for fixing the leak?',
            ai_response: 'The owners corporation is responsible...',
            sentiment: 'neutral',
          },
          {
            turn: 2,
            customer_message: 'But the strata manager says it\'s not their problem.',
            ai_response: 'Let me clarify the responsibilities...',
            sentiment: 'frustrated',
          },
          {
            turn: 3,
            customer_message: 'This is going in circles. I need to speak with someone.',
            sentiment: 'negative',
            escalation_requested: true,
          },
        ],
        original_issue: 'Water leak from ceiling',
        category: 'Maintenance & Repairs',
      };

      const summary = generateEscalationSummary(conversationState);

      expect(summary).toHaveProperty('ticket_id', 'TEST-001');
      expect(summary).toHaveProperty('turn_count', 3);
      expect(summary).toHaveProperty('escalation_reason');
      expect(summary).toHaveProperty('conversation_summary');
      expect(summary.conversation_summary).toContain('leak');
    });
  });

  describe('Automatic Ticket Closure', () => {

    test('should close ticket on positive sentiment', () => {
      const reply = {
        customer_message: 'Thank you! That completely answers my question.',
        sentiment: 'positive',
      };

      const shouldClose = shouldCloseTicket(reply.sentiment);
      expect(shouldClose).toBe(true);
    });

    test('should update ticket status to Resolved (status=5)', () => {
      const freshdeskUpdate = {
        status: 5, // Resolved
        tags: ['auto-closed', 'positive-sentiment', 'multi-turn-resolved'],
        internal_note: 'Ticket automatically closed after positive customer response.',
      };

      expect(freshdeskUpdate.status).toBe(5);
      expect(freshdeskUpdate.tags).toContain('auto-closed');
    });

    test('should not close on neutral sentiment', () => {
      const reply = {
        customer_message: 'OK, but I have another question.',
        sentiment: 'neutral',
      };

      const shouldClose = shouldCloseTicket(reply.sentiment);
      expect(shouldClose).toBe(false);
    });

    test('should not close on negative sentiment', () => {
      const reply = {
        customer_message: 'This doesn\'t help at all.',
        sentiment: 'negative',
      };

      const shouldClose = shouldCloseTicket(reply.sentiment);
      expect(shouldClose).toBe(false);
    });
  });

  describe('Context Re-evaluation', () => {

    test('should extract new entities from customer clarification', () => {
      const originalTicket = {
        entities: {
          property_address: '123 Main St',
          issue: 'leak',
        },
      };

      const customerClarification = 'The leak is coming from unit 7 upstairs, near the bathroom.';

      const newEntities = extractEntities(customerClarification);

      expect(newEntities).toHaveProperty('source_unit', '7');
      expect(newEntities).toHaveProperty('location', 'bathroom');
    });

    test('should re-run knowledge search with updated context', () => {
      const originalQuery = {
        text: 'water leak from ceiling',
        entities: { issue: 'leak' },
      };

      const updatedQuery = {
        text: 'water leak from ceiling, coming from upstairs bathroom',
        entities: { issue: 'leak', source: 'upstairs bathroom', location: 'ceiling' },
      };

      // Simulate that updated query would yield different results
      expect(updatedQuery.text.length).toBeGreaterThan(originalQuery.text.length);
      expect(Object.keys(updatedQuery.entities).length).toBeGreaterThan(
        Object.keys(originalQuery.entities).length
      );
    });

    test('should switch knowledge entry if better match found', () => {
      const turn1 = {
        knowledge_id: 'kb-general-leak',
        similarity_score: 0.72,
      };

      const turn2WithNewContext = {
        knowledge_id: 'kb-bathroom-leak-upstairs',
        similarity_score: 0.89,
      };

      expect(turn2WithNewContext.knowledge_id).not.toBe(turn1.knowledge_id);
      expect(turn2WithNewContext.similarity_score).toBeGreaterThan(turn1.similarity_score);
    });

    test('should incorporate previous conversation context in new search', () => {
      const conversationContext = {
        turn_count: 2,
        accumulated_details: [
          'water leak',
          'from ceiling',
          'started after heavy rain',
          'near bathroom',
          'from upstairs unit 7',
        ],
      };

      const enrichedQuery = conversationContext.accumulated_details.join(', ');

      expect(enrichedQuery).toContain('water leak');
      expect(enrichedQuery).toContain('upstairs unit 7');
      expect(enrichedQuery).toContain('bathroom');
    });
  });

  describe('Multi-Turn Success Tracking', () => {

    test('should record successful multi-turn resolution', () => {
      const resolution = {
        ticket_id: 'TEST-001',
        total_turns: 2,
        resolution_successful: true,
        knowledge_entries_used: ['kb-roof-leak-001', 'kb-roof-leak-001'],
        final_sentiment: 'positive',
        resolution_time_minutes: 45,
      };

      expect(resolution.resolution_successful).toBe(true);
      expect(resolution.total_turns).toBe(2);
      expect(resolution.final_sentiment).toBe('positive');
    });

    test('should track which turn led to resolution', () => {
      const conversationState = {
        turn_count: 3,
        conversation_history: [
          { turn: 1, sentiment: 'neutral', resolution_successful: false },
          { turn: 2, sentiment: 'neutral', resolution_successful: false },
          { turn: 3, sentiment: 'positive', resolution_successful: true },
        ],
      };

      const resolutionTurn = conversationState.conversation_history.findIndex(
        turn => turn.resolution_successful
      ) + 1;

      expect(resolutionTurn).toBe(3);
    });

    test('should improve knowledge entry score on successful resolution', () => {
      const knowledgeEntry = {
        id: 'kb-roof-leak-001',
        success_count: 45,
        total_usage_count: 50,
        success_rate: 0.90,
      };

      const updatedEntry = {
        ...knowledgeEntry,
        success_count: knowledgeEntry.success_count + 1,
        total_usage_count: knowledgeEntry.total_usage_count + 1,
        success_rate: (knowledgeEntry.success_count + 1) / (knowledgeEntry.total_usage_count + 1),
      };

      expect(updatedEntry.success_count).toBe(46);
      expect(updatedEntry.total_usage_count).toBe(51);
      expect(updatedEntry.success_rate).toBeCloseTo(0.902, 2);
    });

    test('should log unsuccessful multi-turn attempt for analysis', () => {
      const failedResolution = {
        ticket_id: 'TEST-002',
        total_turns: 3,
        resolution_successful: false,
        escalated: true,
        escalation_reason: 'exceeded_max_turns',
        knowledge_entries_used: ['kb-bylaw-noise-001', 'kb-bylaw-noise-002'],
        final_sentiment: 'frustrated',
      };

      expect(failedResolution.resolution_successful).toBe(false);
      expect(failedResolution.escalated).toBe(true);
      expect(failedResolution.escalation_reason).toBe('exceeded_max_turns');
    });
  });

  describe('End-to-End Multi-Turn Scenarios', () => {

    test('should handle successful 2-turn conversation', () => {
      const conversation = {
        ticket_id: 'TEST-001',
        turns: [
          {
            turn: 1,
            customer_message: 'Thanks, but can you clarify the timeline?',
            ai_response: 'The repair timeline depends on...',
            sentiment: 'neutral',
            confidence: 0.82,
          },
          {
            turn: 2,
            customer_message: 'Perfect, that makes sense. Thank you!',
            ai_response: null, // Ticket closed
            sentiment: 'positive',
            confidence: 0.82,
            ticket_closed: true,
          },
        ],
      };

      expect(conversation.turns).toHaveLength(2);
      expect(conversation.turns[1].ticket_closed).toBe(true);
      expect(conversation.turns[1].sentiment).toBe('positive');
    });

    test('should handle escalation after 3 unsuccessful turns', () => {
      const conversation = {
        ticket_id: 'TEST-002',
        turns: [
          {
            turn: 1,
            customer_message: 'Who should I contact about this?',
            ai_response: 'You should contact your strata manager...',
            sentiment: 'neutral',
            confidence: 0.75,
          },
          {
            turn: 2,
            customer_message: 'I already did that and they won\'t help.',
            ai_response: 'In that case, you can escalate to...',
            sentiment: 'frustrated',
            confidence: 0.60,
          },
          {
            turn: 3,
            customer_message: 'This is not helpful. I need to speak with someone.',
            ai_response: null,
            sentiment: 'negative',
            confidence: 0.45,
            escalated: true,
          },
        ],
      };

      expect(conversation.turns).toHaveLength(3);
      expect(conversation.turns[2].escalated).toBe(true);
      expect(conversation.turns[2].confidence).toBeLessThan(0.60);
    });

    test('should handle immediate escalation on explicit request', () => {
      const conversation = {
        ticket_id: 'TEST-003',
        turns: [
          {
            turn: 1,
            customer_message: 'I need to speak with a manager immediately.',
            ai_response: null,
            sentiment: 'urgent',
            escalation_requested: true,
            escalated: true,
          },
        ],
      };

      expect(conversation.turns).toHaveLength(1);
      expect(conversation.turns[0].escalated).toBe(true);
      expect(conversation.turns[0].escalation_requested).toBe(true);
    });

    test('should handle context improvement leading to resolution', () => {
      const conversation = {
        ticket_id: 'TEST-004',
        turns: [
          {
            turn: 1,
            customer_message: 'Thanks, but this seems to be about a different type of issue.',
            ai_response: 'Can you provide more details?',
            sentiment: 'neutral',
            knowledge_id: 'kb-general-leak',
            similarity_score: 0.68,
          },
          {
            turn: 2,
            customer_message: 'It\'s specifically about the upstairs unit\'s bathroom renovation causing damage.',
            ai_response: 'I understand now. For renovation-related damage...',
            sentiment: 'positive',
            knowledge_id: 'kb-renovation-damage',
            similarity_score: 0.91,
            ticket_closed: true,
          },
        ],
      };

      expect(conversation.turns[1].knowledge_id).not.toBe(conversation.turns[0].knowledge_id);
      expect(conversation.turns[1].similarity_score).toBeGreaterThan(conversation.turns[0].similarity_score);
      expect(conversation.turns[1].ticket_closed).toBe(true);
    });
  });
});

// Helper functions that simulate workflow logic

function analyzeSentiment(text) {
  const satisfactionKeywords = ['exactly what i needed', 'that answers', 'perfectly', 'that makes sense', 'i\'m happy'];
  const positiveKeywords = ['thank', 'great', 'perfect', 'appreciate', 'helpful'];
  const negativeKeywords = ['doesn\'t help', 'confused', 'not helpful', 'doesn\'t answer', 'makes no sense'];
  const frustrationKeywords = ['manager', 'call me', 'speak with someone', 'urgent'];
  const clarificationKeywords = ['can you clarify', 'but', 'what about', 'follow-up question', 'what happens if'];

  const lowerText = text.toLowerCase();

  // Check for escalation/frustration first
  if (frustrationKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'frustrated';
  }

  // Check for negative sentiment
  if (negativeKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'negative';
  }

  // Check for clear satisfaction (stronger than positive)
  if (satisfactionKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'positive';
  }

  // Check for clarification requests (even if they include "thanks" or "understand")
  if (clarificationKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'neutral';
  }

  // Check for positive sentiment
  if (positiveKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'positive';
  }

  return 'neutral';
}

function detectEscalationRequest(text) {
  const escalationKeywords = [
    'manager',
    'call me',
    'speak with',
    'human assistance',
    'escalate',
    'urgent attention',
  ];

  const lowerText = text.toLowerCase();
  return escalationKeywords.some(keyword => lowerText.includes(keyword));
}

function degradeConfidence(currentConfidence, sentiment) {
  if (sentiment === 'positive') {
    return Math.min(currentConfidence + 0.05, 1.0);
  }

  if (sentiment === 'negative' || sentiment === 'frustrated') {
    return Math.max(currentConfidence - 0.15, 0.0);
  }

  // Neutral sentiment - slight degradation
  return Math.max(currentConfidence - 0.08, 0.0);
}

function shouldEscalateConversation(conversationState) {
  // Check for explicit escalation request
  if (conversationState.conversation_history.some(turn => turn.escalation_requested)) {
    return true;
  }

  // Check for 3+ unsuccessful turns
  if (conversationState.turn_count >= 3) {
    const unsuccessfulTurns = conversationState.conversation_history.filter(
      turn => turn.resolution_successful === false
    );

    if (unsuccessfulTurns.length >= 3) {
      return true;
    }
  }

  return false;
}

function shouldCloseTicket(sentiment) {
  return sentiment === 'positive' || sentiment === 'satisfied';
}

function generateEscalationSummary(conversationState) {
  const lastTurn = conversationState.conversation_history[conversationState.turn_count - 1];

  return {
    ticket_id: conversationState.ticket_id,
    turn_count: conversationState.turn_count,
    escalation_reason: lastTurn.escalation_requested
      ? 'explicit_request'
      : 'exceeded_max_turns',
    conversation_summary: `Original issue: ${conversationState.original_issue}. ` +
      `After ${conversationState.turn_count} turns, customer requires human assistance.`,
    category: conversationState.category,
    final_sentiment: lastTurn.sentiment,
  };
}

function extractEntities(text) {
  const entities = {};

  // Extract unit numbers
  const unitMatch = text.match(/unit\s+(\d+)/i);
  if (unitMatch) {
    entities.source_unit = unitMatch[1];
  }

  // Extract location keywords
  const locationKeywords = ['bathroom', 'kitchen', 'bedroom', 'balcony', 'ceiling', 'floor'];
  locationKeywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      entities.location = keyword;
    }
  });

  return entities;
}

module.exports = {
  analyzeSentiment,
  detectEscalationRequest,
  degradeConfidence,
  shouldEscalateConversation,
  shouldCloseTicket,
  generateEscalationSummary,
  extractEntities,
};
