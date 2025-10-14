# Deployment Guide

Complete guide for deploying the NSW Strata Automation system from development to production.

## Deployment Overview

### Environments

1. **Development** - Local Docker environment
2. **Staging** - n8n Cloud with 20% ticket sampling
3. **Production** - n8n Cloud with full traffic

### Deployment Flow

```
Development (Local)
        ↓
   Git commit
        ↓
    Staging (n8n Cloud)
   2-week validation
        ↓
  Production (n8n Cloud)
   Phased rollout: 10% → 50% → 100%
```

## Prerequisites

### Required Accounts

- [ ] **n8n Cloud** account (Pro Plan or higher)
- [ ] **Supabase** account (Pro Plan, $25/month)
- [ ] **Freshdesk** account with API access
- [ ] **OpenAI** account with API access (Tier 2+)
- [ ] **Claude (Anthropic)** API access
- [ ] **Perplexity** API access (optional)
- [ ] **Slack** workspace with webhook permissions
- [ ] **GitHub** repository for version control

### Required Tools

```bash
# Install n8n CLI
npm install -g n8n

# Install PostgreSQL client
brew install postgresql  # macOS
sudo apt-get install postgresql-client  # Linux

# Install Redis CLI
brew install redis  # macOS
sudo apt-get install redis-tools  # Linux

# Install jq for JSON processing
brew install jq  # macOS
sudo apt-get install jq  # Linux
```

## Step 1: Development Environment Setup

### 1.1 Clone Repository

```bash
cd ~/projects
git clone https://github.com/yourorg/nsw-strata-automation.git
cd nsw-strata-automation
```

### 1.2 Configure Environment

```bash
# Copy development environment template
cp .env.development .env

# Edit environment variables
vim .env

# Required changes:
# - FRESHDESK_DOMAIN
# - FRESHDESK_API_KEY
# - SUPABASE_DB_HOST
# - SUPABASE_DB_PASSWORD
# - OPENAI_API_KEY
```

### 1.3 Start Local n8n

```bash
# Start Docker services
docker-compose up -d

# Check services are running
docker-compose ps

# View logs
docker-compose logs -f n8n
```

### 1.4 Import Workflows

```bash
# Access n8n UI
open http://localhost:5678

# Login with credentials from .env
# Username: admin
# Password: admin123

# Import workflows
# 1. Go to Workflows
# 2. Click "Import from File"
# 3. Import each workflow:
#    - workflows/main-ticket-processor.json
#    - workflows/reply-handler.json
#    - workflows/scheduled-maintenance.json
#    - workflows/manual-trigger.json
#    - workflows/batch-processor.json
```

### 1.5 Configure Credentials

**In n8n (Credentials):**

1. **Freshdesk API**
   - Domain: yourcompany.freshdesk.com
   - API Key: paste your key

2. **Supabase/PostgreSQL**
   - Host: db.xxx.supabase.co
   - Port: 6543
   - Database: postgres
   - User: postgres
   - Password: paste your password
   - SSL: Enabled

3. **OpenAI**
   - API Key: paste your key

### 1.6 Test Workflows

```bash
# Test main ticket processor
curl -X POST http://localhost:5678/webhook/freshdesk-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "event": "ticket_created",
    "ticket": {
      "id": 999,
      "subject": "Test Ticket",
      "description": "Water leak in common property",
      "priority": 2,
      "status": 2
    }
  }'

# Check n8n execution logs
# Should see: Ticket processed successfully
```

## Step 2: Database Setup (Supabase)

### 2.1 Create Supabase Project

1. Login to https://app.supabase.com
2. Click "New Project"
3. **Name:** nsw-strata-automation
4. **Database Password:** Generate strong password
5. **Region:** ap-southeast-2 (Sydney)
6. **Plan:** Pro ($25/month)
7. Wait 2-3 minutes for provisioning

### 2.2 Enable Extensions

