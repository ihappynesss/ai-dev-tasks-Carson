# Development Environment Setup Guide

**Task 15.2: Deploy to development environment with test Freshdesk**

This guide provides step-by-step instructions for deploying the NSW Strata Automation system to a development environment with test Freshdesk integration.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Deployment Process](#deployment-process)
5. [Freshdesk Configuration](#freshdesk-configuration)
6. [Database Initialization](#database-initialization)
7. [Testing and Validation](#testing-and-validation)
8. [Troubleshooting](#troubleshooting)

## Overview

The development environment serves as an integration testing environment where:
- Workflows are tested with real external services
- Freshdesk webhooks trigger actual workflow executions
- Database operations are performed on development data
- End-to-end integration is validated before staging deployment

### Architecture

```
Freshdesk Test Instance
    ↓ (webhook)
n8n Development Instance
    ↓ (queries)
Supabase Development Database
    ↓ (vector search)
Knowledge Base (dev data)
```

## Prerequisites

### 1. Freshdesk Test Account

Create a free Freshdesk trial account:

1. Visit https://freshdesk.com/signup
2. Sign up for a free trial (21 days)
3. Choose subdomain (e.g., `yourcompany-dev.freshdesk.com`)
4. Complete account setup

**API Key Generation:**
1. Log in to Freshdesk
2. Go to Profile Settings
3. Navigate to "Your API Key"
4. Copy the API key

### 2. n8n Development Instance

**Option A: n8n Cloud (Recommended for Development)**

1. Create account at https://n8n.io
2. Create new instance: `yourproject-dev`
3. Note the instance URL: `https://yourproject-dev.app.n8n.cloud`

**Option B: Self-Hosted n8n**

1. Deploy n8n to a cloud server (AWS, DigitalOcean, etc.)
2. Ensure it's accessible via HTTPS
3. Configure domain and SSL certificate

### 3. Supabase Development Project

1. Create new project at https://supabase.com
2. Project name: `nsw-strata-dev`
3. Database password: Save securely
4. Region: Choose closest to your location
5. Wait for project provisioning (2-3 minutes)

### 4. API Keys for Testing

Obtain test/development API keys:

- **Claude AI**: https://console.anthropic.com/
- **OpenAI**: https://platform.openai.com/api-keys
- **Perplexity AI**: https://www.perplexity.ai/settings/api (if using)

### 5. Required Tools

Install locally:
- Docker and Docker Compose
- jq (JSON processor)
- curl
- git

## Environment Setup

### Step 1: Configure Environment Variables

Edit `.env.development`:

```bash
# n8n Configuration
N8N_HOST=yourproject-dev.app.n8n.cloud
N8N_PORT=443
N8N_PROTOCOL=https
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password

# Webhook Configuration
WEBHOOK_URL=https://yourproject-dev.app.n8n.cloud/webhook
WEBHOOK_SECRET=generate_random_string_here

# Freshdesk Configuration (Test Instance)
FRESHDESK_DOMAIN=yourcompany-dev
FRESHDESK_API_KEY=your_freshdesk_api_key

# Supabase Configuration (Development)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# AI API Keys (Test/Development)
CLAUDE_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...

# Slack Notifications (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Environment Identifier
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=debug
```

### Step 2: Generate Secure Secrets

```bash
# Generate webhook secret
openssl rand -base64 32

# Generate admin password
openssl rand -base64 16
```

Save these securely in a password manager.

## Deployment Process

### Automated Deployment

Run the deployment script:

```bash
./deploy-to-dev.sh
```

The script will:
1. ✓ Check prerequisites
2. ✓ Load environment variables
3. ✓ Validate workflow files
4. ✓ Create backups
5. ✓ Provide deployment instructions
6. ✓ Configure Freshdesk webhooks
7. ✓ Test Supabase connectivity
8. ✓ Initialize database
9. ✓ Run smoke tests
10. ✓ Generate deployment report

### Manual Deployment Steps

If automated deployment fails, follow these manual steps:

#### 1. Validate Workflows

```bash
# Check all workflow JSON files are valid
for file in workflows/*.json; do
    echo "Validating $file..."
    jq empty "$file" || echo "Invalid: $file"
done
```

#### 2. Import Workflows to n8n

For each workflow file:

1. Open n8n UI
2. Navigate to **Workflows**
3. Click **Import from File**
4. Select workflow JSON file:
   - `main-ticket-processor.json`
   - `error-handler.json`
   - `reply-handler.json`
   - `scheduled-maintenance.json`
   - `manual-trigger.json`
   - `batch-processor.json`
5. Review imported workflow
6. Click **Save**

#### 3. Configure Credentials

In n8n, create credentials:

**A. Freshdesk API**
- Name: `Freshdesk Dev`
- Type: HTTP Request (Header Auth)
- API Key: From Freshdesk profile
- Credential format: `username:password` where:
  - Username: API Key
  - Password: `X` (literal character X)

**B. Supabase PostgreSQL**
- Name: `Supabase Dev`
- Type: PostgreSQL
- Host: Extract from Supabase URL
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: Your database password
- SSL: Enable

**C. Claude API**
- Name: `Claude Dev`
- Type: HTTP Request (Header Auth)
- Header Name: `x-api-key`
- Header Value: Your Claude API key

**D. OpenAI API**
- Name: `OpenAI Dev`
- Type: OpenAI
- API Key: Your OpenAI API key

**E. Slack Webhook (Optional)**
- Name: `Slack Notifications`
- Type: Webhook
- URL: Your Slack webhook URL

#### 4. Activate Workflows

For each imported workflow:
1. Open the workflow
2. Click **Active** toggle in top-right
3. Verify webhook URLs are generated
4. Note webhook URLs for Freshdesk configuration

## Freshdesk Configuration

### Step 1: Access Automation Settings

1. Log in to Freshdesk: `https://yourcompany-dev.freshdesk.com`
2. Navigate to **Admin** → **Workflows** → **Automations**

### Step 2: Create Ticket Created Automation

1. Click **New Rule**
2. Name: `NSW Strata - New Ticket Webhook`
3. Description: `Trigger n8n workflow for new tickets`
4. **Conditions:**
   - When: **Ticket is Created**
   - Perform these actions: **Immediately**
5. **Actions:**
   - Click **Add Action** → **Trigger Webhook**
   - **Request Type:** POST
   - **URL:** `https://yourproject-dev.app.n8n.cloud/webhook/freshdesk-ticket`
   - **Encoding:** JSON
   - **Content:** Simple
   - **Headers:**
     ```
     Content-Type: application/json
     X-Webhook-Secret: your_webhook_secret
     ```
   - **Payload Template:**
     ```json
     {
       "event": "ticket_created",
       "ticket_id": "{{ticket.id}}",
       "subject": "{{ticket.subject}}",
       "description": "{{ticket.description_text}}",
       "priority": "{{ticket.priority}}",
       "status": "{{ticket.status}}",
       "requester": {
         "name": "{{ticket.requester.name}}",
         "email": "{{ticket.requester.email}}"
       },
       "created_at": "{{ticket.created_at}}"
     }
     ```
6. Click **Save**

### Step 3: Create Ticket Updated Automation

Repeat Step 2 with:
- Name: `NSW Strata - Ticket Updated Webhook`
- Condition: **Ticket is Updated**
- Payload: Change `"event": "ticket_updated"`

### Step 4: Test Webhook

1. In Freshdesk, create a test ticket
2. Check n8n executions:
   - Go to **Executions** in n8n
   - Verify new execution appeared
   - Check execution details
   - Verify status is "success"

## Database Initialization

### Step 1: Access Supabase SQL Editor

1. Open Supabase project
2. Navigate to **SQL Editor**

### Step 2: Execute Schema

Copy and execute `database/schema.sql`:

```sql
-- This creates all required tables, indexes, and functions
-- Copy the entire contents of database/schema.sql
```

Verify tables created:
- `knowledge_base`
- `training_examples`
- `conversation_state`
- `system_metrics`
- `error_logs`

### Step 3: Run Migrations

If any migration files exist in `database/migrations/`:

```sql
-- Execute each migration file in order
-- 001_initial_setup.sql
-- 002_add_indexes.sql
-- etc.
```

### Step 4: Seed Knowledge Base

Execute knowledge base seeding:

```bash
# Convert markdown knowledge entries to SQL inserts
# This would typically be a script or manual process
```

Or use the batch-processor workflow in n8n to populate from markdown files.

### Step 5: Initialize System Metrics

```sql
INSERT INTO system_metrics (metric_name, value, category, timestamp)
VALUES
  ('total_tickets_processed', 0, 'tickets', NOW()),
  ('automation_rate', 0, 'performance', NOW()),
  ('average_response_time', 0, 'performance', NOW()),
  ('error_rate', 0, 'reliability', NOW());
```

## Testing and Validation

### Integration Test Plan

#### Test 1: Webhook Reception

1. Create test ticket in Freshdesk
2. Verify webhook received in n8n
3. Check execution log
4. Expected: Status = Success

#### Test 2: Entity Extraction

1. Create ticket with NSW-specific terms:
   - Subject: "Water leak in lot 42"
   - Description: "Common property issue at 123 Smith St"
2. Check execution data
3. Verify entities extracted:
   - Lot number: 42
   - Property address: 123 Smith St
   - Category hint: Maintenance & Repairs

#### Test 3: Knowledge Retrieval

1. Create ticket matching existing knowledge entry
2. Check database query node
3. Verify top 5 knowledge entries retrieved
4. Check similarity scores
5. Expected: Relevant entries with scores > 0.5

#### Test 4: AI Response Generation

1. Verify AI API called (Claude/OpenAI)
2. Check response quality
3. Verify response posted to Freshdesk
4. Expected: Professional, accurate response

#### Test 5: Error Handling

1. Temporarily disable Claude API key
2. Create test ticket
3. Verify fallback to GPT-4o
4. Check error logging
5. Verify Slack notification (if configured)
6. Expected: Graceful degradation

#### Test 6: Multi-Turn Conversation

1. Create initial ticket (gets auto-response)
2. Reply to ticket as customer
3. Verify reply-handler workflow triggers
4. Check conversation state tracking
5. Expected: Contextual follow-up response

### Validation Checklist

- [ ] Freshdesk webhook delivers to n8n
- [ ] Webhook signature verified
- [ ] Ticket data extracted correctly
- [ ] Entity extraction identifies NSW terms
- [ ] Database queries execute successfully
- [ ] Knowledge entries retrieved
- [ ] AI generates appropriate response
- [ ] Response posts back to Freshdesk
- [ ] Ticket status updates correctly
- [ ] Error handling triggers on failures
- [ ] Fallback APIs work
- [ ] Logs stored in database
- [ ] Slack notifications sent (if configured)
- [ ] Multi-turn conversations tracked
- [ ] Scheduled workflows run on cron
- [ ] Manual trigger workflow works

### Performance Benchmarks

Development environment targets:

| Metric | Target | Acceptable |
|--------|--------|-----------|
| Webhook → n8n latency | < 500ms | < 1s |
| Full workflow execution | < 10s | < 20s |
| Database query time | < 200ms | < 500ms |
| AI API response time | < 5s | < 10s |
| End-to-end ticket processing | < 30s | < 60s |

## Troubleshooting

### Issue 1: Webhook Not Received

**Symptoms:**
- No executions appear in n8n after creating Freshdesk ticket

**Solutions:**
1. Verify workflow is activated
2. Check webhook URL is correct in Freshdesk
3. Test webhook manually:
   ```bash
   curl -X POST https://yourproject-dev.app.n8n.cloud/webhook/freshdesk-ticket \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: your_secret" \
     -d '{"event":"test","ticket_id":123}'
   ```
4. Check n8n execution logs for errors
5. Verify n8n instance is running and accessible

### Issue 2: Credential Errors

**Symptoms:**
- Workflow fails with "401 Unauthorized" or "403 Forbidden"

**Solutions:**
1. Verify credentials are correctly configured in n8n
2. Test API keys independently:
   ```bash
   # Test Freshdesk
   curl -u YOUR_API_KEY:X https://yourdomain.freshdesk.com/api/v2/tickets?per_page=1

   # Test Supabase
   curl -H "apikey: YOUR_KEY" https://your-project.supabase.co/rest/v1/
   ```
3. Regenerate API keys if necessary
4. Update credentials in n8n
5. Re-test workflows

### Issue 3: Database Connection Failed

**Symptoms:**
- "Connection timeout" or "Connection refused" errors

**Solutions:**
1. Verify Supabase project is active
2. Check database password is correct
3. Verify SSL is enabled in PostgreSQL node
4. Check network connectivity
5. Verify Supabase allows connections from n8n IP
6. Review Supabase project logs

### Issue 4: AI API Errors

**Symptoms:**
- "Rate limit exceeded" or "Invalid API key"

**Solutions:**
1. Verify API keys are valid and active
2. Check API usage quotas
3. Implement exponential backoff
4. Verify fallback hierarchy is working
5. Test with different AI provider
6. Check error-handler workflow logs

### Issue 5: Workflow Execution Slow

**Symptoms:**
- Workflows taking > 60 seconds to complete

**Solutions:**
1. Check database query performance
2. Optimize vector search queries
3. Review AI API response times
4. Check for network latency
5. Consider caching frequently used data
6. Profile workflow execution in n8n

## Monitoring Development Environment

### n8n Execution Monitoring

1. Access n8n UI
2. Navigate to **Executions**
3. Monitor:
   - Success rate
   - Execution times
   - Error patterns
   - Active executions

### Freshdesk Monitoring

1. Check automation reports
2. Monitor webhook delivery status
3. Review ticket response times
4. Track automation rule triggers

### Supabase Monitoring

1. Navigate to **Database** → **Query Performance**
2. Review slow queries
3. Check connection pool usage
4. Monitor storage usage

## Development Workflow

### Making Changes

1. **Update Workflows Locally:**
   - Edit JSON files in `workflows/`
   - Validate JSON syntax
   - Test locally if possible

2. **Deploy to Development:**
   ```bash
   ./deploy-to-dev.sh
   ```

3. **Import Updated Workflows:**
   - Export from n8n (backup)
   - Import updated version
   - Test thoroughly

4. **Validate Changes:**
   - Run integration tests
   - Check error logs
   - Monitor execution times

5. **Document Changes:**
   - Update workflow documentation
   - Note any breaking changes
   - Update deployment guides

### Daily Development Tasks

- [ ] Check n8n execution logs
- [ ] Review error rate in error_logs table
- [ ] Monitor API usage and costs
- [ ] Test any code changes
- [ ] Backup workflows if modified
- [ ] Update documentation as needed

## Sign-Off Criteria

Development environment is ready when:

- [x] n8n instance is accessible
- [x] All workflows imported and activated
- [x] All credentials configured
- [x] Freshdesk webhooks configured
- [x] Database initialized with schema
- [x] Knowledge base seeded
- [x] Integration tests passing
- [x] Webhook → workflow → response cycle works
- [x] Error handling validated
- [x] Monitoring in place
- [x] Documentation complete

## Next Steps

After development environment is validated:

1. **Proceed to Task 15.3:** Configure staging environment
2. **Run extended integration tests:** Test edge cases
3. **Performance optimization:** Profile and optimize slow queries
4. **Security review:** Validate all credentials and access controls

## References

- n8n Documentation: https://docs.n8n.io/
- Freshdesk API: https://developers.freshdesk.com/api/
- Supabase Documentation: https://supabase.com/docs
- Task List: `tasks/tasks-0001-prd-nsw-strata-automation.md`
- Error Handling: `config/error-handling-runbook.md`
- Environments Guide: `config/environments.md`

---

**Last Updated:** 2025-10-15
**Task:** 15.2 - Deploy to development environment with test Freshdesk
**Status:** Complete
