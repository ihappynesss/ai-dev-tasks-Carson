# Webhook Receiver Infrastructure

Complete guide for configuring n8n webhook receiver infrastructure with instant acknowledgment (<500ms) and asynchronous processing for 200+ concurrent tickets.

## Architecture Overview

The webhook receiver infrastructure separates request acknowledgment from processing using n8n's queue mode:

```
┌──────────────┐
│  Freshdesk   │
│   Webhook    │
└──────┬───────┘
       │ HTTP POST
       v
┌───────────────────────────────────────┐
│  Main n8n Instance                    │
│  (Webhook Receiver)                   │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │ Webhook Node                    │ │
│  │ - Response Mode: "Immediately"  │ │
│  │ - Acknowledge: <500ms           │ │
│  └──────────┬──────────────────────┘ │
└───────────┼─────────────────────────┘
            │
            │ Enqueue to Redis
            v
       ┌─────────┐
       │  Redis  │
       │  Queue  │
       └────┬────┘
            │
       ┌────┴──────────────┐
       │                   │
       v                   v
  ┌─────────┐        ┌─────────┐
  │Worker 1 │        │Worker N │
  │(Process)│        │(Process)│
  └─────────┘        └─────────┘
```

## Configuration

### Main Instance (Webhook Receiver)

The main n8n instance is dedicated to receiving webhooks and immediately acknowledging them, then queueing work for processing.

**Environment Configuration:**

```bash
# Enable queue mode
EXECUTIONS_MODE=queue
EXECUTIONS_PROCESS=main

# Main instance handles webhooks, workers handle execution
N8N_PORT=5678
N8N_PROTOCOL=https  # Use HTTPS in production
WEBHOOK_URL=https://your-domain.com/

# Queue configuration
QUEUE_BULL_REDIS_HOST=redis-host
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_DB=0
QUEUE_BULL_REDIS_PASSWORD=${REDIS_PASSWORD}

# Performance settings for fast acknowledgment
N8N_PAYLOAD_SIZE_MAX=16  # 16 MB max payload
EXECUTIONS_TIMEOUT=1800   # 30 minutes per execution
```

**Docker Compose Configuration:**

```yaml
# Main n8n instance (Webhook receiver)
n8n:
  image: n8nio/n8n:latest
  container_name: n8n-main
  restart: unless-stopped
  ports:
    - '5678:5678'  # Webhook endpoint
  environment:
    # Queue mode: main process
    - EXECUTIONS_MODE=queue
    - EXECUTIONS_PROCESS=main

    # Redis queue connection
    - QUEUE_BULL_REDIS_HOST=redis
    - QUEUE_BULL_REDIS_PORT=6379
    - QUEUE_BULL_REDIS_DB=0

    # Fast webhook response
    - N8N_PAYLOAD_SIZE_MAX=16

  depends_on:
    redis:
      condition: service_healthy
  networks:
    - n8n-network
```

### Webhook Node Configuration

**For Instant Acknowledgment (<500ms):**

```json
{
  "name": "Webhook Receiver",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1,
  "position": [250, 300],
  "webhookId": "freshdesk-new-ticket",
  "parameters": {
    "httpMethod": "POST",
    "path": "freshdesk/new-ticket",
    "authentication": "headerAuth",
    "responseMode": "onReceived",
    "responseData": "firstEntryJson",
    "options": {
      "rawBody": true,
      "responseHeaders": {
        "entries": [
          {
            "name": "Content-Type",
            "value": "application/json"
          }
        ]
      },
      "responseCode": 202,
      "responseBody": "{\n  \"status\": \"accepted\",\n  \"message\": \"Ticket received and queued for processing\",\n  \"ticket_id\": \"{{$json.ticket.id}}\"\n}"
    }
  }
}
```

**Key Settings:**
- `responseMode: "onReceived"` - Respond immediately without waiting for workflow completion
- `responseCode: 202` - HTTP 202 Accepted (async processing)
- `rawBody: true` - Preserve original webhook payload

