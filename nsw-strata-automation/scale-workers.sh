#!/bin/bash
# n8n Worker Scaling Helper Script
# Simplifies worker scaling operations for different scenarios

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.queue.yml"
REDIS_CONTAINER="n8n-redis"

show_usage() {
    echo -e "${BLUE}=== n8n Worker Scaling Script ===${NC}"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start [workers]        Start queue mode with N workers (default: 2)"
    echo "  scale [workers]        Scale to N workers"
    echo "  stop                   Stop all services"
    echo "  status                 Show current worker status"
    echo "  queue                  Show queue statistics"
    echo "  logs [worker]          Show worker logs"
    echo "  preset [name]          Apply scaling preset"
    echo ""
    echo "Presets:"
    echo "  dev                    Development (regular mode, no workers)"
    echo "  test                   Testing (2 workers)"
    echo "  staging                Staging (4 workers)"
    echo "  production             Production (8 workers)"
    echo "  peak                   Peak hours (12 workers)"
    echo "  load-test              Load testing (16 workers)"
    echo ""
    echo "Examples:"
    echo "  $0 start              # Start with 2 workers"
    echo "  $0 start 4            # Start with 4 workers"
    echo "  $0 scale 8            # Scale to 8 workers"
    echo "  $0 preset production  # Apply production preset"
    echo "  $0 status             # Show current status"
    echo "  $0 queue              # Show queue statistics"
    echo ""
}

check_redis() {
    if ! docker ps | grep -q "${REDIS_CONTAINER}"; then
        echo -e "${RED}Error: Redis container not running${NC}"
        echo "Start Redis first with: docker-compose up -d redis"
        exit 1
    fi
}

get_queue_stats() {
    echo -e "${YELLOW}Queue Statistics:${NC}"

    PENDING=$(docker exec ${REDIS_CONTAINER} redis-cli LLEN bull:n8n:jobs 2>/dev/null || echo "0")
    ACTIVE=$(docker exec ${REDIS_CONTAINER} redis-cli LLEN bull:n8n:active 2>/dev/null || echo "0")
    FAILED=$(docker exec ${REDIS_CONTAINER} redis-cli LLEN bull:n8n:failed 2>/dev/null || echo "0")
    COMPLETED=$(docker exec ${REDIS_CONTAINER} redis-cli LLEN bull:n8n:completed 2>/dev/null || echo "0")

    echo "  Pending:   ${PENDING}"
    echo "  Active:    ${ACTIVE}"
    echo "  Failed:    ${FAILED}"
    echo "  Completed: ${COMPLETED}"

    # Calculate total processing capacity
    WORKER_COUNT=$(docker ps | grep n8n-worker | wc -l | tr -d ' ')
    TOTAL_CAPACITY=$((WORKER_COUNT * 10))  # Assuming 10 concurrent per worker

    echo ""
    echo "Workers:   ${WORKER_COUNT}"
    echo "Capacity:  ${TOTAL_CAPACITY} concurrent executions"

    # Calculate load percentage
    if [ "${TOTAL_CAPACITY}" -gt 0 ]; then
        LOAD_PCT=$(( (ACTIVE * 100) / TOTAL_CAPACITY ))
        echo "Load:      ${LOAD_PCT}%"

        if [ "${LOAD_PCT}" -gt 80 ]; then
            echo -e "${RED}⚠ High load - consider scaling up${NC}"
        elif [ "${LOAD_PCT}" -lt 20 ] && [ "${WORKER_COUNT}" -gt 2 ]; then
            echo -e "${YELLOW}ℹ Low load - consider scaling down${NC}"
        fi
    fi
}

show_status() {
    echo -e "${YELLOW}n8n Services Status:${NC}"
    docker-compose ${COMPOSE_FILES} ps

    echo ""
    check_redis
    get_queue_stats
}

start_services() {
    WORKERS=${1:-2}

    echo -e "${YELLOW}Starting n8n in queue mode with ${WORKERS} workers...${NC}"

    # Calculate worker distribution (split between worker-1 and worker-2)
    WORKER1=$(( (WORKERS + 1) / 2 ))
    WORKER2=$(( WORKERS / 2 ))

    echo "  Worker-1 replicas: ${WORKER1}"
    echo "  Worker-2 replicas: ${WORKER2}"

    docker-compose ${COMPOSE_FILES} up -d --scale n8n-worker-1=${WORKER1} --scale n8n-worker-2=${WORKER2}

    echo ""
    echo -e "${GREEN}✓ Services started${NC}"
    echo ""

    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 5

    show_status
}

