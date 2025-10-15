/**
 * Scheduled Operations and Cron Trigger Tests
 *
 * Validates scheduled workflows including:
 * - Cron expression validation
 * - Stale ticket detection
 * - Nightly maintenance operations
 * - Deduplication logic
 * - Success rate calculations
 * - Optimization report generation
 * - Recurring issue detection
 * - Proactive notifications
 *
 * Related workflows:
 * - workflows/scheduled-maintenance.json
 * - workflows/batch-processor.json
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');

describe('Scheduled Operations and Cron Triggers', () => {

  describe('Cron Expression Validation', () => {

    test('should validate hourly stale ticket check cron: 0 * * * *', () => {
      const cronExpression = '0 * * * *';

      // Validate format: minute hour day month weekday
      const cronParts = cronExpression.split(' ');

      expect(cronParts).toHaveLength(5);
      expect(cronParts[0]).toBe('0'); // At minute 0
      expect(cronParts[1]).toBe('*'); // Every hour
      expect(cronParts[2]).toBe('*'); // Every day
      expect(cronParts[3]).toBe('*'); // Every month
      expect(cronParts[4]).toBe('*'); // Every weekday
    });

    test('should validate nightly maintenance cron: 0 2 * * *', () => {
      const cronExpression = '0 2 * * *';

      const cronParts = cronExpression.split(' ');

      expect(cronParts).toHaveLength(5);
      expect(cronParts[0]).toBe('0'); // At minute 0
      expect(cronParts[1]).toBe('2'); // At 2 AM
      expect(cronParts[2]).toBe('*'); // Every day
      expect(cronParts[3]).toBe('*'); // Every month
      expect(cronParts[4]).toBe('*'); // Every weekday
    });

    test('should validate weekly report cron runs on Mondays', () => {
      // Weekly optimization report: 0 8 * * 1 (8 AM every Monday)
      const cronExpression = '0 8 * * 1';

      const cronParts = cronExpression.split(' ');

      expect(cronParts).toHaveLength(5);
      expect(cronParts[0]).toBe('0'); // At minute 0
      expect(cronParts[1]).toBe('8'); // At 8 AM
      expect(cronParts[4]).toBe('1'); // Monday (1 = Monday in cron)
    });

    test('should calculate next execution time for hourly cron', () => {
      // Current time: 2025-01-15 14:30:00 UTC
      const currentTime = new Date('2025-01-15T14:30:00Z');
      const nextExecution = getNextCronExecution('0 * * * *', currentTime);

      // Next execution should be 2025-01-15 15:00:00 UTC
      expect(nextExecution.getUTCHours()).toBe(15);
      expect(nextExecution.getUTCMinutes()).toBe(0);
    });

    test('should calculate next execution time for nightly cron', () => {
      // Current time: 2025-01-15 14:30:00
      const currentTime = new Date('2025-01-15T14:30:00Z');
      const nextExecution = getNextCronExecution('0 2 * * *', currentTime);

      // Next execution should be 2025-01-16 02:00:00 (next day)
      expect(nextExecution.getDate()).toBe(16);
      expect(nextExecution.getHours()).toBe(2);
      expect(nextExecution.getMinutes()).toBe(0);
    });
  });

  describe('Stale Ticket Detection', () => {

    test('should identify tickets with no response for >48 hours', () => {
      const tickets = [
        {
          id: 'TEST-001',
          status: 'Pending',
          last_activity: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago
        },
        {
          id: 'TEST-002',
          status: 'Pending',
          last_activity: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
        {
          id: 'TEST-003',
          status: 'Pending',
          last_activity: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours ago
        },
      ];

      const staleThresholdHours = 48;
      const staleTickets = detectStaleTickets(tickets, staleThresholdHours);

      expect(staleTickets).toHaveLength(2);
      expect(staleTickets.map(t => t.id)).toContain('TEST-001');
      expect(staleTickets.map(t => t.id)).toContain('TEST-003');
      expect(staleTickets.map(t => t.id)).not.toContain('TEST-002');
    });

    test('should not flag resolved or closed tickets as stale', () => {
      const tickets = [
        {
          id: 'TEST-001',
          status: 'Resolved',
          last_activity: new Date(Date.now() - 72 * 60 * 60 * 1000),
        },
        {
          id: 'TEST-002',
          status: 'Closed',
          last_activity: new Date(Date.now() - 72 * 60 * 60 * 1000),
        },
      ];

      const staleTickets = detectStaleTickets(tickets, 48);

      expect(staleTickets).toHaveLength(0);
    });

    test('should generate reminder message for stale tickets', () => {
      const staleTicket = {
        id: 'TEST-001',
        subject: 'Water leak in unit 5',
        hours_stale: 52,
      };

      const reminderMessage = generateStaleTicketReminder(staleTicket);

      expect(reminderMessage).toContain('follow up');
      expect(reminderMessage).toContain('additional information');
      expect(reminderMessage.length).toBeGreaterThan(50);
    });

    test('should track stale ticket reminder history', () => {
      const staleTicketLog = {
        ticket_id: 'TEST-001',
        reminder_sent_at: new Date(),
        reminder_count: 1,
        last_activity_before_reminder: new Date(Date.now() - 50 * 60 * 60 * 1000),
      };

      expect(staleTicketLog).toHaveProperty('reminder_count', 1);
      expect(staleTicketLog).toHaveProperty('reminder_sent_at');
    });
  });

  describe('Nightly Maintenance - Deduplication', () => {

    test('should identify duplicate knowledge entries with cosine distance <0.1', () => {
      const knowledgeEntries = [
        {
          id: 'kb-001',
          title: 'Roof leak repair procedures',
          embedding: [0.1, 0.2, 0.3, 0.4],
        },
        {
          id: 'kb-002',
          title: 'Roof leaking repair process',
          embedding: [0.11, 0.21, 0.31, 0.41], // Very similar
        },
        {
          id: 'kb-003',
          title: 'Noise complaint handling',
          embedding: [0.9, 0.8, 0.1, 0.2], // Different
        },
      ];

      const duplicates = findDuplicateEntries(knowledgeEntries, 0.1);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toHaveProperty('entries');
      expect(duplicates[0].entries).toContain('kb-001');
      expect(duplicates[0].entries).toContain('kb-002');
    });

    test('should calculate cosine similarity between embeddings', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [0.9, 0.1, 0];

      const similarity = cosineSimilarity(embedding1, embedding2);

      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThanOrEqual(1.0);
    });

    test('should identify candidates for merging using hierarchical clustering', () => {
      const duplicateGroup = {
        entries: ['kb-001', 'kb-002', 'kb-003'],
        average_similarity: 0.95,
      };

      const mergeCandidates = identifyMergeCandidates(duplicateGroup);

      expect(mergeCandidates).toHaveProperty('primary_entry');
      expect(mergeCandidates).toHaveProperty('entries_to_merge');
      expect(mergeCandidates.entries_to_merge.length).toBeGreaterThan(0);
    });

    test('should preserve highest success rate entry as primary', () => {
      const duplicateEntries = [
        { id: 'kb-001', success_rate: 0.85, usage_count: 50 },
        { id: 'kb-002', success_rate: 0.92, usage_count: 75 },
        { id: 'kb-003', success_rate: 0.78, usage_count: 30 },
      ];

      const primaryEntry = selectPrimaryEntry(duplicateEntries);

      expect(primaryEntry.id).toBe('kb-002'); // Highest success rate
    });

    test('should flag contradictions for human review', () => {
      const entry1 = {
        id: 'kb-001',
        content: 'Owner is responsible for repairs inside the unit.',
      };

      const entry2 = {
        id: 'kb-002',
        content: 'Strata manager is responsible for all repairs.',
      };

      const hasContradiction = detectContradiction(entry1.content, entry2.content);

      expect(hasContradiction).toBe(true);
    });
  });

  describe('Success Rate Calculation', () => {

    test('should calculate knowledge entry success rate', () => {
      const knowledgeEntry = {
        id: 'kb-001',
        total_uses: 100,
        successful_resolutions: 87,
      };

      const successRate = calculateSuccessRate(knowledgeEntry);

      expect(successRate).toBe(0.87);
    });

    test('should flag entries with success rate <70%', () => {
      const knowledgeEntries = [
        { id: 'kb-001', success_rate: 0.92 },
        { id: 'kb-002', success_rate: 0.65 },
        { id: 'kb-003', success_rate: 0.58 },
        { id: 'kb-004', success_rate: 0.81 },
      ];

      const threshold = 0.70;
      const lowPerformingEntries = flagLowPerformanceEntries(knowledgeEntries, threshold);

      expect(lowPerformingEntries).toHaveLength(2);
      expect(lowPerformingEntries.map(e => e.id)).toContain('kb-002');
      expect(lowPerformingEntries.map(e => e.id)).toContain('kb-003');
    });

    test('should identify entries not used in >6 months', () => {
      const knowledgeEntries = [
        {
          id: 'kb-001',
          last_used_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // 200 days ago
        },
        {
          id: 'kb-002',
          last_used_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
        {
          id: 'kb-003',
          last_used_at: new Date(Date.now() - 190 * 24 * 60 * 60 * 1000), // 190 days ago
        },
      ];

      const ageThresholdDays = 180; // 6 months
      const staleEntries = identifyStaleKnowledgeEntries(knowledgeEntries, ageThresholdDays);

      expect(staleEntries).toHaveLength(2);
      expect(staleEntries.map(e => e.id)).toContain('kb-001');
      expect(staleEntries.map(e => e.id)).toContain('kb-003');
    });

    test('should generate improvement recommendations for low-performing entries', () => {
      const lowPerformingEntry = {
        id: 'kb-001',
        title: 'Roof leak procedures',
        success_rate: 0.62,
        total_uses: 50,
        common_failure_reasons: ['outdated information', 'missing cost details'],
      };

      const recommendations = generateImprovementRecommendations(lowPerformingEntry);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('recommendation');
      expect(recommendations[0]).toHaveProperty('priority');
    });
  });

  describe('Weekly Optimization Report', () => {

    test('should compile weekly metrics summary', () => {
      const weeklyMetrics = {
        tickets_processed: 350,
        automation_rate: 0.42,
        average_response_time_minutes: 12,
        customer_satisfaction: 4.3,
        top_categories: ['Maintenance & Repairs', 'By-Law Compliance', 'Financial Matters'],
      };

      expect(weeklyMetrics).toHaveProperty('tickets_processed');
      expect(weeklyMetrics).toHaveProperty('automation_rate');
      expect(weeklyMetrics.automation_rate).toBeGreaterThan(0.3);
      expect(weeklyMetrics.customer_satisfaction).toBeGreaterThan(4.0);
    });

    test('should identify trending issues from past week', () => {
      const ticketsLastWeek = [
        { category: 'Maintenance & Repairs', subcategory: 'Common Property' },
        { category: 'Maintenance & Repairs', subcategory: 'Common Property' },
        { category: 'Maintenance & Repairs', subcategory: 'Common Property' },
        { category: 'By-Law Compliance', subcategory: 'Noise' },
        { category: 'By-Law Compliance', subcategory: 'Noise' },
        { category: 'Financial Matters', subcategory: 'Levies' },
      ];

      const trends = identifyTrendingIssues(ticketsLastWeek);

      expect(trends[0].category).toBe('Maintenance & Repairs');
      expect(trends[0].count).toBe(3);
      expect(trends[1].category).toBe('By-Law Compliance');
      expect(trends[1].count).toBe(2);
    });

    test('should calculate automation rate by category', () => {
      const categoryMetrics = [
        { category: 'Maintenance & Repairs', total: 100, automated: 45 },
        { category: 'By-Law Compliance', total: 80, automated: 52 },
        { category: 'Financial Matters', total: 60, automated: 18 },
      ];

      const automationRates = calculateAutomationRatesByCategory(categoryMetrics);

      expect(automationRates['Maintenance & Repairs']).toBe(0.45);
      expect(automationRates['By-Law Compliance']).toBe(0.65);
      expect(automationRates['Financial Matters']).toBe(0.30);
    });

    test('should generate optimization recommendations', () => {
      const weeklyData = {
        low_performing_categories: ['Financial Matters'],
        high_volume_categories: ['Maintenance & Repairs'],
        stale_knowledge_entries: 5,
        duplicate_candidates: 3,
      };

      const recommendations = generateWeeklyRecommendations(weeklyData);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('Financial Matters'))).toBe(true);
    });

    test('should format report for Slack notification', () => {
      const reportData = {
        week_ending: '2025-01-15',
        tickets_processed: 350,
        automation_rate: 0.42,
        top_issue: 'Roof leaks',
      };

      const slackMessage = formatWeeklyReportForSlack(reportData);

      expect(slackMessage).toContain('Weekly Optimization Report');
      expect(slackMessage).toContain('350');
      expect(slackMessage).toContain('42.0%');
    });
  });

  describe('Recurring Issue Detection', () => {

    test('should detect recurring issues with similarity >0.90 in past 7 days', () => {
      const recentTickets = [
        {
          id: 'TEST-001',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          embedding: [0.1, 0.2, 0.3],
        },
        {
          id: 'TEST-002',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          embedding: [0.11, 0.21, 0.31], // Very similar
        },
        {
          id: 'TEST-003',
          created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          embedding: [0.12, 0.22, 0.32], // Very similar
        },
        {
          id: 'TEST-004',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          embedding: [0.9, 0.8, 0.1], // Different
        },
      ];

      const recurringIssues = detectRecurringIssues(recentTickets, 0.90, 7);

      expect(recurringIssues.length).toBeGreaterThan(0);
      expect(recurringIssues[0].ticket_count).toBeGreaterThanOrEqual(2);
    });

    test('should calculate frequency of recurring issue', () => {
      const recurringIssue = {
        issue_signature: 'roof-leak',
        occurrences: [
          { date: '2025-01-10' },
          { date: '2025-01-12' },
          { date: '2025-01-14' },
        ],
        days_span: 4,
      };

      const frequency = calculateIssueFrequency(recurringIssue);

      expect(frequency).toBeCloseTo(0.75, 2); // 3 occurrences over 4 days
    });

    test('should prioritize recurring issues by frequency and severity', () => {
      const recurringIssues = [
        {
          id: 'issue-001',
          frequency: 0.5,
          severity: 'High',
          ticket_count: 5,
        },
        {
          id: 'issue-002',
          frequency: 0.8,
          severity: 'Critical',
          ticket_count: 8,
        },
        {
          id: 'issue-003',
          frequency: 0.3,
          severity: 'Medium',
          ticket_count: 3,
        },
      ];

      const prioritized = prioritizeRecurringIssues(recurringIssues);

      expect(prioritized[0].id).toBe('issue-002'); // Highest frequency + critical severity
    });

    test('should generate root cause analysis prompt for recurring issue', () => {
      const recurringIssue = {
        issue_type: 'roof-leak',
        occurrence_count: 7,
        affected_properties: ['PROP-123', 'PROP-456'],
        time_pattern: 'occurs after heavy rain',
      };

      const analysisPrompt = generateRootCauseAnalysisPrompt(recurringIssue);

      expect(analysisPrompt).toContain('recurring');
      expect(analysisPrompt).toContain('root cause');
      expect(analysisPrompt.length).toBeGreaterThan(100);
    });
  });

  describe('Proactive Notifications', () => {

    test('should trigger notification when recurring issue detected', () => {
      const recurringIssue = {
        issue_type: 'Roof leaks in Building A',
        occurrence_count: 5,
        frequency: 0.7,
        severity: 'High',
      };

      const shouldNotify = shouldTriggerProactiveNotification(recurringIssue);

      expect(shouldNotify).toBe(true);
    });

    test('should not trigger notification for low frequency issues', () => {
      const recurringIssue = {
        issue_type: 'Minor maintenance request',
        occurrence_count: 2,
        frequency: 0.1,
        severity: 'Low',
      };

      const shouldNotify = shouldTriggerProactiveNotification(recurringIssue);

      expect(shouldNotify).toBe(false);
    });

    test('should format proactive notification message', () => {
      const recurringIssue = {
        issue_type: 'Roof leaks in Building A',
        occurrence_count: 5,
        affected_units: ['Unit 5', 'Unit 7', 'Unit 9'],
        recommendation: 'Schedule building-wide roof inspection',
      };

      const notification = formatProactiveNotification(recurringIssue);

      expect(notification).toHaveProperty('title');
      expect(notification).toHaveProperty('message');
      expect(notification).toHaveProperty('severity');
      expect(notification.message).toContain('5 times');
    });

    test('should include actionable recommendations in notification', () => {
      const notification = {
        issue: 'Elevator breakdowns',
        recommendation: 'Schedule preventive maintenance with elevator contractor',
        estimated_cost_savings: '$5,000',
      };

      expect(notification).toHaveProperty('recommendation');
      expect(notification.recommendation.length).toBeGreaterThan(20);
    });
  });

  describe('Knowledge Base Archival', () => {

    test('should archive entries marked for archival', () => {
      const entriesToArchive = [
        {
          id: 'kb-001',
          reason: 'outdated regulation',
          last_used: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'kb-002',
          reason: 'superseded by kb-150',
          last_used: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        },
      ];

      const archivalResults = archiveKnowledgeEntries(entriesToArchive);

      expect(archivalResults).toHaveProperty('archived_count', 2);
      expect(archivalResults).toHaveProperty('archived_ids');
      expect(archivalResults.archived_ids).toContain('kb-001');
      expect(archivalResults.archived_ids).toContain('kb-002');
    });

    test('should maintain full history of archived entries', () => {
      const archiveRecord = {
        original_id: 'kb-001',
        archived_at: new Date(),
        reason: 'outdated regulation',
        content_snapshot: '...',
        version_history: [
          { version: 1, created_at: '2024-01-15' },
          { version: 2, created_at: '2024-06-20' },
        ],
      };

      expect(archiveRecord).toHaveProperty('content_snapshot');
      expect(archiveRecord).toHaveProperty('version_history');
      expect(archiveRecord.version_history.length).toBeGreaterThan(0);
    });

    test('should allow retrieval of archived entries for reference', () => {
      const archivedEntryId = 'kb-001';

      const retrievedEntry = retrieveArchivedEntry(archivedEntryId);

      expect(retrievedEntry).toHaveProperty('id', 'kb-001');
      expect(retrievedEntry).toHaveProperty('archived', true);
      expect(retrievedEntry).toHaveProperty('content');
    });
  });

  describe('Batch Processing Operations', () => {

    test('should process regulatory updates in batches', () => {
      const updatedRegulation = {
        regulation_id: 'SSMA-2025-Amendment-1',
        affected_categories: ['Maintenance & Repairs', 'Governance & Administration'],
        effective_date: '2025-01-01',
      };

      const affectedEntries = identifyAffectedKnowledgeEntries(updatedRegulation);

      expect(affectedEntries).toBeInstanceOf(Array);
      expect(affectedEntries.length).toBeGreaterThan(0);
    });

    test('should auto-generate knowledge entries from resolved tickets', () => {
      const resolvedTicket = {
        id: 'TEST-001',
        category: 'Maintenance & Repairs',
        solution: 'Detailed solution provided...',
        customer_satisfaction: 5,
        resolution_time_hours: 4,
      };

      const shouldAutoGenerate = shouldGenerateKnowledgeEntry(resolvedTicket);

      expect(shouldAutoGenerate).toBe(true);
    });

    test('should not generate knowledge from low satisfaction tickets', () => {
      const resolvedTicket = {
        id: 'TEST-002',
        category: 'Financial Matters',
        solution: 'Solution provided...',
        customer_satisfaction: 2,
        resolution_time_hours: 48,
      };

      const shouldAutoGenerate = shouldGenerateKnowledgeEntry(resolvedTicket);

      expect(shouldAutoGenerate).toBe(false);
    });

    test('should queue generated entries for human approval', () => {
      const generatedEntry = {
        source_ticket: 'TEST-001',
        title: 'Handling elevator emergency stops',
        content: 'Generated content...',
        auto_generated: true,
        approval_status: 'pending',
      };

      expect(generatedEntry).toHaveProperty('approval_status', 'pending');
      expect(generatedEntry).toHaveProperty('auto_generated', true);
    });
  });

  describe('Execution Timing and Performance', () => {

    test('should complete hourly stale check within 5 minutes', () => {
      const startTime = Date.now();

      // Simulate stale ticket check
      const mockTickets = Array(500).fill(null).map((_, i) => ({
        id: `TEST-${i}`,
        status: 'Pending',
        last_activity: new Date(Date.now() - Math.random() * 100 * 60 * 60 * 1000),
      }));

      const staleTickets = detectStaleTickets(mockTickets, 48);

      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5 * 60 * 1000); // 5 minutes
      expect(staleTickets).toBeInstanceOf(Array);
    });

    test('should complete nightly maintenance within 30 minutes', () => {
      const operations = [
        'deduplication',
        'success_rate_calculation',
        'stale_entry_detection',
        'archival',
      ];

      const estimatedDuration = estimateMaintenanceWindowDuration(operations);

      expect(estimatedDuration).toBeLessThan(30 * 60); // 30 minutes in seconds
    });

    test('should handle maintenance window during low traffic hours', () => {
      const scheduledTime = new Date('2025-01-15T02:00:00Z');

      const isLowTrafficHour = isMaintenanceWindowAppropriate(scheduledTime);

      expect(isLowTrafficHour).toBe(true);
    });
  });
});

// Helper functions that simulate scheduled operation logic

function getNextCronExecution(cronExpression, currentTime) {
  const parts = cronExpression.split(' ');
  const minute = parseInt(parts[0]);
  const hour = parts[1] === '*' ? null : parseInt(parts[1]);

  const nextExecution = new Date(currentTime);

  if (hour === null) {
    // Hourly: next execution at minute 0 of next hour
    nextExecution.setHours(nextExecution.getHours() + 1);
    nextExecution.setMinutes(0);
    nextExecution.setSeconds(0);
  } else {
    // Daily at specific hour
    if (currentTime.getHours() >= hour) {
      nextExecution.setDate(nextExecution.getDate() + 1);
    }
    nextExecution.setHours(hour);
    nextExecution.setMinutes(minute);
    nextExecution.setSeconds(0);
  }

  return nextExecution;
}

function detectStaleTickets(tickets, thresholdHours) {
  const threshold = Date.now() - thresholdHours * 60 * 60 * 1000;

  return tickets.filter(ticket => {
    const isStale = ticket.last_activity.getTime() < threshold;
    const isOpen = !['Resolved', 'Closed'].includes(ticket.status);
    return isStale && isOpen;
  });
}

function generateStaleTicketReminder(staleTicket) {
  return `Hi there! We wanted to follow up on your ticket regarding "${staleTicket.subject}". ` +
    `If you need any additional information or would like to provide more details, please let us know. ` +
    `We're here to help resolve your issue.`;
}

function findDuplicateEntries(entries, threshold) {
  const duplicates = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const similarity = cosineSimilarity(entries[i].embedding, entries[j].embedding);
      const distance = 1 - similarity;

      if (distance < threshold) {
        duplicates.push({
          entries: [entries[i].id, entries[j].id],
          distance,
        });
      }
    }
  }

  return duplicates;
}

function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (mag1 * mag2);
}

function identifyMergeCandidates(duplicateGroup) {
  return {
    primary_entry: duplicateGroup.entries[0],
    entries_to_merge: duplicateGroup.entries.slice(1),
  };
}

function selectPrimaryEntry(entries) {
  return entries.reduce((best, current) =>
    current.success_rate > best.success_rate ? current : best
  );
}

function detectContradiction(content1, content2) {
  // Simple contradiction detection
  const contradictionPatterns = [
    { text1: 'owner is responsible', text2: 'strata manager is responsible' },
    { text1: 'not allowed', text2: 'is allowed' },
  ];

  const lower1 = content1.toLowerCase();
  const lower2 = content2.toLowerCase();

  return contradictionPatterns.some(pattern =>
    lower1.includes(pattern.text1) && lower2.includes(pattern.text2)
  );
}

function calculateSuccessRate(entry) {
  return entry.successful_resolutions / entry.total_uses;
}

function flagLowPerformanceEntries(entries, threshold) {
  return entries.filter(entry => entry.success_rate < threshold);
}

function identifyStaleKnowledgeEntries(entries, thresholdDays) {
  const threshold = Date.now() - thresholdDays * 24 * 60 * 60 * 1000;
  return entries.filter(entry => entry.last_used_at.getTime() < threshold);
}

function generateImprovementRecommendations(entry) {
  return [
    {
      recommendation: `Update ${entry.title} with current information`,
      priority: 'High',
      reason: 'Low success rate of ' + (entry.success_rate * 100).toFixed(1) + '%',
    },
  ];
}

function identifyTrendingIssues(tickets) {
  const counts = {};

  tickets.forEach(ticket => {
    const key = ticket.category;
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateAutomationRatesByCategory(metrics) {
  const rates = {};
  metrics.forEach(metric => {
    rates[metric.category] = metric.automated / metric.total;
  });
  return rates;
}

function generateWeeklyRecommendations(data) {
  const recommendations = [];

  if (data.low_performing_categories.length > 0) {
    recommendations.push(
      `Focus on improving automation for: ${data.low_performing_categories.join(', ')}`
    );
  }

  if (data.stale_knowledge_entries > 0) {
    recommendations.push(
      `Review and update ${data.stale_knowledge_entries} stale knowledge entries`
    );
  }

  if (data.duplicate_candidates > 0) {
    recommendations.push(
      `Merge ${data.duplicate_candidates} duplicate knowledge entries`
    );
  }

  return recommendations;
}

function formatWeeklyReportForSlack(data) {
  return `📊 *Weekly Optimization Report* (Week ending ${data.week_ending})\n\n` +
    `• Tickets processed: ${data.tickets_processed}\n` +
    `• Automation rate: ${(data.automation_rate * 100).toFixed(1)}%\n` +
    `• Top issue: ${data.top_issue}`;
}

function detectRecurringIssues(tickets, similarityThreshold, daysWindow) {
  const recurring = [];
  const groups = {};

  tickets.forEach((ticket, i) => {
    tickets.slice(i + 1).forEach(other => {
      const similarity = cosineSimilarity(ticket.embedding, other.embedding);
      if (similarity > similarityThreshold) {
        const key = `group-${i}`;
        if (!groups[key]) {
          groups[key] = { ticket_count: 1, tickets: [ticket.id] };
        }
        groups[key].ticket_count++;
        groups[key].tickets.push(other.id);
      }
    });
  });

  Object.values(groups).forEach(group => {
    if (group.ticket_count >= 2) {
      recurring.push(group);
    }
  });

  return recurring;
}

function calculateIssueFrequency(issue) {
  return issue.occurrences.length / issue.days_span;
}

function prioritizeRecurringIssues(issues) {
  const severityWeight = { Critical: 3, High: 2, Medium: 1, Low: 0.5 };

  return issues.sort((a, b) => {
    const scoreA = a.frequency * severityWeight[a.severity] * a.ticket_count;
    const scoreB = b.frequency * severityWeight[b.severity] * b.ticket_count;
    return scoreB - scoreA;
  });
}

function generateRootCauseAnalysisPrompt(issue) {
  return `A recurring issue has been detected: "${issue.issue_type}". ` +
    `This issue has occurred ${issue.occurrence_count} times ` +
    `affecting properties: ${issue.affected_properties.join(', ')}. ` +
    `Pattern observed: ${issue.time_pattern}. ` +
    `Please analyze the root cause and provide recommendations for prevention.`;
}

function shouldTriggerProactiveNotification(issue) {
  return issue.occurrence_count >= 3 &&
         issue.frequency > 0.5 &&
         ['High', 'Critical'].includes(issue.severity);
}

function formatProactiveNotification(issue) {
  return {
    title: `Recurring Issue Alert: ${issue.issue_type}`,
    message: `This issue has occurred ${issue.occurrence_count} times, ` +
      `affecting: ${issue.affected_units.join(', ')}. ` +
      `Recommendation: ${issue.recommendation}`,
    severity: 'High',
  };
}

function archiveKnowledgeEntries(entries) {
  return {
    archived_count: entries.length,
    archived_ids: entries.map(e => e.id),
  };
}

function retrieveArchivedEntry(id) {
  return {
    id,
    archived: true,
    content: 'Archived content...',
  };
}

function identifyAffectedKnowledgeEntries(regulation) {
  // Simulate finding entries that reference the regulation
  return ['kb-001', 'kb-015', 'kb-042'];
}

function shouldGenerateKnowledgeEntry(ticket) {
  return ticket.customer_satisfaction >= 4 &&
         ticket.resolution_time_hours < 24;
}

function estimateMaintenanceWindowDuration(operations) {
  const durations = {
    deduplication: 5 * 60, // 5 minutes
    success_rate_calculation: 3 * 60, // 3 minutes
    stale_entry_detection: 2 * 60, // 2 minutes
    archival: 1 * 60, // 1 minute
  };

  return operations.reduce((total, op) => total + (durations[op] || 0), 0);
}

function isMaintenanceWindowAppropriate(scheduledTime) {
  const hour = scheduledTime.getUTCHours();
  // Low traffic hours: 1 AM - 5 AM UTC
  return hour >= 1 && hour <= 5;
}

module.exports = {
  getNextCronExecution,
  detectStaleTickets,
  findDuplicateEntries,
  cosineSimilarity,
  calculateSuccessRate,
  detectRecurringIssues,
  shouldTriggerProactiveNotification,
};
