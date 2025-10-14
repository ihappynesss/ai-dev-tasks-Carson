# Database Schemas and Migrations

This directory contains database schemas, migration scripts, and SQL files for the NSW Strata Automation system.

## Database Structure

The system uses two primary databases:

1. **n8n Database (PostgreSQL)** - Workflow execution and n8n internals
2. **Supabase Database (PostgreSQL with pgvector)** - Knowledge base and application data

## Files

- **`schema.sql`** - Complete database schema for Supabase
- **`migrations/`** - Sequential migration files

## Schema Overview

### Knowledge Base Tables

#### `knowledge_base`
Stores NSW strata knowledge entries with vector embeddings.

```sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  title VARCHAR(500) NOT NULL,
  embedding VECTOR(1536),  -- OpenAI text-embedding-3-small
  metadata JSONB NOT NULL,
  search_keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HNSW index for vector similarity search
CREATE INDEX ON knowledge_base USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN index for metadata filtering
CREATE INDEX ON knowledge_base USING gin (metadata);

-- GIN index for keyword search
CREATE INDEX ON knowledge_base USING gin (search_keywords);

-- B-tree indexes for common filters
CREATE INDEX ON knowledge_base ((metadata->>'category'));
CREATE INDEX ON knowledge_base ((metadata->>'property_id'));
CREATE INDEX ON knowledge_base ((metadata->>'success_rate'));
```

**Metadata Structure:**
```json
{
  "category": "maintenance-repairs",
  "subcategory": "common-property",
  "property_id": "BLDG-001",
  "created_date": "2024-10-14",
  "last_updated": "2024-10-14",
  "success_rate": 0.95,
  "resolution_time_avg": 172800,  // seconds
  "requires_human_review": false
}
```

#### `training_examples`
Stores validated ticket-response pairs for progressive learning.

```sql
CREATE TABLE training_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  embedding VECTOR(1536),
  customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),
  resolution_time INTEGER,  -- seconds
  human_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ON training_examples (category);
CREATE INDEX ON training_examples (customer_satisfaction);
CREATE INDEX ON training_examples USING hnsw (embedding vector_cosine_ops);
```

#### `conversation_state`
Tracks multi-turn conversation context.

```sql
CREATE TABLE conversation_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id VARCHAR(100) UNIQUE NOT NULL,
  conversation_history JSONB NOT NULL DEFAULT '[]',
  current_knowledge_id UUID REFERENCES knowledge_base(id),
  confidence_level DECIMAL(3,2) CHECK (confidence_level BETWEEN 0 AND 1),
  turn_count INTEGER DEFAULT 0,
  escalation_ready BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ON conversation_state (ticket_id);
CREATE INDEX ON conversation_state (escalation_ready);
```

#### `system_metrics`
Stores system performance and learning metrics.

```sql
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  category VARCHAR(100),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ON system_metrics (metric_name, timestamp DESC);
CREATE INDEX ON system_metrics (category);
```

### Extensions Required

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable trigram matching for BM25
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Migrations

Migration files are named sequentially:

```
migrations/
├── 001_initial_schema.sql
├── 002_add_training_examples.sql
├── 003_add_conversation_state.sql
├── 004_add_system_metrics.sql
└── 005_add_indexes.sql
```

### Running Migrations

```bash
# Connect to Supabase
psql "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# Run migrations in order
\i migrations/001_initial_schema.sql
\i migrations/002_add_training_examples.sql
# ... etc
```

### Creating New Migrations

```bash
# Create new migration file
cat > migrations/006_description.sql << 'EOF'
-- Migration: Brief description
-- Date: 2024-10-14
-- Author: Your Name

BEGIN;

-- Your SQL statements here

COMMIT;
EOF
```

## Database Configuration

### Supabase Setup

1. Create Supabase project (Pro Plan required for pgvector)
2. Enable extensions in SQL editor
3. Run schema.sql
4. Configure connection pooling (pgBouncer)
5. Set up automated backups

### Performance Settings

```sql
-- Increase work memory for vector operations
ALTER SYSTEM SET work_mem = '256MB';

-- Optimize for vector searches
ALTER SYSTEM SET maintenance_work_mem = '512MB';

-- Enable parallel queries
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- Reload configuration
SELECT pg_reload_conf();
```

### Connection Pooling

Configure pgBouncer in Supabase dashboard:
- **Pool mode:** Transaction
- **Pool size:** 15 connections
- **Default pool size:** 20

## Backup and Recovery

### Automated Backups

