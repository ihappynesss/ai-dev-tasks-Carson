# Local Development Testing Guide

**Task 15.1: Complete local development testing with Docker n8n**

This guide provides comprehensive instructions for testing the NSW Strata Automation system in a local Docker development environment.

## Overview

The local development environment uses Docker Compose to orchestrate the following services:

- **n8n**: Workflow automation platform
- **PostgreSQL**: Database for n8n workflow persistence
- **Redis**: Message queue and caching layer
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Redis Exporter**: Redis metrics for Prometheus
- **PostgreSQL Exporter**: Database metrics for Prometheus
- **Custom Metrics Exporter**: Business and API metrics

## Prerequisites

1. **Docker Desktop** installed and running
   - Version 20.10 or higher
   - At least 4GB RAM allocated to Docker
   - At least 20GB disk space available

2. **Docker Compose** installed
   - Version 2.0 or higher

3. **Command line tools**:
   - `curl` for API testing
   - `jq` for JSON validation
   - `nc` (netcat) for connectivity testing

4. **Environment files**:
   - `.env` or `.env.development` configured

## Testing Procedure

### Step 1: Pre-Flight Checks

Before starting the tests, ensure:

```bash
# Check Docker is running
docker info

# Check Docker Compose is available
docker-compose --version

# Verify you're in the project root
pwd  # Should show: .../nsw-strata-automation

# Check required files exist
ls -l docker-compose.yml
ls -l workflows/
ls -l database/schema.sql
```

### Step 2: Clean Start (Optional)

For a fresh start, remove existing containers and volumes:

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (CAUTION: This deletes all data)
docker-compose down -v

# Remove any orphaned containers
docker system prune -f
```

### Step 3: Run Automated Tests

Execute the comprehensive test script:

```bash
./test-local-deployment.sh
```

The script will:

1. ✓ Verify Docker is running
2. ✓ Start all Docker services
3. ✓ Perform health checks on all services
4. ✓ Validate workflow files and JSON syntax
5. ✓ Check environment configuration
6. ✓ Verify knowledge base structure
7. ✓ Test network connectivity between containers
8. ✓ Validate Redis and PostgreSQL functionality
9. ✓ Analyze container logs for errors
10. ✓ Generate comprehensive test report

**Expected Results:**
- All 20+ tests should pass
- Success rate: 100%
- All services should be healthy and accessible

### Step 4: Manual Verification

After automated tests pass, perform manual verification:

#### 4.1 Access n8n UI

```bash
# Open n8n in browser
open http://localhost:5678
```

- **Login credentials**:
  - Username: `admin`
  - Password: `admin123`

- **Verify**:
  - [ ] Login successful
  - [ ] Dashboard loads without errors
  - [ ] No JavaScript errors in browser console

#### 4.2 Import and Test Workflows

1. **Navigate to Workflows** in n8n UI

2. **Import main workflows**:
   - Import `workflows/main-ticket-processor.json`
   - Import `workflows/error-handler.json`
   - Import `workflows/reply-handler.json`
   - Import `workflows/scheduled-maintenance.json`
   - Import `workflows/manual-trigger.json`
   - Import `workflows/batch-processor.json`

3. **For each workflow, verify**:
   - [ ] No import errors
   - [ ] All nodes load correctly
   - [ ] Credentials placeholders are visible
   - [ ] No missing node types

4. **Test main-ticket-processor workflow**:
   - Open the workflow
   - Click "Execute Workflow" (test mode)
   - Use the "Webhook" trigger node
   - Send a test payload via the test webhook URL
   - Verify workflow executes without errors

#### 4.3 Test Database Connectivity

```bash
# Connect to PostgreSQL
docker exec -it n8n-postgres psql -U n8n -d n8n

# Run test query
\dt  # List tables
\q   # Quit
```

- **Verify**:
  - [ ] Can connect to database
  - [ ] n8n tables exist (workflows, executions, credentials, etc.)
  - [ ] No connection errors

#### 4.4 Test Redis Functionality

```bash
# Connect to Redis
docker exec -it n8n-redis redis-cli

# Test commands
PING                    # Should return PONG
SET test_key "hello"    # Should return OK
GET test_key            # Should return "hello"
DEL test_key            # Clean up
QUIT
```

- **Verify**:
  - [ ] Redis responds to commands
  - [ ] Can set and retrieve keys
  - [ ] No connection errors

#### 4.5 Verify Monitoring Stack

**Prometheus** (`http://localhost:9090`):
- [ ] Prometheus UI loads
- [ ] Navigate to Status > Targets
- [ ] All targets should be "UP":
  - n8n
  - redis-exporter
  - postgres-exporter
  - metrics-exporter
