#!/bin/bash

###############################################################################
# Database Backup Script for NSW Strata Automation
#
# This script backs up the Supabase PostgreSQL database including:
# - Complete database dump (schema + data)
# - Schema-only backup
# - Knowledge base tables backup
# - 30-day retention policy
#
# Usage:
#   ./backup-database.sh [environment]
#
# Environment: development, staging, production (default: development)
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups/database"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DATE_SHORT=$(date +%Y%m%d)
RETENTION_DAYS=30

# Environment selection
ENVIRONMENT="${1:-development}"

# Load environment variables
if [ -f "${SCRIPT_DIR}/.env.${ENVIRONMENT}" ]; then
    echo "Loading environment: ${ENVIRONMENT}"
    source "${SCRIPT_DIR}/.env.${ENVIRONMENT}"
else
    echo "Error: Environment file .env.${ENVIRONMENT} not found"
    exit 1
fi

# Validate required environment variables
if [ -z "${SUPABASE_DB_HOST:-}" ] || [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
    echo "Error: Required database environment variables not set"
    echo "Required: SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD"
    exit 1
fi

# Database connection parameters
DB_HOST="${SUPABASE_DB_HOST}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

# Connection string
export PGPASSWORD="${DB_PASSWORD}"
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Create backup directory
mkdir -p "${BACKUP_DIR}/${DATE_SHORT}"

echo "========================================="
echo "Database Backup Script"
echo "========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Timestamp: ${TIMESTAMP}"
echo "Backup Directory: ${BACKUP_DIR}/${DATE_SHORT}"
echo "Database Host: ${DB_HOST}"
echo "========================================="
echo ""

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if pg_dump is available
check_pg_dump() {
    if ! command -v pg_dump &> /dev/null; then
        echo "Error: pg_dump not found. Please install PostgreSQL client tools."
        echo ""
        echo "Install on macOS: brew install postgresql"
        echo "Install on Ubuntu: sudo apt-get install postgresql-client"
        exit 1
    fi
}

# Function to test database connection
test_connection() {
    log "Testing database connection..."
    if psql "${CONNECTION_STRING}" -c "SELECT 1" &> /dev/null; then
        log "✅ Database connection successful"
    else
        log "❌ Database connection failed"
        exit 1
    fi
}

# Function to get database size
get_db_size() {
    psql "${CONNECTION_STRING}" -t -c "
        SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));
    " | xargs
}

# Function to backup complete database
backup_full() {
    local backup_file="${BACKUP_DIR}/${DATE_SHORT}/full-backup-${TIMESTAMP}.sql"
    log "Creating full database backup..."
    log "Output: ${backup_file}"

    pg_dump "${CONNECTION_STRING}" \
        --format=plain \
        --no-owner \
        --no-acl \
        --verbose \
        > "${backup_file}" 2>&1

    if [ $? -eq 0 ]; then
        # Compress backup
        gzip "${backup_file}"
        log "✅ Full backup complete: ${backup_file}.gz"
        log "Size: $(du -h "${backup_file}.gz" | cut -f1)"
    else
        log "❌ Full backup failed"
        return 1
    fi
}

# Function to backup schema only
backup_schema() {
    local backup_file="${BACKUP_DIR}/${DATE_SHORT}/schema-only-${TIMESTAMP}.sql"
    log "Creating schema-only backup..."
    log "Output: ${backup_file}"

    pg_dump "${CONNECTION_STRING}" \
        --schema-only \
        --format=plain \
        --no-owner \
        --no-acl \
        --verbose \
        > "${backup_file}" 2>&1

    if [ $? -eq 0 ]; then
        gzip "${backup_file}"
        log "✅ Schema backup complete: ${backup_file}.gz"
        log "Size: $(du -h "${backup_file}.gz" | cut -f1)"
    else
        log "❌ Schema backup failed"
        return 1
    fi
}