```sql
-- In Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 2.3 Run Database Schema

```bash
# Copy schema to local
scp database/schema.sql ~/Desktop/

# Or run directly via psql
psql "postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres" \
  < database/schema.sql
```

**Verify:**
```sql
-- Check tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('knowledge_base', 'training_examples',
                     'conversation_state', 'system_metrics');

-- Check indexes
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'knowledge_base';
```

### 2.4 Import Knowledge Base

**Option A: Via Supabase Dashboard**
1. Go to Table Editor
2. Select `knowledge_base` table
3. Import CSV (if available)

**Option B: Via SQL**
```sql
-- Insert knowledge entries manually
INSERT INTO knowledge_base (title, content, metadata, search_keywords)
VALUES (
  'Roof Leak in Common Property',
  'Issue Description: Water leaking through ceiling...',
  '{"category": "maintenance-repairs", "success_rate": 0.95}'::jsonb,
  ARRAY['roof', 'leak', 'water', 'damage']
);
```

## Step 3: Staging Deployment

### 3.1 Create n8n Cloud Account

1. Go to https://n8n.io/cloud
2. Sign up for Pro Plan
3. Create workspace: "nsw-strata-staging"
4. Note webhook base URL: `https://your-workspace.app.n8n.cloud`

### 3.2 Configure Environment Variables

**In n8n Cloud (Settings > Environment Variables):**

```
# Copy from .env.staging
FRESHDESK_DOMAIN=https://yourcompany.freshdesk.com
FRESHDESK_WEBHOOK_SECRET=your-secret
SUPABASE_DB_HOST=db.xxx.supabase.co
SUPABASE_DB_PORT=6543
SUPABASE_DB_PASSWORD=your-password
OPENAI_API_KEY=sk-...
REDIS_HOST=redis.n8n.cloud  # Provided by n8n Cloud
NODE_ENV=staging
```

### 3.3 Deploy Workflows

**Option A: Via n8n UI**
1. Export workflows from local n8n
2. Import to n8n Cloud staging workspace

**Option B: Via n8n CLI**
```bash
# Login to n8n Cloud
n8n login

# Export from local
n8n export:workflow --all --output=./workflows-export

# Import to staging (via n8n Cloud UI)
# Upload each JSON file
```

### 3.4 Configure Webhooks for Staging

**In Freshdesk Automation:**

1. Update webhook URLs to staging:
   ```
   https://your-workspace.app.n8n.cloud/webhook/freshdesk-ticket
   https://your-workspace.app.n8n.cloud/webhook/freshdesk-reply
   ```

2. Add condition to route only 20% of tickets:
   ```
   Ticket ID % 5 = 0  # 20% sampling
   ```

### 3.5 Activate Workflows

**In n8n Cloud:**
1. Open each workflow
2. Click "Active" toggle (top right)
3. Verify webhook endpoints are accessible

**Test:**
```bash
curl -X POST https://your-workspace.app.n8n.cloud/webhook/freshdesk-ticket \
  -H "Content-Type: application/json" \
  -H "X-Freshdesk-Signature: your-signature" \
  -d @test-payload.json
```

### 3.6 Monitor Staging (2 Weeks)

**Daily checks:**
- [ ] Workflow execution success rate (target >95%)
- [ ] Average response time (target <500ms)
- [ ] Error logs (target <5% error rate)
- [ ] API costs per ticket (target <$2.00)
- [ ] Customer satisfaction scores

**Weekly reviews:**
- [ ] Knowledge base performance
- [ ] Routing path distribution
- [ ] Escalation rate
- [ ] False positive/negative rate

## Step 4: Production Deployment

### 4.1 Create Production Workspace

1. **n8n Cloud:** Create "nsw-strata-production" workspace
2. **Configure environment variables** (from `.env.production`)
3. **Deploy workflows** from staging (tested versions)

### 4.2 Production Environment Variables