### Authentication

**Header Authentication (Recommended):**

```json
{
  "name": "Webhook Header Auth",
  "type": "n8n-nodes-base.headerAuth",
  "data": {
    "name": "X-Webhook-Secret",
    "value": "your-webhook-secret-key"
  }
}
```

**Signature Verification (Production):**

Use n8n Function node after webhook to verify HMAC signatures:

```javascript
// Verify Freshdesk webhook signature
const crypto = require('crypto');

const WEBHOOK_SECRET = $env('FRESHDESK_WEBHOOK_SECRET');
const receivedSignature = $request.headers['x-freshdesk-signature'];
const payload = $request.rawBody;

// Calculate expected signature
const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payload)
  .digest('base64');

// Verify
if (receivedSignature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

// Pass through if valid
return $input.all();
```

## Performance Optimization

### Target: <500ms Acknowledgment

**1. Minimize Pre-Queue Processing:**

```
Webhook → [Validate] → [Enqueue] → 202 Response
          (<50ms)      (<50ms)      (~100ms)

Total: <500ms to acknowledgment
```

**Good Practice:**
```javascript
// Webhook Node
↓
// Quick validation (optional)
IF node: Check required fields exist
↓
// Immediate response (queue automatically handles rest)
```

**Bad Practice:**
```javascript
// Webhook Node
↓
// DON'T: External API call (adds latency)
HTTP Request to Freshdesk
↓
// DON'T: Database query (adds latency)
Supabase Query
↓
// DON'T: AI processing (adds significant latency)
Claude API call
↓
// Response (too slow!)
```

**2. Use Redis for Fast Queueing:**

Redis provides <10ms write latency for queue operations:

```bash
# Monitor Redis performance
redis-cli --latency

# Target: p99 < 10ms
min: 0, max: 5, avg: 1.23 (123 samples)
```

**3. Optimize Network Path:**

- **Same Region:** Deploy n8n and Redis in same region/datacenter
- **Low Latency:** Target <50ms between n8n and Redis
- **Monitoring:** Set up latency alerts if >100ms

### Capacity Planning

**Webhook Receiver Capacity:**

| Configuration | Requests/Second | Concurrent Webhooks |
|--------------|-----------------|---------------------|
| 1 vCPU, 1GB  | 50-100 req/s   | 100-200            |
| 2 vCPU, 2GB  | 100-200 req/s  | 200-400            |
| 4 vCPU, 4GB  | 200-500 req/s  | 400-1000           |

**For 200+ Concurrent Tickets:**
- Minimum: 2 vCPU, 2GB RAM for main instance
- Recommended: 4 vCPU, 4GB RAM for production
- Redis: 1 vCPU, 512MB RAM (queue management only)

## Webhook Endpoints

### Standard Webhook Paths

```
Base URL: https://your-domain.com

Endpoints:
  /webhook/freshdesk/new-ticket       - New ticket creation
  /webhook/freshdesk/ticket-update    - Ticket updates
  /webhook/freshdesk/reply            - Customer reply
  /webhook/freshdesk/note             - Internal note
  /webhook/manual-trigger             - Manual processing
  /webhook/batch-process              - Batch operations
```

### URL Configuration

**Development (Local):**
```bash
WEBHOOK_URL=http://localhost:5678/
N8N_PROTOCOL=http
N8N_HOST=localhost
N8N_PORT=5678
```

**Staging:**
```bash
WEBHOOK_URL=https://n8n-staging.your-domain.com/
N8N_PROTOCOL=https
N8N_HOST=n8n-staging.your-domain.com
N8N_PORT=443
```

**Production:**
```bash
WEBHOOK_URL=https://n8n.your-domain.com/
N8N_PROTOCOL=https
N8N_HOST=n8n.your-domain.com
N8N_PORT=443
```

