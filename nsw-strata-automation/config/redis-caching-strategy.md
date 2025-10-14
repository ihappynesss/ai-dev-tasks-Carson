# Redis Caching Strategy for Knowledge Retrieval

Comprehensive guide for implementing Redis caching to optimize knowledge retrieval performance and reduce API costs.

## Overview

Redis caching provides:
- **Sub-second query latency** (<50ms for cache hits)
- **50-70% reduction** in OpenAI embedding API calls
- **Reduced database load** on Supabase
- **Cost optimization** (~$0.10-0.30 saved per cached query)

## Cache Architecture

```
Ticket Query
    ↓
Check Redis Cache (DB 1)
    ↓
  Hit? → Return cached results (50ms)
    ↓ No
Generate Embedding (OpenAI)
    ↓
Query Supabase (pgvector)
    ↓
Store in Redis Cache (TTL: 1 hour)
    ↓
Return results (200ms)
```

## Redis Database Allocation

| DB | Purpose | TTL | Max Keys | Eviction |
|----|---------|-----|----------|----------|
| 0 | Queue (Bull) | Varies | Unlimited | LRU |
| 1 | Knowledge Cache | 1 hour | 10,000 | LRU |
| 2 | Rate Limiting | 60s | 1,000 | TTL |
| 3 | Failed Operations | 7 days | 500 | LRU |

## Cache Key Structure

### Embedding Cache
```
Format: embedding:{hash}
Value: JSON stringified array [0.123, -0.456, ...]
TTL: 24 hours
```

**Example:**
```javascript
const textHash = crypto
  .createHash('sha256')
  .update(normalizedText)
  .digest('hex')
  .substring(0, 16);

const cacheKey = `embedding:${textHash}`;
```

### Knowledge Search Results Cache
```
Format: knowledge:{embedding_hash}:{category}:{limit}
Value: JSON array of knowledge entries
TTL: 1 hour
```

**Example:**
```javascript
const searchKey = `knowledge:${embeddingHash}:maintenance-repairs:5`;
```

### Training Examples Cache
```
Format: training:{category}:{count}
Value: JSON array of training examples
TTL: 4 hours
```

## Implementation in n8n Workflows

### Main Ticket Processor - Embedding Cache

**Add after "Normalize and Extract Entities" node:**

```javascript
// Check Redis cache for embedding
const Redis = require('ioredis');
const crypto = require('crypto');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  db: 1  // Knowledge cache DB
});

const ticket = $json;
const textHash = crypto
  .createHash('sha256')
  .update(ticket.normalizedText)
  .digest('hex')
  .substring(0, 16);

const cacheKey = `embedding:${textHash}`;

try {
  const cached = await redis.get(cacheKey);

  if (cached) {
    // Cache hit - return cached embedding
    console.log(`✅ Cache hit for embedding: ${cacheKey}`);
    return {
      ...ticket,
      embedding: JSON.parse(cached),
      fromCache: true,
      cacheKey: cacheKey
    };
  } else {
    // Cache miss - mark for embedding generation
    console.log(`❌ Cache miss for embedding: ${cacheKey}`);
    return {
      ...ticket,
      fromCache: false,
      cacheKey: cacheKey
    };
  }
} finally {
  redis.disconnect();
}
```

**Add after "Generate Embedding (OpenAI)" node:**

```javascript
// Store embedding in Redis cache
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  db: 1
});

const data = $json;
const embedding = data.data[0].embedding;
const cacheKey = $('Check Embedding Cache').item.json.cacheKey;

try {
  // Store with 24 hour TTL
  await redis.setex(
    cacheKey,
    86400,  // 24 hours
    JSON.stringify(embedding)
  );

  console.log(`💾 Cached embedding: ${cacheKey}`);

  return {
    embedding: embedding,
    cached: true,
    cacheKey: cacheKey
  };
} finally {
  redis.disconnect();
}
```

### Knowledge Search Results Cache

**Add after "Hybrid Search (Vector + Keyword)" node:**

