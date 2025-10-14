# Freshdesk Webhook Configuration Guide

Complete guide for setting up Freshdesk webhooks to trigger n8n workflows for NSW Strata Automation.

## Overview

This system uses Freshdesk webhooks to trigger automated ticket processing in n8n. Webhooks provide real-time notifications when tickets are created or updated, enabling instant response and processing.

## Webhook Endpoints

### Production Endpoints (n8n Cloud)

| Workflow | Webhook Path | URL | Method |
|----------|-------------|-----|--------|
| Main Ticket Processor | `/webhook/freshdesk-ticket` | `https://your-n8n.app.n8n.cloud/webhook/freshdesk-ticket` | POST |
| Reply Handler | `/webhook/freshdesk-reply` | `https://your-n8n.app.n8n.cloud/webhook/freshdesk-reply` | POST |
| Batch Processor | `/webhook/batch-process` | `https://your-n8n.app.n8n.cloud/webhook/batch-process` | POST |

### Development Endpoints (Local Docker)

| Workflow | Webhook Path | URL | Method |
|----------|-------------|-----|--------|
| Main Ticket Processor | `/webhook/freshdesk-ticket` | `http://localhost:5678/webhook/freshdesk-ticket` | POST |
| Reply Handler | `/webhook/freshdesk-reply` | `http://localhost:5678/webhook/freshdesk-reply` | POST |

**Note:** Use ngrok or similar tunneling service for local development webhook testing.

## Freshdesk Webhook Setup

### Step 1: Access Automation Settings

1. Login to your Freshdesk account as Admin
2. Navigate to **Admin > Workflows > Automations**
3. Click **Ticket Creation** for new tickets or **Ticket Updates** for replies

### Step 2: Create New Ticket Automation

**For Main Ticket Processor (New Tickets):**

1. Click **"New Rule"**
2. **Rule Name:** "n8n - New Ticket Processing"
3. **Description:** "Send new tickets to n8n workflow for AI processing"

**Conditions:**
- **When:** Ticket is Created
- **And:** Ticket Status is not Closed
- **And:** Ticket Source is Email OR Portal OR Phone (exclude API-created tickets)

**Actions:**
- **Action Type:** Trigger Webhook
- **Request Type:** POST
- **URL:** `https://your-n8n.app.n8n.cloud/webhook/freshdesk-ticket`
- **Requires Authentication:** Yes
- **Content Type:** JSON
- **Custom Headers:**
  - `X-Freshdesk-Signature`: `{{ ticket.signature }}` (if using signature verification)
  - `X-Freshdesk-Webhook-Secret`: `your-webhook-secret-here`

**Request Body (JSON):**
```json
{
  "event": "ticket_created",
  "ticket": {
    "id": "{{ticket.id}}",
    "subject": "{{ticket.subject}}",
    "description": "{{ticket.description}}",
    "description_text": "{{ticket.description_text}}",
    "status": "{{ticket.status}}",
    "priority": "{{ticket.priority}}",
    "source": "{{ticket.source}}",
    "created_at": "{{ticket.created_at}}",
    "updated_at": "{{ticket.updated_at}}",
    "due_by": "{{ticket.due_by}}",
    "fr_due_by": "{{ticket.fr_due_by}}",
    "requester_id": "{{ticket.requester_id}}",
    "responder_id": "{{ticket.responder_id}}",
    "email": "{{ticket.email}}",
    "tags": {{ticket.tags}},
    "custom_fields": {{ticket.custom_fields}}
  },
  "requester": {
    "id": "{{ticket.requester.id}}",
    "name": "{{ticket.requester.name}}",
    "email": "{{ticket.requester.email}}",
    "phone": "{{ticket.requester.phone}}"
  },
  "timestamp": "{{current_time}}"
}
```

4. **Enable Advanced Options:**
   - ✅ Encode Special Characters
   - ✅ Retry on Failure (3 attempts)
   - ✅ Timeout: 30 seconds

5. Click **"Save & Enable"**

### Step 3: Create Reply Handler Automation

**For Reply Handler (Ticket Updates with Customer Replies):**

1. Click **"New Rule"** under **Ticket Updates**
2. **Rule Name:** "n8n - Customer Reply Processing"
3. **Description:** "Send customer replies to n8n for conversation management"

**Conditions:**
- **When:** Ticket is Updated
- **And:** Reply is Added
- **And:** Reply is from Requester (not agent)
- **And:** Ticket Status is not Closed

**Actions:**
- **Action Type:** Trigger Webhook
- **Request Type:** POST
- **URL:** `https://your-n8n.app.n8n.cloud/webhook/freshdesk-reply`

