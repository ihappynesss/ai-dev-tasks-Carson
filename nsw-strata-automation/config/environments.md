# Environment Configuration Guide

## Overview

The NSW Strata Automation system uses three distinct environment configurations to ensure proper testing and deployment:

1. **Development** - Local Docker-based development
2. **Staging** - Production-like testing with 20% sampled tickets
3. **Production** - Full n8n Cloud deployment with complete automation

## Environment Files

### Development (.env.development)

**Purpose:** Local development and testing on developer machines

**Characteristics:**
- Runs in Docker containers locally
- Uses weak credentials (admin/admin123)
- Regular execution mode (non-queue) for faster feedback
- Debug-level logging
- No SSL/TLS requirements
- Relaxed security settings

**Usage:**
```bash
# Copy to .env for Docker Compose
cp .env.development .env

# Start development environment
docker-compose up -d
```

**Database:** PostgreSQL container (postgres:15)
**Redis:** Redis container (redis:7-alpine)
**n8n:** Latest n8n Docker image
**Access:** http://localhost:5678

---

### Staging (.env.staging)

**Purpose:** Production-like validation with sample traffic before full deployment

**Characteristics:**
- Queue mode enabled with 2 workers
- 20% sample rate (as specified in PRD)
- Strong authentication required
- SSL/TLS enabled
- Production-like security
- Info-level logging
- Managed database and Redis

**Usage:**
```bash
# Set staging environment variables in secrets manager
export STAGING_POSTGRES_PASSWORD="strong_password"
export STAGING_REDIS_PASSWORD="strong_password"
export STAGING_N8N_USER="admin"
export STAGING_N8N_PASSWORD="strong_password"
export STAGING_ENCRYPTION_KEY="32_char_random_key"

# Deploy to staging (n8n Cloud or VPS)
# Import workflows and credentials
# Configure webhook with Freshdesk staging
```

**Validation Period:** 2 weeks minimum (per PRD task 15.4)
**Traffic:** 20% of production tickets sampled
**Purpose:** Final validation before production launch

**Key Differences from Production:**
- Lower traffic volume (20% sample)
- Reduced worker count (2 vs 4+)
- Validation mode flags enabled
- Non-critical testing environment

---

### Production (.env.production)

**Purpose:** Full production deployment on n8n Cloud

**Characteristics:**
- Full queue mode with 4+ workers (horizontal scaling)
- 100% traffic processing
- Maximum security settings
- Monitoring and metrics enabled
- Managed infrastructure (n8n Cloud)
- SSL/TLS required
- Secrets manager integration

**Usage:**
```bash
# IMPORTANT: Never commit .env.production with actual secrets
# Use n8n Cloud environment variables or secrets manager

# Set production environment variables in n8n Cloud dashboard
# Or use AWS Secrets Manager / HashiCorp Vault
```

**Infrastructure:**
- **n8n Cloud:** Managed n8n with queue mode
- **Database:** Supabase Pro ($25/month)
- **Redis:** Managed Redis (AWS ElastiCache or Redis Cloud)
- **Monitoring:** Prometheus + Grafana
- **Alerting:** Slack webhooks

**Performance Targets:**
- 99.9% uptime
- <500ms webhook response time
- 200+ concurrent ticket processing
- 70-80% automation rate after 100 samples
- $0.50-2.00 cost per ticket

---

## Environment Variable Reference

### Critical Security Variables

These must NEVER be committed to version control:

```bash
# Database
PRODUCTION_DB_PASSWORD
STAGING_DB_PASSWORD

# Redis
PRODUCTION_REDIS_PASSWORD
STAGING_REDIS_PASSWORD

# n8n
PRODUCTION_N8N_PASSWORD
PRODUCTION_ENCRYPTION_KEY
STAGING_N8N_PASSWORD
STAGING_ENCRYPTION_KEY

# External APIs
FRESHDESK_API_KEY
SUPABASE_SERVICE_KEY
CLAUDE_API_KEY
PERPLEXITY_API_KEY
OPENAI_API_KEY
SLACK_WEBHOOK_URL
```

### Secrets Management

**Development:** Plain text in `.env` (local only, not committed)

**Staging/Production:** Use secrets manager:

#### AWS Secrets Manager
```bash
# Store secret
aws secretsmanager create-secret \
  --name n8n/production/db-password \
  --secret-string "your_strong_password"

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id n8n/production/db-password \
  --query SecretString \
  --output text
```

#### n8n Cloud Environment Variables
1. Go to n8n Cloud dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable individually
4. Mark sensitive variables as "Secret"

---

## Environment Switching

### Local Development

```bash
# Use development configuration
cp .env.development .env
docker-compose up -d

# Test with sample tickets
# Access at http://localhost:5678
```

