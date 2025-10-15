# NSW Strata Automation - Monitoring Stack

Complete monitoring and observability setup for the NSW Strata automation system using Prometheus, Grafana, and specialized exporters.

**Created**: 2025-10-15
**Task**: 12.1 - Configure Prometheus metrics collection for n8n workflows

---

## Overview

This monitoring stack provides comprehensive observability for:
- **n8n Workflows**: Execution duration, success/failure rates, node performance
- **Redis Queue**: Queue depth, processing rate, worker utilization
- **PostgreSQL Database**: Connection pool, query performance, table sizes
- **Business Metrics**: Tickets processed, automation rates, API costs
- **System Health**: Resource utilization, error rates, SLA compliance

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   n8n       │────▶│  Prometheus  │────▶│   Grafana    │
│ (metrics)   │     │  (collector) │     │ (dashboards) │
└─────────────┘     └──────────────┘     └──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼─────┐    ┌──────▼─────┐
   │  Redis  │      │ PostgreSQL │    │   Custom   │
   │Exporter │      │  Exporter  │    │  Metrics   │
   └─────────┘      └────────────┘    └────────────┘
```

---

## Components

### 1. Prometheus
- **Port**: 9090
- **URL**: http://localhost:9090
- **Purpose**: Time-series metrics collection and storage
- **Retention**: 30 days
- **Scrape Interval**: 15 seconds (n8n), 10 seconds (Redis), 30 seconds (PostgreSQL)

### 2. Grafana
- **Port**: 3000
- **URL**: http://localhost:3000
- **Credentials**: admin / admin123
- **Purpose**: Metrics visualization and dashboards
- **Pre-configured**: Prometheus datasource automatically provisioned

### 3. Redis Exporter
- **Port**: 9121
- **Purpose**: Exposes Redis queue metrics for Prometheus
- **Metrics**: Queue depth, keys, memory usage, command stats

### 4. PostgreSQL Exporter
- **Port**: 9187
- **Purpose**: Exposes database metrics for Prometheus
- **Metrics**: Connections, transactions, table sizes, query performance

---

## Getting Started

### 1. Start the Monitoring Stack

```bash
# Start all services including monitoring
cd nsw-strata-automation
docker-compose up -d

# Verify all services are running
docker-compose ps

# Expected services:
# - n8n-local (port 5678)
# - n8n-prometheus (port 9090)
# - n8n-grafana (port 3000)
# - n8n-redis-exporter (port 9121)
# - n8n-postgres-exporter (port 9187)
# - n8n-postgres
# - n8n-redis
```

### 2. Access the Monitoring Interfaces

#### Prometheus UI
```
http://localhost:9090
```
- Query metrics using PromQL
- View targets status: http://localhost:9090/targets
- Check configuration: http://localhost:9090/config

#### Grafana Dashboards
```
http://localhost:3000
Username: admin
Password: admin123
```
- Pre-configured Prometheus datasource
- Import dashboards from `/monitoring/grafana/dashboards/`

#### n8n Metrics Endpoint
```
http://localhost:5678/metrics
```
- Raw metrics in Prometheus format
- Requires basic auth (admin / admin123)

---

## Available Metrics

### n8n Workflow Metrics

```promql
# Total workflow executions
n8n_workflow_executions_total

# Workflow execution duration (seconds)
n8n_workflow_execution_duration_seconds

# Workflow execution status (success, error, waiting)
n8n_workflow_execution_status

# Node execution duration
n8n_node_execution_duration_seconds

# Active executions count
n8n_executions_active

# Queue depth (pending executions)
n8n_queue_depth
```

### Redis Queue Metrics

```promql
# Redis queue depth
redis_db_keys{db="queue"}

# Redis memory usage
redis_memory_used_bytes

# Command processing rate
rate(redis_commands_processed_total[5m])

# Connected clients
redis_connected_clients
```

### PostgreSQL Database Metrics

```promql
# Active connections
pg_stat_database_numbackends

# Transaction rate
rate(pg_stat_database_xact_commit[5m])

# Database size
pg_database_size_bytes

# Table bloat
pg_stat_user_tables_n_dead_tup
```

---

## Example Queries

### Workflow Performance

```promql
# Average workflow execution time (last 5 minutes)
rate(n8n_workflow_execution_duration_seconds_sum[5m])
  / rate(n8n_workflow_execution_duration_seconds_count[5m])

