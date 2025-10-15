#!/usr/bin/env python3
"""
NSW Strata Automation - Custom Metrics Exporter
Task 12.5: API rate limit consumption tracking
Task 12.6-12.11: Business metrics tracking

Exposes custom metrics from Supabase to Prometheus format.
Tracks API usage, business metrics, and performance indicators.

Port: 8080
Metrics endpoint: /metrics
"""

import os
import time
import logging
from datetime import datetime, timedelta
from prometheus_client import start_http_server, Gauge, Counter, Histogram, Info
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection configuration
DB_CONFIG = {
    'host': os.getenv('SUPABASE_HOST', 'localhost'),
    'port': os.getenv('SUPABASE_PORT', 5432),
    'database': os.getenv('SUPABASE_DB', 'postgres'),
    'user': os.getenv('SUPABASE_USER', 'postgres'),
    'password': os.getenv('SUPABASE_PASSWORD', ''),
}

# ==================================================
# PROMETHEUS METRICS DEFINITIONS
# ==================================================

# Task 12.5: API Rate Limit Consumption
api_requests_total = Counter(
    'api_requests_total',
    'Total API requests by provider',
    ['provider', 'model', 'status']
)

api_rate_limit_remaining = Gauge(
    'api_rate_limit_remaining',
    'Remaining API rate limit by provider',
    ['provider', 'limit_type']
)

api_rate_limit_consumed_percent = Gauge(
    'api_rate_limit_consumed_percent',
    'Percentage of API rate limit consumed',
    ['provider', 'limit_type']
)

api_response_time = Histogram(
    'api_response_time_seconds',
    'API response time in seconds',
    ['provider', 'model'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]
)

# Task 12.6: Business Metrics - Tickets Processed
tickets_processed_total = Counter(
    'tickets_processed_total',
    'Total tickets processed',
    ['category', 'automation_level']
)

tickets_processed_hourly = Gauge(
    'tickets_processed_hourly',
    'Tickets processed in the last hour',
    ['category']
)

tickets_processed_daily = Gauge(
    'tickets_processed_daily',
    'Tickets processed in the last 24 hours',
    ['category']
)

# Task 12.7: Automation Rate by Category
automation_rate = Gauge(
    'automation_rate',
    'Automation rate by category (0-1)',
    ['category', 'subcategory']
)

# Task 12.8: Similarity Scores
similarity_score_avg = Gauge(
    'similarity_score_avg',
    'Average similarity score',
    ['category']
)

similarity_score_distribution = Histogram(
    'similarity_score_distribution',
    'Distribution of similarity scores',
    ['category'],
    buckets=[0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0]
)

# Task 12.9: CSAT Scores
csat_score = Gauge(
    'csat_score',
    'Customer satisfaction score (1-5)',
    ['category', 'automation_level']
)

# Task 12.10: Resolution Time
resolution_time_seconds = Histogram(
    'resolution_time_seconds',
    'Time to resolution in seconds',
    ['category', 'automation_level', 'priority'],
    buckets=[60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400, 172800]
)

resolution_time_avg = Gauge(
    'resolution_time_avg_seconds',
    'Average resolution time in seconds',
    ['category', 'automation_level']
)

# Task 12.11: API Costs
api_cost_per_ticket_usd = Gauge(
    'api_cost_per_ticket_usd',
    'API cost per ticket in USD',
    ['category', 'automation_level']
)

api_cost_total_usd = Counter(
    'api_cost_total_usd',
    'Total API costs in USD',
    ['provider', 'model']
)

# System health metrics
db_connection_status = Gauge(
    'db_connection_status',
    'Database connection status (1=up, 0=down)'
)

metrics_collection_duration = Histogram(
    'metrics_collection_duration_seconds',
    'Time taken to collect metrics',
    ['metric_type']
)

metrics_exporter_info = Info(
    'metrics_exporter',
    'Information about the metrics exporter'
)

# ==================================================
# DATABASE HELPER FUNCTIONS
# ==================================================

