# n8n Worker Scaling Configuration

Complete guide for configuring and scaling n8n workers to handle 200+ concurrent tickets with horizontal scaling.

## Overview

The NSW Strata Automation system uses n8n's queue mode with multiple worker processes to handle high-volume ticket processing. This architecture separates webhook reception (main instance) from execution (workers), enabling horizontal scaling for 200+ concurrent tickets.

## Architecture

```
┌─────────────┐
│  Freshdesk  │
│  Webhooks   │
└──────┬──────┘
       │
       v
┌──────────────────┐
│  n8n Main        │ ← Webhook Receiver (fast acknowledgment)
│  (EXECUTIONS_    │
│   PROCESS=main)  │
└────────┬─────────┘
         │
         v
    ┌────────────┐
    │   Redis    │ ← Queue Management (Bull MQ)
    │   Queue    │
    └──────┬─────┘
           │
      ┌────┴────┬────────┬────────┐
      v         v        v        v
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │Worker 1│ │Worker 2│ │Worker 3│ │Worker N│
  └────────┘ └────────┘ └────────┘ └────────┘
   (Execute)  (Execute)  (Execute)  (Execute)
```

## Worker Configuration

### Local Development (Docker Compose)

**Basic Setup (2 Workers):**
```bash
# Start with queue mode and 2 workers
docker-compose -f docker-compose.yml -f docker-compose.queue.yml up -d
```

**Dynamic Scaling:**
```bash
# Scale to 4 workers on-the-fly
docker-compose -f docker-compose.yml -f docker-compose.queue.yml up -d --scale n8n-worker-1=2 --scale n8n-worker-2=2

# Scale to 8 workers (for load testing)
docker-compose -f docker-compose.yml -f docker-compose.queue.yml up -d --scale n8n-worker-1=4 --scale n8n-worker-2=4
```

**Monitor Worker Status:**
```bash
# Check running workers
docker-compose ps | grep worker

# Monitor worker logs
docker-compose logs -f --tail=50 n8n-worker-1 n8n-worker-2

# Check worker resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Production (n8n Cloud)

**Recommended Configuration for 200+ Concurrent Tickets:**

| Ticket Volume | Workers | vCPU per Worker | Memory per Worker | Total Resources |
|--------------|---------|-----------------|-------------------|-----------------|
| 50-100       | 2       | 1 vCPU          | 1 GB             | 2 vCPU, 2 GB   |
| 100-200      | 4       | 1 vCPU          | 1.5 GB           | 4 vCPU, 6 GB   |
| 200-500      | 6-8     | 2 vCPU          | 2 GB             | 12-16 vCPU, 12-16 GB |
| 500+         | 10+     | 2 vCPU          | 2 GB             | 20+ vCPU, 20+ GB |

**Environment Variables for Production Workers:**

```bash
# Main Instance (Webhook Receiver)
EXECUTIONS_MODE=queue
EXECUTIONS_PROCESS=main
QUEUE_BULL_REDIS_HOST=${REDIS_HOST}
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_DB=0
QUEUE_BULL_REDIS_PASSWORD=${REDIS_PASSWORD}
QUEUE_BULL_REDIS_TLS=true

# Worker Instances (Execution)
EXECUTIONS_MODE=queue
EXECUTIONS_PROCESS=worker
QUEUE_BULL_REDIS_HOST=${REDIS_HOST}
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_DB=0
QUEUE_BULL_REDIS_PASSWORD=${REDIS_PASSWORD}
QUEUE_BULL_REDIS_TLS=true

# Worker Performance Settings
N8N_CONCURRENCY_WORKER=10          # Max concurrent workflows per worker
EXECUTIONS_TIMEOUT=1800             # 30 minutes
EXECUTIONS_TIMEOUT_MAX=3600         # 1 hour
```

## Queue Management

### Redis Configuration

**Connection Settings:**
```bash
# Redis Queue Database (DB 0)
REDIS_DB_QUEUE=0

# Bull Queue Settings
QUEUE_BULL_REDIS_HOST=redis-host
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_DB=0

# Health Check (recommended)
QUEUE_HEALTH_CHECK_ACTIVE=true
QUEUE_RECOVERY_INTERVAL=60
```

**Monitor Queue Depth:**
```bash
# Check queue length (number of pending jobs)
redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} LLEN bull:n8n:jobs