# Workflow success rate
rate(n8n_workflow_executions_total{status="success"}[5m])
  / rate(n8n_workflow_executions_total[5m]) * 100

# 95th percentile execution duration
histogram_quantile(0.95,
  rate(n8n_workflow_execution_duration_seconds_bucket[5m])
)
```

### Queue Monitoring

```promql
# Current queue depth
n8n_queue_depth

# Queue processing rate (executions/second)
rate(n8n_workflow_executions_total[1m])

# Redis queue length
redis_db_keys{db="0"} - redis_db_keys{db="0"} offset 1m
```

### Error Rate

```promql
# Error rate (%)
rate(n8n_workflow_executions_total{status="error"}[5m])
  / rate(n8n_workflow_executions_total[5m]) * 100

# Alert when error rate > 5%
(
  rate(n8n_workflow_executions_total{status="error"}[5m])
  / rate(n8n_workflow_executions_total[5m])
) > 0.05
```

---

## Grafana Dashboards

### Pre-built Dashboards (Tasks 12.2-12.11)

1. **n8n Workflow Overview** (Task 12.2)
   - Execution duration (p50, p95, p99)
   - Success/error rates
   - Active executions
   - Top slowest workflows

2. **Queue & Worker Monitoring** (Task 12.3, 12.4)
   - Redis queue depth over time
   - Worker utilization
   - Queue processing rate
   - Backlog age

3. **Business Metrics Dashboard** (Task 12.6-12.11)
   - Tickets processed (hourly, daily, monthly)
   - Automation rate by category
   - Average similarity scores
   - CSAT scores
   - Resolution time by category
   - API costs per ticket

4. **SLA Compliance Dashboard** (Task 12.12)
   - SLA breach count
   - Time to first response
   - Time to resolution
   - Critical ticket handling time

5. **Error Analysis Dashboard** (Task 12.13)
   - Error rate over time
   - Errors by workflow
   - Errors by node type
   - Error patterns and trends

---

## Alert Rules

Alert rules are defined in `/monitoring/rules/` and will be created in Tasks 12.12-12.14.

### Planned Alerts

1. **SLA Breach Alert** (Task 12.12)
   - Triggers when critical tickets exceed 15 minutes without response
   - Severity: Critical

2. **High Error Rate Alert** (Task 12.13)
   - Triggers when error rate exceeds 5%
   - Severity: Warning

3. **Queue Depth Alert** (Task 12.14)
   - Triggers when pending queue depth > 100
   - Severity: Warning

---

## Configuration Files

### Prometheus Configuration
- **File**: `monitoring/prometheus-config.yml`
- **Purpose**: Defines scrape targets, intervals, and alert rules
- **Reload**: `curl -X POST http://localhost:9090/-/reload`

### Alert Rules
- **Directory**: `monitoring/rules/`
- **Files**:
  - `n8n-alerts.yml` (workflow and system alerts)
  - `redis-alerts.yml` (queue alerts)
  - `business-metrics-alerts.yml` (SLA and business metrics)

### Grafana Provisioning
- **Datasources**: `monitoring/grafana/datasources/prometheus.yml`
- **Dashboards**: `monitoring/grafana/dashboards/`

---

## Troubleshooting

### Prometheus Not Scraping n8n

**Problem**: n8n target shows as "DOWN" in Prometheus targets page

**Solution**:
1. Verify n8n metrics are enabled:
   ```bash
   docker-compose logs n8n | grep METRICS
   ```
   Should show: `N8N_METRICS=true`

2. Check n8n metrics endpoint:
   ```bash
   curl -u admin:admin123 http://localhost:5678/metrics
   ```
   Should return Prometheus-formatted metrics

3. Verify network connectivity:
   ```bash
   docker-compose exec prometheus ping n8n
   ```

### Grafana Not Showing Data

**Problem**: Grafana dashboards show "No data"

**Solution**:
1. Verify Prometheus datasource:
   - Go to Configuration → Data Sources
   - Click "Prometheus"
   - Click "Test" (should show "Data source is working")

2. Check Prometheus has data:
   - Go to http://localhost:9090
   - Run query: `n8n_workflow_executions_total`
   - Should return time series data

