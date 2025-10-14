# API Integration Guide

Comprehensive guide for integrating external APIs in the NSW Strata Automation system.

## Overview

This system integrates with multiple APIs:
- **Freshdesk** - Ticket management and customer support
- **Supabase/PostgreSQL** - Database and vector search
- **OpenAI** - Text embeddings (text-embedding-3-small)
- **Claude (Anthropic)** - AI response generation (Task 6.0)
- **Perplexity** - Deep research queries (Task 6.0)
- **Slack** - Notifications and alerts
- **Redis** - Caching and queue management

## API Credentials Management

### Environment Variables

**Required for all environments:**

```bash
# Freshdesk API
FRESHDESK_DOMAIN=https://yourcompany.freshdesk.com
FRESHDESK_API_KEY=your-api-key
FRESHDESK_WEBHOOK_SECRET=your-webhook-secret

# Supabase Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_DB_HOST=db.xxx.supabase.co
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-password

# OpenAI API
OPENAI_API_KEY=sk-...
OPENAI_API_URL=https://api.openai.com

# Claude API (Anthropic) - Task 6.0
CLAUDE_API_KEY=sk-ant-...
CLAUDE_API_URL=https://api.anthropic.com

# Perplexity API - Task 6.0
PERPLEXITY_API_KEY=pplx-...
PERPLEXITY_API_URL=https://api.perplexity.ai

# Slack Webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

### n8n Credentials Configuration

**In n8n (Settings > Credentials):**

1. **Freshdesk API**
   - Type: Freshdesk API
   - Domain: yourcompany.freshdesk.com
   - API Key: your-api-key

2. **Supabase/PostgreSQL**
   - Type: Postgres
   - Host: db.xxx.supabase.co
   - Port: 6543 (pgBouncer)
   - Database: postgres
   - User: postgres
   - Password: your-password
   - SSL: Enabled

3. **OpenAI**
   - Type: OpenAI API
   - API Key: sk-...

4. **HTTP Header Auth (for webhooks)**
   - Type: Header Auth
   - Name: X-Api-Key
   - Value: your-api-key

## Freshdesk API

### Base URL
```
https://yourcompany.freshdesk.com/api/v2
```

### Authentication
```bash
# Basic Auth with API key
Authorization: Basic base64(api_key:X)

# Example
curl -u "YOUR_API_KEY:X" https://yourcompany.freshdesk.com/api/v2/tickets
```

### Rate Limits
- **Standard Plan:** 1,000 requests/hour
- **Pro Plan:** 2,500 requests/hour
- **Enterprise Plan:** 5,000 requests/hour

**Handling rate limits:**
```javascript
// Check rate limit headers
const rateLimit = response.headers['x-ratelimit-remaining'];
const resetTime = response.headers['x-ratelimit-reset'];

if (rateLimit < 10) {
  console.warn(`Low rate limit: ${rateLimit} remaining`);
  // Wait until reset time
  await sleep(resetTime - Date.now());
}
```

### Common Endpoints

#### Get Ticket
```http
GET /api/v2/tickets/{id}
```

**Response:**
```json
{
  "id": 12345,
  "subject": "Water leak",
  "description": "<p>Water leaking...</p>",
  "status": 2,
  "priority": 3,
  "created_at": "2025-10-15T10:30:00Z"
}
```

#### Create Reply
```http
POST /api/v2/tickets/{id}/reply
Content-Type: application/json

{
  "body": "<p>Response text...</p>",
  "from_email": "support@company.com",
  "user_id": 12345
}
```

#### Update Ticket
```http
PUT /api/v2/tickets/{id}
Content-Type: application/json

{
  "status": 4,
  "priority": 2,
  "tags": ["auto-resolved", "kb-reused"]
}
```

#### Get Conversations
```http
GET /api/v2/tickets/{id}/conversations
```

### Error Handling

**Common errors:**
```javascript
// 401 Unauthorized
if (response.status === 401) {
  throw new Error('Invalid API key');
}

// 429 Rate Limit
if (response.status === 429) {
  const retryAfter = response.headers['retry-after'];
  await sleep(retryAfter * 1000);
  // Retry request
}

// 404 Not Found
if (response.status === 404) {
  console.log('Ticket not found');
  return null;
}
```

## OpenAI API

### Base URL
```
https://api.openai.com/v1
```

### Authentication
```bash
Authorization: Bearer YOUR_API_KEY
```

### Rate Limits
- **Tier 1 (Free):** 3 RPM, 40,000 TPM
- **Tier 2:** 500 RPM, 150,000 TPM
- **Tier 3:** 3,500 RPM, 1,000,000 TPM

### Embedding Generation

#### Single Embedding
```http
POST /v1/embeddings
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "model": "text-embedding-3-small",
  "input": "Your text here",
  "encoding_format": "float"
}
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.123, -0.456, ...],  // 1536 dimensions
      "index": 0
    }
  ],
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 10,
    "total_tokens": 10
  }
}
```

#### Batch Embeddings (50% cost savings)
```http
POST /v1/embeddings
Content-Type: application/json