# Check active jobs
redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} LLEN bull:n8n:active

# Check failed jobs
redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} LLEN bull:n8n:failed

# Monitor queue in real-time
watch -n 1 'redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} LLEN bull:n8n:jobs'
```

**Queue Maintenance:**
```bash
# Clear failed jobs (after investigation)
redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} DEL bull:n8n:failed

# Clean completed jobs (automatic with TTL, but can be manual)
redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} DEL bull:n8n:completed
```

## Scaling Strategies

### Auto-Scaling (Production)

**Metrics-Based Scaling:**

1. **Queue Depth Trigger:**
   - Scale up when: `queue_depth > 50` for 2 minutes
   - Scale down when: `queue_depth < 10` for 5 minutes

2. **Worker Utilization Trigger:**
   - Scale up when: `worker_cpu > 70%` for 5 minutes
   - Scale down when: `worker_cpu < 30%` for 10 minutes

3. **Response Time Trigger:**
   - Scale up when: `p95_execution_time > 10s` for 3 minutes
   - Target: `p95_execution_time < 5s`

**Kubernetes Auto-Scaling Example:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: n8n-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: n8n-worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

### Manual Scaling

**Peak Hours (8 AM - 6 PM):**
```bash
# Scale up for business hours
kubectl scale deployment n8n-worker --replicas=8
```

**Off-Peak Hours (6 PM - 8 AM):**
```bash
# Scale down for cost optimization
kubectl scale deployment n8n-worker --replicas=2
```

## Performance Optimization

### Worker Tuning

**Optimize Worker Concurrency:**

```bash
# CPU-bound workflows (AI processing)
N8N_CONCURRENCY_WORKER=5   # Lower concurrency, higher quality

# I/O-bound workflows (API calls)
N8N_CONCURRENCY_WORKER=20  # Higher concurrency, better throughput
```

**Memory Management:**

```bash
# Node.js Memory Limits
NODE_OPTIONS="--max-old-space-size=2048"  # 2 GB per worker

# Garbage Collection Tuning
NODE_OPTIONS="--max-old-space-size=2048 --expose-gc"
```

### Load Balancing

**Redis Connection Pooling:**

```bash
# Optimize Redis connections
QUEUE_BULL_REDIS_POOL_MIN=2
QUEUE_BULL_REDIS_POOL_MAX=10
```

**Fair Distribution:**
- Workers pull jobs from shared queue (Bull MQ handles distribution)
- FIFO ordering by default
- Priority queues available for critical tickets

## Monitoring and Alerts

### Key Metrics

**Queue Metrics:**
- `queue_depth`: Pending jobs waiting for execution
- `queue_active`: Jobs currently being processed
- `queue_failed`: Failed jobs requiring investigation
- `queue_throughput`: Jobs processed per minute

**Worker Metrics:**
- `worker_count`: Number of active workers
- `worker_cpu_usage`: CPU utilization per worker
- `worker_memory_usage`: Memory usage per worker
- `worker_uptime`: Worker instance health

**Performance Metrics:**
- `execution_duration_p50`: Median execution time
- `execution_duration_p95`: 95th percentile (target: <10s)
- `execution_duration_p99`: 99th percentile (SLA breach indicator)
- `webhook_response_time`: Webhook acknowledgment time (target: <500ms)

### Alert Configuration

**Critical Alerts (Immediate Action):**
```yaml
# Queue depth exceeds capacity
alert: QueueDepthCritical
expr: queue_depth > 200
for: 2m
annotations:
  summary: "Queue depth critically high: {{ $value }} pending jobs"
  action: "Scale up workers immediately"

# Worker failure
alert: WorkerDown
expr: worker_count < 2
for: 1m
annotations:
  summary: "Only {{ $value }} workers running"
  action: "Investigate worker failures"
```

**Warning Alerts (Proactive):**
```yaml
# Queue building up
alert: QueueDepthWarning
expr: queue_depth > 100
for: 5m
annotations:
  summary: "Queue depth elevated: {{ $value }} pending jobs"
  action: "Consider scaling up workers"