**Request Body (JSON):**
```json
{
  "event": "ticket_reply",
  "is_reply": true,
  "performer_type": "customer",
  "ticket": {
    "id": "{{ticket.id}}",
    "subject": "{{ticket.subject}}",
    "status": "{{ticket.status}}",
    "priority": "{{ticket.priority}}",
    "requester_id": "{{ticket.requester_id}}",
    "tags": {{ticket.tags}}
  },
  "reply": {
    "body": "{{ticket.latest_public_comment}}",
    "body_text": "{{ticket.latest_public_comment_text}}",
    "created_at": "{{ticket.updated_at}}",
    "user_id": "{{ticket.requester_id}}"
  },
  "timestamp": "{{current_time}}"
}
```

4. Click **"Save & Enable"**

## Webhook Security Configuration

### Option 1: HMAC Signature Verification (Recommended)

**Generate Webhook Secret:**
```bash
# Generate a secure random secret
openssl rand -base64 32
# Example output: Kj8fH2nB9xL4mP7wQ1eT6vR3sC5dN8aZ0yU4iO2
```

**Store Secret:**
- In Freshdesk: Admin > Webhooks > Secret Key
- In n8n: Environment variable `FRESHDESK_WEBHOOK_SECRET`
- In `.env.production`:
  ```bash
  FRESHDESK_WEBHOOK_SECRET=Kj8fH2nB9xL4mP7wQ1eT6vR3sC5dN8aZ0yU4iO2
  ```

**Verification (Already Implemented in Workflows):**
The main-ticket-processor workflow includes HMAC-SHA256 signature verification:
```javascript
const crypto = require('crypto');
const webhookSecret = $env.FRESHDESK_WEBHOOK_SECRET;
const signature = $json.headers['x-freshdesk-signature'];
const payload = JSON.stringify($json.body);

const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('base64');

if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Option 2: IP Whitelisting

**Freshdesk IP Ranges:**
```
185.78.20.0/24
185.78.21.0/24
54.253.120.0/24
```

**Configure in n8n Cloud:**
- n8n Cloud > Settings > Security > IP Whitelist
- Add Freshdesk IP ranges

**Configure in Docker (nginx or firewall):**
```nginx
location /webhook/ {
    allow 185.78.20.0/24;
    allow 185.78.21.0/24;
    allow 54.253.120.0/24;
    deny all;
    proxy_pass http://n8n:5678;
}
```

### Option 3: Header Authentication

**In Freshdesk Webhook Config:**
```
X-Api-Key: your-api-key-here
```

**In n8n Webhook Node:**
- Authentication: Header Auth
- Name: X-Api-Key
- Value: your-api-key-here

## Testing Webhooks

### Step 1: Test in Development

**Using ngrok for local testing:**
```bash
# Start ngrok tunnel
ngrok http 5678

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Use this as webhook URL in Freshdesk: https://abc123.ngrok.io/webhook/freshdesk-ticket
```

**Create test ticket in Freshdesk:**
1. Create a new ticket via Freshdesk portal or email
2. Check n8n workflow execution logs
3. Verify webhook payload received
4. Check immediate response (should be <500ms)

### Step 2: Test Signature Verification

**Send test webhook with curl:**
```bash
#!/bin/bash

WEBHOOK_URL="http://localhost:5678/webhook/freshdesk-ticket"
WEBHOOK_SECRET="your-secret-here"

# Create payload
PAYLOAD='{
  "event": "ticket_created",
  "ticket": {
    "id": "12345",
    "subject": "Test Ticket",
    "description": "This is a test",
    "priority": 2
  }
}'

# Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)

# Send webhook
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Freshdesk-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

**Expected Response:**
```json
{
  "status": "received",
  "ticket_id": "12345",
  "timestamp": "2025-10-15T02:30:00.000Z"
}
```

### Step 3: Monitor Webhook Logs

**In Freshdesk:**
- Admin > Webhooks > Logs
- Check for successful webhook deliveries (200 OK)
- Review failed attempts and error messages

**In n8n:**
- Open workflow > Executions
- Check webhook node execution logs
- Verify data extraction and processing

## Webhook Payload Examples

### New Ticket Payload

```json
{
  "event": "ticket_created",
  "ticket": {
    "id": 12345,
    "subject": "Water leak in Unit 25",
    "description": "<p>Water is leaking from the ceiling in our apartment...</p>",
    "description_text": "Water is leaking from the ceiling in our apartment...",
    "status": 2,
    "priority": 3,
    "source": 1,
    "created_at": "2025-10-15T10:30:00Z",
    "updated_at": "2025-10-15T10:30:00Z",
    "due_by": "2025-10-17T10:30:00Z",
    "fr_due_by": "2025-10-15T14:30:00Z",
    "requester_id": 67890,
    "email": "owner@example.com",
    "tags": ["urgent", "maintenance"],
    "custom_fields": {
      "cf_property_id": "BLDG-001",
      "cf_unit_number": "25",
      "cf_strata_plan": "SP 12345"
    }
  },
  "requester": {
    "id": 67890,
    "name": "John Smith",
    "email": "owner@example.com",
    "phone": "+61412345678"
  }
}
```

