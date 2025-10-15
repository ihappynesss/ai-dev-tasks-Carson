/**
 * NSW Strata Automation - JSON Schema Validation
 * Task 13.3: Create JSON schema validation for all inputs
 * Date: 2025-10-15
 */

// Freshdesk Ticket Webhook Schema
const freshdeskTicketSchema = {
  type: 'object',
  required: ['ticket_id', 'ticket_subject', 'ticket_description', 'ticket_priority', 'ticket_status'],
  properties: {
    ticket_id: { type: 'number', minimum: 1 },
    ticket_subject: { type: 'string', minLength: 1, maxLength: 500 },
    ticket_description: { type: 'string', minLength: 1, maxLength: 50000 },
    ticket_priority: { type: 'number', minimum: 1, maximum: 4 },
    ticket_status: { type: 'number', minimum: 2, maximum: 5 },
    requester_email: { type: 'string', format: 'email', maxLength: 255 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    custom_fields: { type: 'object' },
    tags: { type: 'array', items: { type: 'string', maxLength: 50 } }
  }
};

// Input Sanitization Rules
const sanitizationRules = {
  removeHTML: (input) => input.replace(/<[^>]*>/g, ''),
  removeScripts: (input) => input.replace(/<script[^>]*>.*?<\/script>/gi, ''),
  escapeSQLInjection: (input) => input.replace(/(['";\\])/g, '\\$1'),
  escapeXSS: (input) => input.replace(/[<>&'"]/g, (char) => {
    const escape = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' };
    return escape[char];
  })
};

module.exports = {
  freshdeskTicketSchema,
  sanitizationRules
};
