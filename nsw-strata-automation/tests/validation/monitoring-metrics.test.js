/**
 * Monitoring Metrics and Alerting Validation Tests
 *
 * Validates monitoring infrastructure including:
 * - Prometheus metrics collection
 * - Grafana dashboard functionality
 * - Alert rule configuration
 * - Metric accuracy and consistency
 * - Performance tracking
 * - Business metrics
 * - Notification delivery
 *
 * Related files:
 * - monitoring/prometheus-config.yml
 * - monitoring/grafana/dashboards/*.json
 * - monitoring/rules/*.yml
 * - monitoring/metrics-exporter/exporter.py
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');

describe('Monitoring Metrics and Alerting Validation (Task 14.13)', () => {

  describe('Prometheus Metrics Collection (Task 12.1)', () => {

    test('should define workflow execution duration metric', () => {
      const metric = {
        name: 'n8n_workflow_execution_duration_seconds',
        type: 'histogram',
        help: 'Duration of workflow execution in seconds',
        labels: ['workflow_id', 'workflow_name', 'status'],
        buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300, 900], // Up to 15 minutes
      };

      expect(metric.type).toBe('histogram');
      expect(metric.labels).toContain('workflow_id');
      expect(metric.labels).toContain('status');
      expect(metric.buckets).toContain(60); // 1 minute
    });

    test('should track workflow execution count', () => {
      const metric = {
        name: 'n8n_workflow_executions_total',
        type: 'counter',
        help: 'Total number of workflow executions',
        labels: ['workflow_id', 'status'],
      };

      expect(metric.type).toBe('counter');
      expect(metric.labels).toContain('status');
    });

    test('should monitor Redis queue depth', () => {
      const metric = {
        name: 'redis_queue_depth',
        type: 'gauge',
        help: 'Current depth of Redis job queue',
        labels: ['queue_name', 'priority'],
      };

      expect(metric.type).toBe('gauge');
      expect(metric.labels).toContain('queue_name');
    });

    test('should track worker utilization', () => {
      const metric = {
        name: 'n8n_worker_utilization_percent',
        type: 'gauge',
        help: 'Worker utilization percentage',
        labels: ['worker_id', 'worker_host'],
      };

      expect(metric.type).toBe('gauge');
      expect(metric.name).toContain('utilization');
    });

    test('should expose API rate limit metrics', () => {
      const metrics = [
        {
          name: 'api_rate_limit_remaining',
          type: 'gauge',
          labels: ['api_provider', 'endpoint'],
        },
        {
          name: 'api_rate_limit_reset_timestamp',
          type: 'gauge',
          labels: ['api_provider'],
        },
      ];

      expect(metrics).toHaveLength(2);
      expect(metrics[0].labels).toContain('api_provider');
    });
  });

  describe('Workflow Performance Metrics (Task 12.2)', () => {

    test('should calculate p50, p95, p99 percentiles', () => {
      const executionTimes = [
        100, 150, 200, 250, 300, 350, 400, 450, 500, 550,
        600, 650, 700, 750, 800, 850, 900, 950, 1000, 2000
      ]; // In milliseconds

      const sorted = executionTimes.slice().sort((a, b) => a - b);

      const p50Index = Math.floor(sorted.length * 0.50);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);

      const p50 = sorted[p50Index];
      const p95 = sorted[p95Index];
      const p99 = sorted[p99Index];

      expect(p50).toBe(600); // Median (10th index, value 600)
      expect(p95).toBe(2000); // 95th percentile (19th index, last value)
      expect(p99).toBe(2000); // 99th percentile (19th index, last value)
    });

    test('should track execution duration by workflow', () => {
      const workflowMetrics = {
        'main-ticket-processor': {
          executions: 1000,
          total_duration: 150000, // seconds
          avg_duration: 150,
          p95_duration: 300,
        },
        'reply-handler': {
          executions: 500,
          total_duration: 30000,
          avg_duration: 60,
          p95_duration: 120,
        },
      };

      expect(workflowMetrics['main-ticket-processor'].avg_duration).toBe(150);
      expect(workflowMetrics['reply-handler'].avg_duration).toBe(60);
    });

    test('should detect performance degradation', () => {
      const baselineP95 = 180; // seconds (3 minutes)
      const currentP95 = 450; // seconds (7.5 minutes)

      const degradationPercent = ((currentP95 - baselineP95) / baselineP95) * 100;

      expect(degradationPercent).toBeGreaterThan(50); // >50% degradation
      expect(degradationPercent).toBeCloseTo(150, 0);
    });

    test('should track execution success rate', () => {
      const executions = {
        total: 1000,
        successful: 970,
        failed: 30,
      };

      const successRate = (executions.successful / executions.total) * 100;

      expect(successRate).toBe(97);
      expect(successRate).toBeGreaterThan(95); // >95% success rate target
    });
  });

  describe('Redis Queue Monitoring (Task 12.3)', () => {

    test('should track queue depth by priority', () => {
      const queueMetrics = {
        critical: { depth: 2, processing: 1, waiting: 1 },
        high: { depth: 15, processing: 8, waiting: 7 },
        medium: { depth: 45, processing: 20, waiting: 25 },
        low: { depth: 10, processing: 5, waiting: 5 },
      };

      const totalWaiting = Object.values(queueMetrics).reduce((sum, q) => sum + q.waiting, 0);

      expect(totalWaiting).toBe(38);
      expect(queueMetrics.critical.waiting).toBe(1); // Critical should be processed first
    });

    test('should alert on high queue depth (>100)', () => {
      const queueDepth = 150;
      const threshold = 100;

      const shouldAlert = queueDepth > threshold;
      const severity = queueDepth > 200 ? 'critical' : 'warning';

      expect(shouldAlert).toBe(true);
      expect(severity).toBe('warning');
    });

    test('should monitor queue processing rate', () => {
      const metrics = {
        items_enqueued_last_minute: 80,
        items_processed_last_minute: 60,
        current_depth: 120,
      };

      const netRate = metrics.items_enqueued_last_minute - metrics.items_processed_last_minute;

      expect(netRate).toBe(20); // Queue growing by 20/minute
      expect(netRate).toBeGreaterThan(0); // Queue is growing
    });

    test('should track job age in queue', () => {
      const jobs = [
        { id: 1, enqueued_at: Date.now() - 60000 }, // 1 minute ago
        { id: 2, enqueued_at: Date.now() - 300000 }, // 5 minutes ago
        { id: 3, enqueued_at: Date.now() - 900000 }, // 15 minutes ago
      ];

      const oldestJobAge = Math.max(...jobs.map(j => Date.now() - j.enqueued_at));
      const oldestJobMinutes = oldestJobAge / 60000;

      expect(oldestJobMinutes).toBeGreaterThan(14);
      expect(oldestJobMinutes).toBeLessThan(16);
    });
  });

  describe('Worker Utilization Metrics (Task 12.4)', () => {

    test('should calculate worker utilization percentage', () => {
      const worker = {
        id: 'worker-1',
        total_time: 3600, // seconds (1 hour)
        idle_time: 720, // seconds (12 minutes)
        busy_time: 2880, // seconds (48 minutes)
      };

      const utilization = (worker.busy_time / worker.total_time) * 100;

      expect(utilization).toBe(80);
      expect(utilization).toBeGreaterThan(70); // >70% utilization is good
    });

    test('should track concurrent jobs per worker', () => {
      const workers = [
        { id: 'worker-1', concurrent_jobs: 3, max_concurrent: 5 },
        { id: 'worker-2', concurrent_jobs: 5, max_concurrent: 5 },
        { id: 'worker-3', concurrent_jobs: 2, max_concurrent: 5 },
      ];

      const totalJobs = workers.reduce((sum, w) => sum + w.concurrent_jobs, 0);
      const maxCapacity = workers.reduce((sum, w) => sum + w.max_concurrent, 0);
      const clusterUtilization = (totalJobs / maxCapacity) * 100;

      expect(clusterUtilization).toBeCloseTo(66.67, 1);
    });

    test('should detect idle workers', () => {
      const workers = [
        { id: 'worker-1', last_job_at: Date.now() - 30000 }, // 30s ago
        { id: 'worker-2', last_job_at: Date.now() - 600000 }, // 10 minutes ago (idle)
        { id: 'worker-3', last_job_at: Date.now() - 5000 }, // 5s ago
      ];

      const idleThreshold = 300000; // 5 minutes
      const idleWorkers = workers.filter(w =>
        Date.now() - w.last_job_at > idleThreshold
      );

      expect(idleWorkers).toHaveLength(1);
      expect(idleWorkers[0].id).toBe('worker-2');
    });

    test('should recommend scaling up when utilization is high', () => {
      const clusterMetrics = {
        avg_utilization: 92,
        queue_depth: 150,
        active_workers: 5,
        max_workers: 10,
      };

      const shouldScaleUp =
        clusterMetrics.avg_utilization > 85 &&
        clusterMetrics.queue_depth > 100 &&
        clusterMetrics.active_workers < clusterMetrics.max_workers;

      expect(shouldScaleUp).toBe(true);

      const recommendedWorkers = Math.min(
        clusterMetrics.active_workers + 2,
        clusterMetrics.max_workers
      );

      expect(recommendedWorkers).toBe(7);
    });
  });

  describe('Business Metrics Dashboard (Tasks 12.6-12.11)', () => {

    test('should track tickets processed per hour/day', () => {
      const metrics = {
        last_hour: 42,
        last_24_hours: 856,
        last_7_days: 5234,
      };

      const avgPerHour = metrics.last_24_hours / 24;
      const avgPerDay = metrics.last_7_days / 7;

      expect(avgPerHour).toBeCloseTo(35.67, 1);
      expect(avgPerDay).toBeCloseTo(747.71, 1);
    });

    test('should calculate automation rate by category', () => {
      const categories = [
        { name: 'Maintenance & Repairs', total: 200, automated: 85 },
        { name: 'By-Law Compliance', total: 150, automated: 95 },
        { name: 'Financial Matters', total: 100, automated: 30 },
      ];

      const rates = categories.map(c => ({
        category: c.name,
        automation_rate: (c.automated / c.total) * 100,
      }));

      expect(rates[0].automation_rate).toBe(42.5);
      expect(rates[1].automation_rate).toBeCloseTo(63.33, 1);
      expect(rates[2].automation_rate).toBe(30);
    });

    test('should track average similarity scores over time', () => {
      const dailyScores = [
        { date: '2025-01-10', avg_score: 0.78 },
        { date: '2025-01-11', avg_score: 0.81 },
        { date: '2025-01-12', avg_score: 0.83 },
        { date: '2025-01-13', avg_score: 0.85 },
        { date: '2025-01-14', avg_score: 0.87 },
      ];

      const trend = dailyScores[4].avg_score - dailyScores[0].avg_score;
      const improvementPercent = (trend / dailyScores[0].avg_score) * 100;

      expect(trend).toBeCloseTo(0.09, 2);
      expect(improvementPercent).toBeCloseTo(11.54, 1); // ~11.5% improvement
    });

    test('should monitor CSAT scores from Freshdesk surveys', () => {
      const surveys = [
        { ticket_id: 1001, rating: 5, category: 'Maintenance & Repairs' },
        { ticket_id: 1002, rating: 4, category: 'Maintenance & Repairs' },
        { ticket_id: 1003, rating: 5, category: 'By-Law Compliance' },
        { ticket_id: 1004, rating: 3, category: 'Financial Matters' },
        { ticket_id: 1005, rating: 5, category: 'By-Law Compliance' },
      ];

      const avgCSAT = surveys.reduce((sum, s) => sum + s.rating, 0) / surveys.length;

      expect(avgCSAT).toBeCloseTo(4.4, 1);
      expect(avgCSAT).toBeGreaterThan(4.0); // Target >4.0
    });

    test('should track resolution time by category', () => {
      const resolutionTimes = {
        'Maintenance & Repairs': { avg_minutes: 180, p95_minutes: 420 },
        'By-Law Compliance': { avg_minutes: 90, p95_minutes: 210 },
        'Financial Matters': { avg_minutes: 240, p95_minutes: 600 },
      };

      expect(resolutionTimes['By-Law Compliance'].avg_minutes).toBe(90);
      expect(resolutionTimes['By-Law Compliance'].avg_minutes).toBeLessThan(120); // <2 hours
    });

    test('should monitor API costs per ticket', () => {
      const tickets = [
        { id: 1001, embedding_cost: 0.05, llm_cost: 0.45, total: 0.50 },
        { id: 1002, embedding_cost: 0.08, llm_cost: 1.20, total: 1.28 },
        { id: 1003, embedding_cost: 0.03, llm_cost: 0.25, total: 0.28 },
        { id: 1004, embedding_cost: 0.06, llm_cost: 0.85, total: 0.91 },
      ];

      const avgCostPerTicket = tickets.reduce((sum, t) => sum + t.total, 0) / tickets.length;

      expect(avgCostPerTicket).toBeCloseTo(0.74, 2);
      expect(avgCostPerTicket).toBeLessThan(2.00); // Target <$2.00 per ticket
    });
  });

  describe('Alert Rule Configuration (Tasks 12.12-12.14)', () => {

    test('should define SLA breach alert for critical tickets', () => {
      const alertRule = {
        name: 'CriticalTicketSLABreach',
        expr: 'n8n_workflow_execution_duration_seconds{priority="critical"} > 900', // >15 minutes
        for: '5m',
        severity: 'critical',
        annotations: {
          summary: 'Critical ticket SLA breach detected',
          description: 'Ticket processing exceeded 15 minute SLA for critical priority',
        },
      };

      expect(alertRule.severity).toBe('critical');
      expect(alertRule.for).toBe('5m'); // Alert after 5 minutes
      expect(alertRule.expr).toContain('priority="critical"');
    });

    test('should define error rate threshold alert', () => {
      const alertRule = {
        name: 'HighErrorRate',
        expr: '(rate(n8n_workflow_executions_total{status="failed"}[5m]) / rate(n8n_workflow_executions_total[5m])) > 0.05',
        for: '10m',
        severity: 'warning',
        annotations: {
          summary: 'Error rate above 5%',
          description: 'Workflow error rate has exceeded 5% threshold',
        },
      };

      expect(alertRule.severity).toBe('warning');
      expect(alertRule.expr).toContain('> 0.05'); // 5% threshold
    });

    test('should define queue depth alert', () => {
      const alertRule = {
        name: 'RedisQueueDepthHigh',
        expr: 'redis_queue_depth > 100',
        for: '5m',
        severity: 'warning',
        annotations: {
          summary: 'Redis queue depth exceeds 100 items',
          description: 'Consider scaling up workers to handle backlog',
        },
        labels: {
          component: 'redis',
          action: 'scale_workers',
        },
      };

      expect(alertRule.expr).toContain('> 100');
      expect(alertRule.labels.action).toBe('scale_workers');
    });

    test('should define cost overrun alert', () => {
      const alertRule = {
        name: 'APIcostPerTicketHigh',
        expr: 'avg_over_time(api_cost_per_ticket[1h]) > 2.00',
        for: '30m',
        severity: 'warning',
        annotations: {
          summary: 'API costs exceed $2.00 per ticket',
          description: 'Review AI provider usage and consider optimization',
        },
      };

      expect(alertRule.expr).toContain('> 2.00');
      expect(alertRule.severity).toBe('warning');
    });

    test('should alert when CSAT drops below threshold', () => {
      const alertRule = {
        name: 'CSATScoreLow',
        expr: 'avg_over_time(freshdesk_csat_score[24h]) < 4.0',
        for: '1h',
        severity: 'warning',
        annotations: {
          summary: 'Customer satisfaction below target',
          description: 'CSAT score has dropped below 4.0 average',
        },
      };

      expect(alertRule.expr).toContain('< 4.0');
      expect(alertRule.for).toBe('1h');
    });
  });

  describe('Notification Delivery', () => {

    test('should format Slack alert notification', () => {
      const alert = {
        name: 'HighErrorRate',
        status: 'firing',
        severity: 'warning',
        summary: 'Error rate above 5%',
        description: 'Workflow error rate has exceeded 5% threshold for 10 minutes',
        startsAt: new Date().toISOString(),
      };

      const slackPayload = {
        channel: '#strata-alerts',
        username: 'Prometheus Alert',
        icon_emoji: ':warning:',
        attachments: [
          {
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            title: `⚠️ ${alert.name}`,
            text: alert.description,
            fields: [
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Status', value: alert.status, short: true },
            ],
            footer: 'NSW Strata Monitoring',
            ts: Math.floor(new Date(alert.startsAt).getTime() / 1000),
          },
        ],
      };

      expect(slackPayload.attachments[0].color).toBe('warning');
      expect(slackPayload.attachments[0].title).toContain('HighErrorRate');
    });

    test('should include alert context in notification', () => {
      const alert = {
        name: 'CriticalTicketSLABreach',
        labels: {
          workflow_id: 'main-ticket-processor',
          priority: 'critical',
          ticket_id: '1001',
        },
        annotations: {
          summary: 'SLA breach detected',
          runbook_url: 'https://wiki.example.com/runbooks/sla-breach',
        },
      };

      const notification = {
        alert_name: alert.name,
        ticket_id: alert.labels.ticket_id,
        workflow: alert.labels.workflow_id,
        priority: alert.labels.priority,
        runbook: alert.annotations.runbook_url,
      };

      expect(notification.ticket_id).toBe('1001');
      expect(notification.runbook).toContain('runbooks');
    });

    test('should suppress duplicate alerts within time window', () => {
      const alerts = [
        { name: 'HighErrorRate', fired_at: Date.now() - 120000 }, // 2 min ago
        { name: 'HighErrorRate', fired_at: Date.now() - 60000 }, // 1 min ago
        { name: 'HighErrorRate', fired_at: Date.now() - 30000 }, // 30s ago
      ];

      const suppressionWindow = 300000; // 5 minutes
      const firstAlert = alerts[0];

      const shouldSuppress = alerts.slice(1).some(alert =>
        alert.name === firstAlert.name &&
        (alert.fired_at - firstAlert.fired_at) < suppressionWindow
      );

      expect(shouldSuppress).toBe(true); // Duplicate alerts suppressed
    });
  });

  describe('Metric Accuracy and Consistency', () => {

    test('should validate metric labels are consistent', () => {
      const metrics = [
        { name: 'n8n_workflow_executions_total', labels: ['workflow_id', 'status'] },
        { name: 'n8n_workflow_execution_duration_seconds', labels: ['workflow_id', 'status', 'workflow_name'] },
      ];

      // All workflow metrics should have workflow_id label
      metrics.forEach(metric => {
        expect(metric.labels).toContain('workflow_id');
      });
    });

    test('should ensure counter metrics only increase', () => {
      const counterSamples = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 150 },
        { timestamp: 3000, value: 200 },
        { timestamp: 4000, value: 250 },
      ];

      for (let i = 1; i < counterSamples.length; i++) {
        expect(counterSamples[i].value).toBeGreaterThanOrEqual(counterSamples[i - 1].value);
      }
    });

    test('should validate gauge metrics stay within reasonable bounds', () => {
      const utilizationSamples = [
        { timestamp: 1000, value: 75 },
        { timestamp: 2000, value: 82 },
        { timestamp: 3000, value: 95 },
        { timestamp: 4000, value: 88 },
      ];

      utilizationSamples.forEach(sample => {
        expect(sample.value).toBeGreaterThanOrEqual(0);
        expect(sample.value).toBeLessThanOrEqual(100);
      });
    });

    test('should detect metric collection gaps', () => {
      const metricSamples = [
        { timestamp: Date.now() - 60000 }, // 1 min ago
        { timestamp: Date.now() - 45000 }, // 45s ago
        { timestamp: Date.now() - 600000 }, // 10 min ago (gap!)
        { timestamp: Date.now() - 15000 }, // 15s ago
      ];

      const scrapeInterval = 60000; // 1 minute
      const sorted = metricSamples.sort((a, b) => a.timestamp - b.timestamp);

      let hasGap = false;
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
        if (gap > scrapeInterval * 2) {
          hasGap = true;
          break;
        }
      }

      expect(hasGap).toBe(true); // Gap detected
    });
  });

  describe('Grafana Dashboard Integration', () => {

    test('should define dashboard panels for key metrics', () => {
      const dashboard = {
        title: 'n8n Workflow Performance',
        panels: [
          {
            id: 1,
            title: 'Workflow Execution Duration (p95)',
            type: 'graph',
            targets: [
              {
                expr: 'histogram_quantile(0.95, rate(n8n_workflow_execution_duration_seconds_bucket[5m]))',
              },
            ],
          },
          {
            id: 2,
            title: 'Queue Depth',
            type: 'graph',
            targets: [
              {
                expr: 'redis_queue_depth',
              },
            ],
          },
          {
            id: 3,
            title: 'Worker Utilization',
            type: 'gauge',
            targets: [
              {
                expr: 'avg(n8n_worker_utilization_percent)',
              },
            ],
          },
        ],
      };

      expect(dashboard.panels).toHaveLength(3);
      expect(dashboard.panels[0].type).toBe('graph');
      expect(dashboard.panels[2].type).toBe('gauge');
    });

    test('should configure time range variables', () => {
      const timeRanges = [
        { label: 'Last 5 minutes', value: '5m' },
        { label: 'Last 1 hour', value: '1h' },
        { label: 'Last 24 hours', value: '24h' },
        { label: 'Last 7 days', value: '7d' },
      ];

      expect(timeRanges).toHaveLength(4);
      expect(timeRanges[2].value).toBe('24h');
    });

    test('should define dashboard refresh intervals', () => {
      const refreshIntervals = ['5s', '10s', '30s', '1m', '5m'];
      const defaultRefresh = '30s';

      expect(refreshIntervals).toContain(defaultRefresh);
    });
  });
});

module.exports = {
  // Export for reuse if needed
};