scale_workers() {
    WORKERS=$1

    if [ -z "${WORKERS}" ]; then
        echo -e "${RED}Error: Number of workers required${NC}"
        echo "Usage: $0 scale [number]"
        exit 1
    fi

    echo -e "${YELLOW}Scaling to ${WORKERS} workers...${NC}"

    # Calculate worker distribution
    WORKER1=$(( (WORKERS + 1) / 2 ))
    WORKER2=$(( WORKERS / 2 ))

    echo "  Worker-1 replicas: ${WORKER1}"
    echo "  Worker-2 replicas: ${WORKER2}"

    docker-compose ${COMPOSE_FILES} up -d --scale n8n-worker-1=${WORKER1} --scale n8n-worker-2=${WORKER2} --no-recreate

    echo ""
    echo -e "${GREEN}✓ Scaled to ${WORKERS} workers${NC}"
    echo ""

    sleep 2
    show_status
}

stop_services() {
    echo -e "${YELLOW}Stopping n8n services...${NC}"
    docker-compose ${COMPOSE_FILES} down
    echo -e "${GREEN}✓ Services stopped${NC}"
}

show_logs() {
    WORKER=${1:-all}

    if [ "${WORKER}" == "all" ]; then
        echo -e "${YELLOW}Showing logs for all workers...${NC}"
        docker-compose ${COMPOSE_FILES} logs -f --tail=50 n8n-worker-1 n8n-worker-2
    else
        echo -e "${YELLOW}Showing logs for ${WORKER}...${NC}"
        docker-compose ${COMPOSE_FILES} logs -f --tail=50 ${WORKER}
    fi
}

apply_preset() {
    PRESET=$1

    case $PRESET in
        dev)
            echo -e "${YELLOW}Applying development preset (regular mode)...${NC}"
            docker-compose -f docker-compose.yml up -d
            echo -e "${GREEN}✓ Development mode active (no queue)${NC}"
            ;;
        test)
            echo -e "${YELLOW}Applying test preset (2 workers)...${NC}"
            start_services 2
            ;;
        staging)
            echo -e "${YELLOW}Applying staging preset (4 workers)...${NC}"
            start_services 4
            ;;
        production)
            echo -e "${YELLOW}Applying production preset (8 workers)...${NC}"
            start_services 8
            ;;
        peak)
            echo -e "${YELLOW}Applying peak hours preset (12 workers)...${NC}"
            start_services 12
            ;;
        load-test)
            echo -e "${YELLOW}Applying load test preset (16 workers)...${NC}"
            start_services 16
            ;;
        *)
            echo -e "${RED}Error: Unknown preset '${PRESET}'${NC}"
            echo "Available presets: dev, test, staging, production, peak, load-test"
            exit 1
            ;;
    esac
}

monitor_queue() {
    echo -e "${YELLOW}Monitoring queue (Ctrl+C to stop)...${NC}"
    echo ""

    while true; do
        clear
        echo -e "${BLUE}=== n8n Queue Monitor ===${NC}"
        echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        get_queue_stats
        sleep 2
    done
}

# Main script logic
COMMAND=${1:-}

if [ -z "${COMMAND}" ]; then
    show_usage
    exit 0
fi

case $COMMAND in
    start)
        start_services ${2:-2}
        ;;
    scale)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Number of workers required${NC}"
            show_usage
            exit 1
        fi
        scale_workers $2
        ;;
    stop)
        stop_services
        ;;
    status)
        show_status
        ;;
    queue)
        check_redis
        get_queue_stats
        ;;
    monitor)
        check_redis
        monitor_queue
        ;;
    logs)
        show_logs ${2:-all}
        ;;
    preset)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Preset name required${NC}"
            show_usage
            exit 1
        fi
        apply_preset $2
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo -e "${RED}Error: Unknown command '${COMMAND}'${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac
