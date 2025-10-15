# NSW Strata Automation - Error Handling & Recovery Runbook

**Version:** 1.0.0
**Last Updated:** 2025-10-15
**Responsibility:** DevOps Team / On-Call Engineer

## Table of Contents

1. [Overview](#overview)
2. [Error Classification System](#error-classification-system)
3. [System-Level Fallbacks](#system-level-fallbacks)
4. [Circuit Breaker Pattern](#circuit-breaker-pattern)
5. [Error Recovery Dashboard](#error-recovery-dashboard)
6. [Automated Error Pattern Detection](#automated-error-pattern-detection)
7. [Common Error Scenarios](#common-error-scenarios)
8. [Escalation Procedures](#escalation-procedures)

---

## Overview

This runbook provides operational procedures for handling, diagnosing, and recovering from errors in the NSW Strata Automation system.

### Error Handling Architecture

```
Ticket → Webhook → Main Workflow
                      ↓ (error)
                  Error Handler Workflow
                      ↓
            ┌────────┴─────────┐
            ↓                  ↓
      Error Logging      Classification
            ↓                  ↓
      ┌─────┴────────┬────────┴──────┐
      ↓              ↓                ↓
   Database      Slack Alert    Retry Queue
      ↓              ↓                ↓
   Dashboard   Immediate Action  Auto-Recovery
```

### Key Components

- **Node-Level Retry:** 3 attempts, 5-second delays
- **Workflow-Level Error Handler:** Comprehensive context capture
- **Error Database:** Full audit trail with classification
- **Redis Retry Queue:** 7-day TTL for failed operations
- **Slack Notifications:** <1 minute for critical errors
- **Manual Intervention:** Automatic ticket creation for unrecoverable errors

---

## Error Classification System

### Task 11.7: Error Types

All errors are automatically classified into three categories:

#### 1. Transient Errors (⚠️ Warning)
**Characteristics:**
- Temporary failures
- Likely to resolve on retry
- No code/config changes needed

**Examples:**
- `ECONNREFUSED` - Connection refused
- `ETIMEDOUT` - Request timeout
- `503 Service Unavailable`
- `502 Bad Gateway`
- `504 Gateway Timeout`
- `Rate limit exceeded`

**Actions:**
- ✅ Automatic retry (up to 3 attempts)
- ✅ Queued in Redis for later retry
- ⚠️ Log to database
- ⚠️ Slack alert if recurring (>5 in 10 min)

#### 2. Systematic Errors (🔴 Error)
**Characteristics:**
- Code or configuration issues
- Requires manual intervention
- Not retryable without changes

**Examples:**
- `ValidationError` - Invalid input
- `SyntaxError` - Code syntax issue
- `400 Bad Request` - Invalid API call
- `401 Unauthorized` - Auth failure
- `403 Forbidden` - Permission denied
- `404 Not Found` - Resource missing

**Actions:**
- ❌ No retry
- 📋 Create manual intervention ticket
- 🔔 Slack notification
- 📊 Log to database with full context

#### 3. Critical Errors (🚨 Critical)
**Characteristics:**
- System failures
- Potential data loss/corruption
- Security implications
- Immediate attention required

**Examples:**
- Database connection failure
- `Data corruption detected`
- `Security violation`
- `Permission denied` (database)
- `500 Internal Server Error`

**Actions:**
- 🚨 Immediate Slack alert (@channel)
- 📋 High-priority intervention ticket
- 🛑 Circuit breaker activation
- 📊 Full context logging
- 👤 On-call engineer notification

---

## System-Level Fallbacks

### Task 11.3: Graceful Degradation Strategy

The system implements multiple fallback layers to maintain operation during failures:

### Level 1: Node-Level Fallbacks

#### Vector Search → Keyword Search
**Trigger:** Vector search (Supabase/pgvector) failure
**Fallback:** Pure keyword search using pg_trgm
**Implementation:** Already configured in workflow
**Performance Impact:** Moderate (10-20% slower, lower accuracy)

```
Vector Search (HNSW)
    ↓ (fails)
Keyword Search (pg_trgm)
    ↓ (fails)
Error Handler → Manual Review
```

#### Claude API → GPT-4o → GPT-4o Mini
**Task 11.10: AI Model Fallback Hierarchy**

**Primary:** Claude Sonnet 4.5 (`claude-sonnet-4-5`)
- Best quality for NSW strata responses
- $3 per million input tokens
- $15 per million output tokens

**Fallback 1:** GPT-4o (`gpt-4o`)
- Excellent quality, slightly different style
- $2.50 per million input tokens
- $10 per million output tokens

**Fallback 2:** GPT-4o Mini (`gpt-4o-mini`)
- Good quality for simple queries
- $0.15 per million input tokens
- $0.60 per million output tokens

**Implementation:**
```javascript
// In claude-response-generator workflow
async function generateResponse(ticket, knowledge) {
  try {
    return await callClaude(ticket, knowledge);
  } catch (error) {
    if (isRateLimitOrUnavailable(error)) {
      try {
        return await callGPT4o(ticket, knowledge);
      } catch (gpt4oError) {
        return await callGPT4oMini(ticket, knowledge);
      }
    }
    throw error;  // Non-retryable errors propagate
  }
}
```

#### Freshdesk API → Retry Queue
**Trigger:** Freshdesk API unavailable
**Fallback:** Queue operation in Redis
**Retry:** Every 5 minutes for 7 days
**Manual:** Create intervention ticket if still failing after 24 hours

### Level 2: Workflow-Level Fallbacks

#### Main Workflow Failure → Error Handler
**Trigger:** Any uncaught error in main workflow
**Fallback:** Error Handler Workflow captures full context
**Actions:**
1. Log error to database
2. Classify error type
3. Send Slack notification (if critical)
4. Queue for retry (if retryable)
5. Create intervention ticket (if unrecoverable)

### Level 3: System-Level Fallbacks

#### Complete System Failure → Manual Processing
**Trigger:** Multiple component failures, system-wide outage
**Fallback:** Revert to manual ticket processing
**Actions:**
1. Alert on-call engineer
2. Update status page
3. Enable manual ticket queue
4. Preserve all failed operations in Redis
5. Begin recovery procedures

---

## Circuit Breaker Pattern

### Task 11.8: Circuit Breaker Implementation

Circuit breakers prevent cascading failures by temporarily disabling failed services.

### States

#### CLOSED (Normal Operation)
- All requests pass through
- Success/failure tracked
- **Transitions to OPEN:** 5 failures in 60 seconds

#### OPEN (Service Disabled)
- All requests fail fast (no API calls)
- Fallback logic activated immediately
- **Duration:** 60 seconds
- **Transitions to HALF-OPEN:** After timeout

#### HALF-OPEN (Testing Recovery)
- Allow 1 test request
- **If successful:** Transition to CLOSED
- **If failed:** Return to OPEN, increase timeout (exponential backoff)

### Implementation

```javascript
// Circuit breaker for external services
const CircuitBreaker = {
  freshdesk: { state: 'CLOSED', failures: 0, lastFailure: null },
  openai: { state: 'CLOSED', failures: 0, lastFailure: null },
  claude: { state: 'CLOSED', failures: 0, lastFailure: null },
  supabase: { state: 'CLOSED', failures: 0, lastFailure: null }
};

function checkCircuitBreaker(service) {
  const breaker = CircuitBreaker[service];

  // Check if in OPEN state
  if (breaker.state === 'OPEN') {
    const elapsed = Date.now() - breaker.lastFailure;
    if (elapsed > 60000) {  // 60 second timeout
      breaker.state = 'HALF-OPEN';
    } else {
      throw new Error(`Circuit breaker OPEN for ${service}`);
    }
  }

  return true;
}

function recordSuccess(service) {
  const breaker = CircuitBreaker[service];
  breaker.state = 'CLOSED';
  breaker.failures = 0;
}

function recordFailure(service) {
  const breaker = CircuitBreaker[service];
  breaker.failures++;
  breaker.lastFailure = Date.now();

  if (breaker.failures >= 5) {
    breaker.state = 'OPEN';
    // Trigger alert
    sendSlackAlert(`Circuit breaker OPEN for ${service}`);
  }
}
```

### Configuration

| Service | Failure Threshold | Timeout | Max Timeout |
|---------|------------------|---------|-------------|
| Freshdesk | 5 in 60s | 60s | 5min |
| OpenAI | 5 in 60s | 30s | 2min |
| Claude | 3 in 60s | 30s | 2min |
| Supabase | 10 in 60s | 120s | 10min |

---

## Error Recovery Dashboard

### Task 11.13: Dashboard Queries and Metrics

Access the error recovery dashboard at: `https://n8n.yourdomain.com/dashboard/errors`

### Key Metrics

#### 1. Error Rate
```sql
-- Errors per hour (last 24 hours)
SELECT
  date_trunc('hour', timestamp) AS hour,
  COUNT(*) AS error_count,
  COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count
FROM error_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

#### 2. Unresolved Errors
```sql
-- Unresolved errors requiring attention
SELECT
  error_id,
  error_type,
  severity,
  error_node,
  error_message,
  ticket_id,
  timestamp,
  retries_attempted
FROM error_logs
WHERE resolved = false
ORDER BY severity DESC, timestamp DESC
LIMIT 50;
```

#### 3. Error Distribution by Type
```sql
-- Error distribution by classification
SELECT
  error_type,
  severity,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE resolved = true) AS resolved_count,
  ROUND(AVG(retries_attempted), 2) AS avg_retries
FROM error_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY error_type, severity
ORDER BY count DESC;
```

#### 4. Failure Patterns by Node
```sql
-- Most problematic workflow nodes
SELECT
  workflow_name,
  error_node,
  COUNT(*) AS error_count,
  COUNT(DISTINCT ticket_id) AS affected_tickets,
  array_agg(DISTINCT error_type) AS error_types
FROM error_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY workflow_name, error_node
HAVING COUNT(*) > 5
ORDER BY error_count DESC;
```

#### 5. Recovery Success Rate
```sql
-- Retry success rate
SELECT
  error_type,
  COUNT(*) AS total_errors,
  COUNT(*) FILTER (WHERE resolved = true AND retries_attempted > 0) AS auto_recovered,
  ROUND(
    COUNT(*) FILTER (WHERE resolved = true AND retries_attempted > 0)::numeric /
    COUNT(*)::numeric * 100,
    2
  ) AS recovery_rate_pct
FROM error_logs
WHERE retryable = true
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY error_type;
```

### Alert Thresholds

Configure alerts for:

- Error rate > 10/hour → Warning
- Error rate > 50/hour → Critical
- Unresolved critical errors > 5 → Alert on-call
- Circuit breaker opens → Immediate alert
- Recovery rate < 70% → Investigation required

---

## Automated Error Pattern Detection

### Task 11.14: Pattern Detection Queries

Run these queries hourly via scheduled workflow:

### 1. Spike Detection
```sql
-- Detect sudden spikes in error rate
WITH hourly_errors AS (
  SELECT
    date_trunc('hour', timestamp) AS hour,
    COUNT(*) AS error_count
  FROM error_logs
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY hour
),
avg_baseline AS (
  SELECT AVG(error_count) AS avg_count, STDDEV(error_count) AS stddev_count
  FROM hourly_errors
)
SELECT
  he.hour,
  he.error_count,
  ab.avg_count,
  he.error_count - ab.avg_count AS deviation,
  CASE
    WHEN he.error_count > ab.avg_count + (2 * ab.stddev_count) THEN 'SPIKE_DETECTED'
    ELSE 'NORMAL'
  END AS status
FROM hourly_errors he, avg_baseline ab
WHERE he.error_count > ab.avg_count + (2 * ab.stddev_count)
ORDER BY he.hour DESC;
```

### 2. Recurring Error Pattern
```sql
-- Detect recurring errors (same error multiple times)
SELECT
  error_node,
  error_message,
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT date_trunc('day', timestamp)) AS days_affected,
  MIN(timestamp) AS first_seen,
  MAX(timestamp) AS last_seen,
  array_agg(DISTINCT ticket_id) FILTER (WHERE ticket_id IS NOT NULL) AS affected_tickets
FROM error_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY error_node, error_message
HAVING COUNT(*) > 10
ORDER BY occurrence_count DESC;
```

### 3. Cascading Failure Detection
```sql
-- Detect cascading failures (multiple nodes failing in sequence)
WITH error_sequences AS (
  SELECT
    execution_id,
    array_agg(error_node ORDER BY timestamp) AS node_sequence,
    COUNT(*) AS error_count,
    MIN(timestamp) AS start_time,
    MAX(timestamp) AS end_time
  FROM error_logs
  WHERE timestamp > NOW() - INTERVAL '1 hour'
  GROUP BY execution_id
  HAVING COUNT(*) > 3
)
SELECT
  execution_id,
  node_sequence,
  error_count,
  end_time - start_time AS duration,
  'CASCADING_FAILURE' AS pattern_type
FROM error_sequences
ORDER BY error_count DESC;
```

### 4. Performance Degradation
```sql
-- Detect performance degradation (increased retry attempts)
SELECT
  error_node,
  DATE(timestamp) AS date,
  AVG(retries_attempted) AS avg_retries,
  COUNT(*) AS error_count,
  CASE
    WHEN AVG(retries_attempted) > 2 THEN 'DEGRADED'
    WHEN AVG(retries_attempted) > 1 THEN 'WARNING'
    ELSE 'NORMAL'
  END AS performance_status
FROM error_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
  AND retryable = true
GROUP BY error_node, DATE(timestamp)
HAVING AVG(retries_attempted) > 1
ORDER BY avg_retries DESC;
```

### Automated Actions

When patterns are detected:

1. **Spike Detected:**
   - Send Slack alert with details
   - Increase monitoring frequency to 5 minutes
   - Check circuit breaker status
   - Review recent deployments

2. **Recurring Error:**
   - Create high-priority bug ticket
   - Aggregate error logs
   - Notify development team
   - Schedule root cause analysis

3. **Cascading Failure:**
   - Immediate on-call alert
   - Enable system-wide fallbacks
   - Increase retry timeouts
   - Consider maintenance mode

4. **Performance Degradation:**
   - Scale up resources (workers, database connections)
   - Enable caching
   - Review slow queries
   - Check external service status

---

## Common Error Scenarios

### Task 11.15: Runbook Procedures

### Scenario 1: Freshdesk API Rate Limit

**Error Message:** `429 Too Many Requests` or `Rate limit exceeded`

**Symptoms:**
- Multiple Freshdesk API call failures
- Tickets not being created/updated
- Redis retry queue filling up

**Diagnosis:**
```bash
# Check error logs
psql -c "SELECT COUNT(*), error_message FROM error_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
AND error_message LIKE '%429%' OR error_message LIKE '%rate limit%'
GROUP BY error_message;"

# Check Redis queue depth
redis-cli LLEN retry:transient:*
```

**Resolution:**
1. Verify rate limit threshold (default: 1000 requests/hour)
2. Check n8n worker count - may need to reduce concurrency
3. Implement exponential backoff (already configured)
4. If persistent, contact Freshdesk support to increase limit
5. Consider upgrading Freshdesk plan

**Prevention:**
- Monitor API usage via dashboard
- Set alert at 80% of rate limit
- Implement request throttling in n8n

### Scenario 2: OpenAI Embedding Service Unavailable

**Error Message:** `503 Service Unavailable` from OpenAI API

**Symptoms:**
- Embedding generation failures
- Vector search not working
- Fallback to keyword search activated

**Diagnosis:**
```bash
# Check OpenAI service status
curl https://status.openai.com/api/v2/status.json

# Check error logs
psql -c "SELECT * FROM error_logs
WHERE error_node = 'generate-embedding'
AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC LIMIT 10;"
```

**Resolution:**
1. Verify OpenAI API status
2. Check API key validity
3. Confirm account credit balance
4. If temporary outage, wait for Redis retry queue to process
5. If extended outage, enable keyword-only search mode

**Workaround:**
```bash
# Temporarily disable vector search, use keyword only
# Update workflow setting
n8n workflow:update main-ticket-processor \
  --set 'settings.useKeywordOnly=true'
```

### Scenario 3: Supabase Database Connection Failure

**Error Message:** `Connection refused`, `too many connections`

**Symptoms:**
- All database operations failing
- Circuit breaker opens
- System-wide degradation

**Diagnosis:**
```bash
# Check Supabase dashboard for connection stats
# https://app.supabase.com/project/[project-id]/database/connection-pooling

# Check current connections
psql -c "SELECT count(*), state FROM pg_stat_activity
GROUP BY state;"

# Check for long-running queries
psql -c "SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY duration DESC
LIMIT 10;"
```

**Resolution:**
1. Check Supabase status: https://status.supabase.com/
2. Review connection pool settings (default: 15)
3. Identify and kill long-running queries if necessary:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE pid = [problem_pid];
   ```
4. Consider upgrading Supabase plan for more connections
5. Implement connection pooling with pgBouncer

**Prevention:**
- Configure connection limits in n8n
- Use transaction pooling
- Implement query timeouts
- Regular vacuum and analyze

### Scenario 4: Redis Queue Overflow

**Error Message:** `Redis queue depth exceeds threshold`

**Symptoms:**
- Failed operations not being retried
- Redis memory usage high
- System performance degraded

**Diagnosis:**
```bash
# Check Redis memory usage
redis-cli INFO memory

# Check queue depths
redis-cli KEYS 'retry:*' | wc -l

# Check oldest entries
redis-cli LRANGE retry:transient 0 10
```

**Resolution:**
1. Identify root cause of failures (why so many retries?)
2. Process manual intervention tickets
3. Increase Redis memory limit if needed
4. Manually process critical queued items:
   ```bash
   # Get queued items
   redis-cli LRANGE retry:critical 0 -1

   # Process manually via n8n manual trigger workflow
   ```
5. If overflow continues, temporarily disable retry queue

**Prevention:**
- Monitor queue depth (alert at >100)
- Implement queue size limits
- Set up automated queue processing workflow
- Regular queue cleanup (expired items)

### Scenario 5: Error Handler Workflow Failure

**Error Message:** `Error handler workflow failed` (meta-error!)

**Symptoms:**
- Errors not being logged
- No Slack notifications
- Manual intervention tickets not created
- System degradation invisible

**Diagnosis:**
```bash
# Check n8n workflow execution logs
n8n workflow:list --active

# Check last execution
n8n execution:list --workflow=error-handler --limit=10

# Check database connectivity
psql -c "SELECT 1"

# Check Slack webhook
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message"}'
```

**Resolution:**
1. **CRITICAL:** This is a meta-failure - immediate attention required
2. Verify error handler workflow is active
3. Check database connectivity (error logs table)
4. Verify Slack webhook URL is valid
5. Check Redis connectivity
6. Review error handler workflow execution logs
7. If necessary, temporarily disable error handler and rely on n8n built-in error handling

**Prevention:**
- Monitor error handler workflow health
- Implement health check endpoint
- Set up external monitoring (UptimeRobot, etc.)
- Create backup error notification path (email)

### Scenario 6: Circuit Breaker Stuck Open

**Error Message:** `Circuit breaker OPEN for [service]`

**Symptoms:**
- Service appears healthy but requests are blocked
- All requests fail immediately
- Fallbacks activated permanently

**Diagnosis:**
```bash
# Check service health
curl https://api.freshdesk.com/api/v2/tickets?per_page=1

# Check circuit breaker state in Redis
redis-cli GET circuit:freshdesk:state

# Review recent errors
psql -c "SELECT * FROM error_logs
WHERE error_message LIKE '%freshdesk%'
ORDER BY timestamp DESC LIMIT 20;"
```

**Resolution:**
1. Verify service is actually healthy
2. Manually reset circuit breaker:
   ```bash
   redis-cli SET circuit:freshdesk:state CLOSED
   redis-cli SET circuit:freshdesk:failures 0
   ```
3. Monitor for immediate failures
4. If failures recur, investigate root cause
5. Consider adjusting circuit breaker thresholds

**Prevention:**
- Implement circuit breaker health check
- Set up automated circuit breaker reset (after extended success period)
- Review and tune failure thresholds
- Implement gradual traffic ramp-up after recovery

---

## Escalation Procedures

### Level 1: Automated Recovery (0-15 minutes)
- Node-level retries
- Redis queue processing
- Fallback mechanisms
- **Escalate if:** Recovery attempts exhausted

### Level 2: On-Call Engineer (15-60 minutes)
- Slack alert sent
- Review error dashboard
- Execute runbook procedures
- Manual intervention if needed
- **Escalate if:** Cannot resolve within 60 minutes

### Level 3: Development Team (1-4 hours)
- Code-level investigation required
- System design review
- Hotfix deployment
- **Escalate if:** Architectural changes needed

### Level 4: Management (4+ hours)
- System-wide outage
- Data integrity issues
- Security incidents
- Customer communication required

### Escalation Contacts

```
On-Call Engineer: Use PagerDuty rotation
Development Lead: #dev-team Slack channel
DevOps Lead: #devops-team Slack channel
Management: escalation@company.com
```

### SLA Targets

| Severity | Response Time | Resolution Time |
|----------|--------------|-----------------|
| Critical | 15 minutes | 4 hours |
| High | 1 hour | 24 hours |
| Medium | 4 hours | 3 days |
| Low | 1 day | 1 week |

---

## Appendix

### A. Useful Commands

```bash
# Check error rate
psql -c "SELECT COUNT(*) FROM error_logs WHERE timestamp > NOW() - INTERVAL '1 hour';"

# Check circuit breaker status
redis-cli KEYS 'circuit:*'

# Check retry queue depth
redis-cli LLEN retry:transient

# Manual workflow trigger
n8n workflow:execute --id=main-ticket-processor --data='{"test":true}'

# Check n8n worker status
docker ps | grep n8n-worker

# Database connection count
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### B. Monitoring URLs

- n8n Dashboard: `https://n8n.yourdomain.com`
- Supabase Dashboard: `https://app.supabase.com/project/[id]`
- Error Dashboard: `https://n8n.yourdomain.com/dashboard/errors`
- Redis Insight: `http://localhost:8001`

### C. Log Locations

- n8n logs: `/var/log/n8n/n8n.log`
- Worker logs: `/var/log/n8n/worker-*.log`
- Error handler logs: `/var/log/n8n/error-handler.log`
- System logs: `/var/log/syslog`

---

**Document Owner:** DevOps Team
**Review Schedule:** Monthly
**Last Review:** 2025-10-15
**Next Review:** 2025-11-15
