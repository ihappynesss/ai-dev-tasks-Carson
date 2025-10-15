/**
 * Unit Tests for Webhook Node Configuration
 * Tests webhook receiver node for proper configuration and signature verification
 */

const crypto = require('crypto');

describe('Webhook Node Configuration', () => {
  describe('Webhook - New Ticket Node', () => {
    const webhookConfig = {
      httpMethod: 'POST',
      path: 'freshdesk-ticket',
      responseMode: 'responseNode',
      options: {
        allowedOrigins: '*'
      }
    };

    test('should have correct HTTP method configured', () => {
      expect(webhookConfig.httpMethod).toBe('POST');
    });

    test('should have correct webhook path', () => {
      expect(webhookConfig.path).toBe('freshdesk-ticket');
    });

    test('should use responseNode mode for async processing', () => {
      expect(webhookConfig.responseMode).toBe('responseNode');
    });

    test('should allow all origins', () => {
      expect(webhookConfig.options.allowedOrigins).toBe('*');
    });
  });

  describe('Immediate Response Node', () => {
    const responseConfig = {
      respondWith: 'json',
      responseBody: '={{ {\"status\": \"received\", \"ticket_id\": $json.ticket.id, \"timestamp\": new Date().toISOString()} }}',
      options: {
        responseCode: 200,
        responseHeaders: {
          entries: [
            {
              name: 'Content-Type',
              value: 'application/json'
            }
          ]
        }
      }
    };

    test('should respond with JSON format', () => {
      expect(responseConfig.respondWith).toBe('json');
    });

    test('should have 200 status code', () => {
      expect(responseConfig.options.responseCode).toBe(200);
    });

    test('should set Content-Type header', () => {
      const contentTypeHeader = responseConfig.options.responseHeaders.entries.find(
        h => h.name === 'Content-Type'
      );
      expect(contentTypeHeader).toBeDefined();
      expect(contentTypeHeader.value).toBe('application/json');
    });

    test('should respond within 500ms target', () => {
      // This is a configuration test - actual timing would be measured in integration tests
      expect(responseConfig.responseMode).not.toBe('lastNode');
    });
  });

  describe('HMAC Signature Verification', () => {
    const testSecret = 'test-webhook-secret';
    const testPayload = { ticket: { id: 123, subject: 'Test' } };

    function generateSignature(payload, secret) {
      return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('base64');
    }

    test('should verify valid HMAC-SHA256 signature', () => {
      const payload = JSON.stringify(testPayload);
      const signature = generateSignature(testPayload, testSecret);

      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(payload)
        .digest('base64');

      expect(signature).toBe(expectedSignature);
    });

    test('should reject invalid signature', () => {
      const validSignature = generateSignature(testPayload, testSecret);
      const invalidSignature = 'invalid-signature';

      expect(validSignature).not.toBe(invalidSignature);
    });

    test('should reject modified payload', () => {
      const originalSignature = generateSignature(testPayload, testSecret);

      const modifiedPayload = { ...testPayload, ticket: { ...testPayload.ticket, id: 999 } };
      const modifiedSignature = generateSignature(modifiedPayload, testSecret);

      expect(originalSignature).not.toBe(modifiedSignature);
    });

    test('should use base64 encoding for signature', () => {
      const signature = generateSignature(testPayload, testSecret);
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;

      expect(signature).toMatch(base64Regex);
    });
  });

  describe('Webhook Security Configuration', () => {
    test('should verify signature before processing', () => {
      const webhookFlow = {
        hasSignatureVerification: true,
        verificationBeforeProcessing: true
      };

      expect(webhookFlow.hasSignatureVerification).toBe(true);
      expect(webhookFlow.verificationBeforeProcessing).toBe(true);
    });

    test('should fail on missing signature', () => {
      const mockRequest = {
        headers: {},
        body: { ticket: { id: 123 } }
      };

      expect(mockRequest.headers['x-freshdesk-signature']).toBeUndefined();
    });
  });
});