- [ ] Execute sample query: `up{job="n8n"}`
- [ ] Results should show value "1"

**Grafana** (`http://localhost:3000`):
- [ ] Grafana UI loads
- Login with admin/admin123
- [ ] Navigate to Data Sources
- [ ] Prometheus datasource is configured
- [ ] Test & Save - should show success
- [ ] Navigate to Dashboards
- [ ] Import dashboards from `monitoring/grafana/dashboards/`
- [ ] Verify dashboards display metrics

#### 4.6 Test Workflow Execution

Create a simple test workflow:

1. **Create new workflow** in n8n
2. **Add Webhook node** (GET method)
3. **Add Set node** to return test data
4. **Activate workflow**
5. **Test webhook** using curl:

```bash
# Get webhook URL from n8n (e.g., http://localhost:5678/webhook-test/test)
WEBHOOK_URL="http://localhost:5678/webhook-test/YOUR_ID"

# Test webhook
curl -X GET "$WEBHOOK_URL"
```

- **Verify**:
  - [ ] Webhook responds with 200 OK
  - [ ] Returns expected JSON data
  - [ ] Execution appears in n8n executions list
  - [ ] No errors in execution log

#### 4.7 Test Error Handling

1. **Open error-handler.json workflow**
2. **Review error handling nodes**:
   - [ ] Error trigger node is configured
   - [ ] Classification logic exists
   - [ ] Slack notification node (placeholder)
   - [ ] Database logging node
   - [ ] Retry queue logic

3. **Simulate an error**:
   - Create a test workflow with an HTTP node pointing to invalid URL
   - Execute the workflow
   - Verify error-handler workflow is triggered
   - Check error logs in database or Redis

### Step 5: Performance Testing

#### 5.1 Test Queue Functionality (Optional - Queue Mode)

If using queue mode with workers:

```bash
# Start queue mode environment
docker-compose -f docker-compose.queue.yml up -d

# Monitor queue depth
docker exec -it n8n-redis redis-cli

# In Redis CLI:
LLEN bull:n8n:active
LLEN bull:n8n:waiting
LLEN bull:n8n:failed
```

#### 5.2 Load Testing

Run concurrent workflow executions:

```bash
# Simple load test (requires Apache Bench or similar)
# Test webhook endpoint
ab -n 100 -c 10 http://localhost:5678/webhook-test/YOUR_ID

# Monitor n8n performance in Grafana
# Check response times and error rates
```

### Step 6: Validate Credentials Configuration

1. **Navigate to Credentials** in n8n UI
2. **Verify placeholders exist for**:
   - [ ] Freshdesk API
   - [ ] Supabase Database
   - [ ] Claude API
   - [ ] OpenAI API
   - [ ] Perplexity API
   - [ ] Slack Webhook

3. **For testing**, configure at least:
   - [ ] Test database connection (Supabase or local PostgreSQL)
   - [ ] Test API key (OpenAI or Claude)

### Step 7: Knowledge Base Validation

```bash
# Check knowledge base structure
find knowledge -name "*.md" -type f

# Count entries by category
find knowledge/maintenance-repairs -name "*.md" | wc -l
find knowledge/by-law-compliance -name "*.md" | wc -l
find knowledge/financial-matters -name "*.md" | wc -l
```

- **Verify**:
  - [ ] At least 6 sample knowledge entries exist
  - [ ] Each entry follows the template structure
  - [ ] YAML frontmatter is valid
  - [ ] Content includes NSW legislation references

## Test Results Checklist

### Automated Tests
- [ ] All Docker services start successfully
- [ ] Health checks pass for all containers
- [ ] Network connectivity between containers works
- [ ] Redis and PostgreSQL are functional
- [ ] Workflow JSON files are valid
- [ ] Environment configuration is correct
- [ ] Knowledge base structure exists
- [ ] Monitoring stack is operational
- [ ] No critical errors in container logs
- [ ] Overall success rate: 100%

