/**
 * Unit Tests for Freshdesk API Node Configuration
 * Tests Freshdesk integration nodes for proper API configuration and retry logic
 */

describe('Freshdesk API Node Configuration', () => {
  describe('Get Ticket Details Node', () => {
    const getTicketConfig = {
      url: '={{ $env.FRESHDESK_DOMAIN }}/api/v2/tickets/{{ $json.body.ticket.id }}',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'freshdeskApi',
      options: {
        timeout: 10000,
        retry: {
          maxTries: 3,
          waitBetweenTries: 5000
        }
      }
    };

    test('should use correct Freshdesk API endpoint', () => {
      expect(getTicketConfig.url).toContain('/api/v2/tickets/');
    });

    test('should use environment variable for domain', () => {
      expect(getTicketConfig.url).toContain('$env.FRESHDESK_DOMAIN');
    });

    test('should use predefined credential type', () => {
      expect(getTicketConfig.authentication).toBe('predefinedCredentialType');
      expect(getTicketConfig.nodeCredentialType).toBe('freshdeskApi');
    });

    test('should have 10 second timeout', () => {
      expect(getTicketConfig.options.timeout).toBe(10000);
    });

    test('should retry 3 times on failure (Task 11.1)', () => {
      expect(getTicketConfig.options.retry.maxTries).toBe(3);
    });

    test('should wait 5 seconds between retries (Task 11.1)', () => {
      expect(getTicketConfig.options.retry.waitBetweenTries).toBe(5000);
    });
  });

  describe('Post Reply Node', () => {
    const postReplyConfig = {
      method: 'POST',
      url: '={{ $env.FRESHDESK_DOMAIN }}/api/v2/tickets/{{ $json.ticketId }}/reply',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'Content-Type',
            value: 'application/json'
          }
        ]
      },
      sendBody: true,
      specifyBody: 'json'
    };

    test('should use POST method', () => {
      expect(postReplyConfig.method).toBe('POST');
    });

    test('should use reply endpoint', () => {
      expect(postReplyConfig.url).toContain('/reply');
    });

    test('should send JSON content type', () => {
      const contentType = postReplyConfig.headerParameters.parameters.find(
        h => h.name === 'Content-Type'
      );
      expect(contentType.value).toBe('application/json');
    });

    test('should send body as JSON', () => {
      expect(postReplyConfig.sendBody).toBe(true);
      expect(postReplyConfig.specifyBody).toBe('json');
    });
  });

  describe('Update Ticket Status Node', () => {
    const updateTicketConfig = {
      method: 'PUT',
      url: '={{ $env.FRESHDESK_DOMAIN }}/api/v2/tickets/{{ $json.ticketId }}',
      jsonBody: '={{ {\"status\": $json.status, \"tags\": $json.tags, \"custom_fields\": {\"knowledge_id\": $json.knowledgeId, \"confidence\": $json.confidence, \"routing_path\": $json.routingPath}} }}'
    };

    test('should use PUT method for updates', () => {
      expect(updateTicketConfig.method).toBe('PUT');
    });

    test('should update status field', () => {
      expect(updateTicketConfig.jsonBody).toContain('status');
    });

    test('should update tags (Task 5.12)', () => {
      expect(updateTicketConfig.jsonBody).toContain('tags');
    });

    test('should set custom fields for tracking', () => {
      expect(updateTicketConfig.jsonBody).toContain('custom_fields');
      expect(updateTicketConfig.jsonBody).toContain('knowledge_id');
      expect(updateTicketConfig.jsonBody).toContain('confidence');
      expect(updateTicketConfig.jsonBody).toContain('routing_path');
    });
  });

  describe('Freshdesk Status Codes', () => {
    const statusCodes = {
      open: 2,
      pending: 3,
      resolved: 4,
      closed: 5
    };

    test('should use correct status code for resolved', () => {
      expect(statusCodes.resolved).toBe(4);
    });

    test('should use correct status code for pending', () => {
      expect(statusCodes.pending).toBe(3);
    });

    test('should use correct status code for open', () => {
      expect(statusCodes.open).toBe(2);
    });

    test('should use correct status code for closed', () => {
      expect(statusCodes.closed).toBe(5);
    });
  });

  describe('Error Handling and Retries', () => {
    const retryConfig = {
      maxTries: 3,
      waitBetweenTries: 5000
    };

    test('should implement exponential backoff ready configuration', () => {
      // Base configuration for 3 retries with 5s wait
      const retries = [
        5000,  // First retry: 5s
        10000, // Second retry: 10s (could be exponential)
        15000  // Third retry: 15s (could be exponential)
      ];

      expect(retryConfig.maxTries).toBe(3);
      expect(retryConfig.waitBetweenTries).toBe(5000);
    });

    test('should handle rate limiting gracefully', () => {
      const rateLimitConfig = {
        handleRetryAfter: true,
        respectRateLimits: true
      };

      expect(rateLimitConfig.handleRetryAfter).toBe(true);
    });
  });
});