### Testing Queue Mode Locally

```bash
# Use development config with queue mode override
cp .env.development .env
# Edit .env and change EXECUTIONS_MODE=queue
docker-compose -f docker-compose.yml -f docker-compose.queue.yml up -d

# Access at http://localhost:5678
# Monitor queue: docker exec -it n8n-redis redis-cli LLEN bull:n8n:jobs
```

### Deploying to Staging

```bash
# 1. Ensure staging infrastructure is ready
# 2. Load staging environment variables
# 3. Deploy workflows using n8n CLI
n8n export:workflow --all --output=./workflows
# Upload to staging n8n instance
# 4. Configure Freshdesk webhook for staging
# 5. Enable 20% sample rate
# 6. Monitor for 2 weeks
```

### Deploying to Production

```bash
# 1. Validate staging performance metrics
# 2. Load production environment variables in n8n Cloud
# 3. Import validated workflows
# 4. Phased rollout: 10% → 50% → 100%
# 5. Monitor critical metrics
# 6. Keep staging environment for testing updates
```

---

## Environment-Specific Settings

### Execution Timeout

| Environment | Timeout | Max Timeout | Reason |
|------------|---------|-------------|--------|
| Development | 300s | 600s | Fast feedback for debugging |
| Staging | 900s | 3600s | Production-like but shorter for testing |
| Production | 1800s | 3600s | Full processing time for complex workflows |

### Data Retention

| Environment | Execution Data | Retention Period |
|------------|----------------|------------------|
| Development | All | Unlimited |
| Staging | All | 14 days (336 hours) |
| Production | Errors + Manual | 7 days (168 hours) |

### Logging Levels

| Environment | Log Level | Output | Purpose |
|------------|-----------|--------|---------|
| Development | debug | console, file | Detailed debugging |
| Staging | info | console, file | Operational insight |
| Production | info | console (structured) | Production monitoring |

---

## Configuration Validation

### Pre-Deployment Checklist

**Development:**
- [ ] Docker and Docker Compose installed
- [ ] Ports 5678, 5432, 6379 available
- [ ] `.env` file created from `.env.development`
- [ ] Basic auth credentials set

**Staging:**
- [ ] All required secrets configured
- [ ] Database connection validated
- [ ] Redis connection validated
- [ ] SSL certificates valid
- [ ] Freshdesk webhook configured (20% sample)
- [ ] Monitoring dashboards accessible
- [ ] 2-week validation period planned

**Production:**
- [ ] n8n Cloud account configured
- [ ] All secrets in secrets manager
- [ ] Database scaled appropriately (Supabase Pro)
- [ ] Redis scaled (managed service)
- [ ] Monitoring integrated (Prometheus)
- [ ] Alerting configured (Slack)
- [ ] Backup strategy implemented
- [ ] Disaster recovery tested
- [ ] Phased rollout plan (10% → 50% → 100%)
- [ ] Rollback procedure documented

---

## Troubleshooting

### Development Issues

**"Port already in use"**
```bash
# Check what's using the port
lsof -i :5678
# Change port in .env if needed
```

**"Database connection failed"**
```bash
# Check container health
docker-compose ps
# View logs
docker-compose logs postgres
```

### Staging/Production Issues

**"Queue not processing"**
```bash
# Check Redis connection
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD PING
# Check worker health
# Monitor queue depth
```

**"Webhook timeout"**
- Verify execution mode is 'queue'
- Check worker process count
- Verify Redis queue is processing
- Review execution timeout settings

---

## Best Practices

1. **Never commit secrets** - Use `.gitignore` and secrets managers
2. **Test in staging first** - Always validate in staging before production
3. **Use phased rollouts** - 10% → 50% → 100% with monitoring
4. **Monitor continuously** - Set up alerts for all environments
5. **Document changes** - Update this file when adding new variables
6. **Regular backups** - Automated daily backups for all environments
7. **Security audits** - Quarterly review of credentials and access
8. **Performance testing** - Load test staging before production deployments

---

## Migration Path

### Development → Staging
1. Export workflows: `n8n export:workflow --all`
2. Validate workflow configurations
3. Update environment-specific values
4. Import to staging
5. Test with 20% sample traffic
6. Validate for 2 weeks

### Staging → Production
1. Review staging metrics (success rate, performance)
2. Prepare production infrastructure
3. Configure all production secrets
4. Import validated workflows
5. Start with 10% traffic
6. Monitor and scale to 50% then 100%

---

## Support

For environment configuration issues:
- Development: Check Docker logs and this documentation
- Staging: Review validation metrics and adjust as needed
- Production: Follow incident response playbook (see `docs/incident-response.md`)
