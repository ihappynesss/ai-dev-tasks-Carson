# pgBouncer Connection Pooling Configuration

Configuration guide for pgBouncer connection pooling to optimize Supabase database connections and handle 200+ concurrent requests.

## Why Connection Pooling?

**Without pgBouncer:**
- Each n8n workflow execution creates new connection
- PostgreSQL connection limit: 100-500 connections
- Connection overhead: 50-100ms per connection
- Risk of "too many connections" errors under load

**With pgBouncer:**
- Reuse connections across executions
- Support 1000s of concurrent requests
- Connection pooling: <5ms connection time
- Stable performance under high load

## Architecture

```
n8n Workflows (200+ concurrent)
        ↓
pgBouncer (Transaction mode)
  Connection Pool: 20 connections
        ↓
Supabase PostgreSQL
  Max Connections: 100
  Available for pool: 20-30
```

## Supabase Built-in Connection Pooling

Supabase includes pgBouncer connection pooling by default. Use the **connection pooling** connection string.

### Connection Strings

**Direct Connection (No Pooling):**
```
postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres
```

**Pooled Connection (pgBouncer):**
```
postgresql://postgres:[password]@db.xxx.supabase.co:6543/postgres
```

**Key Difference:** Port `6543` = pgBouncer, Port `5432` = Direct PostgreSQL

## Supabase pgBouncer Configuration

### Default Settings (Supabase Pro)

| Setting | Value | Description |
|---------|-------|-------------|
| Pool Mode | Transaction | Connection released after each transaction |
| Pool Size | 15 | Connections per user/database |
| Max Client Connections | 200 | Total client connections allowed |
| Default Pool Size | 20 | Default connections if not specified |
| Reserve Pool Size | 5 | Emergency connections for superuser |

### Recommended Settings for n8n

**In Supabase Dashboard (Database > Connection Pooling):**

```
Pool Mode: Transaction
Pool Size: 20
Max Client Connections: 300
```

**Transaction Mode** is recommended because:
- ✅ Faster connection release (after each query)
- ✅ Better concurrency (more clients per connection)
- ✅ Works with n8n Postgres node
- ❌ Cannot use prepared statements
- ❌ Cannot use advisory locks

## Configuring n8n to Use Connection Pooling

### Method 1: Update Postgres Credentials

**In n8n (Settings > Credentials > Postgres):**

```
Host: db.xxx.supabase.co
Port: 6543              ← Use pgBouncer port (not 5432)
Database: postgres
User: postgres
Password: your-password
SSL: Enabled
```

**Connection string format:**
```
postgresql://postgres:[password]@db.xxx.supabase.co:6543/postgres?sslmode=require
```

### Method 2: Environment Variables

**In `.env.production`:**
```bash
# Supabase with pgBouncer
SUPABASE_DB_HOST=db.xxx.supabase.co
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-password
SUPABASE_DB_SSL=true

# Full connection string (pgBouncer)
SUPABASE_CONNECTION_STRING=postgresql://postgres:[password]@db.xxx.supabase.co:6543/postgres?sslmode=require
```

## Connection Pooling Best Practices

### 1. Use Short-Lived Connections

**✅ Good - Transaction Mode:**
```javascript
// Query executed, connection released immediately
const result = await postgres.query(
  'SELECT * FROM knowledge_base WHERE id = $1',
  [knowledgeId]
);

// Connection automatically returned to pool
return result.rows;
```

**❌ Bad - Holding Connections:**
```javascript
// Don't hold connections open
const client = await postgres.connect();
await doSomethingElse();  // Connection held during this
await client.query('...');
await client.release();
```

### 2. Avoid Long Transactions

**✅ Good:**
```sql
-- Quick transaction
BEGIN;
UPDATE knowledge_base SET views = views + 1 WHERE id = 123;
COMMIT;
```

**❌ Bad:**
```sql
-- Long transaction blocks connection
BEGIN;
SELECT pg_sleep(30);  -- Holds connection for 30 seconds
UPDATE knowledge_base SET ...;
COMMIT;
```

### 3. Close Connections After Use

n8n Postgres node automatically releases connections, but for custom code:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_CONNECTION_STRING,
  max: 20,  // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

try {
  const result = await pool.query('SELECT ...');
  return result.rows;
} finally {
  // Pool manages connections, no need to manually release
}
```

## Monitoring Connection Usage

### Supabase Dashboard

**Database > Database Usage:**
- Active connections graph
- Connection pool utilization
- Query performance

### SQL Queries

**Check active connections:**
```sql
SELECT
  COUNT(*) AS total_connections,
  COUNT(*) FILTER (WHERE state = 'active') AS active,
  COUNT(*) FILTER (WHERE state = 'idle') AS idle
FROM pg_stat_activity
WHERE datname = 'postgres';
```

**Check connection pool status (if direct pgBouncer access):**
```sql
-- Via pgBouncer admin database
SHOW POOLS;
SHOW STATS;
```

**Expected output:**
```
 database  |   user    | cl_active | cl_waiting | sv_active | sv_idle