```javascript
// Cache knowledge search results
const Redis = require('ioredis');
const crypto = require('crypto');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  db: 1
});

const results = $input.all();
const ticket = $('Normalize and Extract Entities').item.json;
const embeddingHash = $('Check Embedding Cache').item.json.cacheKey.split(':')[1];

// Create search cache key
const category = ticket.categoryHints[0] || 'all';
const searchKey = `knowledge:${embeddingHash}:${category}:5`;

try {
  // Store results with 1 hour TTL
  await redis.setex(
    searchKey,
    3600,  // 1 hour
    JSON.stringify(results.map(r => r.json))
  );

  console.log(`💾 Cached knowledge results: ${searchKey}`);

  return results;
} finally {
  redis.disconnect();
}
```

## Cache Warming Strategy

### Preload Common Queries

**Run during off-peak hours (3 AM):**

```sql
-- Get most common ticket categories from last 30 days
SELECT
  category,
  COUNT(*) AS frequency,
  ARRAY_AGG(DISTINCT ticket_text ORDER BY created_at DESC LIMIT 5) AS sample_texts
FROM training_examples
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY category
ORDER BY frequency DESC
LIMIT 10;
```

**Warm cache for top categories:**

```javascript
// Cache warming workflow (scheduled daily at 3 AM)
const commonQueries = [
  { category: 'maintenance-repairs', text: 'water leak common property' },
  { category: 'by-law-compliance', text: 'noise complaint late night' },
  { category: 'financial-matters', text: 'unpaid levies arrears' },
  { category: 'renovations-alterations', text: 'flooring replacement approval' },
  { category: 'governance-administration', text: 'AGM meeting requirements' }
];

for (const query of commonQueries) {
  // Generate embedding
  const embedding = await generateEmbedding(query.text);

  // Perform search
  const results = await searchKnowledge(embedding, query.category);

  // Results automatically cached
  console.log(`✅ Warmed cache for: ${query.category}`);
}
```

## Cache Invalidation

### Automatic Invalidation Triggers

**1. Knowledge Base Updates:**
```javascript
// After updating knowledge_base table
const Redis = require('ioredis');
const redis = new Redis({ host: 'redis', port: 6379, db: 1 });

// Invalidate all knowledge caches for updated category
const category = 'maintenance-repairs';
const pattern = `knowledge:*:${category}:*`;

const keys = await redis.keys(pattern);
if (keys.length > 0) {
  await redis.del(...keys);
  console.log(`🗑️ Invalidated ${keys.length} cache entries for ${category}`);
}

redis.disconnect();
```

**2. Training Examples Updates:**
```javascript
// After adding new training examples
const pattern = `training:${category}:*`;
const keys = await redis.keys(pattern);
if (keys.length > 0) {
  await redis.del(...keys);
}
```

**3. Manual Cache Flush:**
```bash
# Flush knowledge cache DB (DB 1)
redis-cli -h redis -p 6379 -n 1 FLUSHDB

# Flush specific pattern
redis-cli -h redis -p 6379 -n 1 --scan --pattern "knowledge:*:maintenance-repairs:*" | xargs redis-cli -h redis -p 6379 -n 1 DEL
```

## Cache Metrics and Monitoring

### Metrics to Track

```javascript
// Log cache performance metrics
const metrics = {
  cacheHits: 0,
  cacheMisses: 0,
  avgCacheLatency: 0,
  avgDbLatency: 0,
  cacheSavings: 0  // API calls saved
};

// Calculate hit rate
const hitRate = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);

// Log to system_metrics table
await postgres.query(`
  INSERT INTO system_metrics (metric_name, metric_value, category, timestamp)
  VALUES
    ('cache_hit_rate', $1, 'performance', NOW()),
    ('cache_hits', $2, 'performance', NOW()),
    ('cache_misses', $3, 'performance', NOW()),
    ('api_calls_saved', $4, 'cost', NOW())
`, [hitRate, metrics.cacheHits, metrics.cacheMisses, metrics.cacheSavings]);
```

### Redis INFO Monitoring

```bash
# Check cache DB statistics
redis-cli -n 1 INFO stats

# Key metrics:
# - keyspace_hits: Number of cache hits
# - keyspace_misses: Number of cache misses
# - used_memory: Memory consumption
# - evicted_keys: Keys removed by LRU policy
```