{
  "model": "text-embedding-3-small",
  "input": [
    "Text 1",
    "Text 2",
    "Text 3",
    ...  // Up to 2048 inputs
  ]
}
```

**Cost:**
- text-embedding-3-small: $0.02 / 1M tokens
- Single embedding (100 tokens): $0.000002
- Batch 50 embeddings: $0.0001 (50% savings vs individual)

### Error Handling

```javascript
try {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  if (!response.ok) {
    const error = await response.json();

    if (response.status === 429) {
      // Rate limit exceeded
      const retryAfter = response.headers.get('retry-after') || 60;
      console.log(`Rate limited. Retry after ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      // Retry
    } else if (response.status === 401) {
      throw new Error('Invalid API key');
    } else {
      throw new Error(`OpenAI API error: ${error.error.message}`);
    }
  }

  return await response.json();
} catch (error) {
  console.error('OpenAI API call failed:', error);
  throw error;
}
```

## Supabase/PostgreSQL API

### Connection Strings

**Direct Connection (Port 5432):**
```
postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres
```

**Pooled Connection (Port 6543 - Recommended):**
```
postgresql://postgres:[password]@db.xxx.supabase.co:6543/postgres?sslmode=require
```

### REST API

**Base URL:**
```
https://xxx.supabase.co/rest/v1
```

**Authentication:**
```bash
apikey: YOUR_SUPABASE_ANON_KEY
Authorization: Bearer YOUR_SUPABASE_SERVICE_KEY
```

### Common Operations

#### Query with Vector Search
```http
POST /rest/v1/rpc/search_knowledge
Content-Type: application/json
apikey: YOUR_KEY

{
  "query_embedding": [0.123, -0.456, ...],
  "match_threshold": 0.7,
  "match_count": 5
}
```

#### Insert Row
```http
POST /rest/v1/knowledge_base
Content-Type: application/json
apikey: YOUR_KEY
Prefer: return=representation

{
  "title": "Entry Title",
  "content": "Entry content...",
  "embedding": [0.123, ...],
  "metadata": {"category": "maintenance"}
}
```

### Connection Pooling

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_CONNECTION_STRING,
  max: 20,  // Max 20 connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: { rejectUnauthorized: false }
});

// Use pool
const result = await pool.query('SELECT * FROM knowledge_base LIMIT 5');
```

## Claude API (Anthropic) - Task 6.0

### Base URL
```
https://api.anthropic.com/v1
```

### Authentication
```bash
x-api-key: YOUR_CLAUDE_API_KEY
anthropic-version: 2023-06-01
```

### Models
- **claude-sonnet-4.5:** Best quality, slower (recommended)
- **claude-sonnet-3.5:** Fast, good quality
- **claude-haiku-3:** Fastest, lower cost

### Message Generation

```http
POST /v1/messages
Content-Type: application/json
x-api-key: YOUR_KEY
anthropic-version: 2023-06-01

{
  "model": "claude-sonnet-4.5",
  "max_tokens": 2048,
  "system": "You are a helpful NSW strata management assistant...",
  "messages": [
    {
      "role": "user",
      "content": "Ticket content and knowledge..."
    }
  ]
}
```

### Prompt Caching (90% cost reduction)

```http
POST /v1/messages
Content-Type: application/json

{
  "model": "claude-sonnet-4.5",
  "max_tokens": 2048,
  "system": [
    {
      "type": "text",
      "text": "Long system prompt (50K tokens)...",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [...]
}
```

**Cost savings:**
- Without caching: $3 / 1M input tokens
- With caching (write): $3.75 / 1M tokens
- With caching (read): $0.30 / 1M tokens (90% savings)

### Rate Limits
- **Tier 1:** 50 RPM, 40,000 TPM
- **Tier 2:** 1,000 RPM, 80,000 TPM
- **Tier 3:** 2,000 RPM, 160,000 TPM

## Perplexity API - Task 6.0

### Base URL
```
https://api.perplexity.ai
```

### Authentication
```bash
Authorization: Bearer YOUR_PERPLEXITY_API_KEY
```

### Models
- **sonar-deep-research:** Deep research with citations (5 RPM limit)
- **sonar-pro:** Fast general queries (50 RPM)
- **sonar:** Fastest, basic queries (100 RPM)

### Chat Completion

```http
POST /chat/completions
Content-Type: application/json
Authorization: Bearer YOUR_KEY

{
  "model": "sonar-deep-research",
  "messages": [
    {
      "role": "system",
      "content": "Research NSW strata regulations..."
    },
    {
      "role": "user",
      "content": "What are the requirements for AGM notices?"
    }
  ],
  "max_tokens": 4096,
  "return_citations": true
}
```

**Response:**
```json
{
  "id": "...",
  "model": "sonar-deep-research",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "According to NSW legislation...",
        "citations": ["https://..."]
      }
    }
  ]
}
```

### Rate Limiting Strategy

```javascript
// Perplexity has strict rate limits (5 RPM for deep-research)
// Use Redis queue to manage requests

const Queue = require('bull');
const perplexityQueue = new Queue('perplexity', {
  redis: {
    host: 'redis',
    port: 6379,
    db: 0
  },
  limiter: {
    max: 4,  // 4 requests
    duration: 60000  // per 60 seconds (leave margin for safety)
  }
});

// Add job to queue
await perplexityQueue.add({
  query: 'Research topic...',
  model: 'sonar-deep-research'
});

// Process jobs
perplexityQueue.process(async (job) => {
  const result = await callPerplexityAPI(job.data);
  return result;
});
```

## Slack Webhooks

### Incoming Webhook URL
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### Send Message

```http
POST https://hooks.slack.com/services/...
Content-Type: application/json

{
  "text": "Notification message",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "System Alert"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Details:* Important information here"
      }
    }
  ]
}
```

### Message Formatting

**Markdown supported:**
- *italic* = `*italic*`
- **bold** = `**bold**`
- ~strikethrough~ = `~strikethrough~`
- `code` = `` `code` ``
- [link](url) = `<url|link>`

## Redis API

### Connection

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  db: 1,  // Cache DB
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
});
```

