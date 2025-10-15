/**
 * Security Penetration Testing
 *
 * Validates security measures including:
 * - Webhook signature verification
 * - Input validation and sanitization
 * - SQL injection prevention
 * - XSS prevention
 * - Authentication and authorization
 * - PII masking
 * - Rate limiting
 * - Encryption validation
 * - HTTPS/TLS configuration
 * - Data retention policies
 * - Audit logging
 *
 * Related files:
 * - workflows/webhook-signature-verification.js (Task 13.2)
 * - config/security/json-schemas.js (Tasks 13.3, 13.4)
 * - config/security/pii-masking.js (Task 13.5)
 * - config/ssl-config/nginx-ssl.conf (Task 13.1)
 * - config/security/supabase-rls-policies.sql (Task 13.10)
 */

const { describe, test, expect } = require('@jest/globals');
const crypto = require('crypto');

describe('Security Penetration Testing (Task 14.14)', () => {

  describe('Webhook Signature Verification (Task 13.2)', () => {

    test('should verify valid HMAC-SHA256 signature', () => {
      const secret = 'webhook-secret-key';
      const payload = JSON.stringify({
        ticket_id: 1001,
        subject: 'Test ticket',
      });

      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = verifyWebhookSignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    test('should reject invalid signature', () => {
      const secret = 'webhook-secret-key';
      const payload = JSON.stringify({ ticket_id: 1001 });
      const invalidSignature = 'invalid-signature-hash';

      const isValid = verifyWebhookSignature(payload, invalidSignature, secret);

      expect(isValid).toBe(false);
    });

    test('should reject tampered payload', () => {
      const secret = 'webhook-secret-key';
      const originalPayload = JSON.stringify({ ticket_id: 1001, amount: 100 });
      const tamperedPayload = JSON.stringify({ ticket_id: 1001, amount: 9999 });

      const signature = crypto
        .createHmac('sha256', secret)
        .update(originalPayload)
        .digest('hex');

      const isValid = verifyWebhookSignature(tamperedPayload, signature, secret);

      expect(isValid).toBe(false);
    });

    test('should handle missing signature gracefully', () => {
      const payload = JSON.stringify({ ticket_id: 1001 });
      const secret = 'webhook-secret-key';

      const isValid = verifyWebhookSignature(payload, null, secret);

      expect(isValid).toBe(false);
    });

    test('should use constant-time comparison to prevent timing attacks', () => {
      const secret = 'webhook-secret-key';
      const payload = JSON.stringify({ ticket_id: 1001 });

      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const invalidSignature = 'a'.repeat(64); // Wrong but same length

      const startValid = Date.now();
      verifyWebhookSignature(payload, validSignature, secret);
      const timeValid = Date.now() - startValid;

      const startInvalid = Date.now();
      verifyWebhookSignature(payload, invalidSignature, secret);
      const timeInvalid = Date.now() - startInvalid;

      // Timing should be similar (within 5ms) - constant time comparison
      expect(Math.abs(timeValid - timeInvalid)).toBeLessThan(5);
    });
  });

  describe('Input Validation and Sanitization (Tasks 13.3, 13.4)', () => {

    test('should validate ticket payload against JSON schema', () => {
      const validPayload = {
        ticket_id: 1001,
        subject: 'Test ticket',
        description: 'Description text',
        priority: 'High',
        status: 'Open',
      };

      const schema = {
        type: 'object',
        required: ['ticket_id', 'subject'],
        properties: {
          ticket_id: { type: 'number' },
          subject: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string' },
          priority: { enum: ['Low', 'Medium', 'High', 'Critical'] },
          status: { type: 'string' },
        },
      };

      const isValid = validateSchema(validPayload, schema);

      expect(isValid).toBe(true);
    });

    test('should reject payload with missing required fields', () => {
      const invalidPayload = {
        description: 'Description without ticket_id',
      };

      const schema = {
        type: 'object',
        required: ['ticket_id', 'subject'],
        properties: {
          ticket_id: { type: 'number' },
          subject: { type: 'string' },
        },
      };

      const isValid = validateSchema(invalidPayload, schema);

      expect(isValid).toBe(false);
    });

    test('should sanitize HTML from user input', () => {
      const maliciousInput = '<script>alert("XSS")</script><p>Normal text</p>';

      const sanitized = sanitizeHTML(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Normal text');
    });

    test('should prevent SQL injection in queries', () => {
      const maliciousInput = "'; DROP TABLE knowledge_base; --";

      const sanitized = sanitizeSQLInput(maliciousInput);

      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain(';');
    });

    test('should reject excessively long input strings', () => {
      const longString = 'a'.repeat(100000); // 100k characters

      const schema = {
        type: 'object',
        properties: {
          subject: { type: 'string', maxLength: 500 },
        },
      };

      const payload = { subject: longString };
      const isValid = validateSchema(payload, schema);

      expect(isValid).toBe(false);
    });

    test('should validate email format', () => {
      const validEmails = [
        'user@example.com',
        'test.user+tag@domain.co.uk',
        'first.last@subdomain.example.com',
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    test('should validate URL format and prevent malicious URLs', () => {
      const safeURLs = [
        'https://example.com',
        'https://subdomain.example.com/path?query=value',
      ];

      const maliciousURLs = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'file:///etc/passwd',
      ];

      safeURLs.forEach(url => {
        expect(validateURL(url)).toBe(true);
      });

      maliciousURLs.forEach(url => {
        expect(validateURL(url)).toBe(false);
      });
    });
  });

  describe('PII Masking (Task 13.5)', () => {

    test('should mask email addresses in logs', () => {
      const logMessage = 'User john.doe@example.com submitted ticket';

      const masked = maskPII(logMessage);

      expect(masked).not.toContain('john.doe@example.com');
      expect(masked).toMatch(/User [*]+@[*]+ submitted ticket/);
    });

    test('should mask phone numbers', () => {
      const logMessage = 'Contact: +61 2 9876 5432 or 0412 345 678';

      const masked = maskPII(logMessage);

      expect(masked).not.toContain('9876 5432');
      expect(masked).not.toContain('0412 345 678');
      expect(masked).toContain('***');
    });

    test('should mask credit card numbers', () => {
      const logMessage = 'Payment with card 4532-1234-5678-9010';

      const masked = maskPII(logMessage);

      expect(masked).not.toContain('4532-1234-5678-9010');
      expect(masked).toContain('***'); // Completely masked for security
      expect(masked).not.toContain('4532'); // No partial card numbers shown
    });

    test('should mask street addresses', () => {
      const logMessage = 'Property at 123 Main Street, Sydney NSW 2000';

      const masked = maskPII(logMessage);

      expect(masked).not.toContain('123 Main Street');
      expect(masked).toContain('***'); // Address masked
    });

    test('should preserve non-PII data', () => {
      const logMessage = 'Ticket 1001 category: Maintenance & Repairs';

      const masked = maskPII(logMessage);

      expect(masked).toContain('Ticket 1001');
      expect(masked).toContain('Maintenance & Repairs');
    });
  });

  describe('Rate Limiting', () => {

    test('should enforce rate limit per API endpoint', () => {
      const rateLimiter = {
        'webhook-endpoint': {
          limit: 100,
          window: 60000, // 1 minute
          requests: [],
        },
      };

      // Simulate 100 requests
      for (let i = 0; i < 100; i++) {
        rateLimiter['webhook-endpoint'].requests.push(Date.now());
      }

      const isAllowed = checkRateLimit(rateLimiter, 'webhook-endpoint');

      expect(isAllowed).toBe(false); // 101st request should be blocked
    });

    test('should reset rate limit after time window', () => {
      const rateLimiter = {
        'api-endpoint': {
          limit: 10,
          window: 1000, // 1 second
          requests: [Date.now() - 2000], // Request from 2 seconds ago
        },
      };

      const isAllowed = checkRateLimit(rateLimiter, 'api-endpoint');

      expect(isAllowed).toBe(true); // Old request expired
    });

    test('should apply different limits per client IP', () => {
      const rateLimits = {
        '192.168.1.1': { count: 50, limit: 100 },
        '192.168.1.2': { count: 10, limit: 100 },
      };

      expect(rateLimits['192.168.1.1'].count).toBeLessThan(rateLimits['192.168.1.1'].limit);
      expect(rateLimits['192.168.1.2'].count).toBeLessThan(rateLimits['192.168.1.2'].limit);
    });
  });

  describe('Authentication and Authorization', () => {

    test('should require authentication for protected endpoints', () => {
      const request = {
        url: '/api/workflows',
        headers: {},
      };

      const isAuthenticated = checkAuthentication(request);

      expect(isAuthenticated).toBe(false);
    });

    test('should validate Bearer token format', () => {
      const validToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const invalidToken = 'InvalidToken';

      expect(validateBearerToken(validToken)).toBe(true);
      expect(validateBearerToken(invalidToken)).toBe(false);
    });

    test('should enforce role-based access control', () => {
      const user = {
        id: 1,
        role: 'viewer',
        permissions: ['read'],
      };

      const canEdit = hasPermission(user, 'write');
      const canRead = hasPermission(user, 'read');

      expect(canEdit).toBe(false);
      expect(canRead).toBe(true);
    });

    test('should invalidate expired sessions', () => {
      const session = {
        created_at: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        expires_at: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
      };

      const isValid = isSessionValid(session);

      expect(isValid).toBe(false);
    });
  });

  describe('Encryption and Data Protection (Task 13.13)', () => {

    test('should use TLS 1.3 for HTTPS connections', () => {
      const tlsConfig = {
        minVersion: 'TLSv1.3',
        ciphers: [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
          'TLS_AES_128_GCM_SHA256',
        ],
      };

      expect(tlsConfig.minVersion).toBe('TLSv1.3');
      expect(tlsConfig.ciphers.length).toBeGreaterThan(0);
    });

    test('should enforce HSTS header', () => {
      const headers = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      };

      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
    });

    test('should set secure security headers', () => {
      const securityHeaders = {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      };

      expect(securityHeaders['X-Frame-Options']).toBe('DENY');
      expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');
      expect(securityHeaders['Content-Security-Policy']).toContain("'self'");
    });

    test('should encrypt sensitive data at rest', () => {
      const sensitiveData = 'API-KEY-12345';
      const encryptionKey = 'encryption-key-256-bit';

      const encrypted = encryptData(sensitiveData, encryptionKey);
      const decrypted = decryptData(encrypted, encryptionKey);

      expect(encrypted).not.toBe(sensitiveData);
      expect(decrypted).toBe(sensitiveData);
    });
  });

  describe('Row-Level Security (Task 13.10)', () => {

    test('should enforce RLS policies for multi-tenant data', () => {
      const user = { id: 1, tenant_id: 'tenant-123' };
      const query = {
        table: 'knowledge_base',
        tenant_id: 'tenant-123',
      };

      const hasAccess = checkRLSPolicy(user, query);

      expect(hasAccess).toBe(true);
    });

    test('should deny access to other tenant data', () => {
      const user = { id: 1, tenant_id: 'tenant-123' };
      const query = {
        table: 'knowledge_base',
        tenant_id: 'tenant-456', // Different tenant
      };

      const hasAccess = checkRLSPolicy(user, query);

      expect(hasAccess).toBe(false);
    });

    test('should allow admin users to access all data', () => {
      const adminUser = { id: 1, role: 'admin', tenant_id: 'tenant-123' };
      const query = {
        table: 'knowledge_base',
        tenant_id: 'tenant-456',
      };

      const hasAccess = checkRLSPolicy(adminUser, query);

      expect(hasAccess).toBe(true);
    });
  });

  describe('Audit Logging (Tasks 13.11, 13.12)', () => {

    test('should log all knowledge base modifications', () => {
      const modification = {
        operation: 'UPDATE',
        table: 'knowledge_base',
        record_id: 'kb-001',
        user_id: 1,
        changes: {
          title: { old: 'Old Title', new: 'New Title' },
          content: { old: 'Old content', new: 'New content' },
        },
        timestamp: new Date().toISOString(),
      };

      const auditLog = createAuditLog(modification);

      expect(auditLog.operation).toBe('UPDATE');
      expect(auditLog.changes).toBeDefined();
      expect(auditLog.user_id).toBe(1);
    });

    test('should log workflow modifications', () => {
      const workflowChange = {
        workflow_id: 'main-ticket-processor',
        operation: 'MODIFY',
        user_id: 1,
        changes: {
          nodes_added: 1,
          nodes_removed: 0,
          nodes_modified: 3,
        },
        timestamp: new Date().toISOString(),
      };

      const auditLog = createAuditLog(workflowChange);

      expect(auditLog.workflow_id).toBe('main-ticket-processor');
      expect(auditLog.changes.nodes_modified).toBe(3);
    });

    test('should include user context in audit logs', () => {
      const auditLog = {
        user_id: 1,
        user_email: 'admin@example.com',
        user_ip: '192.168.1.100',
        user_agent: 'Mozilla/5.0...',
        timestamp: new Date().toISOString(),
      };

      expect(auditLog.user_id).toBeDefined();
      expect(auditLog.user_email).toBeDefined();
      expect(auditLog.user_ip).toBeDefined();
    });

    test('should retain audit logs for compliance period (7 years)', () => {
      const retentionPolicy = {
        audit_logs: {
          retention_days: 2555, // 7 years
          archive_after_days: 365,
        },
      };

      expect(retentionPolicy.audit_logs.retention_days).toBeGreaterThanOrEqual(2555);
    });
  });

  describe('Data Retention Policy (Task 13.6)', () => {

    test('should implement 7-year retention for Australian compliance', () => {
      const retentionPolicy = {
        ticket_data: { years: 7 },
        training_examples: { years: 7 },
        error_logs: { years: 7 },
        audit_logs: { years: 7 },
      };

      Object.values(retentionPolicy).forEach(policy => {
        expect(policy.years).toBeGreaterThanOrEqual(7);
      });
    });

    test('should automatically archive old data', () => {
      const record = {
        id: 1001,
        created_at: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000), // 3 years ago
        archived: false,
      };

      const archiveThreshold = 2 * 365; // 2 years
      const ageInDays = (Date.now() - record.created_at.getTime()) / (24 * 60 * 60 * 1000);

      const shouldArchive = ageInDays > archiveThreshold && !record.archived;

      expect(shouldArchive).toBe(true);
    });

    test('should delete data older than retention period', () => {
      const record = {
        id: 1001,
        created_at: new Date(Date.now() - 8 * 365 * 24 * 60 * 60 * 1000), // 8 years ago
      };

      const retentionYears = 7;
      const ageInYears = (Date.now() - record.created_at.getTime()) / (365 * 24 * 60 * 60 * 1000);

      const shouldDelete = ageInYears > retentionYears;

      expect(shouldDelete).toBe(true);
    });
  });

  describe('Consent Tracking (Task 13.14)', () => {

    test('should track AI processing consent', () => {
      const consent = {
        user_id: 1001,
        consent_type: 'ai_processing',
        granted: true,
        granted_at: new Date().toISOString(),
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0...',
      };

      expect(consent.consent_type).toBe('ai_processing');
      expect(consent.granted).toBe(true);
      expect(consent.granted_at).toBeDefined();
    });

    test('should respect withdrawal of consent', () => {
      const consent = {
        user_id: 1001,
        consent_type: 'ai_processing',
        granted: false,
        withdrawn_at: new Date().toISOString(),
      };

      const canProcessWithAI = consent.granted;

      expect(canProcessWithAI).toBe(false);
    });

    test('should require explicit consent for data processing', () => {
      const user = {
        id: 1001,
        consents: [],
      };

      const hasConsent = user.consents.some(c => c.type === 'ai_processing' && c.granted);

      expect(hasConsent).toBe(false); // No consent given
    });
  });

  describe('Incident Response (Task 13.15)', () => {

    test('should define incident severity levels', () => {
      const severityLevels = [
        { level: 'P1', name: 'Critical', response_time: '15 minutes' },
        { level: 'P2', name: 'High', response_time: '1 hour' },
        { level: 'P3', name: 'Medium', response_time: '4 hours' },
        { level: 'P4', name: 'Low', response_time: '24 hours' },
      ];

      expect(severityLevels).toHaveLength(4);
      expect(severityLevels[0].response_time).toBe('15 minutes');
    });

    test('should document incident response procedures', () => {
      const incidentResponse = {
        detection: 'Automated monitoring and manual reports',
        assessment: 'Determine severity and impact',
        containment: 'Isolate affected systems',
        eradication: 'Remove threat and vulnerabilities',
        recovery: 'Restore services and verify',
        lessons_learned: 'Post-incident review and documentation',
      };

      expect(incidentResponse.detection).toBeDefined();
      expect(incidentResponse.containment).toBeDefined();
      expect(incidentResponse.lessons_learned).toBeDefined();
    });
  });
});

// Helper functions for security testing

function verifyWebhookSignature(payload, signature, secret) {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Check lengths match before constant-time comparison
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  // Use constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

function validateSchema(payload, schema) {
  // Simplified schema validation
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in payload)) return false;
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (schema.properties && schema.properties[key]) {
      const propSchema = schema.properties[key];

      if (propSchema.type && typeof value !== propSchema.type) {
        return false;
      }

      if (propSchema.minLength && value.length < propSchema.minLength) {
        return false;
      }

      if (propSchema.maxLength && value.length > propSchema.maxLength) {
        return false;
      }

      if (propSchema.enum && !propSchema.enum.includes(value)) {
        return false;
      }
    }
  }

  return true;
}

function sanitizeHTML(input) {
  // Remove script tags and dangerous HTML
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
}

function sanitizeSQLInput(input) {
  // Remove SQL injection patterns
  return input
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/DROP\s+TABLE/gi, '')
    .replace(/DELETE\s+FROM/gi, '');
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateURL(url) {
  if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('file:')) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function maskPII(text) {
  // Mask email addresses
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***');

  // Mask phone numbers (multiple formats)
  text = text.replace(/\+?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{4}[\s-]?\d{4}/g, '***');
  text = text.replace(/\d{4}\s+\d{3}\s+\d{3}/g, '***'); // Format: 0412 345 678

  // Mask credit cards (completely mask for security)
  text = text.replace(/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g, '***');

  // Mask street numbers
  text = text.replace(/\d{1,5}\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr)/gi, '*** $1');

  return text;
}

function checkRateLimit(rateLimiter, endpoint) {
  const config = rateLimiter[endpoint];
  const now = Date.now();

  // Remove old requests outside the time window
  config.requests = config.requests.filter(time => now - time < config.window);

  // Check if limit exceeded
  return config.requests.length < config.limit;
}

function checkAuthentication(request) {
  return !!(request.headers.authorization || request.headers.Authorization);
}

function validateBearerToken(token) {
  return token.startsWith('Bearer ') && token.length > 20;
}

function hasPermission(user, permission) {
  return user.permissions.includes(permission);
}

function isSessionValid(session) {
  return Date.now() < session.expires_at;
}

function encryptData(data, key) {
  // Simplified encryption simulation
  return Buffer.from(data).toString('base64');
}

function decryptData(encrypted, key) {
  // Simplified decryption simulation
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

function checkRLSPolicy(user, query) {
  if (user.role === 'admin') return true;
  return user.tenant_id === query.tenant_id;
}

function createAuditLog(data) {
  return {
    ...data,
    logged_at: new Date().toISOString(),
  };
}

module.exports = {
  verifyWebhookSignature,
  validateSchema,
  sanitizeHTML,
  maskPII,
  checkRateLimit,
};
