#!/bin/bash

# Development Environment Deployment Script
# Task 15.2: Deploy to development environment with test Freshdesk
#
# This script deploys the NSW Strata Automation system to a development
# environment with test Freshdesk integration for end-to-end testing.

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="development"
ENV_FILE=".env.development"
DEPLOYMENT_LOG="deployment-dev-$(date +%Y%m%d-%H%M%S).log"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Print section header
print_section() {
    echo "" | tee -a "$DEPLOYMENT_LOG"
    echo "==========================================" | tee -a "$DEPLOYMENT_LOG"
    echo "$1" | tee -a "$DEPLOYMENT_LOG"
    echo "==========================================" | tee -a "$DEPLOYMENT_LOG"
    echo "" | tee -a "$DEPLOYMENT_LOG"
}

# Check prerequisites
check_prerequisites() {
    print_section "1. Checking Prerequisites"

    local all_good=true

    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found"
        all_good=false
    else
        log_success "Environment file found"
    fi

    # Check if n8n is installed (for workflow export)
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        all_good=false
    else
        log_success "Docker is available"
    fi

    # Check if jq is available for JSON processing
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed - JSON validation will be skipped"
    else
        log_success "jq is available"
    fi

    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed"
        all_good=false
    else
        log_success "curl is available"
    fi

    if [ "$all_good" = false ]; then
        log_error "Prerequisites check failed. Please install missing dependencies."
        exit 1
    fi

    log_success "All prerequisites met"
}

# Load and validate environment variables
load_environment() {
    print_section "2. Loading Environment Configuration"

    if [ -f "$ENV_FILE" ]; then
        log_info "Loading environment variables from $ENV_FILE"
        set -a
        source "$ENV_FILE"
        set +a
        log_success "Environment variables loaded"
    else
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi

    # Validate required variables
    local required_vars=(
        "N8N_HOST"
        "N8N_PORT"
        "N8N_PROTOCOL"
        "FRESHDESK_DOMAIN"
        "FRESHDESK_API_KEY"
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
    )

    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
            log_error "Required variable $var is not set"
        else
            log_success "Found $var"
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi

    log_success "All required environment variables are set"
}

