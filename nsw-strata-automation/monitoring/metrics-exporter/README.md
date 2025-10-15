# NSW Strata Automation - Custom Metrics Exporter

Custom Prometheus metrics exporter for business and API metrics.

**Created**: 2025-10-15
**Tasks**: 12.5 (API rate limits), 12.6-12.11 (Business metrics)

---

## Overview

This service queries the Supabase database and exposes custom metrics in Prometheus format for:
- **API rate limit consumption** (Task 12.5)
- **Tickets processed** (hourly/daily) (Task 12.6)
- **Automation rate by category** (Task 12.7)
- **Similarity scores** (Task 12.8)
- **CSAT scores** (Task 12.9)
- **Resolution time** (Task 12.10)
- **API costs** (Task 12.11)

---

## Configuration

### Environment Variables

```bash
# Supabase connection
SUPABASE_HOST=your-project.supabase.co
SUPABASE_PORT=5432
SUPABASE_DB=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=your-password

# Metrics exporter
METRICS_PORT=8080
COLLECTION_INTERVAL=60  # seconds
```

### Docker Compose Integration

Already configured in `docker-compose.yml`:

```yaml
metrics-exporter:
  build: ./monitoring/metrics-exporter
  container_name: n8n-metrics-exporter
  restart: unless-stopped
  ports:
    - '8080:8080'
  environment:
    - SUPABASE_HOST=${SUPABASE_HOST}
    - SUPABASE_PORT=5432
    - SUPABASE_DB=postgres
    - SUPABASE_USER=${SUPABASE_USER}
    - SUPABASE_PASSWORD=${SUPABASE_PASSWORD}
    - COLLECTION_INTERVAL=60
  networks:
    - n8n-network
```

---

## Exposed Metrics

### API Rate Limits (Task 12.5)

```prometheus
# Remaining API requests
api_rate_limit_remaining{provider="openai", limit_type="requests"} 4500

# Rate limit consumed percentage
api_rate_limit_consumed_percent{provider="claude", limit_type="requests"} 25.5

# API response time
api_response_time_seconds_bucket{provider="openai", model="text-embedding-3-small", le="0.5"} 150
```

### Tickets Processed (Task 12.6)

```prometheus
# Hourly ticket count
tickets_processed_hourly{category="maintenance-repairs"} 45

# Daily ticket count
tickets_processed_daily{category="by-law-compliance"} 312
```

### Automation Rate (Task 12.7)

```prometheus
# Automation rate (0-1)
automation_rate{category="maintenance-repairs", subcategory="common-property"} 0.38
```

### Similarity Scores (Task 12.8)

```prometheus
# Average similarity score
similarity_score_avg{category="financial-matters"} 0.82
```

### CSAT Scores (Task 12.9)

```prometheus
# Customer satisfaction (1-5)
csat_score{category="maintenance-repairs", automation_level="auto-respond"} 4.2
```

### Resolution Time (Task 12.10)

```prometheus
# Average resolution time (seconds)
resolution_time_avg_seconds{category="governance", automation_level="draft"} 7200
```

### API Costs (Task 12.11)

```prometheus
# Cost per ticket (USD)
api_cost_per_ticket_usd{category="disputes", automation_level="deep-research"} 1.85
```

---

## Running Locally

### Build and Run

```bash
cd monitoring/metrics-exporter

# Build Docker image
docker build -t n8n-metrics-exporter .

# Run container
docker run -d \
  --name metrics-exporter \
  -p 8080:8080 \
  -e SUPABASE_HOST=your-project.supabase.co \
  -e SUPABASE_USER=postgres \
  -e SUPABASE_PASSWORD=your-password \
  n8n-metrics-exporter
```

### Test Metrics Endpoint

```bash
curl http://localhost:8080/metrics
```

Expected output (Prometheus format):

```
# HELP api_rate_limit_remaining Remaining API rate limit by provider
# TYPE api_rate_limit_remaining gauge
api_rate_limit_remaining{provider="openai",limit_type="requests"} 4500.0

# HELP tickets_processed_hourly Tickets processed in the last hour
# TYPE tickets_processed_hourly gauge
tickets_processed_hourly{category="maintenance-repairs"} 45.0
...
```

---

## Troubleshooting

### Connection Errors

**Problem**: Cannot connect to Supabase

**Solution**:
1. Verify environment variables:
   ```bash
   docker logs n8n-metrics-exporter
   ```

2. Test database connection:
   ```bash
   docker exec -it n8n-metrics-exporter python -c \
     "import psycopg2; conn = psycopg2.connect(host='...', user='...', password='...'); print('OK')"
   ```

### No Metrics Available

**Problem**: Metrics endpoint returns empty or zero values

**Solution**:
1. Verify system_metrics table has data:
   ```sql
   SELECT COUNT(*), metric_name
   FROM system_metrics
   WHERE timestamp > NOW() - INTERVAL '1 hour'
   GROUP BY metric_name;
   ```

2. Check exporter logs:
   ```bash
   docker logs -f n8n-metrics-exporter
   ```

### High Collection Time

**Problem**: Metrics collection taking too long

**Solution**:
1. Increase COLLECTION_INTERVAL to reduce frequency
2. Add database indexes on timestamp columns
3. Optimize queries with EXPLAIN ANALYZE

---

## Development

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export SUPABASE_HOST=localhost
export SUPABASE_USER=postgres
export SUPABASE_PASSWORD=password

# Run exporter
python exporter.py
```

### Adding New Metrics

1. Define Prometheus metric in `exporter.py`:
```python
my_custom_metric = Gauge(
    'my_custom_metric',
    'Description of metric',
    ['label1', 'label2']
)
```

2. Create collection function:
```python
def collect_my_metric():
    query = "SELECT ... FROM system_metrics WHERE ..."
    results = query_db(query)
    for row in results:
        my_custom_metric.labels(
            label1=row['label1'],
            label2=row['label2']
        ).set(row['value'])
```

3. Add to `collect_all_metrics()`:
```python
def collect_all_metrics():
    collect_my_metric()
    # ... other collections
```

---

## Maintenance

### Updating Dependencies

```bash
pip install --upgrade prometheus-client psycopg2-binary
pip freeze > requirements.txt
```

### Rebuild Image

```bash
docker-compose build metrics-exporter
docker-compose up -d metrics-exporter
```

---

**Status**: ✅ Task 12.5 Complete (API rate limit tracking)
**Next**: Tasks 12.6-12.11 use the same exporter