-----------+-----------+-----------+------------+-----------+---------
 postgres  | postgres  |       45  |         0  |       15  |      5
```

### Set Up Alerts

**Alert when connections exceed 80%:**
```sql
-- In scheduled workflow (every 5 minutes)
SELECT
  COUNT(*) AS current_connections,
  100 AS max_connections,
  (COUNT(*)::float / 100 * 100)::int AS usage_pct
FROM pg_stat_activity
WHERE datname = 'postgres';

-- If usage_pct > 80, send Slack alert
```

## Handling Connection Errors

### Common Errors

**1. "Too Many Connections"**
```
Error: sorry, too many clients already
```

**Solutions:**
- Use pgBouncer port (6543) instead of direct (5432)
- Increase pool size in Supabase dashboard
- Reduce concurrent n8n workflow executions
- Scale to multiple n8n workers

**2. "Connection Timeout"**
```
Error: Connection terminated unexpectedly
```

**Solutions:**
- Check network connectivity
- Increase `connectionTimeoutMillis`
- Verify Supabase is not under maintenance
- Check SSL certificate validity

**3. "Prepared Statement Already Exists"**
```
Error: prepared statement "stmt_123" already exists
```

**Cause:** Using prepared statements in Transaction mode

**Solution:** Use Simple mode in pgBouncer (not recommended) or avoid prepared statements

## Load Testing Connection Pool

### Test Script

```javascript
// test-connection-pool.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:[password]@db.xxx.supabase.co:6543/postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function simulateLoad() {
  const promises = [];

  // Simulate 100 concurrent queries
  for (let i = 0; i < 100; i++) {
    promises.push(
      pool.query('SELECT * FROM knowledge_base LIMIT 1')
        .then(() => console.log(`✅ Query ${i} succeeded`))
        .catch(err => console.error(`❌ Query ${i} failed:`, err.message))
    );
  }

  await Promise.all(promises);
  console.log('Load test complete');
}

simulateLoad()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Load test failed:', err);
    process.exit(1);
  });
```

**Run test:**
```bash
node test-connection-pool.js
```

**Expected:**
- All 100 queries succeed
- Average query time: <50ms
- No "too many connections" errors

## Scaling Strategy

### Current Setup (Pro Plan)
- pgBouncer pool: 20 connections
- Max concurrent workflows: 200
- Connection reuse ratio: 10:1

### Scaling to 500+ Concurrent
- Upgrade to Supabase Team/Enterprise
- Increase pool size to 50
- Use multiple n8n worker instances
- Implement Redis caching (reduce DB queries by 60%)

### Scaling to 1000+ Concurrent
- Enterprise plan (dedicated resources)
- Pool size: 100+
- Multiple read replicas
- Aggressive caching strategy

## Configuration Checklist

- [ ] **Using pgBouncer port** (6543, not 5432)
- [ ] **Pool mode** set to Transaction in Supabase
- [ ] **Pool size** configured (20-30 connections)
- [ ] **SSL enabled** in connection string
- [ ] **Connection timeout** set (2-5 seconds)
- [ ] **Monitoring** active connections via SQL
- [ ] **Alerts** configured for high connection usage
- [ ] **Load tested** with simulated concurrent requests
- [ ] **n8n credentials** updated with pooled connection string
- [ ] **Environment variables** use port 6543
- [ ] **Error handling** for connection failures
- [ ] **Graceful degradation** if pool exhausted

## Performance Comparison

### Direct Connection (Port 5432)
```
Connection time: 80-100ms
Max concurrent: 50-80
Risk of "too many connections": High
```

### Pooled Connection (Port 6543)
```
Connection time: <5ms
Max concurrent: 200-300
Risk of "too many connections": Low
Connection reuse: 10-20x
```

### Impact on n8n Workflows
```
Without pooling:
- Webhook response: 200-300ms
- Database query: 100-150ms

With pooling:
- Webhook response: 100-150ms
- Database query: 20-50ms
```

## Troubleshooting

### Verify pgBouncer is Used

```bash
# Test direct connection
psql "postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres" -c "SELECT 1"

# Test pooled connection
psql "postgresql://postgres:[password]@db.xxx.supabase.co:6543/postgres" -c "SELECT 1"
```

### Check Connection Pool Stats

```sql
-- Active connections by state
SELECT
  state,
  COUNT(*) AS count,
  MAX(now() - state_change) AS max_age
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY state;
```

### Reset Connections

If connections appear stuck:

```sql
-- Terminate idle connections older than 5 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'postgres'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes';
```

## Related Documentation

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pool)
- [pgBouncer Documentation](https://www.pgbouncer.org/)
- [Redis Caching Strategy](./redis-caching-strategy.md)
- [Worker Scaling Guide](./worker-scaling.md)
- [Performance Tuning](./performance-tuning.md)