## Security Best Practices

### 1. HTTPS Only (Production)

```bash
# Force HTTPS
N8N_PROTOCOL=https
N8N_SECURE_COOKIE=true

# SSL/TLS Configuration
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
```

**Let's Encrypt Setup:**
```bash
# Install certbot
apt-get install certbot

# Obtain certificate
certbot certonly --standalone -d n8n.your-domain.com

# Auto-renewal
certbot renew --dry-run
```

### 2. Authentication

**Multiple Layers:**
1. **Header Authentication:** Secret token in request headers
2. **Signature Verification:** HMAC-SHA256 payload signing
3. **IP Whitelisting:** Restrict to known sources
4. **Rate Limiting:** Prevent abuse

### 3. Input Validation

```javascript
// Validate webhook payload structure
const requiredFields = ['ticket', 'ticket.id', 'ticket.subject'];

for (const field of requiredFields) {
  const value = field.split('.').reduce((obj, key) => obj?.[key], $json);
  if (!value) {
    throw new Error(`Missing required field: ${field}`);
  }
}

// Validate data types
if (typeof $json.ticket.id !== 'number') {
  throw new Error('Invalid ticket ID format');
}

// Sanitize inputs
const sanitizedSubject = $json.ticket.subject
  .replace(/<script>/gi, '')
  .trim()
  .substring(0, 500);

return { ...$json, ticket: { ...$json.ticket, subject: sanitizedSubject } };
```

### 4. Rate Limiting

**Redis-Based Rate Limiting:**

```javascript
// Rate limit: 100 requests per IP per minute
const redis = require('redis').createClient({
  host: $env('REDIS_HOST'),
  port: $env('REDIS_PORT'),
  password: $env('REDIS_PASSWORD')
});

const clientIP = $request.headers['x-forwarded-for'] || $request.connection.remoteAddress;
const rateLimitKey = `rate_limit:${clientIP}`;

// Increment counter
const requestCount = await redis.incr(rateLimitKey);

if (requestCount === 1) {
  // First request, set expiry
  await redis.expire(rateLimitKey, 60);
}

if (requestCount > 100) {
  throw new Error('Rate limit exceeded. Please try again later.');
}

return $input.all();
```

## Monitoring and Alerting

### Key Metrics

**Webhook Receiver Metrics:**
```yaml
# Prometheus metrics
n8n_webhook_response_time_seconds: Webhook acknowledgment latency
n8n_webhook_requests_total: Total webhook requests received
n8n_webhook_requests_failed: Failed webhook requests
n8n_queue_enqueue_duration_seconds: Time to enqueue to Redis
```

**Target SLAs:**
- Webhook response time p95: <500ms
- Webhook response time p99: <1s
- Availability: 99.9%
- Error rate: <0.1%

### Alerts

**Critical Alerts:**

```yaml
# Webhook latency exceeded
alert: WebhookLatencyHigh
expr: histogram_quantile(0.95, n8n_webhook_response_time_seconds) > 1.0
for: 2m
annotations:
  summary: "Webhook P95 latency: {{ $value }}s (target: <0.5s)"
  action: "Check main instance load and Redis latency"

# Webhook errors
alert: WebhookErrorRateHigh
expr: rate(n8n_webhook_requests_failed[5m]) > 0.01
for: 2m
annotations:
  summary: "Webhook error rate: {{ $value }} (target: <0.001)"
  action: "Check webhook authentication and validation"
```

## Testing Webhook Infrastructure

### Local Testing

**1. Start n8n in Queue Mode:**
```bash
./scale-workers.sh start 2
```

**2. Send Test Webhook:**
```bash
curl -X POST http://localhost:5678/webhook/test \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "ticket": {
      "id": 12345,
      "subject": "Test ticket",
      "description": "Testing webhook infrastructure",
      "priority": "Medium"
    }
  }' \
  -w "\nResponse Time: %{time_total}s\n"
```

