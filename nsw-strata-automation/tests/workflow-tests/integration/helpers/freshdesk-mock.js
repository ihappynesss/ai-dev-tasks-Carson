/**
 * Freshdesk API Mock Helper
 * Provides mock responses for Freshdesk API endpoints using nock
 */

const nock = require('nock');

const FRESHDESK_DOMAIN = process.env.FRESHDESK_DOMAIN || 'https://test.freshdesk.com';

class FreshdeskMock {
  constructor() {
    this.domain = FRESHDESK_DOMAIN;
    this.interceptors = [];
  }

  /**
   * Reset all mocks
   */
  reset() {
    nock.cleanAll();
    this.interceptors = [];
  }

  /**
   * Mock GET /api/v2/tickets/:id - Get ticket details
   */
  mockGetTicket(ticketId, ticketData, options = {}) {
    const {
      statusCode = 200,
      delay = 0,
      times = 1,
      shouldFail = false
    } = options;

    let interceptor = nock(this.domain)
      .get(`/api/v2/tickets/${ticketId}`)
      .times(times);

    if (delay > 0) {
      interceptor = interceptor.delay(delay);
    }

    if (shouldFail) {
      interceptor.replyWithError({
        code: 'ETIMEDOUT',
        message: 'Connection timeout'
      });
    } else {
      interceptor.reply(statusCode, ticketData);
    }

    this.interceptors.push(interceptor);
    return interceptor;
  }

  /**
   * Mock POST /api/v2/tickets/:id/reply - Post reply to ticket
   */
  mockPostReply(ticketId, options = {}) {
    const {
      statusCode = 200,
      delay = 0,
      times = 1,
      shouldFail = false,
      failCount = 0  // Fail first N attempts, then succeed
    } = options;

    if (failCount > 0) {
      // Mock failures first
      nock(this.domain)
        .post(`/api/v2/tickets/${ticketId}/reply`)
        .times(failCount)
        .reply(503, {
          errors: {
            message: 'Service temporarily unavailable'
          }
        });

      // Then mock success
      nock(this.domain)
        .post(`/api/v2/tickets/${ticketId}/reply`)
        .reply(200, {
          id: Math.floor(Math.random() * 10000),
          ticket_id: ticketId,
          body: 'Reply posted successfully',
          created_at: new Date().toISOString()
        });
    } else {
      let interceptor = nock(this.domain)
        .post(`/api/v2/tickets/${ticketId}/reply`)
        .times(times);

      if (delay > 0) {
        interceptor = interceptor.delay(delay);
      }

      if (shouldFail) {
        interceptor.reply(statusCode || 500, {
          errors: {
            message: 'Failed to post reply'
          }
        });
      } else {
        interceptor.reply(statusCode, {
          id: Math.floor(Math.random() * 10000),
          ticket_id: ticketId,
          body: 'Reply posted successfully',
          created_at: new Date().toISOString()
        });
      }

      this.interceptors.push(interceptor);
    }
  }

  /**
   * Mock PUT /api/v2/tickets/:id - Update ticket
   */
  mockUpdateTicket(ticketId, updates, options = {}) {
    const {
      statusCode = 200,
      delay = 0,
      times = 1,
      shouldFail = false
    } = options;

    let interceptor = nock(this.domain)
      .put(`/api/v2/tickets/${ticketId}`)
      .times(times);

    if (delay > 0) {
      interceptor = interceptor.delay(delay);
    }

    if (shouldFail) {
      interceptor.reply(statusCode || 500, {
        errors: {
          message: 'Failed to update ticket'
        }
      });
    } else {
      interceptor.reply(statusCode, {
        id: ticketId,
        ...updates,
        updated_at: new Date().toISOString()
      });
    }

    this.interceptors.push(interceptor);
    return interceptor;
  }

  /**
   * Mock GET /api/v2/tickets/:id/conversations - Get conversations
   */
  mockGetConversations(ticketId, conversations = [], options = {}) {
    const {
      statusCode = 200,
      delay = 0,
      times = 1
    } = options;

    let interceptor = nock(this.domain)
      .get(`/api/v2/tickets/${ticketId}/conversations`)
      .times(times);

    if (delay > 0) {
      interceptor = interceptor.delay(delay);
    }

    interceptor.reply(statusCode, conversations);

    this.interceptors.push(interceptor);
    return interceptor;
  }

  /**
   * Mock rate limiting (429 response)
   */
  mockRateLimit(endpoint, retryAfter = 60) {
    const interceptor = nock(this.domain)
      .persist()
      .intercept(endpoint, 'POST')
      .reply(429, {
        errors: {
          message: 'Rate limit exceeded'
        }
      }, {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': '0'
      });

    this.interceptors.push(interceptor);
    return interceptor;
  }

  /**
   * Mock authentication failure
   */
  mockAuthFailure(endpoint) {
    const interceptor = nock(this.domain)
      .persist()
      .intercept(endpoint, /GET|POST|PUT/)
      .reply(401, {
        errors: {
          message: 'Authentication failed'
        }
      });

    this.interceptors.push(interceptor);
    return interceptor;
  }

  /**
   * Mock successful workflow execution
   * Mocks all required API calls for a complete ticket processing flow
   */
  mockSuccessfulWorkflow(ticketId, ticketData) {
    // 1. Get ticket details
    this.mockGetTicket(ticketId, ticketData);

    // 2. Post reply
    this.mockPostReply(ticketId);

    // 3. Update ticket status and tags
    this.mockUpdateTicket(ticketId, {
      status: 4,
      tags: ['auto-resolved', 'kb-reused']
    });
  }

  /**
   * Mock retry scenario - fails first N times, then succeeds
   * Tests Task 11.1: 3 attempts with 5s delay
   */
  mockRetryScenario(ticketId, failCount = 2) {
    // Get ticket - succeeds
    this.mockGetTicket(ticketId, {
      id: ticketId,
      subject: 'Test ticket',
      description: 'Test description',
      priority: 2,
      status: 2
    });

    // Post reply - fails first N times, then succeeds
    this.mockPostReply(ticketId, { failCount });

    // Update ticket - succeeds
    this.mockUpdateTicket(ticketId, {
      status: 4,
      tags: ['auto-resolved']
    });
  }

  /**
   * Verify all mocks were called
   */
  verify() {
    if (!nock.isDone()) {
      const pending = nock.pendingMocks();
      throw new Error(`Pending mocks not satisfied: ${pending.join(', ')}`);
    }
  }

  /**
   * Check if all mocks are satisfied
   */
  isDone() {
    return nock.isDone();
  }

  /**
   * Get pending (uncalled) mocks
   */
  getPending() {
    return nock.pendingMocks();
  }
}

// Singleton instance
const freshdeskMock = new FreshdeskMock();

module.exports = {
  FreshdeskMock,
  freshdeskMock,
  FRESHDESK_DOMAIN
};