3. Verify time range:
   - Check dashboard time picker (top right)
   - Ensure range covers period with executions

### High Memory Usage

**Problem**: Prometheus consuming excessive memory

**Solution**:
1. Reduce retention time in `docker-compose.yml`:
   ```yaml
   - '--storage.tsdb.retention.time=15d'  # Instead of 30d
   ```

2. Increase scrape interval in `prometheus-config.yml`:
   ```yaml
   scrape_interval: 30s  # Instead of 15s
   ```

3. Limit time series cardinality:
   - Review label values (avoid high-cardinality labels like IDs)

---

## Production Deployment

### n8n Cloud Integration

For n8n Cloud deployments, update `prometheus-config.yml`:

```yaml
scrape_configs:
  - job_name: 'n8n-cloud'
    scrape_interval: 30s
    metrics_path: '/metrics'
    scheme: 'https'
    basic_auth:
      username: 'prometheus'
      password: 'your-secure-password'
    static_configs:
      - targets:
          - 'your-instance.n8n.cloud:443'
```

### Remote Storage

For long-term metrics storage, configure remote write to Grafana Cloud or Thanos:

```yaml
remote_write:
  - url: 'https://prometheus-prod-01.grafana.net/api/prom/push'
    basic_auth:
      username: 'your-grafana-cloud-id'
      password: 'your-grafana-cloud-api-key'
```

### High Availability

For production, run multiple Prometheus instances with federation:

```yaml
scrape_configs:
  - job_name: 'federate'
    scrape_interval: 15s
    honor_labels: true
    metrics_path: '/federate'
    params:
      'match[]':
        - '{job="n8n-main"}'
        - '{job="n8n-workers"}'
    static_configs:
      - targets:
          - 'prometheus-1:9090'
          - 'prometheus-2:9090'
```

---

## Maintenance

### Backup Prometheus Data

```bash
# Stop Prometheus
docker-compose stop prometheus

# Backup data directory
docker run --rm -v nsw-strata-automation_prometheus_data:/data \
  -v $(pwd)/backups:/backup alpine \
  tar czf /backup/prometheus-$(date +%Y%m%d).tar.gz /data

# Restart Prometheus
docker-compose start prometheus
```

### Cleanup Old Metrics

```bash
# Prometheus automatically handles retention based on configuration
# To manually compact data:
docker-compose exec prometheus promtool tsdb compact /prometheus
```

### Update Configuration

```bash
# After modifying prometheus-config.yml or alert rules:
docker-compose exec prometheus curl -X POST http://localhost:9090/-/reload

# Or restart Prometheus:
docker-compose restart prometheus
```

---

## Metrics Reference

### n8n Metrics Namespace

All n8n metrics are prefixed with `n8n_` (configurable via `N8N_METRICS_PREFIX`).

**Available Metrics**:
- `n8n_workflow_executions_total` - Counter of workflow executions
- `n8n_workflow_execution_duration_seconds` - Histogram of execution durations
- `n8n_node_executions_total` - Counter of node executions
- `n8n_webhook_requests_total` - Counter of webhook requests
- `n8n_api_requests_total` - Counter of API requests
- `n8n_cache_hits_total` - Counter of cache hits
- `n8n_cache_misses_total` - Counter of cache misses

### Custom Business Metrics (Tasks 12.6-12.11)

Custom metrics will be exposed via a metrics-exporter service (to be implemented):
- `tickets_processed_total` - Counter of tickets processed
- `tickets_processed_hourly` - Gauge of tickets/hour
- `automation_rate_by_category` - Gauge (0-1) per category
- `similarity_score_avg` - Gauge of average similarity scores
- `csat_score` - Gauge from Freshdesk surveys
- `resolution_time_seconds` - Histogram by category
- `api_cost_per_ticket_usd` - Gauge of API costs

---

## Support

For issues or questions:
1. Check Prometheus logs: `docker-compose logs prometheus`
2. Check Grafana logs: `docker-compose logs grafana`
3. Review n8n metrics: http://localhost:5678/metrics
4. Consult n8n metrics documentation: https://docs.n8n.io/hosting/configuration/metrics/

---

**Status**: ✅ Task 12.1 Complete
**Next Tasks**: 12.2-12.15 (Dashboard and alert creation)