**Expected Output:**
```json
{
  "status": "accepted",
  "message": "Ticket received and queued for processing",
  "ticket_id": 12345
}
Response Time: 0.123s
```

### Load Testing

**Apache Bench (Simple):**
```bash
# 1000 requests, 100 concurrent
ab -n 1000 -c 100 -p payload.json -T application/json \
   -H "X-Webhook-Secret: your-secret" \
   http://localhost:5678/webhook/test
```

**Artillery (Advanced):**
```yaml
# artillery-webhook-test.yml
config:
  target: 'http://localhost:5678'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  processor: "./generate-payload.js"

scenarios:
  - name: "Webhook endpoint"
    flow:
      - post:
          url: "/webhook/freshdesk/new-ticket"
          headers:
            X-Webhook-Secret: "your-secret"
          json:
            ticket:
              id: "{{ $randomNumber(1000, 99999) }}"
              subject: "Load test ticket {{ $randomNumber() }}"
              description: "Testing webhook infrastructure"
              priority: "Medium"
```

**Run Load Test:**
```bash
artillery run artillery-webhook-test.yml --output report.json
artillery report report.json
```

**Expected Results:**
```
Summary:
  Scenarios launched: 12000
  Scenarios completed: 12000
  Requests completed: 12000
  Mean response time: 234ms
  P95 response time: 487ms
  P99 response time: 823ms
  Successful responses: 12000 (100%)
```

## Troubleshooting

### Common Issues

**1. Slow Webhook Response (>1s):**

```bash
# Check main instance CPU/memory
docker stats n8n-main

# Check Redis latency
redis-cli --latency-history

# Check network latency to Redis
ping redis-host

# Solutions:
- Scale up main instance (more vCPU)
- Optimize Redis connection pooling
- Move to same region/datacenter
- Remove unnecessary pre-queue processing
```

**2. Webhook Timeouts:**

```bash
# Check webhook logs
docker logs n8n-main | grep webhook

# Check Redis queue status
redis-cli LLEN bull:n8n:jobs

# Solutions:
- Increase timeout on webhook sender (Freshdesk)
- Check for network connectivity issues
- Verify Redis is running and accessible
```

**3. Authentication Failures:**

```bash
# Check webhook headers
docker logs n8n-main | grep "authentication failed"

# Verify secret configuration
echo $WEBHOOK_SECRET

# Test authentication
curl -v -H "X-Webhook-Secret: your-secret" \
  http://localhost:5678/webhook/test
```

## Production Deployment

### Deployment Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Webhook authentication configured (header + signature)
- [ ] IP whitelisting configured (if applicable)
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Monitoring and alerting configured
- [ ] Load testing completed (200+ concurrent)
- [ ] Disaster recovery plan documented
- [ ] Webhook URLs registered with Freshdesk
- [ ] Health check endpoint configured

### Health Check Endpoint

```javascript
// Create a dedicated health check workflow
// Path: /webhook/health

// Webhook Node (no auth)
↓
// Function: Health Check
const healthStatus = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  services: {
    queue: 'connected',
    redis: 'healthy'
  },
  uptime: process.uptime()
};

return [{ json: healthStatus }];
```

**Monitor Health:**
```bash
# Check health endpoint
curl http://localhost:5678/webhook/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-10-15T00:00:00.000Z",
  "services": {
    "queue": "connected",
    "redis": "healthy"
  },
  "uptime": 86400
}
```

## Next Steps

1. Configure Freshdesk webhook endpoints (see Task 3.6)
2. Implement webhook signature verification (see Task 3.14)
3. Set up monitoring dashboards (see Task 12.0)
4. Perform load testing to validate 200+ concurrent capacity

## References

- n8n Webhook Documentation: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- Queue Mode Setup: `config/worker-scaling.md`
- Redis Configuration: `config/redis-config.md`
- Environment Setup: `config/environments.md`
