# Redis Configuration for NSW Strata Automation

## Overview

Redis is used for multiple purposes in the NSW Strata Automation system:

1. **Queue Management** - n8n Bull queue for workflow execution
2. **Caching Layer** - Query results and embeddings (1-hour TTL)
3. **Rate Limiting** - Perplexity API requests (4.5 RPM max)
4. **Failed Operations** - Retry queue with 7-day TTL

## Redis Databases

Redis supports multiple logical databases (0-15). We allocate them as follows:

- **DB 0**: n8n queue management (Bull queue)
- **DB 1**: Query and knowledge retrieval caching
- **DB 2**: API rate limiting and tracking
- **DB 3**: Failed operations retry queue

## Configuration

### Local Development (Docker)

Redis is configured in `docker-compose.yml` with:
- **Memory Limit**: 256MB with LRU eviction
- **Persistence**: AOF (Append-Only File) enabled
- **Port**: 6379 (exposed for debugging)

### Production Settings

For production deployment, use these Redis configurations:

```redis
# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
appendonly yes
appendfsync everysec

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128
```

## Usage Patterns

### 1. Query Caching (DB 1)

Cache knowledge retrieval results and embeddings:

```javascript
// Cache key pattern
const cacheKey = `query:${hash(ticketText)}:${category}`;

// Set with 1-hour TTL (3600 seconds)
await redis.setex(cacheKey, 3600, JSON.stringify(queryResult));

// Get cached result
const cached = await redis.get(cacheKey);
```

### 2. Rate Limiting (DB 2)

Perplexity API rate limiting (4.5 RPM):

```javascript
// Rate limit key
const rateLimitKey = `ratelimit:perplexity:${Math.floor(Date.now() / 60000)}`;

// Increment and check
const count = await redis.incr(rateLimitKey);
await redis.expire(rateLimitKey, 60);

if (count > 4) {
  // Rate limit exceeded, queue request
  await redis.rpush('queue:perplexity', JSON.stringify(request));
}
```

### 3. Failed Operations Queue (DB 3)

Store failed operations for retry with 7-day TTL:

```javascript
// Add failed operation
const failedOp = {
  ticketId: 'TKT-123',
  operation: 'processTicket',
  error: errorMessage,
  timestamp: Date.now(),
  retryCount: 0
};

await redis.setex(
  `failed:${failedOp.ticketId}:${Date.now()}`,
  604800, // 7 days in seconds
  JSON.stringify(failedOp)
);
```

## Monitoring

### Key Metrics to Track

```bash
# Connection info
redis-cli INFO clients

# Memory usage
redis-cli INFO memory

# Hit rate
redis-cli INFO stats | grep keyspace

# Slow queries
redis-cli SLOWLOG GET 10

# Queue length
redis-cli LLEN queue:perplexity
```

### Health Checks

```bash
# Ping test
redis-cli PING

# Check memory usage
redis-cli INFO memory | grep used_memory_human

# Check connected clients
redis-cli INFO clients | grep connected_clients
```

## Scaling Considerations

### Redis Cluster (for >10K tickets/day)

When scaling beyond single-instance capacity:

1. **Redis Cluster**: 3+ master nodes with replication
2. **Redis Sentinel**: Automatic failover
3. **Separate instances**:
   - Instance 1: n8n queue
   - Instance 2: Application caching
   - Instance 3: Rate limiting

### Cloud Redis Services

For production, consider managed Redis:

- **AWS ElastiCache**: Redis 7.x with automatic backups
- **Azure Cache for Redis**: Premium tier with persistence
- **Redis Cloud**: Dedicated instances with clustering

**Recommended for production:**
- Redis Cloud or AWS ElastiCache
- 2GB+ memory allocation
- Replication enabled (1+ replicas)
- Daily automated backups
- Multi-AZ deployment

## Backup and Recovery

### Backup Strategy

Redis AOF (Append-Only File) provides point-in-time recovery:

```bash
# Force save
redis-cli BGSAVE

# Backup AOF file
cp /data/appendonly.aof /backup/redis-$(date +%Y%m%d).aof
```

### Recovery

```bash
# Stop Redis
docker-compose stop redis

# Restore AOF file
cp /backup/redis-20241014.aof /data/appendonly.aof

# Start Redis
docker-compose start redis
```

## Troubleshooting

### High Memory Usage

```bash
# Check biggest keys
redis-cli --bigkeys

# Check memory by pattern
redis-cli --memkeys --pattern 'query:*'
```

### Connection Issues

```bash
# Check max connections
redis-cli CONFIG GET maxclients

# Check current connections
redis-cli CLIENT LIST
```

### Performance Issues

```bash
# Enable slow log
redis-cli CONFIG SET slowlog-log-slower-than 1000

# Check slow queries
redis-cli SLOWLOG GET 20
```

## Security

### Production Security Checklist

- ✅ Bind to internal network only (not 0.0.0.0)
- ✅ Enable Redis AUTH with strong password
- ✅ Disable dangerous commands (FLUSHALL, FLUSHDB, CONFIG)
- ✅ Use TLS/SSL for connections
- ✅ Regular security updates
- ✅ Network firewall rules

### Authentication

```bash
# Set password
redis-cli CONFIG SET requirepass "strong_password_here"

# Connect with auth
redis-cli -a "strong_password_here"
```

## Environment Variables

Update `.env` with Redis configuration:

```env
# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB_QUEUE=0
REDIS_DB_CACHE=1
REDIS_DB_RATELIMIT=2
REDIS_DB_FAILED=3

# n8n Queue Configuration
QUEUE_BULL_REDIS_HOST=redis
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_DB=0
QUEUE_BULL_REDIS_PASSWORD=
```

## Testing Redis

```bash
# Start Redis in Docker
docker-compose up -d redis

# Test connection
docker exec -it n8n-redis redis-cli PING

# Test basic operations
docker exec -it n8n-redis redis-cli SET test "Hello"
docker exec -it n8n-redis redis-cli GET test

# Monitor commands in real-time
docker exec -it n8n-redis redis-cli MONITOR
```
