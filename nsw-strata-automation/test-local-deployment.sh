#!/bin/bash

# Local Development Testing Script for n8n NSW Strata Automation
# Task 15.1: Complete local development testing with Docker n8n
#
# This script validates the entire local Docker setup including:
# - Docker services health checks
# - Workflow import and validation
# - API connectivity tests
# - Database connectivity
# - Redis queue functionality
# - Monitoring stack validation

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to record test result
record_test() {
    local test_name="$1"
    local result="$2"

    if [ "$result" = "PASS" ]; then
        ((TESTS_PASSED++))
        log_success "✓ $test_name"
    else
        ((TESTS_FAILED++))
        FAILED_TESTS+=("$test_name")
        log_error "✗ $test_name"
    fi
}

# Print section header
print_section() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

# Main testing procedure
main() {
    print_section "NSW Strata Automation - Local Development Testing"
    log_info "Starting comprehensive local deployment tests..."
    echo ""

    # Test 1: Check if Docker is running
    print_section "1. Docker Environment Check"
    if docker info > /dev/null 2>&1; then
        record_test "Docker daemon is running" "PASS"
    else
        record_test "Docker daemon is running" "FAIL"
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    # Test 2: Check Docker Compose file exists
    if [ -f "docker-compose.yml" ]; then
        record_test "docker-compose.yml exists" "PASS"
    else
        record_test "docker-compose.yml exists" "FAIL"
        exit 1
    fi

    # Test 3: Start Docker services
    print_section "2. Starting Docker Services"
    log_info "Bringing up all services..."
    if docker-compose up -d; then
        record_test "Docker services started" "PASS"
        sleep 10  # Give services time to initialize
    else
        record_test "Docker services started" "FAIL"
        exit 1
    fi

    # Test 4: Health check for PostgreSQL
    print_section "3. Service Health Checks"
    log_info "Checking PostgreSQL health..."
    if docker exec n8n-postgres pg_isready -U n8n > /dev/null 2>&1; then
        record_test "PostgreSQL is healthy" "PASS"
    else
        record_test "PostgreSQL is healthy" "FAIL"
    fi

    # Test 5: Health check for Redis
    log_info "Checking Redis health..."
    if docker exec n8n-redis redis-cli ping | grep -q "PONG"; then
        record_test "Redis is healthy" "PASS"
    else
        record_test "Redis is healthy" "FAIL"
    fi

    # Test 6: Health check for n8n
    log_info "Checking n8n health..."
    sleep 5  # Additional wait for n8n to fully start
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5678 | grep -q "200\|401"; then
        record_test "n8n is accessible" "PASS"
    else
        record_test "n8n is accessible" "FAIL"
        log_warning "n8n may still be starting. Waiting additional 15 seconds..."
        sleep 15
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:5678 | grep -q "200\|401"; then
            log_success "n8n is now accessible"
        fi
    fi

    # Test 7: Check Prometheus
    log_info "Checking Prometheus health..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/-/healthy | grep -q "200"; then
        record_test "Prometheus is healthy" "PASS"
    else
        record_test "Prometheus is healthy" "FAIL"
    fi

    # Test 8: Check Grafana
    log_info "Checking Grafana health..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q "200"; then
        record_test "Grafana is healthy" "PASS"
    else
        record_test "Grafana is healthy" "FAIL"
    fi

    # Test 9: Check Redis Exporter
    log_info "Checking Redis Exporter..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:9121/metrics | grep -q "200"; then
        record_test "Redis Exporter is healthy" "PASS"
    else
        record_test "Redis Exporter is healthy" "FAIL"
    fi

    # Test 10: Verify workflow files exist
    print_section "4. Workflow Files Validation"
    REQUIRED_WORKFLOWS=(
        "main-ticket-processor.json"
        "error-handler.json"
        "reply-handler.json"
        "scheduled-maintenance.json"
        "manual-trigger.json"
        "batch-processor.json"
    )

    for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
        if [ -f "workflows/$workflow" ]; then
            record_test "Workflow exists: $workflow" "PASS"
        else
            record_test "Workflow exists: $workflow" "FAIL"
        fi
    done

    # Test 11: Validate workflow JSON syntax
    log_info "Validating workflow JSON syntax..."
    for workflow in workflows/*.json; do
        if [ -f "$workflow" ]; then
            workflow_name=$(basename "$workflow")
            if jq empty "$workflow" > /dev/null 2>&1; then
                record_test "Valid JSON: $workflow_name" "PASS"
            else
                record_test "Valid JSON: $workflow_name" "FAIL"
            fi
        fi
    done

    # Test 12: Check environment configuration
    print_section "5. Environment Configuration"
    if [ -f ".env" ]; then
        record_test ".env file exists" "PASS"
    else
        log_warning ".env file not found, using defaults"
        record_test ".env file exists" "FAIL"
    fi

    # Test 13: Check database schema file
    if [ -f "database/schema.sql" ]; then
        record_test "Database schema file exists" "PASS"
    else
        record_test "Database schema file exists" "FAIL"
    fi

    # Test 14: Check knowledge base structure
    print_section "6. Knowledge Base Structure"
    if [ -d "knowledge" ]; then
        record_test "Knowledge base directory exists" "PASS"

        # Count knowledge entries
        KB_COUNT=$(find knowledge -name "*.md" -type f | wc -l)
        log_info "Found $KB_COUNT knowledge base entries"
        if [ "$KB_COUNT" -gt 0 ]; then
            record_test "Knowledge base has entries" "PASS"
        else
            record_test "Knowledge base has entries" "FAIL"
        fi
    else
        record_test "Knowledge base directory exists" "FAIL"
    fi

    # Test 15: Check monitoring configuration
    print_section "7. Monitoring Configuration"
    if [ -f "monitoring/prometheus-config.yml" ]; then
        record_test "Prometheus config exists" "PASS"
    else
        record_test "Prometheus config exists" "FAIL"
    fi

    # Test 16: Check Docker volumes
    print_section "8. Docker Volumes"
    REQUIRED_VOLUMES=(
        "nsw-strata-automation_postgres_data"
        "nsw-strata-automation_n8n_data"
        "nsw-strata-automation_redis_data"
    )

    for volume in "${REQUIRED_VOLUMES[@]}"; do
        if docker volume ls | grep -q "$volume"; then
            record_test "Volume exists: $volume" "PASS"
        else
            record_test "Volume exists: $volume" "FAIL"
        fi
    done

    # Test 17: Check network connectivity between containers
    print_section "9. Container Network Connectivity"
    log_info "Testing n8n -> PostgreSQL connectivity..."
    if docker exec n8n-local sh -c "nc -zv postgres 5432" 2>&1 | grep -q "open\|succeeded"; then
        record_test "n8n can reach PostgreSQL" "PASS"
    else
        record_test "n8n can reach PostgreSQL" "FAIL"
    fi

    log_info "Testing n8n -> Redis connectivity..."
    if docker exec n8n-local sh -c "nc -zv redis 6379" 2>&1 | grep -q "open\|succeeded"; then
        record_test "n8n can reach Redis" "PASS"
    else
        record_test "n8n can reach Redis" "FAIL"
    fi

    # Test 18: Verify Redis data persistence
    print_section "10. Redis Functionality"
    log_info "Testing Redis SET/GET operations..."
    docker exec n8n-redis redis-cli SET test_key "test_value" > /dev/null
    REDIS_VALUE=$(docker exec n8n-redis redis-cli GET test_key)
    if [ "$REDIS_VALUE" = "test_value" ]; then
        record_test "Redis SET/GET operations work" "PASS"
        docker exec n8n-redis redis-cli DEL test_key > /dev/null
    else
        record_test "Redis SET/GET operations work" "FAIL"
    fi

    # Test 19: Check PostgreSQL database existence
    print_section "11. PostgreSQL Database"
    log_info "Checking n8n database..."
    if docker exec n8n-postgres psql -U n8n -d n8n -c "\l" | grep -q "n8n"; then
        record_test "n8n database exists" "PASS"
    else
        record_test "n8n database exists" "FAIL"
    fi

    # Test 20: Check container logs for errors
    print_section "12. Container Log Analysis"
    log_info "Checking n8n logs for errors..."
    N8N_ERRORS=$(docker logs n8n-local 2>&1 | grep -i "error" | grep -v "0 errors" | wc -l)
    if [ "$N8N_ERRORS" -eq 0 ]; then
        record_test "n8n logs show no errors" "PASS"
    else
        record_test "n8n logs show no errors" "FAIL"
        log_warning "Found $N8N_ERRORS error lines in n8n logs"
    fi

    # Print final summary
    print_section "Test Summary"
    TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

    echo "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "${RED}Failed Tests:${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        echo ""
    fi

    # Calculate success rate
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TESTS_PASSED / $TOTAL_TESTS) * 100}")
    echo "Success Rate: $SUCCESS_RATE%"
    echo ""

    # Provide access information
    print_section "Service Access Information"
    echo "n8n UI:          http://localhost:5678"
    echo "                 Username: admin"
    echo "                 Password: admin123"
    echo ""
    echo "Prometheus:      http://localhost:9090"
    echo "Grafana:         http://localhost:3000"
    echo "                 Username: admin"
    echo "                 Password: admin123"
    echo ""
    echo "Redis:           localhost:6379"
    echo "PostgreSQL:      localhost:5432"
    echo "                 Database: n8n"
    echo "                 Username: n8n"
    echo "                 Password: n8n_password"
    echo ""

    # Final verdict
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "All tests passed! Local development environment is ready."
        echo ""
        log_info "Next steps:"
        echo "  1. Access n8n at http://localhost:5678"
        echo "  2. Import workflows from the workflows/ directory"
        echo "  3. Configure credentials for external services"
        echo "  4. Test webhook endpoints"
        echo "  5. Monitor metrics in Grafana at http://localhost:3000"
        echo ""
        return 0
    else
        log_error "Some tests failed. Please review the errors above."
        echo ""
        log_info "To view container logs, use:"
        echo "  docker-compose logs [service-name]"
        echo ""
        log_info "To restart services, use:"
        echo "  docker-compose restart"
        echo ""
        return 1
    fi
}

# Handle script interruption
trap 'echo ""; log_warning "Test interrupted by user"; exit 130' INT TERM

# Run main function
main

# Exit with appropriate code
exit $?
