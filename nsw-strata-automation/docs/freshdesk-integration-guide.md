# Freshdesk Integration Guide

**Task 15.2: Freshdesk Test Instance Configuration**

Complete guide for integrating Freshdesk with the NSW Strata Automation system using webhooks and API.

## Table of Contents

1. [Freshdesk Account Setup](#freshdesk-account-setup)
2. [API Key Configuration](#api-key-configuration)
3. [Webhook Configuration](#webhook-configuration)
4. [Testing Webhooks](#testing-webhooks)
5. [API Integration](#api-integration)
6. [Troubleshooting](#troubleshooting)

## Freshdesk Account Setup

### Creating a Test Account

1. **Sign Up for Free Trial:**
   - Visit: https://freshdesk.com/signup
   - Enter business email
   - Choose subdomain (e.g., `yourcompany-dev`)
   - Select plan: Start with free trial (21 days)

2. **Complete Account Setup:**
   - Set company name
   - Configure business hours
   - Add agent(s) for testing
   - Set support email (e.g., `support@yourcompany-dev.freshdesk.com`)

3. **Initial Configuration:**
   - Go to Admin → Helpdesk Settings
   - Configure:
     - Time zone: Australia/Sydney
     - Date format: DD/MM/YYYY
     - Default language: English

### Recommended Test Configuration

**Ticket Fields:**
- Enable custom fields for:
  - Property ID (Text)
  - Lot Number (Number)
  - Building Name (Text)
  - Category (Dropdown)
  - Priority Override (Checkbox)

**Ticket Statuses:**
- Open
- Pending
- Resolved
- Closed
- Awaiting Customer Reply

**Priority Levels:**
- Low (4)
- Medium (3)
- High (2)
- Urgent (1)

## API Key Configuration

### Generating API Key

1. **Access Profile Settings:**
   - Click profile icon (top-right)
   - Select "Profile Settings"

2. **Find API Key:**
   - Scroll to "Your API Key" section
   - Click "View API Key"
   - Copy the key (format: `xxxxxxxxxxxxxxxxxxxxx`)

3. **Store Securely:**
   ```bash
   # Add to .env.development
   FRESHDESK_DOMAIN=yourcompany-dev
   FRESHDESK_API_KEY=your_api_key_here
   ```

### Testing API Access

```bash
# Test authentication
curl -u YOUR_API_KEY:X \
  https://yourcompany-dev.freshdesk.com/api/v2/tickets?per_page=1

# Expected response: JSON array with ticket(s) or empty array
```

## Webhook Configuration

### Overview

Freshdesk webhooks notify n8n when tickets are created or updated, enabling real-time automation.

### Webhook Events

We configure webhooks for:
1. **Ticket Created** - New tickets submitted
2. **Ticket Updated** - Existing tickets modified
3. **Note Added** (Optional) - Internal notes added

### Step-by-Step Webhook Setup

#### 1. Access Automations

1. Go to **Admin** → **Workflows** → **Automations**
2. Click **Ticket Updates** (or **New Ticket**)

#### 2. Create "New Ticket" Webhook Automation

**A. Basic Configuration:**
- Click **New Rule**
- Name: `NSW Strata - New Ticket to n8n`
- Description: `Send new tickets to n8n for AI processing`
- Status: Active

**B. Event Conditions:**
```
WHEN: Ticket is Created
AND: Priority is not equal to Low (optional filter)
PERFORM THESE ACTIONS: Immediately
```

**C. Webhook Action:**

Click **Add Action** → **Trigger Webhook**

**Request Configuration:**
```
Request Type: POST
URL: https://your-n8n-instance.app.n8n.cloud/webhook/freshdesk-ticket
Encoding: JSON
Content: Advanced
Requires Authentication: No (we use custom header)
```

**Custom Headers:**
```json
{
  "Content-Type": "application/json",
  "X-Webhook-Secret": "your_webhook_secret_from_env",
  "X-Freshdesk-Event": "ticket_created"
}
```

**Request Body (JSON):**
```json
{
  "event_type": "ticket_created",
  "ticket": {
    "id": {{ticket.id}},
    "subject": "{{ticket.subject}}",
    "description": "{{ticket.description_text}}",
    "description_html": "{{ticket.description}}",
    "priority": {{ticket.priority}},
    "status": {{ticket.status}},
    "source": {{ticket.source}},
    "created_at": "{{ticket.created_at}}",
    "updated_at": "{{ticket.updated_at}}",
    "due_by": "{{ticket.due_by}}",
    "fr_due_by": "{{ticket.fr_due_by}}",
    "is_escalated": {{ticket.is_escalated}},
    "custom_fields": {
      "property_id": "{{ticket.custom_field.cf_property_id}}",
      "lot_number": "{{ticket.custom_field.cf_lot_number}}",
      "building_name": "{{ticket.custom_field.cf_building_name}}"
    }
  },
  "requester": {
    "id": {{ticket.requester.id}},
    "name": "{{ticket.requester.name}}",
    "email": "{{ticket.requester.email}}",
    "phone": "{{ticket.requester.phone}}",
    "mobile": "{{ticket.requester.mobile}}"
  },
  "agent": {
    "id": {{ticket.responder.id}},
    "name": "{{ticket.responder.name}}",
    "email": "{{ticket.responder.email}}"
  },
  "company": {
    "id": {{ticket.company.id}},
    "name": "{{ticket.company.name}}"
  }
}
```

**D. Save and Activate:**
- Click **Save** at bottom
- Ensure toggle is **Active**

#### 3. Create "Ticket Updated" Webhook Automation

Repeat the same process with:

**Changes:**
- Name: `NSW Strata - Ticket Updated to n8n`
- Condition: `WHEN: Ticket is Updated`
- Header: `"X-Freshdesk-Event": "ticket_updated"`
- Body: Change `"event_type": "ticket_updated"`

**Additional Conditions (Optional):**
```
AND: Status changes from Open to any
AND: Reply is sent by requester
```

#### 4. Create "Note Added" Automation (Optional)

For internal note tracking:

- Name: `NSW Strata - Note Added to n8n`
- Condition: `WHEN: Note is added`
- Header: `"X-Freshdesk-Event": "note_added"`
- Body: Include note content and author

### Webhook Payload Templates

#### Minimal Payload (Lightweight)

For basic ticket information:

```json
{
  "event": "{{ticket.event}}",
  "ticket_id": {{ticket.id}},
  "subject": "{{ticket.subject}}",
  "description": "{{ticket.description_text}}",
  "priority": {{ticket.priority}},
  "status": {{ticket.status}},
  "requester_email": "{{ticket.requester.email}}",
  "created_at": "{{ticket.created_at}}"
}
```

#### Full Payload (Complete Data)

Use the comprehensive JSON from section 2C above.

## Testing Webhooks

### Test 1: Manual Webhook Test

Use Freshdesk's built-in test feature:

1. In automation rule, click **Run Now**
2. Select a test ticket
3. Click **Run**
4. Check n8n executions for incoming request

### Test 2: Create Test Ticket

1. **In Freshdesk UI:**
   - Go to **Tickets** → **New Ticket**
   - Fill in:
     - Requester: test@example.com
     - Subject: `Test: Water leak in common property`
     - Description: `There is a water leak in the common area near the elevator on level 3.`
     - Priority: High
   - Click **Submit**

2. **Verify in n8n:**
   - Go to n8n **Executions**
   - Check for new execution
   - Review execution data
   - Verify webhook payload received

3. **Check Response:**
   - Return to Freshdesk ticket
   - Look for AI-generated reply
   - Verify ticket status updated

### Test 3: Reply to Ticket

1. **Customer Reply:**
   - Reply to the test ticket as customer
   - Add: `Thank you, but the issue is still present`

2. **Verify Reply Handler:**
   - Check n8n for reply-handler workflow execution
   - Verify conversation state tracked
   - Check follow-up response posted

### Test 4: Webhook Failure Handling

1. **Temporarily Deactivate n8n Workflow:**
   - In n8n, deactivate main-ticket-processor

2. **Create Test Ticket:**
   - Create ticket in Freshdesk
   - Check Freshdesk automation logs

3. **Expected Behavior:**
   - Freshdesk shows webhook delivery failure
   - Error logged in Freshdesk

4. **Reactivate and Retry:**
   - Reactivate n8n workflow
   - Re-trigger automation or create new ticket
   - Verify success

## API Integration

### Freshdesk API Operations

The n8n workflows use these Freshdesk API endpoints:

#### 1. Get Ticket Details

```http
GET /api/v2/tickets/{id}
Authorization: Basic {base64(API_KEY:X)}
```

**Used in:** Ticket enrichment node

#### 2. Create Reply

```http
POST /api/v2/tickets/{id}/reply
Content-Type: application/json
Authorization: Basic {base64(API_KEY:X)}

{
  "body": "Response text here",
  "user_id": agent_id
}
```

**Used in:** Response posting nodes

#### 3. Update Ticket

```http
PUT /api/v2/tickets/{id}
Content-Type: application/json
Authorization: Basic {base64(API_KEY:X)}

{
  "status": 4,
  "priority": 2,
  "tags": ["ai-processed", "auto-resolved"]
}
```

**Used in:** Status update nodes

#### 4. Add Note

```http
POST /api/v2/tickets/{id}/notes
Content-Type: application/json
Authorization: Basic {base64(API_KEY:X)}

{
  "body": "Internal note text",
  "private": true
}
```

**Used in:** Internal tracking

#### 5. Get Conversations

```http
GET /api/v2/tickets/{id}/conversations
Authorization: Basic {base64(API_KEY:X)}
```

**Used in:** Multi-turn conversation handling

### Rate Limits

Freshdesk API rate limits:

- **Free/Trial:** 50 requests/minute per account
- **Growth:** 100 requests/minute
- **Pro:** 200 requests/minute
- **Enterprise:** 400 requests/minute

**Handling Rate Limits:**

Our implementation includes:
- Exponential backoff (Task 6.7)
- Retry-After header handling (Task 6.8)
- Redis queue for request management

### Authentication in n8n

**Configure Freshdesk Credential:**

1. In n8n, go to **Credentials**
2. Click **Add Credential**
3. Select **HTTP Request - Basic Auth**
4. Configure:
   - Name: `Freshdesk Dev`
   - Username: `{YOUR_API_KEY}`
   - Password: `X` (literal character)
5. Test and save

## Troubleshooting

### Issue 1: Webhook Not Triggering

**Symptoms:**
- No n8n executions when ticket created
- Freshdesk automation shows "failed"

**Solutions:**

1. **Check URL:**
   - Verify webhook URL is correct
   - Ensure HTTPS (not HTTP)
   - Test URL directly with curl

2. **Check n8n Workflow:**
   - Verify workflow is **Active**
   - Check webhook node configuration
   - Ensure authentication allows webhooks

3. **Check Freshdesk Automation:**
   - Verify automation is **Active**
   - Check conditions match test ticket
   - Review automation execution logs

4. **Test Manually:**
   ```bash
   curl -X POST https://your-n8n.app.n8n.cloud/webhook/freshdesk-ticket \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: your_secret" \
     -d '{"event":"test","ticket_id":123,"subject":"Test"}'
   ```

### Issue 2: Webhook Signature Verification Failed

**Symptoms:**
- n8n workflow fails at signature verification node
- Error: "Invalid webhook signature"

**Solutions:**

1. Verify `WEBHOOK_SECRET` matches in:
   - `.env.development`
   - Freshdesk automation header
   - n8n workflow signature verification

2. Check header format:
   - Header name: `X-Webhook-Secret`
   - Value: Exact match (case-sensitive)

3. Temporarily disable verification for testing:
   - Skip signature node
   - Test webhook delivery
   - Re-enable after confirming setup

### Issue 3: API Authentication Errors

**Symptoms:**
- 401 Unauthorized
- 403 Forbidden

**Solutions:**

1. **Verify API Key:**
   ```bash
   # Test independently
   curl -v -u YOUR_API_KEY:X \
     https://yourcompany-dev.freshdesk.com/api/v2/tickets?per_page=1
   ```

2. **Check Encoding:**
   - n8n uses basic auth: base64(API_KEY:X)
   - Ensure `:X` is included (colon and capital X)

3. **Regenerate Key:**
   - Go to Freshdesk profile
   - Regenerate API key
   - Update in n8n credential
   - Test again

### Issue 4: Missing Ticket Data

**Symptoms:**
- Webhook received but missing fields
- Null or undefined values in n8n

**Solutions:**

1. **Check Payload Template:**
   - Verify placeholders are correct
   - Use `{{ticket.field}}` not `{{field}}`

2. **Check Field Availability:**
   - Some fields only available on certain events
   - Custom fields need `custom_field.cf_` prefix

3. **Use Advanced Content:**
   - In webhook action, select "Advanced" not "Simple"
   - Allows full JSON customization

### Issue 5: Rate Limit Exceeded

**Symptoms:**
- 429 Too Many Requests
- Workflow fails intermittently

**Solutions:**

1. **Implement Backoff:**
   - Already configured in workflows (Task 6.7)
   - Check retry settings

2. **Monitor Usage:**
   - Check API usage in Freshdesk Admin
   - Review request frequency

3. **Upgrade Plan:**
   - Consider higher Freshdesk tier
   - Increases rate limits

## Best Practices

### Webhook Security

1. **Always Use HTTPS:**
   - Never use HTTP for webhooks
   - Ensure SSL certificate is valid

2. **Implement Signature Verification:**
   - Use webhook secret
   - Verify signature before processing

3. **Rate Limiting:**
   - Implement request throttling
   - Handle 429 responses gracefully

### Error Handling

1. **Webhook Retries:**
   - Freshdesk retries failed webhooks
   - Implement idempotency

2. **Logging:**
   - Log all webhook receipts
   - Track processing status

3. **Monitoring:**
   - Alert on repeated failures
   - Monitor webhook delivery rate

### Testing

1. **Use Test Account:**
   - Separate from production
   - Safe for experimentation

2. **Test Scenarios:**
   - Create tickets
   - Update tickets
   - Reply to tickets
   - Close tickets

3. **Verify Data Flow:**
   - Webhook → n8n → Database
   - AI processing → Response
   - Error handling → Alerts

## Reference

### Freshdesk Documentation

- API Reference: https://developers.freshdesk.com/api/
- Webhooks Guide: https://developers.freshdesk.com/v2/docs/webhooks/
- Automation Rules: https://support.freshdesk.com/en/support/solutions/articles/216548

### n8n Integration

- HTTP Request Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- Webhook Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/

---

**Last Updated:** 2025-10-15
**Task:** 15.2 - Freshdesk Integration
**Status:** Complete