# Function to backup specific tables
backup_tables() {
    local backup_file="${BACKUP_DIR}/${DATE_SHORT}/knowledge-tables-${TIMESTAMP}.sql"
    log "Creating knowledge base tables backup..."
    log "Tables: knowledge_base, training_examples, conversation_state, system_metrics"
    log "Output: ${backup_file}"

    pg_dump "${CONNECTION_STRING}" \
        --format=plain \
        --no-owner \
        --no-acl \
        --table=public.knowledge_base \
        --table=public.training_examples \
        --table=public.conversation_state \
        --table=public.system_metrics \
        --verbose \
        > "${backup_file}" 2>&1

    if [ $? -eq 0 ]; then
        gzip "${backup_file}"
        log "✅ Tables backup complete: ${backup_file}.gz"
        log "Size: $(du -h "${backup_file}.gz" | cut -f1)"
    else
        log "❌ Tables backup failed"
        return 1
    fi
}

# Function to backup data only (no schema)
backup_data() {
    local backup_file="${BACKUP_DIR}/${DATE_SHORT}/data-only-${TIMESTAMP}.sql"
    log "Creating data-only backup..."
    log "Output: ${backup_file}"

    pg_dump "${CONNECTION_STRING}" \
        --data-only \
        --format=plain \
        --no-owner \
        --no-acl \
        --verbose \
        > "${backup_file}" 2>&1

    if [ $? -eq 0 ]; then
        gzip "${backup_file}"
        log "✅ Data backup complete: ${backup_file}.gz"
        log "Size: $(du -h "${backup_file}.gz" | cut -f1)"
    else
        log "❌ Data backup failed"
        return 1
    fi
}

# Function to create backup manifest
create_manifest() {
    local manifest_file="${BACKUP_DIR}/${DATE_SHORT}/manifest-${TIMESTAMP}.json"
    log "Creating backup manifest..."

    cat > "${manifest_file}" << EOF
{
  "backup_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "${ENVIRONMENT}",
  "database": {
    "host": "${DB_HOST}",
    "name": "${DB_NAME}",
    "size": "$(get_db_size)"
  },
  "files": [
$(ls -1 "${BACKUP_DIR}/${DATE_SHORT}"/*.gz 2>/dev/null | while read file; do
    echo "    {"
    echo "      \"filename\": \"$(basename "$file")\","
    echo "      \"size\": \"$(du -h "$file" | cut -f1)\","
    echo "      \"path\": \"$file\""
    echo "    },"
done | sed '$ s/,$//')
  ],
  "retention_days": ${RETENTION_DAYS}
}
EOF

    log "✅ Manifest created: ${manifest_file}"
}

# Function to clean old backups (retention policy)
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."

    find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}" -type f -name "*.json" -mtime +${RETENTION_DAYS} -delete

    # Remove empty directories
    find "${BACKUP_DIR}" -type d -empty -delete

    log "✅ Cleanup complete"
}

# Function to display backup statistics
show_statistics() {
    log ""
    log "========================================="
    log "Backup Statistics"
    log "========================================="
    log "Database Size: $(get_db_size)"
    log "Backup Location: ${BACKUP_DIR}/${DATE_SHORT}"
    log "Total Backup Size: $(du -sh "${BACKUP_DIR}/${DATE_SHORT}" 2>/dev/null | cut -f1 || echo "N/A")"
    log ""

    # Table row counts
    log "Table Row Counts:"
    psql "${CONNECTION_STRING}" -t << 'EOF'
    SELECT
        'knowledge_base: ' || COUNT(*)
    FROM knowledge_base
    UNION ALL
    SELECT
        'training_examples: ' || COUNT(*)
    FROM training_examples
    UNION ALL
    SELECT
        'conversation_state: ' || COUNT(*)
    FROM conversation_state
    UNION ALL
    SELECT
        'system_metrics: ' || COUNT(*)
    FROM system_metrics;
EOF
    log "========================================="
}

# Main execution
main() {
    log "Starting backup process..."

    # Checks
    check_pg_dump
    test_connection

    # Show database info
    log "Database size: $(get_db_size)"

    # Perform backups
    backup_full
    backup_schema
    backup_tables
    backup_data

    # Create manifest
    create_manifest

    # Clean old backups
    cleanup_old_backups

    # Show statistics
    show_statistics

    log ""
    log "✅ Backup process complete!"
    log "Backup location: ${BACKUP_DIR}/${DATE_SHORT}"
}

# Handle script interruption
trap 'log "❌ Backup interrupted"; exit 130' INT TERM

# Run main function
main

# Unset password
unset PGPASSWORD

exit 0