def get_db_connection():
    """Create and return a database connection."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        db_connection_status.set(1)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        db_connection_status.set(0)
        return None


def query_db(query, params=None):
    """Execute a database query and return results."""
    conn = get_db_connection()
    if not conn:
        return []

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            results = cur.fetchall()
        return results
    except Exception as e:
        logger.error(f"Query error: {e}")
        return []
    finally:
        conn.close()


# ==================================================
# METRICS COLLECTION FUNCTIONS
# ==================================================

def collect_api_rate_limits():
    """
    Task 12.5: Collect API rate limit consumption metrics.
    Queries system_metrics table for API usage data.
    """
    start_time = time.time()
    logger.info("Collecting API rate limit metrics...")

    try:
        # Query for API rate limit metrics
        query = """
        SELECT
            metadata->>'provider' as provider,
            metadata->>'model' as model,
            metadata->>'limit_type' as limit_type,
            metric_value,
            timestamp
        FROM system_metrics
        WHERE category = 'api'
          AND subcategory = 'rate_limit'
          AND timestamp > NOW() - INTERVAL '5 minutes'
        ORDER BY timestamp DESC;
        """

        results = query_db(query)

        for row in results:
            provider = row.get('provider', 'unknown')
            limit_type = row.get('limit_type', 'requests')
            value = float(row.get('metric_value', 0))

            # Update rate limit remaining
            api_rate_limit_remaining.labels(
                provider=provider,
                limit_type=limit_type
            ).set(value)

        logger.info(f"Collected {len(results)} API rate limit metrics")

    except Exception as e:
        logger.error(f"Error collecting API rate limits: {e}")
    finally:
        duration = time.time() - start_time
        metrics_collection_duration.labels(metric_type='api_rate_limits').observe(duration)


def collect_tickets_processed():
    """
    Task 12.6: Collect tickets processed metrics (hourly and daily).
    """
    start_time = time.time()
    logger.info("Collecting tickets processed metrics...")

    try:
        # Hourly tickets
        query_hourly = """
        SELECT
            metadata->>'category' as category,
            COUNT(*) as count
        FROM system_metrics
        WHERE metric_name = 'ticket_processed'
          AND timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY metadata->>'category';
        """

        results_hourly = query_db(query_hourly)
        for row in results_hourly:
            category = row.get('category', 'uncategorized')
            count = int(row.get('count', 0))
            tickets_processed_hourly.labels(category=category).set(count)

        # Daily tickets
        query_daily = """
        SELECT
            metadata->>'category' as category,
            COUNT(*) as count
        FROM system_metrics
        WHERE metric_name = 'ticket_processed'
          AND timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY metadata->>'category';
        """

        results_daily = query_db(query_daily)
        for row in results_daily:
            category = row.get('category', 'uncategorized')
            count = int(row.get('count', 0))
            tickets_processed_daily.labels(category=category).set(count)

        logger.info(f"Collected tickets metrics: {len(results_hourly)} hourly, {len(results_daily)} daily")

    except Exception as e:
        logger.error(f"Error collecting tickets processed: {e}")
    finally:
        duration = time.time() - start_time
        metrics_collection_duration.labels(metric_type='tickets_processed').observe(duration)


def collect_automation_rate():
    """
    Task 12.7: Collect automation rate by category with trending.
    """
    start_time = time.time()
    logger.info("Collecting automation rate metrics...")

    try:
        query = """
        SELECT
            metric_name,
            metric_value,
            category,
            subcategory
        FROM system_metrics
        WHERE metric_name = 'automation_rate'
          AND timestamp > NOW() - INTERVAL '5 minutes'
        ORDER BY timestamp DESC
        LIMIT 100;
        """

        results = query_db(query)

        for row in results:
            category = row.get('category', 'unknown')
            subcategory = row.get('subcategory', 'all')
            value = float(row.get('metric_value', 0))

            automation_rate.labels(
                category=category,
                subcategory=subcategory
            ).set(value)

        logger.info(f"Collected {len(results)} automation rate metrics")

    except Exception as e:
        logger.error(f"Error collecting automation rate: {e}")
    finally:
        duration = time.time() - start_time
        metrics_collection_duration.labels(metric_type='automation_rate').observe(duration)


def collect_similarity_scores():
    """
    Task 12.8: Collect average similarity scores over time.
    """
    start_time = time.time()
    logger.info("Collecting similarity score metrics...")

    try:
        query = """
        SELECT
            metadata->>'category' as category,
            AVG(metric_value) as avg_score
        FROM system_metrics
        WHERE metric_name = 'similarity_score'
          AND timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY metadata->>'category';
        """

        results = query_db(query)

        for row in results:
            category = row.get('category', 'unknown')
            avg_score = float(row.get('avg_score', 0))

            similarity_score_avg.labels(category=category).set(avg_score)

        logger.info(f"Collected {len(results)} similarity score metrics")

    except Exception as e:
        logger.error(f"Error collecting similarity scores: {e}")
    finally:
        duration = time.time() - start_time
        metrics_collection_duration.labels(metric_type='similarity_scores').observe(duration)


def collect_csat_scores():
    """
    Task 12.9: Collect CSAT scores from Freshdesk surveys.
    """
    start_time = time.time()
    logger.info("Collecting CSAT metrics...")

    try:
        query = """
        SELECT
            metadata->>'category' as category,
            metadata->>'automation_level' as automation_level,
            AVG(metric_value) as avg_csat
        FROM system_metrics
        WHERE metric_name = 'csat_score'
          AND timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY metadata->>'category', metadata->>'automation_level';
        """

        results = query_db(query)

        for row in results:
            category = row.get('category', 'unknown')
            automation_level = row.get('automation_level', 'manual')
            avg_csat = float(row.get('avg_csat', 0))

            csat_score.labels(
                category=category,
                automation_level=automation_level
            ).set(avg_csat)

        logger.info(f"Collected {len(results)} CSAT metrics")

    except Exception as e:
        logger.error(f"Error collecting CSAT scores: {e}")
    finally:
        duration = time.time() - start_time
        metrics_collection_duration.labels(metric_type='csat_scores').observe(duration)


def collect_resolution_time():
    """
    Task 12.10: Collect resolution time by category and automation level.
    """
    start_time = time.time()
    logger.info("Collecting resolution time metrics...")

    try:
        query = """
        SELECT
            metadata->>'category' as category,
            metadata->>'automation_level' as automation_level,
            AVG(metric_value) as avg_resolution_time
        FROM system_metrics
        WHERE metric_name = 'resolution_time'
          AND timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY metadata->>'category', metadata->>'automation_level';
        """

        results = query_db(query)

        for row in results:
            category = row.get('category', 'unknown')
            automation_level = row.get('automation_level', 'manual')
            avg_time = float(row.get('avg_resolution_time', 0))

            resolution_time_avg.labels(
                category=category,
                automation_level=automation_level
            ).set(avg_time)

        logger.info(f"Collected {len(results)} resolution time metrics")

    except Exception as e:
        logger.error(f"Error collecting resolution time: {e}")
    finally:
        duration = time.time() - start_time
        metrics_collection_duration.labels(metric_type='resolution_time').observe(duration)


def collect_api_costs():
    """
    Task 12.11: Collect API costs per ticket.
    """
    start_time = time.time()
    logger.info("Collecting API cost metrics...")

    try:
        # Per-ticket cost
        query_per_ticket = """
        SELECT
            metadata->>'category' as category,
            metadata->>'automation_level' as automation_level,
            AVG(metric_value) as avg_cost
        FROM system_metrics
        WHERE metric_name = 'api_cost_per_ticket'
          AND timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY metadata->>'category', metadata->>'automation_level';
        """

        results = query_db(query_per_ticket)

        for row in results:
            category = row.get('category', 'unknown')
            automation_level = row.get('automation_level', 'manual')
            avg_cost = float(row.get('avg_cost', 0))

            api_cost_per_ticket_usd.labels(
                category=category,
                automation_level=automation_level
            ).set(avg_cost)

        logger.info(f"Collected {len(results)} API cost metrics")

    except Exception as e:
        logger.error(f"Error collecting API costs: {e}")
    finally:
        duration = time.time() - start_time
        metrics_collection_duration.labels(metric_type='api_costs').observe(duration)


def collect_all_metrics():
    """Collect all metrics in sequence."""
    logger.info("Starting metrics collection cycle...")

    collect_api_rate_limits()
    collect_tickets_processed()
    collect_automation_rate()
    collect_similarity_scores()
    collect_csat_scores()
    collect_resolution_time()
    collect_api_costs()

    logger.info("Metrics collection cycle complete")


# ==================================================
# MAIN EXECUTION
# ==================================================

def main():
    """Main execution function."""
    # Set exporter info
    metrics_exporter_info.info({
        'version': '1.0.0',
        'task': 'Task 12.5-12.11',
        'description': 'NSW Strata Automation Custom Metrics Exporter'
    })

    # Start Prometheus HTTP server
    port = int(os.getenv('METRICS_PORT', 8080))
    start_http_server(port)
    logger.info(f"Metrics exporter started on port {port}")
    logger.info(f"Metrics available at http://localhost:{port}/metrics")

    # Collection interval in seconds
    collection_interval = int(os.getenv('COLLECTION_INTERVAL', 60))
    logger.info(f"Collection interval: {collection_interval} seconds")

    # Main loop
    while True:
        try:
            collect_all_metrics()
        except Exception as e:
            logger.error(f"Error in collection cycle: {e}")

        time.sleep(collection_interval)


if __name__ == '__main__':
    main()