### Customer Reply Payload

```json
{
  "event": "ticket_reply",
  "is_reply": true,
  "performer_type": "customer",
  "ticket": {
    "id": 12345,
    "subject": "Water leak in Unit 25",
    "status": 2,
    "priority": 3,
    "requester_id": 67890
  },
  "reply": {
    "body": "<p>Thank you, but the issue is still not resolved...</p>",
    "body_text": "Thank you, but the issue is still not resolved...",
    "created_at": "2025-10-15T12:30:00Z",
    "user_id": 67890
  }
}
```

## Rate Limiting Configuration

To prevent abuse and ensure system stability:

**In n8n (via Redis):**
```javascript
// Rate limiting logic (implement in webhook nodes)
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379,
  db: 2  // Rate limit DB
});

const key = `ratelimit:${$json.body.ticket.requester_id}`;
const limit = 10;  // 10 requests per minute
const window = 60;  // 60 seconds

const current = await client.incr(key);
if (current === 1) {
  await client.expire(key, window);
}

if (current > limit) {
  throw new Error('Rate limit exceeded');
}
```

**Limits:**
- **Per Requester:** 10 tickets/minute
- **Global:** 200 tickets/minute
- **Per IP:** 50 requests/minute

## Monitoring and Alerts

### Webhook Health Check

**Daily Check (in scheduled-maintenance workflow):**
```sql
-- Check webhook processing stats
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total_webhooks,
  COUNT(*) FILTER (WHERE processing_time_ms < 500) AS fast_responses,
  AVG(processing_time_ms) AS avg_processing_time,
  COUNT(*) FILTER (WHERE error IS NOT NULL) AS failed_webhooks
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at);
```

### Slack Alerts

**Configure alerts for:**
- Webhook endpoint down (no webhooks received for >30 minutes)
- High error rate (>5% failed webhooks)
- Slow response time (>1000ms average)
- Rate limit exceeded events

## Troubleshooting

### Webhook Not Triggering

**Check:**
1. ✅ Freshdesk automation rule is enabled
2. ✅ Conditions are met (ticket status, source, etc.)
3. ✅ Webhook URL is correct (no typos)
4. ✅ n8n workflow is active
5. ✅ Firewall/IP whitelist allows Freshdesk IPs

**Test:**
- Manually trigger webhook from Freshdesk automation rule
- Check Freshdesk webhook logs for delivery status

### Signature Verification Failing

**Check:**
1. ✅ `FRESHDESK_WEBHOOK_SECRET` environment variable is set
2. ✅ Secret matches in Freshdesk and n8n
3. ✅ Payload is not modified before verification
4. ✅ Signature header name is correct (`X-Freshdesk-Signature`)

### Slow Response Times (>500ms)

**Optimize:**
1. Move heavy processing after immediate response node
2. Use queue mode in n8n (execute webhooks asynchronously)
3. Optimize database queries (add indexes)
4. Cache frequent lookups in Redis
5. Scale n8n workers horizontally

### Webhook Payloads Missing Data

**Check:**
1. ✅ Freshdesk placeholders are correct (`{{ticket.id}}`, not `{{id}}`)
2. ✅ Custom fields are included in request body
3. ✅ JSON syntax is valid (use Freshdesk's JSON validator)
4. ✅ n8n workflow is parsing payload correctly

## Production Deployment Checklist

- [ ] **Webhook URLs updated** to production n8n Cloud endpoints
- [ ] **HMAC secret generated** and stored securely
- [ ] **IP whitelist configured** (Freshdesk IPs allowed)
- [ ] **Rate limiting enabled** in n8n workflows
- [ ] **Monitoring configured** (Slack alerts, Prometheus metrics)
- [ ] **Webhooks tested** with real Freshdesk tickets
- [ ] **Signature verification tested** and working
- [ ] **Response time verified** (<500ms average)
- [ ] **Error handling tested** (network failures, timeouts)
- [ ] **Freshdesk automations enabled** in production
- [ ] **Documentation updated** with production URLs and secrets
- [ ] **Backup webhook configured** (failover endpoint)

## Related Documentation

- [Main Ticket Processor Workflow](../workflows/main-ticket-processor.json)
- [Reply Handler Workflow](../workflows/reply-handler.json)
- [Webhook Infrastructure Guide](./webhook-infrastructure.md)
- [Redis Configuration](./redis-config.md)
- [Environment Configuration](./environments.md)

## Support

For webhook configuration issues:
- **Freshdesk Support:** https://support.freshdesk.com
- **n8n Webhook Documentation:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- **Project Issues:** File an issue in the project repository
