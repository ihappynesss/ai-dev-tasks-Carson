/**
 * Test Fixtures: Webhook Payloads
 * Realistic webhook payloads from Freshdesk for integration testing
 */

const crypto = require('crypto');

function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('base64');
}

const WEBHOOK_SECRET = 'test-webhook-secret-12345';

// Task 14.2: Sample ticket payloads for different NSW strata scenarios

const maintenanceTicket = {
  ticket: {
    id: 1001,
    subject: 'Roof leak in common area - Lot 5',
    description: '<p>Water is leaking from the roof into the hallway near Lot 5. This started after last night\'s rain. The carpet is getting damaged and there\'s a safety concern.</p>',
    description_text: 'Water is leaking from the roof into the hallway near Lot 5. This started after last night\'s rain. The carpet is getting damaged and there\'s a safety concern.',
    priority: 3,
    status: 2,
    created_at: '2025-10-15T08:30:00Z',
    updated_at: '2025-10-15T08:30:00Z',
    due_by: '2025-10-15T17:00:00Z',
    fr_due_by: '2025-10-15T12:30:00Z',
    requester_id: 5001,
    responder_id: null,
    tags: ['urgent', 'roof'],
    custom_fields: {
      property_address: '123 George Street, Sydney NSW 2000',
      strata_plan: 'SP 75432',
      lot_number: 'Lot 5'
    }
  },
  requester: {
    id: 5001,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+61412345678'
  }
};

const bylawComplianceTicket = {
  ticket: {
    id: 1002,
    subject: 'Noise complaint - Late night party in Unit 12',
    description: '<p>There was a loud party in Unit 12 last night until 2 AM. Music was extremely loud and disturbing multiple residents. This is the third complaint this month. Please reference By-law 1 regarding noise restrictions.</p>',
    description_text: 'There was a loud party in Unit 12 last night until 2 AM. Music was extremely loud and disturbing multiple residents. This is the third complaint this month. Please reference By-law 1 regarding noise restrictions.',
    priority: 2,
    status: 2,
    created_at: '2025-10-15T09:15:00Z',
    updated_at: '2025-10-15T09:15:00Z',
    due_by: '2025-10-16T09:15:00Z',
    fr_due_by: '2025-10-15T17:15:00Z',
    requester_id: 5002,
    tags: ['noise', 'bylaw'],
    custom_fields: {
      property_address: '456 Park Avenue, Parramatta NSW 2150',
      strata_plan: 'SP 88765',
      lot_number: 'Unit 12'
    }
  },
  requester: {
    id: 5002,
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    phone: '+61423456789'
  }
};

const financialTicket = {
  ticket: {
    id: 1003,
    subject: 'Unpaid levies - Lot 23 - 3 quarters overdue',
    description: '<p>Lot 23 has unpaid levies for the last 3 quarters totaling $4,500. According to SSMA 2015 Section 85, we need to follow up with payment plan or escalation procedures. Previous reminders sent on 01/07/2025 and 15/08/2025.</p>',
    description_text: 'Lot 23 has unpaid levies for the last 3 quarters totaling $4,500. According to SSMA 2015 Section 85, we need to follow up with payment plan or escalation procedures. Previous reminders sent on 01/07/2025 and 15/08/2025.',
    priority: 2,
    status: 2,
    created_at: '2025-10-15T10:00:00Z',
    updated_at: '2025-10-15T10:00:00Z',
    due_by: '2025-10-17T10:00:00Z',
    fr_due_by: '2025-10-16T10:00:00Z',
    requester_id: 5003,
    tags: ['financial', 'levies', 'overdue'],
    custom_fields: {
      property_address: '789 Main Road, Bondi NSW 2026',
      strata_plan: 'SP 65432',
      lot_number: 'Lot 23',
      amount_owed: 4500
    }
  },
  requester: {
    id: 5003,
    name: 'Lisa Wong',
    email: 'lisa.wong@stratamanagement.com.au',
    phone: '+61434567890'
  }
};

const renovationTicket = {
  ticket: {
    id: 1004,
    subject: 'Approval request - Timber flooring installation Apartment 8',
    description: '<p>Owner of Apartment 8 requests approval to install timber flooring throughout the apartment. This is a minor alteration as per SSMA 2015 Section 108. Acoustic underlay will be used to minimize noise. Quotes and specifications attached.</p>',
    description_text: 'Owner of Apartment 8 requests approval to install timber flooring throughout the apartment. This is a minor alteration as per SSMA 2015 Section 108. Acoustic underlay will be used to minimize noise. Quotes and specifications attached.',
    priority: 2,
    status: 2,
    created_at: '2025-10-15T11:30:00Z',
    updated_at: '2025-10-15T11:30:00Z',
    due_by: '2025-10-17T11:30:00Z',
    fr_due_by: '2025-10-16T11:30:00Z',
    requester_id: 5004,
    tags: ['renovation', 'approval'],
    custom_fields: {
      property_address: '321 Beach Road, Manly NSW 2095',
      strata_plan: 'SP 54321',
      lot_number: 'Apartment 8',
      renovation_type: 'minor'
    },
    attachments: [
      {
        name: 'flooring-quote.pdf',
        size: 245678,
        content_type: 'application/pdf'
      }
    ]
  },
  requester: {
    id: 5004,
    name: 'David Smith',
    email: 'david.smith@example.com',
    phone: '+61445678901'
  }
};