# Slow execution
alert: ExecutionSlow
expr: execution_duration_p95 > 15
for: 5m
annotations:
  summary: "P95 execution time: {{ $value }}s"
  action: "Review workflow performance"
```

## Troubleshooting

### Common Issues

**1. Workers Not Processing Jobs:**

```bash
# Check worker logs
docker-compose logs n8n-worker-1

# Verify Redis connection
redis-cli -h ${REDIS_HOST} PING

# Check queue for stuck jobs
redis-cli LLEN bull:n8n:active

# Restart workers
docker-compose restart n8n-worker-1 n8n-worker-2
```

**2. Queue Growing Indefinitely:**

```bash
# Check worker utilization
docker stats

# Scale up workers
docker-compose up -d --scale n8n-worker-1=4

# Check for failing workflows
redis-cli LLEN bull:n8n:failed

# Investigate failed jobs
redis-cli LRANGE bull:n8n:failed 0 10
```

**3. High Memory Usage:**

```bash
# Reduce worker concurrency
N8N_CONCURRENCY_WORKER=5

# Increase worker memory limit
docker-compose up -d --scale n8n-worker-1=4 -m 2g

# Enable garbage collection
NODE_OPTIONS="--max-old-space-size=2048 --expose-gc"
```

## Testing Worker Scaling

### Load Testing

**Generate Test Load:**

```bash
# Install Artillery for load testing
npm install -g artillery

# Create load test configuration (artillery-config.yml)
cat > artillery-config.yml << 'EOF'
config:
  target: 'http://localhost:5678'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load (200+ concurrent)"
    - duration: 60
      arrivalRate: 5
      name: "Cool down"
scenarios:
  - name: "Webhook ticket creation"
    flow:
      - post:
          url: "/webhook/freshdesk-ticket"
          json:
            ticket_id: "{{ $randomNumber(1, 10000) }}"
            subject: "Test ticket"
            description: "Load testing ticket"
            priority: "Medium"
EOF

# Run load test
artillery run artillery-config.yml

# Monitor during test
watch -n 1 'echo "Queue: $(redis-cli LLEN bull:n8n:jobs)" && docker stats --no-stream'
```

**Verify Scaling:**

```bash
# Check worker distribution
for i in {1..10}; do
  echo "Worker $i: $(docker exec n8n-worker-$i ps aux | grep node | wc -l) processes"
done

# Check queue processing rate
redis-cli --stat | grep commands_per_sec

# Verify no queue buildup
redis-cli LLEN bull:n8n:jobs
```

## Best Practices

1. **Start Small, Scale Gradually:**
   - Begin with 2-4 workers
   - Monitor queue depth and execution times
   - Scale up incrementally based on metrics

2. **Monitor Continuously:**
   - Set up Prometheus + Grafana dashboard
   - Configure alerts for queue depth > 100
   - Track P95 execution time < 10s

3. **Plan for Peak Load:**
   - Identify peak hours (typically 9 AM - 12 PM)
   - Pre-scale workers 15 minutes before peak
   - Maintain 20% overhead capacity

4. **Optimize Workflows First:**
   - Reduce execution time before scaling
   - Use caching for repeated queries
   - Batch API calls where possible

5. **Test Regularly:**
   - Quarterly load testing
   - Verify auto-scaling triggers
   - Practice failure scenarios

## Cost Optimization

**Development Environment:**
- Use regular mode (no queue) for single developer
- Enable queue mode only for integration testing
- 2 workers sufficient for most dev work

**Staging Environment:**
- 2-4 workers for production-like testing
- Test auto-scaling policies with reduced thresholds
- Monitor costs vs. production

**Production Environment:**
- Right-size workers based on actual load
- Use auto-scaling to minimize idle capacity
- Schedule scale-down during off-peak hours
- Target 70% average worker utilization

## Next Steps

1. Configure monitoring dashboards (see `monitoring/prometheus-config.yml`)
2. Set up auto-scaling policies for production
3. Perform load testing to validate 200+ concurrent ticket capacity
4. Document runbook procedures for scaling operations

## References

- n8n Queue Mode Documentation: https://docs.n8n.io/hosting/scaling/queue-mode/
- Bull MQ Documentation: https://docs.bullmq.io/
- Redis Configuration Guide: `config/redis-config.md`
- Environment Setup: `config/environments.md`