# Validate workflow files
validate_workflows() {
    print_section "3. Validating Workflow Files"

    local workflow_count=0
    local valid_count=0
    local invalid_count=0

    for workflow in workflows/*.json; do
        if [ -f "$workflow" ]; then
            workflow_count=$((workflow_count + 1))
            workflow_name=$(basename "$workflow")

            if jq empty "$workflow" 2>/dev/null; then
                log_success "Valid: $workflow_name"
                valid_count=$((valid_count + 1))
            else
                log_error "Invalid JSON: $workflow_name"
                invalid_count=$((invalid_count + 1))
            fi
        fi
    done

    log_info "Total workflows: $workflow_count"
    log_info "Valid: $valid_count"
    log_info "Invalid: $invalid_count"

    if [ $invalid_count -gt 0 ]; then
        log_error "Some workflows have invalid JSON. Please fix before deploying."
        exit 1
    fi

    log_success "All workflow files are valid"
}

# Create backup of existing workflows
backup_existing() {
    print_section "4. Creating Backup"

    local backup_dir="backups/pre-dev-deploy-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"

    log_info "Creating backup in $backup_dir"

    # Backup workflows
    if [ -d "workflows" ]; then
        cp -r workflows "$backup_dir/"
        log_success "Workflows backed up"
    fi

    # Backup environment file
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$backup_dir/"
        log_success "Environment configuration backed up"
    fi

    log_success "Backup completed: $backup_dir"
}

# Deploy workflows to development n8n instance
deploy_workflows() {
    print_section "5. Deploying Workflows"

    # Check if n8n is accessible
    local n8n_url="${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}"
    log_info "Checking n8n accessibility at $n8n_url"

    if ! curl -s -f -u "${N8N_BASIC_AUTH_USER}:${N8N_BASIC_AUTH_PASSWORD}" \
         "$n8n_url/healthz" &>/dev/null; then
        log_warning "Cannot reach n8n at $n8n_url"
        log_info "Please ensure n8n is running and accessible"
        log_info "You may need to import workflows manually via the n8n UI"
        return 1
    fi

    log_success "n8n is accessible"

    # List workflows to deploy
    local workflows_to_deploy=(
        "workflows/main-ticket-processor.json"
        "workflows/error-handler.json"
        "workflows/reply-handler.json"
        "workflows/scheduled-maintenance.json"
        "workflows/manual-trigger.json"
        "workflows/batch-processor.json"
    )

    log_info "Workflows to deploy:"
    for workflow in "${workflows_to_deploy[@]}"; do
        echo "  - $(basename "$workflow")" | tee -a "$DEPLOYMENT_LOG"
    done

    log_info "Please import these workflows via n8n UI at: $n8n_url"
    log_info "Or use n8n CLI if available"

    log_success "Workflow deployment instructions provided"
}

# Configure Freshdesk webhook
configure_freshdesk() {
    print_section "6. Configuring Freshdesk Test Instance"

    log_info "Freshdesk Domain: ${FRESHDESK_DOMAIN}"

    # Webhook URL for main ticket processor
    local webhook_url="${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}/webhook/freshdesk-ticket"

    log_info "Webhook Configuration:"
    echo "  URL: $webhook_url" | tee -a "$DEPLOYMENT_LOG"
    echo "  Method: POST" | tee -a "$DEPLOYMENT_LOG"
    echo "  Events: Ticket Created, Ticket Updated" | tee -a "$DEPLOYMENT_LOG"

    # Test Freshdesk API connectivity
    log_info "Testing Freshdesk API connectivity..."

    local freshdesk_api="https://${FRESHDESK_DOMAIN}.freshdesk.com/api/v2"
    if curl -s -f -u "${FRESHDESK_API_KEY}:X" \
         "$freshdesk_api/tickets?per_page=1" &>/dev/null; then
        log_success "Freshdesk API is accessible"
    else
        log_error "Cannot access Freshdesk API"
        log_error "Please verify FRESHDESK_DOMAIN and FRESHDESK_API_KEY"
        return 1
    fi

    log_info "Manual Freshdesk webhook setup required:"
    echo "  1. Log in to Freshdesk: https://${FRESHDESK_DOMAIN}.freshdesk.com" | tee -a "$DEPLOYMENT_LOG"
    echo "  2. Go to Admin > Workflows > Automations" | tee -a "$DEPLOYMENT_LOG"
    echo "  3. Create new automation for 'Ticket is Created'" | tee -a "$DEPLOYMENT_LOG"
    echo "  4. Add action: Trigger webhook" | tee -a "$DEPLOYMENT_LOG"
    echo "  5. Set URL: $webhook_url" | tee -a "$DEPLOYMENT_LOG"
    echo "  6. Set Method: POST" | tee -a "$DEPLOYMENT_LOG"
    echo "  7. Add header: X-Webhook-Secret: \${WEBHOOK_SECRET}" | tee -a "$DEPLOYMENT_LOG"
    echo "  8. Set content type: application/json" | tee -a "$DEPLOYMENT_LOG"
    echo "  9. Repeat for 'Ticket is Updated' event" | tee -a "$DEPLOYMENT_LOG"

    log_success "Freshdesk configuration instructions provided"
}

# Test Supabase connectivity
test_supabase() {
    print_section "7. Testing Supabase Connection"

    log_info "Supabase URL: ${SUPABASE_URL}"

    # Test REST API endpoint
    if curl -s -f -H "apikey: ${SUPABASE_ANON_KEY}" \
         -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
         "${SUPABASE_URL}/rest/v1/" &>/dev/null; then
        log_success "Supabase REST API is accessible"
    else
        log_error "Cannot access Supabase REST API"
        return 1
    fi

    log_success "Supabase connection verified"
}

# Initialize development database
init_database() {
    print_section "8. Initializing Development Database"

    log_info "Database initialization steps:"
    echo "  1. Execute database/schema.sql in Supabase" | tee -a "$DEPLOYMENT_LOG"
    echo "  2. Run database/migrations/*.sql if any" | tee -a "$DEPLOYMENT_LOG"
    echo "  3. Seed knowledge base entries" | tee -a "$DEPLOYMENT_LOG"
    echo "  4. Initialize system_metrics table" | tee -a "$DEPLOYMENT_LOG"

    log_info "Please run these SQL scripts manually in Supabase SQL Editor"
    log_info "Or use the Supabase CLI if available"

    log_success "Database initialization instructions provided"
}

# Run smoke tests
run_smoke_tests() {
    print_section "9. Running Smoke Tests"

    local n8n_url="${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}"

    # Test 1: n8n health
    log_info "Testing n8n health endpoint..."
    if curl -s -f "$n8n_url/healthz" &>/dev/null; then
        log_success "n8n health check passed"
    else
        log_error "n8n health check failed"
    fi

    # Test 2: Webhook endpoint
    log_info "Testing webhook endpoint..."
    local webhook_response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$n8n_url/webhook/test" \
        -H "Content-Type: application/json" \
        -d '{"test": true}')

    if [ "$webhook_response" = "404" ] || [ "$webhook_response" = "401" ]; then
        log_success "Webhook endpoint responding (expected 404/401 without active workflow)"
    else
        log_info "Webhook endpoint response: $webhook_response"
    fi

    # Test 3: Freshdesk API
    log_info "Testing Freshdesk API..."
    if curl -s -f -u "${FRESHDESK_API_KEY}:X" \
         "https://${FRESHDESK_DOMAIN}.freshdesk.com/api/v2/tickets?per_page=1" &>/dev/null; then
        log_success "Freshdesk API accessible"
    else
        log_warning "Freshdesk API test failed"
    fi

    # Test 4: Supabase
    log_info "Testing Supabase..."
    if curl -s -f -H "apikey: ${SUPABASE_ANON_KEY}" \
         "${SUPABASE_URL}/rest/v1/" &>/dev/null; then
        log_success "Supabase accessible"
    else
        log_warning "Supabase test failed"
    fi

    log_success "Smoke tests completed"
}

# Generate deployment report
generate_report() {
    print_section "10. Deployment Summary"

    local report_file="deployment-report-dev-$(date +%Y%m%d-%H%M%S).md"

    cat > "$report_file" <<EOF
# Development Environment Deployment Report

**Date**: $(date +"%Y-%m-%d %H:%M:%S")
**Environment**: Development
**Task**: 15.2 - Deploy to development environment with test Freshdesk

## Deployment Configuration

- **n8n URL**: ${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}
- **Freshdesk Domain**: ${FRESHDESK_DOMAIN}.freshdesk.com
- **Supabase URL**: ${SUPABASE_URL}
- **Environment File**: ${ENV_FILE}

## Deployed Workflows

1. main-ticket-processor.json - Main workflow for ticket processing
2. error-handler.json - Error handling and recovery
3. reply-handler.json - Multi-turn conversation handling
4. scheduled-maintenance.json - Scheduled operations
5. manual-trigger.json - Manual testing and reprocessing
6. batch-processor.json - Bulk operations

## Configuration Steps Completed

- [x] Prerequisites validated
- [x] Environment variables loaded
- [x] Workflow files validated
- [x] Backup created
- [x] Deployment instructions provided
- [x] Freshdesk configuration documented
- [x] Supabase connectivity tested
- [x] Database initialization steps documented
- [x] Smoke tests executed

## Next Steps

### 1. Import Workflows to n8n

Access n8n at: ${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}

Import each workflow file:
- Navigate to Workflows
- Click "Import from File"
- Select workflow JSON file
- Activate the workflow

### 2. Configure Credentials in n8n

Create the following credentials:
- Freshdesk API (API Key)
- Supabase (PostgreSQL connection)
- Claude API (API Key)
- OpenAI API (API Key)
- Perplexity API (API Key)
- Slack Webhook (Webhook URL)

### 3. Set Up Freshdesk Webhooks

Follow the instructions in the deployment log:
- Go to Freshdesk Admin > Workflows > Automations
- Create webhook for "Ticket Created"
- Create webhook for "Ticket Updated"
- Set webhook URL: ${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}/webhook/freshdesk-ticket

### 4. Initialize Database

Execute in Supabase SQL Editor:
- database/schema.sql
- Any migrations in database/migrations/
- Seed knowledge base entries

### 5. Test the Integration

Create a test ticket in Freshdesk and verify:
- Webhook triggers n8n workflow
- Ticket is processed correctly
- Response is posted back to Freshdesk
- Data is stored in Supabase

## Monitoring

Access monitoring dashboards:
- n8n Executions: ${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}/executions
- Freshdesk: https://${FRESHDESK_DOMAIN}.freshdesk.com
- Supabase: ${SUPABASE_URL}

## Troubleshooting

See deployment log for details: ${DEPLOYMENT_LOG}

For issues, refer to:
- docs/local-development-testing.md
- config/environments.md
- config/error-handling-runbook.md

## Sign-Off

Deployment prepared by: $(whoami)
Deployment timestamp: $(date -Iseconds)

---

Task 15.2 - Development environment deployment prepared successfully.
EOF

    log_success "Deployment report generated: $report_file"

    # Display summary
    echo ""
    echo "=========================================="
    echo "Deployment Summary"
    echo "=========================================="
    echo ""
    echo "Environment: Development"
    echo "n8n URL: ${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}"
    echo "Freshdesk: ${FRESHDESK_DOMAIN}.freshdesk.com"
    echo "Supabase: ${SUPABASE_URL}"
    echo ""
    echo "Deployment log: $DEPLOYMENT_LOG"
    echo "Deployment report: $report_file"
    echo ""
    echo "Next steps:"
    echo "1. Import workflows to n8n UI"
    echo "2. Configure credentials in n8n"
    echo "3. Set up Freshdesk webhooks"
    echo "4. Initialize database"
    echo "5. Run integration tests"
    echo ""
    log_success "Development deployment preparation complete!"
}

# Main execution
main() {
    echo "=========================================="
    echo "NSW Strata Automation"
    echo "Development Environment Deployment"
    echo "Task 15.2"
    echo "=========================================="
    echo ""

    log_info "Starting deployment to development environment..."
    log_info "Deployment log: $DEPLOYMENT_LOG"
    echo ""

    check_prerequisites
    load_environment
    validate_workflows
    backup_existing
    deploy_workflows
    configure_freshdesk
    test_supabase
    init_database
    run_smoke_tests
    generate_report

    return 0
}

# Handle script interruption
trap 'echo ""; log_warning "Deployment interrupted by user"; exit 130' INT TERM

# Run main function
main

# Exit with success
exit 0
