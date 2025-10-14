# NSW Strata Management Automation - n8n Workflow System

This project implements an intelligent n8n workflow system for automating NSW strata management ticket responses using AI-powered processing, vector search, and progressive learning.

## Local Development Setup

### Prerequisites

- Docker Desktop installed and running
- At least 4GB RAM available for Docker
- Ports 5678 (n8n), 5432 (PostgreSQL), and 6379 (Redis) available

### Quick Start

1. **Clone and navigate to project directory:**
   ```bash
   cd nsw-strata-automation
   ```

2. **Create environment file:**
   ```bash
   # For local development
   cp .env.development .env

   # Or use the general template
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

3. **Start the services:**
   ```bash
   docker-compose up -d
   ```

4. **Access n8n:**
   - Open browser to http://localhost:5678
   - Login with credentials from .env file (default: admin/admin123)

5. **Stop the services:**
   ```bash
   docker-compose down
   ```

### Docker Services

- **n8n**: Workflow automation platform (port 5678)
- **postgres**: PostgreSQL database for workflow persistence (port 5432)
- **redis**: Redis for queue management and caching (port 6379)

### Data Persistence

- **Workflows**: Stored in `./workflows/` and synced to container
- **Credentials**: Stored in `./credentials/` (encrypted by n8n)
- **Database**: PostgreSQL data persisted in Docker volume `postgres_data`
- **n8n data**: Application data persisted in Docker volume `n8n_data`

### Development Workflow

1. **Create workflows** in the n8n UI at http://localhost:5678
2. **Export workflows** to `./workflows/` directory for version control
3. **Test integrations** using the local environment
4. **Commit changes** to Git repository

### Logs and Debugging

View n8n logs:
```bash
docker-compose logs -f n8n
```

View PostgreSQL logs:
```bash
docker-compose logs -f postgres
```

### Useful Commands

```bash
# Start services (regular mode)
docker-compose up -d

# Start services with queue mode (production-style with 2 workers)
docker-compose -f docker-compose.yml -f docker-compose.queue.yml up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View running containers
docker-compose ps

# Remove all data and start fresh
docker-compose down -v
```

### Queue Mode and Worker Scaling

For production-style queue mode with horizontal scaling (200+ concurrent tickets):

**Quick Start with Helper Script:**

```bash
# Start with 2 workers (default)
./scale-workers.sh start

# Start with specific number of workers
./scale-workers.sh start 4

# Apply preset configurations
./scale-workers.sh preset production  # 8 workers
./scale-workers.sh preset peak        # 12 workers for peak hours

# Check status and queue statistics
./scale-workers.sh status
./scale-workers.sh queue

# Scale on-the-fly
./scale-workers.sh scale 8

# Monitor queue in real-time
./scale-workers.sh monitor
```

**Manual Docker Compose Commands:**

1. **Start with queue mode enabled:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.queue.yml up -d
   ```

2. **This configuration includes:**
   - 1 main n8n instance (webhook receiver)
   - 2 worker instances for processing
   - Redis for queue management
   - Horizontal scaling capability (200+ concurrent tickets)

3. **Monitor queue:**
   ```bash
   docker exec -it n8n-redis redis-cli LLEN bull:n8n:jobs
   ```

4. **Scale workers dynamically:**
   ```bash
   # Scale to 8 workers (4 of each type)
   docker-compose -f docker-compose.yml -f docker-compose.queue.yml up -d \
     --scale n8n-worker-1=4 --scale n8n-worker-2=4
   ```

**See detailed documentation:**
- Worker Scaling Guide: `config/worker-scaling.md`
- Redis Configuration: `config/redis-config.md`
- Environment Setup: `config/environments.md`

### n8n CLI Tools for Workflow Management

The n8n CLI allows you to export/import workflows, credentials, and automate workflow operations.

**Installation:**

```bash
# Install n8n CLI globally (recommended for frequent use)
npm install -g n8n

# Or use npx (no installation required)
npx n8n <command>
```

**Common CLI Commands:**

```bash
# Export all workflows to ./workflows directory
n8n export:workflow --all --output=./workflows

# Export specific workflow by ID
n8n export:workflow --id=<workflow_id> --output=./workflows

# Import workflow from file
n8n import:workflow --input=./workflows/workflow-name.json

# Export all credentials (encrypted)
n8n export:credentials --all --output=./credentials

# Start n8n locally (alternative to Docker)
n8n start

# Show n8n version
n8n --version
```

**Using CLI with Docker Container:**

If n8n is running in Docker, you can execute CLI commands inside the container:

```bash
# Export workflows from Docker container
docker exec -it n8n-local n8n export:workflow --all --output=/home/node/.n8n/workflows

# Import workflow into Docker container
docker exec -it n8n-local n8n import:workflow --input=/home/node/.n8n/workflows/workflow.json

# Access n8n CLI inside container
docker exec -it n8n-local sh
n8n --help
```

**Automated Backup Script:**

For regular backups, you can use this script (save as `backup-workflows.sh`):

```bash
#!/bin/bash
# Backup all workflows with timestamp
BACKUP_DIR="./backups/workflows-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
docker exec n8n-local n8n export:workflow --all --output=/home/node/.n8n/workflows
docker cp n8n-local:/home/node/.n8n/workflows/. "$BACKUP_DIR/"
echo "Workflows backed up to $BACKUP_DIR"
```

### Troubleshooting

**Port already in use:**
- Change ports in docker-compose.yml if 5678 or 5432 are occupied

**Database connection issues:**
- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check logs: `docker-compose logs postgres`

**n8n won't start:**
- Check logs: `docker-compose logs n8n`
- Ensure sufficient Docker resources allocated

## Project Structure

```
nsw-strata-automation/
├── docker-compose.yml          # Docker services configuration
├── .env.example                # Environment variables template
├── workflows/                  # n8n workflow JSON files
├── credentials/                # n8n credentials (encrypted)
├── database/                   # Database schemas and migrations
├── config/                     # Configuration files
├── monitoring/                 # Monitoring and metrics config
├── tests/                      # Test configurations
├── docs/                       # Documentation
└── knowledge/                  # Knowledge base entries
```

## Environment Configurations

This project includes three environment configurations for different deployment stages:

### 1. Development (`.env.development`)
- **Purpose:** Local Docker-based development
- **Execution Mode:** Regular (non-queue) for fast feedback
- **Security:** Weak credentials (admin/admin123)
- **Logging:** Debug level
- **Usage:** `cp .env.development .env && docker-compose up -d`

### 2. Staging (`.env.staging`)
- **Purpose:** Production-like testing with 20% sampled tickets
- **Execution Mode:** Queue mode with 2 workers
- **Security:** Strong credentials (use secrets manager)
- **Validation:** 2-week minimum validation period
- **Usage:** Deploy to staging n8n Cloud or VPS

### 3. Production (`.env.production`)
- **Purpose:** Full n8n Cloud deployment
- **Execution Mode:** Queue mode with 4+ workers (horizontal scaling)
- **Security:** Maximum security, secrets manager required
- **Target:** 99.9% uptime, 200+ concurrent tickets
- **Usage:** Deploy to n8n Cloud with secrets manager

**See `config/environments.md` for complete documentation on environment configurations, secrets management, and deployment procedures.**

## Next Steps

1. Configure API credentials in n8n UI
2. Import workflow templates
3. Set up Supabase database connection
4. Configure Freshdesk webhooks
5. Test with sample tickets

## Production Deployment

For production deployment to n8n Cloud, refer to `docs/deployment-guide.md`.

## Support

For issues and questions, refer to the project documentation in `docs/`.