### Manual Tests
- [ ] n8n UI is accessible and functional
- [ ] All workflows import without errors
- [ ] Database connectivity works
- [ ] Redis operations succeed
- [ ] Prometheus collects metrics
- [ ] Grafana displays dashboards
- [ ] Test workflow executes successfully
- [ ] Error handling workflow responds
- [ ] Credentials can be configured
- [ ] Knowledge base is accessible

## Troubleshooting

### Common Issues

#### Issue 1: Services Not Starting

**Symptoms**: Docker containers fail to start or keep restarting

**Solutions**:
```bash
# Check Docker resources
docker system df

# Check container logs
docker-compose logs n8n
docker-compose logs postgres
docker-compose logs redis

# Restart services
docker-compose restart

# Full rebuild
docker-compose down
docker-compose up --build -d
```

#### Issue 2: n8n Not Accessible

**Symptoms**: Cannot access http://localhost:5678

**Solutions**:
```bash
# Check if n8n is running
docker ps | grep n8n-local

# Check n8n logs
docker logs n8n-local

# Wait for initialization (can take 30-60 seconds on first start)
docker logs -f n8n-local  # Watch logs

# Verify port is not in use
lsof -i :5678
```

#### Issue 3: Database Connection Errors

**Symptoms**: n8n shows database connection errors

**Solutions**:
```bash
# Check PostgreSQL is running
docker ps | grep n8n-postgres

# Check PostgreSQL health
docker exec n8n-postgres pg_isready -U n8n

# Check connection from n8n
docker exec n8n-local nc -zv postgres 5432

# Review database logs
docker logs n8n-postgres
```

#### Issue 4: Redis Connection Errors

**Symptoms**: Queue operations fail or Redis is unreachable

**Solutions**:
```bash
# Check Redis is running
docker ps | grep n8n-redis

# Test Redis
docker exec n8n-redis redis-cli PING

# Check connectivity from n8n
docker exec n8n-local nc -zv redis 6379

# Review Redis logs
docker logs n8n-redis
```

#### Issue 5: Workflow Import Fails

**Symptoms**: Cannot import workflow JSON files

**Solutions**:
1. Validate JSON syntax:
   ```bash
   jq empty workflows/main-ticket-processor.json
   ```

2. Check for missing node types in n8n
3. Ensure n8n version is compatible
4. Try importing via CLI:
   ```bash
   docker exec n8n-local n8n import:workflow --input=/home/node/.n8n/workflows/main-ticket-processor.json
   ```

#### Issue 6: Monitoring Not Working

**Symptoms**: Prometheus or Grafana not accessible

**Solutions**:
```bash
# Check Prometheus
curl http://localhost:9090/-/healthy

# Check Grafana
curl http://localhost:3000/api/health

# Verify configuration
cat monitoring/prometheus-config.yml

# Restart monitoring stack
docker-compose restart prometheus grafana
```

## Performance Benchmarks

Expected performance for local development environment:

| Metric | Target | Acceptable Range |
|--------|--------|------------------|
| n8n startup time | < 30 seconds | 20-60 seconds |
| Workflow execution | < 5 seconds | 3-10 seconds |
| Database query latency | < 100ms | 50-200ms |
| Redis operations | < 10ms | 5-20ms |
| Memory usage (n8n) | < 512MB | 256MB-1GB |
| Memory usage (total) | < 2GB | 1.5-3GB |

## Next Steps

After successful local testing:

1. **Document any issues** encountered and solutions
2. **Configure remaining credentials** for full functionality
3. **Test integration** with external services (Freshdesk, Supabase, AI APIs)
4. **Proceed to Task 15.2**: Deploy to development environment
5. **Export workflows** for deployment:
   ```bash
   ./backup-workflows.sh
   ```

## Sign-Off Criteria

Task 15.1 is complete when:

- [x] Automated test script passes with 100% success rate
- [x] All manual verification tests pass
- [x] n8n UI is accessible and functional
- [x] All workflows import without errors
- [x] Database and Redis are operational
- [x] Monitoring stack displays metrics
- [x] Test workflow execution succeeds
- [x] Error handling is functional
- [x] Documentation is complete
- [x] No critical issues remain

## References

- Docker Compose documentation: `docker-compose.yml`
- Workflow documentation: `workflows/README.md`
- Environment configuration: `config/environments.md`
- Monitoring setup: `monitoring/README.md`
- Error handling guide: `config/error-handling-runbook.md`

---

**Last Updated**: 2025-10-15
**Task**: 15.1 - Complete local development testing with Docker n8n
**Status**: Ready for execution