### Common Operations

#### Get/Set with TTL
```javascript
// Set with 1 hour expiry
await redis.setex('cache:key', 3600, JSON.stringify(data));

// Get
const cached = await redis.get('cache:key');
if (cached) {
  return JSON.parse(cached);
}
```

#### Rate Limiting
```javascript
const key = `ratelimit:${userId}`;
const limit = 10;
const window = 60;

const current = await redis.incr(key);
if (current === 1) {
  await redis.expire(key, window);
}

if (current > limit) {
  throw new Error('Rate limit exceeded');
}
```

## Error Handling Best Practices

### Retry Strategy

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }
}

// Usage
const result = await retryWithBackoff(() =>
  callAPI(endpoint, data)
);
```

### Circuit Breaker

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

// Usage
const openaiBreaker = new CircuitBreaker(5, 60000);
const result = await openaiBreaker.call(() =>
  generateEmbedding(text)
);
```

## Monitoring and Logging

### API Call Metrics

```sql
-- Log API calls to system_metrics
INSERT INTO system_metrics (metric_name, metric_value, category, metadata, timestamp)
VALUES (
  'api_call_duration',
  $1,  -- duration in ms
  'api',
  jsonb_build_object(
    'service', $2,  -- 'openai', 'claude', etc.
    'endpoint', $3,
    'status', $4
  ),
  NOW()
);
```

### Dashboard Queries

```sql
-- API calls per service (last 24 hours)
SELECT
  metadata->>'service' AS service,
  COUNT(*) AS total_calls,
  AVG(metric_value) AS avg_duration_ms,
  MAX(metric_value) AS max_duration_ms
FROM system_metrics
WHERE metric_name = 'api_call_duration'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY service
ORDER BY total_calls DESC;

-- API error rate
SELECT
  metadata->>'service' AS service,
  COUNT(*) FILTER (WHERE metadata->>'status' != '200') AS errors,
  COUNT(*) AS total,
  (COUNT(*) FILTER (WHERE metadata->>'status' != '200')::float / COUNT(*) * 100)::int AS error_rate_pct
FROM system_metrics
WHERE metric_name = 'api_call_duration'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY service;
```

## Security Best Practices

1. **Never commit API keys** to git
2. **Use environment variables** for all credentials
3. **Rotate keys regularly** (quarterly recommended)
4. **Use separate keys** for dev/staging/production
5. **Monitor API usage** for anomalies
6. **Set up billing alerts** to prevent overages
7. **Validate webhook signatures** (HMAC-SHA256)
8. **Use HTTPS** for all API calls
9. **Implement rate limiting** on all endpoints
10. **Log all API errors** for audit trail

## Related Documentation

- [Freshdesk Webhook Setup](../config/freshdesk-webhook-setup.md)
- [Redis Caching Strategy](../config/redis-caching-strategy.md)
- [pgBouncer Configuration](../config/pgbouncer-config.md)
- [Environment Configuration](../config/environments.md)
