# Supabase Setup Guide

Complete guide for setting up Supabase database for NSW Strata Automation system.

## Prerequisites

- Supabase account (create at https://supabase.com)
- Pro Plan subscription ($25/month) - Required for pgvector extension
- Database connection credentials
- SQL editor access

## Step-by-Step Setup

### 1. Create Supabase Project

1. **Login to Supabase Dashboard**
   - Navigate to https://app.supabase.com
   - Sign in with your account

2. **Create New Project**
   - Click "New Project"
   - **Name:** `nsw-strata-automation`
   - **Database Password:** Generate a strong password (save this securely!)
   - **Region:** Choose closest to Sydney (e.g., `ap-southeast-2`)
   - **Pricing Plan:** Select **Pro Plan** ($25/month)
     - Pro Plan is required for pgvector extension
     - Includes: 8GB database, 100GB bandwidth, 250GB storage, automated backups
   - Click "Create new project"
   - Wait 2-3 minutes for provisioning

3. **Save Connection Details**
   After project creation, save these from Settings > Database:
   - **Host:** `db.xxx.supabase.co`
   - **Database name:** `postgres`
   - **Port:** `5432`
   - **User:** `postgres`
   - **Password:** (your generated password)
   - **Connection string:** `postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres`

### 2. Enable Required Extensions

1. **Navigate to SQL Editor**
   - In Supabase dashboard, go to "SQL Editor"
   - Click "New Query"

2. **Enable Extensions**
   Run this SQL to enable required extensions:

   ```sql
   -- Enable UUID generation
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

   -- Enable vector operations (requires Pro Plan)
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Enable trigram matching for keyword search
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```

3. **Verify Extensions**
   Run this query to confirm extensions are active:

   ```sql
   SELECT extname, extversion
   FROM pg_extension
   WHERE extname IN ('uuid-ossp', 'vector', 'pg_trgm');
   ```

   Expected output:
   ```
   extname    | extversion
   -----------|-----------
   uuid-ossp  | 1.1
   vector     | 0.5.1
   pg_trgm    | 1.6
   ```

### 3. Run Database Schema

1. **Open schema.sql**
   - Open `database/schema.sql` from this repository

2. **Execute Schema**
   - Copy entire contents of `schema.sql`
   - Paste into SQL Editor in Supabase
   - Click "Run" or press `Ctrl+Enter`

3. **Verify Tables Created**
   Run verification query:

   ```sql
   SELECT table_name, table_type
   FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('knowledge_base', 'training_examples',
                        'conversation_state', 'system_metrics');
   ```

   Expected: 4 tables shown

4. **Verify Indexes Created**
   ```sql
   SELECT tablename, indexname
   FROM pg_indexes
   WHERE schemaname = 'public'
   ORDER BY tablename, indexname;
   ```

   Expected: Multiple indexes for each table including HNSW vector indexes

### 4. Configure Database Settings

1. **Set Performance Parameters**
   In SQL Editor, run:

   ```sql
   -- Increase work memory for vector operations
   ALTER SYSTEM SET work_mem = '256MB';

   -- Increase maintenance work memory
   ALTER SYSTEM SET maintenance_work_mem = '512MB';

   -- Enable parallel queries
   ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

   -- Reload configuration
   SELECT pg_reload_conf();
   ```

2. **Configure Connection Pooling**
   - Go to Settings > Database > Connection Pooling
   - **Enable Connection Pooling:** Yes
   - **Pool Mode:** Transaction
   - **Pool Size:** 15
   - **Default Pool Size:** 20
   - Save changes

3. **Enable Point-in-Time Recovery (PITR)**
   - Go to Settings > Database > Backups
   - **Enable PITR:** Yes
   - **Retention:** 7 days (or longer if needed)
   - This allows database restoration to any point in time

### 5. Set Up Authentication and Security

1. **Create Service Role Key**
   - Go to Settings > API
   - Copy the `service_role` key (secret!)
   - Save in password manager - this will be used in n8n workflows
   - **Never expose this in client-side code**

2. **Configure Row Level Security (RLS)**
   The schema already includes RLS policies for service_role access.
   Verify with:

   ```sql
   SELECT tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

3. **Set Up API Access**
   - Your API URL: `https://xxx.supabase.co`
   - Your anon key: (from Settings > API)
   - Your service_role key: (from Settings > API)

### 6. Create Supabase Credentials in n8n

1. **Open n8n**
   - Navigate to http://localhost:5678 (or your n8n instance)

2. **Create Supabase Credential**
   - Go to Settings > Credentials
   - Click "Add Credential"
   - Search for "Supabase"
   - Fill in:
     - **Name:** `supabase-nsw-strata`
     - **Host:** `db.xxx.supabase.co`
     - **Database:** `postgres`
     - **User:** `postgres`
     - **Password:** (your database password)
     - **Port:** `5432`
     - **SSL:** Enabled
   - Test connection and save

3. **Alternative: Use Postgres Node**
   If Supabase node is not available, use Postgres node:
   - Connection Type: PostgreSQL
   - Host: `db.xxx.supabase.co`
   - Database: `postgres`
   - User: `postgres`
   - Password: (your password)
   - Port: 5432
   - SSL: Enabled

### 7. Verify Setup

Run these verification tests:

1. **Test Vector Extension**
   ```sql
   SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector AS distance;
   ```
   Should return a distance value (e.g., 0.215)

2. **Test Knowledge Base Table**
   ```sql
   INSERT INTO knowledge_base (title, content, metadata, search_keywords)
   VALUES (
     'Test Entry',
     'This is a test knowledge entry for NSW strata regulations.',
     '{"category": "test", "success_rate": 1.0}'::jsonb,
     ARRAY['test', 'verification']
   )
   RETURNING id, title, created_at;
   ```

   Then query it:
   ```sql
   SELECT * FROM knowledge_base WHERE title = 'Test Entry';
   ```

3. **Test Training Examples**
   ```sql
   INSERT INTO training_examples (ticket_text, response_text, category, customer_satisfaction)
   VALUES (
     'Water leak in common area',
     'I will arrange for immediate inspection...',
     'maintenance-repairs',
     5
   )
   RETURNING id, category, created_at;
   ```

4. **Clean Up Test Data**
   ```sql
   DELETE FROM knowledge_base WHERE title = 'Test Entry';
   DELETE FROM training_examples WHERE category = 'maintenance-repairs';
   ```

### 8. Configure Environment Variables

Update your n8n environment configuration with Supabase details:

**In `.env.development` or `.env.production`:**

```bash
# Supabase Database Configuration
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Direct Database Connection (for advanced queries)
SUPABASE_DB_HOST=db.xxx.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_database_password

# Supabase API for REST access
SUPABASE_REST_API=https://xxx.supabase.co/rest/v1
```

### 9. Set Up Automated Backups

Supabase Pro includes automated backups, but you should also implement custom backup scripts:

**Create backup script (`backup-supabase.sh`):**

```bash
#!/bin/bash

BACKUP_DIR="./backups/database"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SUPABASE_URL="postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres"

mkdir -p "$BACKUP_DIR"

# Backup schema only
pg_dump -s "$SUPABASE_URL" > "$BACKUP_DIR/schema-$TIMESTAMP.sql"

# Backup data only
pg_dump -a "$SUPABASE_URL" > "$BACKUP_DIR/data-$TIMESTAMP.sql"

# Backup specific tables
pg_dump -t knowledge_base -t training_examples "$SUPABASE_URL" \
  > "$BACKUP_DIR/kb-training-$TIMESTAMP.sql"

echo "Backup completed: $BACKUP_DIR"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
```

**Schedule with cron:**
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-supabase.sh
```

### 10. Monitor Database Performance

1. **Enable Database Statistics**
   ```sql
   -- Check query performance
   SELECT * FROM pg_stat_statements
   ORDER BY total_exec_time DESC
   LIMIT 10;
   ```

2. **Monitor Index Usage**
   ```sql
   SELECT
     schemaname,
     tablename,
     indexname,
     idx_scan AS scans,
     idx_tup_read AS tuples_read
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;
   ```

3. **Set Up Alerts**
   - Go to Settings > Database > Usage
   - Configure alerts for:
     - Database size > 80%
     - Connection count > 80%
     - High error rates

## Troubleshooting

### Error: extension "vector" is not available

**Solution:**
- Upgrade to Supabase Pro Plan
- The vector extension requires Pro Plan or higher

### Error: permission denied to create extension

**Solution:**
- Use the SQL Editor in Supabase dashboard (not external psql)
- Dashboard has elevated permissions

### Slow Vector Searches

**Solution:**
1. Check if HNSW index exists:
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'knowledge_base'
     AND indexname LIKE '%hnsw%';
   ```

2. Rebuild index if needed:
   ```sql
   REINDEX INDEX CONCURRENTLY knowledge_base_embedding_hnsw_idx;
   ```

### Connection Pool Exhausted

**Solution:**
- Increase connection pool size in Settings > Database
- Use connection pooling in n8n (reuse connections)
- Close connections after queries complete

### Out of Memory During Queries

**Solution:**
```sql
-- Temporarily increase work_mem for current session
SET work_mem = '512MB';

-- Run your query
SELECT ...;
```

## Next Steps

After completing setup:

1. ✅ Verify all tables and indexes created
2. ✅ Test vector operations
3. ✅ Configure n8n credentials
4. ✅ Set up automated backups
5. ➡️ Initialize knowledge base with NSW strata content (Task 2.12)
6. ➡️ Create GitHub repository for knowledge versioning (Task 2.13)
7. ➡️ Set up n8n workflows for database integration (Task 3.0+)

## Maintenance Schedule

**Daily:**
- Automated backups (via Supabase Pro)
- Monitor query performance

**Weekly:**
- Review slow queries
- Check index usage statistics
- Monitor database size growth

**Monthly:**
- Review and optimize indexes
- Analyze table statistics
- Update row-level security policies if needed

**Quarterly:**
- Test disaster recovery procedures
- Review backup retention policy
- Update database schema if needed

## Resources

- **Supabase Documentation:** https://supabase.com/docs
- **pgvector Documentation:** https://github.com/pgvector/pgvector
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Supabase Dashboard:** https://app.supabase.com

## Support

For Supabase-specific issues:
- **Email:** support@supabase.com
- **Discord:** https://discord.supabase.com
- **GitHub:** https://github.com/supabase/supabase

For project-specific questions, refer to project documentation.