```bash
NODE_ENV=production
FRESHDESK_DOMAIN=https://yourcompany.freshdesk.com
FRESHDESK_WEBHOOK_SECRET=production-secret-here
SUPABASE_DB_HOST=db.xxx.supabase.co
SUPABASE_DB_PORT=6543
OPENAI_API_KEY=sk-production-key
CLAUDE_API_KEY=sk-ant-production-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/production
```

### 4.3 Configure Production Webhooks

**Freshdesk Automation Rules:**

1. **New Ticket Rule:**
   ```
   Name: n8n Production - New Ticket
   When: Ticket is Created
   And: Status is not Closed
   And: Source is Email OR Portal OR Phone
   URL: https://prod-workspace.app.n8n.cloud/webhook/freshdesk-ticket
   ```

2. **Reply Handler Rule:**
   ```
   Name: n8n Production - Customer Reply
   When: Ticket is Updated
   And: Reply is Added
   And: Performer is Requester
   URL: https://prod-workspace.app.n8n.cloud/webhook/freshdesk-reply
   ```

### 4.4 Phased Rollout

**Phase 1: 10% Traffic (Week 1)**

Add condition to Freshdesk automation:
```
Ticket ID % 10 < 1  # 10% of tickets
```

**Monitor:**
- Execution success rate
- Response times
- Error rates
- API costs

**Phase 2: 50% Traffic (Week 2)**

Update condition:
```
Ticket ID % 2 = 0  # 50% of tickets
```

**Phase 3: 100% Traffic (Week 3)**

Remove sampling condition:
```
# Process all tickets
```

### 4.5 Blue-Green Deployment (Optional)

**Setup:**
1. Deploy to "blue" workspace (current production)
2. Deploy new version to "green" workspace
3. Test green workspace with 1% traffic
4. Switch load balancer to green
5. Keep blue as fallback

**Load Balancer Config:**
```nginx
upstream n8n_production {
    server blue-workspace.app.n8n.cloud weight=99;
    server green-workspace.app.n8n.cloud weight=1;
}
```

## Step 5: Post-Deployment

### 5.1 Monitoring Setup

**Prometheus Metrics** (if available):
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'n8n'
    static_configs:
      - targets: ['n8n.app.n8n.cloud:9000']
    metrics_path: '/metrics'
```

**Slack Alerts:**
- Workflow failures (within 1 minute)
- High error rate (>5%)
- Slow response times (>1 second)
- Queue depth (>100 pending)
- API rate limits approaching

### 5.2 Backup Strategy

**Workflows (Daily):**
```bash
#!/bin/bash
# backup-workflows.sh

BACKUP_DIR="./backups/workflows-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Export workflows
n8n export:workflow --all --output="$BACKUP_DIR"

# Commit to git
git add "$BACKUP_DIR"
git commit -m "backup: workflows $(date +%Y-%m-%d)"
git push
```

**Database (Daily via Supabase):**
- Automatic daily backups enabled
- 30-day retention
- Point-in-time recovery

**Manual Backup:**
```bash
pg_dump "postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres" \
  > backup-$(date +%Y%m%d).sql
```

### 5.3 Disaster Recovery

**RTO:** 4 hours (Recovery Time Objective)
**RPO:** 1 hour (Recovery Point Objective)

**Recovery Procedure:**

1. **Failover to manual processing:**
   ```bash
   # Disable n8n workflows
   # Route all tickets to human queue
   ```

2. **Restore database (if needed):**
   ```bash
   # From Supabase dashboard
   # OR from backup file
   psql "postgresql://..." < backup-latest.sql
   ```

3. **Restore workflows:**
   ```bash
   # Import from latest git backup
   n8n import:workflow --input=./backups/workflows-latest/
   ```

4. **Verify and reactivate:**
   ```bash
   # Test with sample ticket
   # Activate workflows
   # Monitor for 1 hour
   ```

**Quarterly DR Drills:**
- Schedule maintenance window
- Simulate failure scenario
- Practice recovery procedures
- Document lessons learned

### 5.4 Operational Runbooks

**Create runbooks for:**
1. High API costs
2. Workflow failures
3. Slow performance
4. Database connection issues
5. Webhook delivery failures

**Example Runbook (High API Costs):**

```
1. Check recent executions in n8n
2. Identify which API is causing high costs
3. Check if caching is working (Redis)
4. Review batch processing configuration
5. Adjust thresholds if needed
6. Consider enabling more aggressive caching
```

## Step 6: Scaling

### 6.1 Horizontal Scaling (n8n Workers)

**Current:** 4 workers (200+ concurrent tickets)

**Scale to 8 workers:**
```bash
# In n8n Cloud dashboard
# Settings > Workers > Scale to 8
```

**Or via Docker Compose (self-hosted):**
```bash
docker-compose -f docker-compose.yml -f docker-compose.queue.yml up -d \
  --scale n8n-worker-1=4 --scale n8n-worker-2=4
