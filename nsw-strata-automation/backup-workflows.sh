#!/bin/bash
# Automated n8n Workflow Backup Script
# Usage: ./backup-workflows.sh

set -e

# Configuration
CONTAINER_NAME="n8n-local"
BACKUP_BASE_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${BACKUP_BASE_DIR}/workflows-${TIMESTAMP}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== n8n Workflow Backup Script ===${NC}"
echo "Timestamp: ${TIMESTAMP}"
echo ""

# Check if Docker container is running
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo -e "${RED}Error: Docker container '${CONTAINER_NAME}' is not running${NC}"
    echo "Start it with: docker-compose up -d"
    exit 1
fi

# Create backup directory
echo -e "${YELLOW}Creating backup directory...${NC}"
mkdir -p "${BACKUP_DIR}"

# Export workflows from Docker container
echo -e "${YELLOW}Exporting workflows from n8n...${NC}"
docker exec "${CONTAINER_NAME}" n8n export:workflow --all --output=/home/node/.n8n/workflows

# Copy workflows from container to backup directory
echo -e "${YELLOW}Copying workflows to backup directory...${NC}"
docker cp "${CONTAINER_NAME}:/home/node/.n8n/workflows/." "${BACKUP_DIR}/"

# Count backed up files
WORKFLOW_COUNT=$(find "${BACKUP_DIR}" -name "*.json" | wc -l | tr -d ' ')

echo ""
echo -e "${GREEN}✓ Backup completed successfully!${NC}"
echo "Location: ${BACKUP_DIR}"
echo "Workflows backed up: ${WORKFLOW_COUNT}"

# Optional: Create a git commit for version control
if [ -d ".git" ]; then
    echo ""
    read -p "Create git commit for this backup? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add "${BACKUP_DIR}"
        git commit -m "chore: backup workflows - ${TIMESTAMP}

- ${WORKFLOW_COUNT} workflows backed up
- Automated backup via backup-workflows.sh"
        echo -e "${GREEN}✓ Git commit created${NC}"
    fi
fi

# Optional: Clean up old backups (keep last 10)
OLD_BACKUP_COUNT=$(find "${BACKUP_BASE_DIR}" -maxdepth 1 -type d -name "workflows-*" | wc -l | tr -d ' ')
if [ "${OLD_BACKUP_COUNT}" -gt 10 ]; then
    echo ""
    echo -e "${YELLOW}Found ${OLD_BACKUP_COUNT} backups. Cleaning up old backups (keeping last 10)...${NC}"
    find "${BACKUP_BASE_DIR}" -maxdepth 1 -type d -name "workflows-*" | sort | head -n -10 | xargs rm -rf
    echo -e "${GREEN}✓ Old backups cleaned up${NC}"
fi

echo ""
echo -e "${GREEN}=== Backup Complete ===${NC}"