### Target Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Cache Hit Rate | >60% | 🎯 |
| Avg Cache Latency | <50ms | 🎯 |
| Avg DB Latency | <200ms | 🎯 |
| Memory Usage | <100MB | 🎯 |
| Eviction Rate | <5% | 🎯 |

## Performance Optimization

### Redis Configuration (`redis.conf`)

```conf
# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence (for cache, we can disable)
save ""
appendonly no

# Performance
tcp-keepalive 60
timeout 300

# Connection pooling
maxclients 10000

# Logging
loglevel notice
```

### Connection Pooling

```javascript
// Use ioredis connection pool
const Redis = require('ioredis');

// Create connection pool (reuse across workflow executions)
const redisPool = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  db: 1,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: true
});

// Use pool in workflow
const cached = await redisPool.get(cacheKey);

// Don't disconnect (connection pooling)
// redisPool.disconnect(); // ❌ Don't do this
```

### Pipeline for Batch Operations

```javascript
// Use pipeline for multiple cache lookups
const pipeline = redis.pipeline();

for (const key of cacheKeys) {
  pipeline.get(key);
}

const results = await pipeline.exec();

// Process results
const cachedValues = results.map(([err, value]) =>
  err ? null : JSON.parse(value)
);
```

## Cost Savings Analysis

### Without Caching
```
Tickets per day: 100
Embedding API calls: 100
Cost per call: $0.0001 (text-embedding-3-small)
Daily cost: $0.01
Monthly cost: $0.30
```

### With 60% Cache Hit Rate
```
Tickets per day: 100
Cache hits: 60 (no API call)
Cache misses: 40 (API call)
Daily API cost: $0.004
Daily Redis cost: $0.001 (negligible)
Monthly cost: $0.15
Savings: 50%
```

### Additional Savings
- **Database queries reduced:** 60% fewer Supabase queries
- **Faster response time:** 150ms saved per cached query
- **Better user experience:** Sub-second responses

## Testing Cache Implementation

### Test Cache Hit

```bash
# Manually set cache entry
redis-cli -n 1 SET "embedding:abc123def456" '[0.123,-0.456,0.789]'
redis-cli -n 1 EXPIRE "embedding:abc123def456" 86400

# Query from workflow
# Should return cached value
```

### Test Cache Miss

```bash
# Clear cache
redis-cli -n 1 FLUSHDB

# Query from workflow
# Should generate new embedding and cache it
```

### Monitor Cache Activity

```bash
# Watch Redis commands in real-time
redis-cli -n 1 MONITOR

# Check cache statistics
redis-cli -n 1 INFO stats | grep keyspace
```

## Troubleshooting

### High Cache Miss Rate

**Causes:**
- TTL too short
- Query variations not normalized
- Cache eviction due to memory limits

**Solutions:**
- Increase TTL for stable knowledge
- Improve text normalization
- Increase Redis maxmemory
- Monitor evicted_keys metric

### Memory Issues

**Check memory usage:**
```bash
redis-cli -n 1 INFO memory
```

**Solutions:**
- Lower TTL values
- Reduce maxmemory allocation
- Use more aggressive LRU policy
- Clear unused keys manually

### Connection Timeouts

**Solutions:**
- Increase Redis timeout setting
- Use connection pooling
- Check network latency
- Monitor Redis load

## Production Checklist

- [ ] Redis configured with 256MB memory for cache DB
- [ ] LRU eviction policy enabled
- [ ] Cache keys following naming convention
- [ ] TTL configured (embeddings: 24h, knowledge: 1h)
- [ ] Cache warming scheduled (daily at 3 AM)
- [ ] Invalidation triggers implemented
- [ ] Metrics logging to system_metrics table
- [ ] Cache hit rate monitoring (target >60%)
- [ ] Connection pooling configured
- [ ] Backup/failover strategy (cache can fail gracefully)

## Related Documentation

- [Redis Configuration](./redis-config.md)
- [Worker Scaling](./worker-scaling.md)
- [Main Ticket Processor Workflow](../workflows/main-ticket-processor.json)
- [Performance Optimization Guide](./performance-tuning.md)