```

### 6.2 Database Scaling

**Supabase Pro Plan:**
- 8GB database
- 100GB bandwidth
- 250GB storage

**Upgrade to Team Plan ($599/month):**
- 32GB database
- Dedicated resources
- Advanced metrics

### 6.3 Redis Scaling

**Current:** Single Redis instance (256MB)

**Scale options:**
- Increase memory to 1GB
- Enable Redis Cluster for high availability
- Use Redis Cloud for managed service

## Deployment Checklist

### Pre-Deployment

- [ ] All workflows tested in development
- [ ] Database schema deployed and verified
- [ ] Knowledge base initialized (6+ entries)
- [ ] Credentials configured and tested
- [ ] Webhook URLs updated
- [ ] Environment variables set
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Disaster recovery plan documented

### Staging Validation (2 Weeks)

- [ ] 20% ticket sampling configured
- [ ] Daily monitoring checks passing
- [ ] Weekly review meetings completed
- [ ] Success rate >95%
- [ ] Error rate <5%
- [ ] Average response time <500ms
- [ ] API costs <$2.00 per ticket
- [ ] No critical issues identified

### Production Deployment

- [ ] Staging sign-off received
- [ ] Production webhooks configured
- [ ] Phased rollout plan approved
- [ ] Rollback procedure documented
- [ ] On-call rotation established
- [ ] Communication sent to team
- [ ] Phase 1 (10%) deployed and monitored
- [ ] Phase 2 (50%) deployed and monitored
- [ ] Phase 3 (100%) deployed successfully

### Post-Deployment

- [ ] All workflows active and processing
- [ ] Monitoring dashboards live
- [ ] Alerts configured and tested
- [ ] Backup jobs running
- [ ] Documentation updated
- [ ] Runbooks created
- [ ] Team training completed
- [ ] Success metrics baseline established

## Troubleshooting

### Common Issues

**1. Workflows not triggering:**
- Check webhook URLs in Freshdesk
- Verify workflows are active in n8n
- Check webhook signature verification

**2. Database connection errors:**
- Verify pgBouncer port (6543)
- Check connection pool size
- Verify SSL enabled

**3. High API costs:**
- Check Redis caching is working
- Verify batch processing enabled
- Review prompt caching configuration

**4. Slow performance:**
- Check database indexes
- Monitor Redis cache hit rate
- Review worker utilization

## Support and Escalation

**Escalation Path:**

1. **Level 1:** Check runbooks and logs
2. **Level 2:** Strata manager review
3. **Level 3:** System administrator
4. **Level 4:** External support (n8n, Supabase)

**Support Contacts:**

- **n8n Support:** support@n8n.io
- **Supabase Support:** support@supabase.com
- **OpenAI Support:** help.openai.com
- **Anthropic Support:** support@anthropic.com

## Related Documentation

- [Environment Configuration](../config/environments.md)
- [Worker Scaling](../config/worker-scaling.md)
- [API Integration Guide](./api-integration-guide.md)
- [Freshdesk Webhook Setup](../config/freshdesk-webhook-setup.md)