const emergencyTicket = {
  ticket: {
    id: 1005,
    subject: 'EMERGENCY - Gas leak detected in basement car park',
    description: '<p><strong>URGENT:</strong> Strong gas smell detected in basement car park. Area has been evacuated. Emergency services contacted. Requires immediate attention per SSMA 2015 Section 106.</p>',
    description_text: 'URGENT: Strong gas smell detected in basement car park. Area has been evacuated. Emergency services contacted. Requires immediate attention per SSMA 2015 Section 106.',
    priority: 4,
    status: 2,
    created_at: '2025-10-15T14:45:00Z',
    updated_at: '2025-10-15T14:45:00Z',
    due_by: '2025-10-15T18:45:00Z',
    fr_due_by: '2025-10-15T15:45:00Z',
    requester_id: 5005,
    tags: ['emergency', 'safety', 'critical'],
    custom_fields: {
      property_address: '555 Harbour Street, Sydney NSW 2000',
      strata_plan: 'SP 98765',
      emergency_type: 'gas_leak'
    }
  },
  requester: {
    id: 5005,
    name: 'Emergency Contact',
    email: 'emergency@example.com',
    phone: '+61456789012'
  }
};

const ncatDisputeTicket = {
  ticket: {
    id: 1006,
    subject: 'NCAT application received - Lot 15 vs Owners Corporation',
    description: '<p>Received NCAT application from Lot 15 owner regarding dispute over special levy for building repairs. Application number: NCAT-2025-12345. Hearing scheduled for 30/11/2025. Requires urgent legal review and response preparation as per SSMA 2015 Section 232.</p>',
    description_text: 'Received NCAT application from Lot 15 owner regarding dispute over special levy for building repairs. Application number: NCAT-2025-12345. Hearing scheduled for 30/11/2025. Requires urgent legal review and response preparation as per SSMA 2015 Section 232.',
    priority: 4,
    status: 2,
    created_at: '2025-10-15T15:20:00Z',
    updated_at: '2025-10-15T15:20:00Z',
    due_by: '2025-10-15T19:20:00Z',
    fr_due_by: '2025-10-15T16:20:00Z',
    requester_id: 5006,
    tags: ['ncat', 'legal', 'dispute', 'critical'],
    custom_fields: {
      property_address: '888 City Plaza, Sydney NSW 2000',
      strata_plan: 'SP 11223',
      lot_number: 'Lot 15',
      ncat_application: 'NCAT-2025-12345'
    }
  },
  requester: {
    id: 5006,
    name: 'Legal Department',
    email: 'legal@stratamanagement.com.au',
    phone: '+61467890123'
  }
};

const informationRequestTicket = {
  ticket: {
    id: 1007,
    subject: 'New owner onboarding - Access to strata records',
    description: '<p>New owner of Lot 7 requesting access to strata records including by-laws, meeting minutes from past 12 months, and capital works plan. As per SSMA 2015 Section 178, please provide records within 7 days.</p>',
    description_text: 'New owner of Lot 7 requesting access to strata records including by-laws, meeting minutes from past 12 months, and capital works plan. As per SSMA 2015 Section 178, please provide records within 7 days.',
    priority: 1,
    status: 2,
    created_at: '2025-10-15T16:00:00Z',
    updated_at: '2025-10-15T16:00:00Z',
    due_by: '2025-10-17T16:00:00Z',
    fr_due_by: '2025-10-16T16:00:00Z',
    requester_id: 5007,
    tags: ['information', 'onboarding', 'records'],
    custom_fields: {
      property_address: '222 Coastal Drive, Bondi NSW 2026',
      strata_plan: 'SP 77889',
      lot_number: 'Lot 7',
      request_type: 'onboarding'
    }
  },
  requester: {
    id: 5007,
    name: 'Emma Wilson',
    email: 'emma.wilson@example.com',
    phone: '+61478901234'
  }
};

// Generate webhook payloads with signatures
function createWebhookPayload(ticketData) {
  const payload = {
    ...ticketData,
    webhook_type: 'ticket_create',
    timestamp: new Date().toISOString()
  };

  const signature = generateSignature(payload, WEBHOOK_SECRET);

  return {
    headers: {
      'x-freshdesk-signature': signature,
      'content-type': 'application/json',
      'user-agent': 'Freshdesk-Webhook'
    },
    body: payload
  };
}

// Invalid payloads for testing error handling
const invalidPayloads = {
  missingTicketId: {
    ticket: {
      subject: 'Test ticket',
      description: 'No ID field'
    }
  },
  invalidSignature: {
    ticket: maintenanceTicket.ticket,
    _signature: 'invalid-signature-abc123'
  },
  malformedJson: 'this is not valid json {{{',
  emptyPayload: {},
  missingRequiredFields: {
    ticket: {
      id: 9999
      // Missing subject and description
    }
  }
};

module.exports = {
  WEBHOOK_SECRET,
  generateSignature,
  createWebhookPayload,

  // Valid ticket scenarios
  maintenanceTicket,
  bylawComplianceTicket,
  financialTicket,
  renovationTicket,
  emergencyTicket,
  ncatDisputeTicket,
  informationRequestTicket,

  // Invalid payloads for error testing
  invalidPayloads,

  // Helper to create webhook request
  createWebhookRequest: (ticketData) => createWebhookPayload(ticketData)
};