Supabase Pro includes:
- Daily automated backups
- 30-day retention
- Point-in-time recovery (PITR)

### Manual Backup

```bash
# Export schema
pg_dump -s "postgresql://..." > schema_backup_$(date +%Y%m%d).sql

# Export data
pg_dump "postgresql://..." > full_backup_$(date +%Y%m%d).sql

# Export specific tables
pg_dump -t knowledge_base -t training_examples "postgresql://..." > kb_backup.sql
```

### Recovery

```bash
# Restore schema
psql "postgresql://..." < schema_backup.sql

# Restore data
psql "postgresql://..." < full_backup.sql
```

## Query Examples

### Vector Similarity Search

```sql
-- Find similar knowledge entries
SELECT
  id,
  title,
  embedding <-> $1::vector AS distance,
  metadata->>'category' AS category
FROM knowledge_base
WHERE metadata->>'category' = 'maintenance-repairs'
  AND (metadata->>'success_rate')::float > 0.8
ORDER BY embedding <-> $1::vector
LIMIT 10;
```

### Hybrid Search (Vector + Keyword)

```sql
-- Vector search
WITH vector_results AS (
  SELECT id, embedding <-> $1::vector AS distance
  FROM knowledge_base
  WHERE metadata->>'category' = $2
  ORDER BY distance LIMIT 10
),
-- Keyword search
keyword_results AS (
  SELECT id, similarity(content, $3) AS score
  FROM knowledge_base
  WHERE metadata->>'category' = $2
    AND content % $3  -- trigram similarity
  ORDER BY score DESC LIMIT 10
)
-- Reciprocal Rank Fusion
SELECT
  k.id,
  k.title,
  k.content,
  COALESCE(1/(60 + v.rank), 0) + COALESCE(1/(60 + kw.rank), 0) AS combined_score
FROM knowledge_base k
LEFT JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY distance) AS rank
  FROM vector_results
) v ON k.id = v.id
LEFT JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) AS rank
  FROM keyword_results
) kw ON k.id = kw.id
WHERE v.id IS NOT NULL OR kw.id IS NOT NULL
ORDER BY combined_score DESC
LIMIT 5;
```

### Training Example Retrieval

```sql
-- Get few-shot examples for category
SELECT
  ticket_text,
  response_text,
  customer_satisfaction
FROM training_examples
WHERE category = $1
  AND customer_satisfaction >= 4
ORDER BY embedding <-> $2::vector
LIMIT 5;
```

### Success Rate Calculation

```sql
-- Update knowledge base success rates
UPDATE knowledge_base kb
SET metadata = jsonb_set(
  metadata,
  '{success_rate}',
  to_jsonb((
    SELECT COUNT(*) FILTER (WHERE satisfied = true)::float / COUNT(*)
    FROM ticket_resolutions tr
    WHERE tr.kb_id = kb.id
  ))
)
WHERE id IN (
  SELECT DISTINCT kb_id FROM ticket_resolutions
);
```

## Monitoring Queries

### Database Size

```sql
SELECT
  pg_size_pretty(pg_database_size(current_database())) AS db_size,
  pg_size_pretty(pg_total_relation_size('knowledge_base')) AS kb_table_size,
  pg_size_pretty(pg_total_relation_size('training_examples')) AS training_table_size;
```

### Index Usage

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Query Performance

```sql
-- Enable query timing
\timing on

-- Analyze query plan
EXPLAIN ANALYZE
SELECT ...;
```

## Troubleshooting

### Slow Vector Searches

```sql
-- Check if HNSW index is being used
EXPLAIN SELECT * FROM knowledge_base
ORDER BY embedding <-> '[...]'::vector LIMIT 10;

-- Rebuild index if needed
REINDEX INDEX CONCURRENTLY knowledge_base_embedding_idx;
```

### Out of Memory

```sql
-- Check current work_mem
SHOW work_mem;

-- Increase temporarily for large operations
SET work_mem = '512MB';
```

### Connection Limits

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Check connection limit
SHOW max_connections;
```

## Best Practices

1. **Always use prepared statements** - Prevents SQL injection
2. **Use connection pooling** - Limits database connections
3. **Index frequently filtered columns** - Improves query performance
4. **Monitor query performance** - Use EXPLAIN ANALYZE
5. **Regular VACUUM** - Keep statistics up-to-date
6. **Backup before migrations** - Always have a restore point
7. **Test migrations locally** - Never run untested SQL in production
8. **Use transactions** - Ensure atomicity of operations

## Related Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Configuration](../config/redis-config.md)
