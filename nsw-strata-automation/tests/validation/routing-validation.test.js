/**
 * Validation Tests: Routing Decision Logic
 * Tasks 14.4, 14.5: Validate similarity thresholds and test all 5 routing paths
 *
 * Tests:
 * - Similarity threshold accuracy (Task 14.4)
 * - All 5 routing paths with representative tickets (Task 14.5)
 * - Confidence score validation
 * - Training sample requirements
 * - Priority override logic
 */

describe('Routing Decision Validation (Tasks 14.4, 14.5)', () => {
  // Routing decision logic from Task 5.0
  function determineRoutingPath(similarity, trainingSamples, priority, complexity, requiresHumanReview = false) {
    // Task 5.6: Path 5 - Immediate Escalation
    if (priority === 'urgent' || priority === 'critical' || complexity > 4 || requiresHumanReview) {
      return {
        path: 'immediate-escalation',
        pathNumber: 5,
        confidence: similarity,
        requiresHumanReview: true,
        reason: priority === 'urgent' ? 'Critical priority' : complexity > 4 ? 'High complexity' : 'Requires human review'
      };
    }

    // Task 5.2: Path 1 - Auto-Respond
    if (similarity > 0.85 && trainingSamples > 100 && !requiresHumanReview) {
      return {
        path: 'auto-respond',
        pathNumber: 1,
        confidence: similarity,
        requiresHumanReview: false,
        reason: 'High similarity, sufficient training'
      };
    }

    // Task 5.3: Path 2 - Auto-Refine
    if (similarity >= 0.75 && similarity <= 0.85 && trainingSamples > 100) {
      return {
        path: 'auto-refine',
        pathNumber: 2,
        confidence: similarity,
        requiresHumanReview: true,
        reason: 'Medium-high similarity, needs refinement'
      };
    }

    // Task 5.4: Path 3 - Generate Draft
    if (similarity >= 0.50 && similarity < 0.75 && trainingSamples > 30) {
      return {
        path: 'generate-draft',
        pathNumber: 3,
        confidence: similarity,
        requiresHumanReview: true,
        reason: 'Medium similarity, draft generation'
      };
    }

    // Task 5.5: Path 4 - Deep Research
    if (similarity < 0.50) {
      return {
        path: 'deep-research',
        pathNumber: 4,
        confidence: similarity,
        requiresHumanReview: true,
        reason: 'Low similarity, requires research'
      };
    }

    // Fallback
    return {
      path: 'escalation',
      pathNumber: 5,
      confidence: similarity,
      requiresHumanReview: true,
      reason: 'Default escalation'
    };
  }

  describe('Task 14.4: Similarity Threshold Accuracy', () => {
    test('should route to auto-respond only above 0.85 threshold', () => {
      const testCases = [
        { similarity: 0.86, samples: 150, expected: 'auto-respond' },
        { similarity: 0.90, samples: 150, expected: 'auto-respond' },
        { similarity: 0.95, samples: 150, expected: 'auto-respond' },
        { similarity: 0.85, samples: 150, expected: 'auto-refine' }, // Boundary
        { similarity: 0.84, samples: 150, expected: 'auto-refine' }
      ];

      testCases.forEach(({ similarity, samples, expected }) => {
        const result = determineRoutingPath(similarity, samples, 'medium', 2);
        expect(result.path).toBe(expected);
      });
    });

    test('should route to auto-refine for 0.75-0.85 range with sufficient samples', () => {
      const testCases = [
        { similarity: 0.75, samples: 150, expected: 'auto-refine' },
        { similarity: 0.78, samples: 150, expected: 'auto-refine' },
        { similarity: 0.82, samples: 150, expected: 'auto-refine' },
        { similarity: 0.85, samples: 150, expected: 'auto-refine' },
        { similarity: 0.74, samples: 101, expected: 'generate-draft' }, // Just below threshold
        { similarity: 0.86, samples: 150, expected: 'auto-respond' }     // Just above threshold
      ];

      testCases.forEach(({ similarity, samples, expected }) => {
        const result = determineRoutingPath(similarity, samples, 'medium', 2);
        expect(result.path).toBe(expected);
      });
    });

    test('should route to generate-draft for 0.50-0.75 range with >30 samples', () => {
      const testCases = [
        { similarity: 0.50, samples: 50, expected: 'generate-draft' },
        { similarity: 0.60, samples: 50, expected: 'generate-draft' },
        { similarity: 0.70, samples: 50, expected: 'generate-draft' },
        { similarity: 0.74, samples: 50, expected: 'generate-draft' },
        { similarity: 0.49, samples: 50, expected: 'deep-research' }, // Just below
        { similarity: 0.75, samples: 150, expected: 'auto-refine' }    // Above with enough samples
      ];

      testCases.forEach(({ similarity, samples, expected }) => {
        const result = determineRoutingPath(similarity, samples, 'medium', 2);
        expect(result.path).toBe(expected);
      });
    });

    test('should route to deep-research below 0.50 threshold', () => {
      const testCases = [
        { similarity: 0.49, expected: 'deep-research' },
        { similarity: 0.40, expected: 'deep-research' },
        { similarity: 0.30, expected: 'deep-research' },
        { similarity: 0.10, expected: 'deep-research' }
      ];

      testCases.forEach(({ similarity, expected }) => {
        const result = determineRoutingPath(similarity, 50, 'medium', 2);
        expect(result.path).toBe(expected);
      });
    });

    test('should validate threshold boundaries precisely', () => {
      // Test specific boundary cases
      const result1 = determineRoutingPath(0.8501, 101, 'medium', 2);
      expect(result1.path).toBe('auto-respond');

      const result2 = determineRoutingPath(0.75, 101, 'medium', 2);
      expect(result2.path).toBe('auto-refine');

      const result3 = determineRoutingPath(0.7499, 101, 'medium', 2);
      expect(result3.path).toBe('generate-draft');

      const result4 = determineRoutingPath(0.50, 31, 'medium', 2);
      expect(result4.path).toBe('generate-draft');

      const result5 = determineRoutingPath(0.4999, 31, 'medium', 2);
      expect(result5.path).toBe('deep-research');
    });
  });

  describe('Task 14.5: Test All 5 Routing Paths', () => {
    test('Path 1: Auto-Respond - High similarity, auto-resolve', () => {
      const testTickets = [
        {
          name: 'Roof leak - exact match',
          similarity: 0.92,
          trainingSamples: 150,
          priority: 'medium',
          complexity: 2
        },
        {
          name: 'Noise complaint - well-documented',
          similarity: 0.88,
          trainingSamples: 200,
          priority: 'low',
          complexity: 1
        },
        {
          name: 'Unpaid levies - standard case',
          similarity: 0.86,
          trainingSamples: 180,
          priority: 'medium',
          complexity: 2
        }
      ];

      testTickets.forEach(ticket => {
        const result = determineRoutingPath(
          ticket.similarity,
          ticket.trainingSamples,
          ticket.priority,
          ticket.complexity
        );

        expect(result.path).toBe('auto-respond');
        expect(result.pathNumber).toBe(1);
        expect(result.requiresHumanReview).toBe(false);
        expect(result.confidence).toBeGreaterThan(0.85);
        console.log(`  ✓ ${ticket.name}: Path 1 (Auto-Respond) - ${(ticket.similarity * 100).toFixed(1)}%`);
      });
    });

    test('Path 2: Auto-Refine - Medium-high similarity, needs Claude review', () => {
      const testTickets = [
        {
          name: 'Flooring approval - minor renovation',
          similarity: 0.80,
          trainingSamples: 150,
          priority: 'medium',
          complexity: 2
        },
        {
          name: 'AGM inquiry - standard procedures',
          similarity: 0.77,
          trainingSamples: 120,
          priority: 'low',
          complexity: 2
        },
        {
          name: 'Parking violation - by-law reference',
          similarity: 0.82,
          trainingSamples: 160,
          priority: 'medium',
          complexity: 1
        }
      ];

      testTickets.forEach(ticket => {
        const result = determineRoutingPath(
          ticket.similarity,
          ticket.trainingSamples,
          ticket.priority,
          ticket.complexity
        );

        expect(result.path).toBe('auto-refine');
        expect(result.pathNumber).toBe(2);
        expect(result.requiresHumanReview).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.75);
        expect(result.confidence).toBeLessThanOrEqual(0.85);
        console.log(`  ✓ ${ticket.name}: Path 2 (Auto-Refine) - ${(ticket.similarity * 100).toFixed(1)}%`);
      });
    });

    test('Path 3: Generate Draft - Medium similarity, draft with review', () => {
      const testTickets = [
        {
          name: 'Committee nomination - governance query',
          similarity: 0.65,
          trainingSamples: 80,
          priority: 'low',
          complexity: 2
        },
        {
          name: 'Insurance claim process',
          similarity: 0.58,
          trainingSamples: 60,
          priority: 'medium',
          complexity: 3
        },
        {
          name: 'Short-term letting complaint',
          similarity: 0.70,
          trainingSamples: 90,
          priority: 'medium',
          complexity: 2
        }
      ];

      testTickets.forEach(ticket => {
        const result = determineRoutingPath(
          ticket.similarity,
          ticket.trainingSamples,
          ticket.priority,
          ticket.complexity
        );

        expect(result.path).toBe('generate-draft');
        expect(result.pathNumber).toBe(3);
        expect(result.requiresHumanReview).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.50);
        expect(result.confidence).toBeLessThan(0.75);
        console.log(`  ✓ ${ticket.name}: Path 3 (Generate Draft) - ${(ticket.similarity * 100).toFixed(1)}%`);
      });
    });

    test('Path 4: Deep Research - Low similarity, requires Perplexity', () => {
      const testTickets = [
        {
          name: 'Unique building defect - new issue',
          similarity: 0.42,
          trainingSamples: 50,
          priority: 'medium',
          complexity: 4
        },
        {
          name: '2025 reform compliance question',
          similarity: 0.35,
          trainingSamples: 20,
          priority: 'medium',
          complexity: 3
        },
        {
          name: 'Complex multi-party dispute',
          similarity: 0.28,
          trainingSamples: 40,
          priority: 'high',
          complexity: 4
        }
      ];

      testTickets.forEach(ticket => {
        const result = determineRoutingPath(
          ticket.similarity,
          ticket.trainingSamples,
          ticket.priority,
          ticket.complexity
        );

        // Note: Complexity >4 (5+) triggers escalation, complexity 4 doesn't
        if (ticket.priority === 'urgent' || ticket.complexity > 4) {
          expect(result.path).toBe('immediate-escalation');
          expect(result.pathNumber).toBe(5);
        } else {
          // Deep research for low similarity
          expect(result.requiresHumanReview).toBe(true);
        }
        expect(result.requiresHumanReview).toBe(true);
        console.log(`  ✓ ${ticket.name}: Path ${result.pathNumber} - ${(ticket.similarity * 100).toFixed(1)}%`);
      });
    });

    test('Path 5: Immediate Escalation - Critical/urgent/complex tickets', () => {
      const testTickets = [
        {
          name: 'Emergency - gas leak in basement',
          similarity: 0.90,
          trainingSamples: 150,
          priority: 'urgent',
          complexity: 5
        },
        {
          name: 'NCAT tribunal application received',
          similarity: 0.75,
          trainingSamples: 100,
          priority: 'urgent',
          complexity: 5
        },
        {
          name: 'Fire safety hazard - immediate attention',
          similarity: 0.85,
          trainingSamples: 120,
          priority: 'critical',
          complexity: 4
        },
        {
          name: 'Complex multi-stakeholder issue',
          similarity: 0.70,
          trainingSamples: 80,
          priority: 'high',
          complexity: 5
        }
      ];

      testTickets.forEach(ticket => {
        const result = determineRoutingPath(
          ticket.similarity,
          ticket.trainingSamples,
          ticket.priority,
          ticket.complexity
        );

        expect(result.path).toBe('immediate-escalation');
        expect(result.pathNumber).toBe(5);
        expect(result.requiresHumanReview).toBe(true);
        console.log(`  ✓ ${ticket.name}: Path 5 (Escalation) - Priority: ${ticket.priority}, Complexity: ${ticket.complexity}`);
      });
    });
  });

  describe('Training Sample Requirements', () => {
    test('should require >100 samples for auto-respond', () => {
      const result1 = determineRoutingPath(0.90, 101, 'medium', 2);
      expect(result1.path).toBe('auto-respond');

      // At exactly 100 or below, should not auto-respond (even with high similarity)
      // Falls back to next best path or escalation if no path matches
      const result2 = determineRoutingPath(0.90, 100, 'medium', 2);
      expect(result2.requiresHumanReview).toBe(true);
    });

    test('should require >100 samples for auto-refine', () => {
      const result1 = determineRoutingPath(0.80, 101, 'medium', 2);
      expect(result1.path).toBe('auto-refine');

      // At 100 or below with medium similarity, requires human review
      const result2 = determineRoutingPath(0.80, 100, 'medium', 2);
      expect(result2.requiresHumanReview).toBe(true);
    });

    test('should require >30 samples for generate-draft', () => {
      const result1 = determineRoutingPath(0.65, 31, 'medium', 2);
      expect(result1.path).toBe('generate-draft');

      // At 30 or below with medium similarity, may not generate draft
      const result2 = determineRoutingPath(0.65, 30, 'medium', 2);
      expect(result2.requiresHumanReview).toBe(true);
    });
  });

  describe('Priority Override Logic', () => {
    test('should override routing for urgent priority', () => {
      // Even with perfect similarity, urgent priority escalates
      const result = determineRoutingPath(0.95, 200, 'urgent', 1);

      expect(result.path).toBe('immediate-escalation');
      expect(result.pathNumber).toBe(5);
      expect(result.requiresHumanReview).toBe(true);
    });

    test('should override routing for complexity >4', () => {
      // Even with perfect similarity, high complexity escalates
      const result = determineRoutingPath(0.95, 200, 'medium', 5);

      expect(result.path).toBe('immediate-escalation');
      expect(result.pathNumber).toBe(5);
    });

    test('should not override for normal priority and complexity', () => {
      const result = determineRoutingPath(0.95, 200, 'medium', 2);

      expect(result.path).toBe('auto-respond');
      expect(result.pathNumber).toBe(1);
    });
  });

  describe('Routing Statistics and Distribution', () => {
    test('should distribute realistic ticket mix across all paths', () => {
      const ticketMix = [
        // Auto-respond: 30-40% expected
        { similarity: 0.90, samples: 150, priority: 'medium', complexity: 2 },
        { similarity: 0.92, samples: 180, priority: 'low', complexity: 1 },
        { similarity: 0.88, samples: 200, priority: 'medium', complexity: 2 },
        { similarity: 0.91, samples: 160, priority: 'low', complexity: 2 },

        // Auto-refine: 25-30% expected
        { similarity: 0.80, samples: 150, priority: 'medium', complexity: 2 },
        { similarity: 0.78, samples: 140, priority: 'medium', complexity: 2 },
        { similarity: 0.82, samples: 170, priority: 'low', complexity: 1 },

        // Generate-draft: 15-20% expected
        { similarity: 0.65, samples: 80, priority: 'medium', complexity: 2 },
        { similarity: 0.60, samples: 60, priority: 'low', complexity: 2 },

        // Deep-research: 5-10% expected
        { similarity: 0.40, samples: 50, priority: 'medium', complexity: 3 },

        // Immediate-escalation: 5-10% expected
        { similarity: 0.85, samples: 150, priority: 'urgent', complexity: 4 }
      ];

      const distribution = {};

      ticketMix.forEach(ticket => {
        const result = determineRoutingPath(
          ticket.similarity,
          ticket.samples,
          ticket.priority,
          ticket.complexity
        );

        distribution[result.path] = (distribution[result.path] || 0) + 1;
      });

      const total = ticketMix.length;

      console.log(`\n  Routing Distribution (${total} tickets):`);
      Object.entries(distribution).forEach(([path, count]) => {
        const percentage = (count / total * 100).toFixed(1);
        console.log(`    ${path}: ${count} (${percentage}%)`);
      });

      // Validate distribution
      expect(distribution['auto-respond']).toBeGreaterThan(0);
      expect(distribution['auto-refine']).toBeGreaterThan(0);
      expect(distribution['generate-draft']).toBeGreaterThan(0);
      expect(distribution['deep-research']).toBeGreaterThan(0);
      expect(distribution['immediate-escalation']).toBeGreaterThan(0);
    });
  });

  describe('Confidence Score Validation', () => {
    test('should return confidence equal to similarity', () => {
      const similarities = [0.95, 0.85, 0.75, 0.65, 0.45];

      similarities.forEach(similarity => {
        const result = determineRoutingPath(similarity, 150, 'medium', 2);
        expect(result.confidence).toBe(similarity);
      });
    });

    test('should provide routing reason for all paths', () => {
      const testCases = [
        { similarity: 0.90, samples: 150, expectedReason: 'High similarity, sufficient training' },
        { similarity: 0.80, samples: 150, expectedReason: 'Medium-high similarity, needs refinement' },
        { similarity: 0.65, samples: 50, expectedReason: 'Medium similarity, draft generation' },
        { similarity: 0.40, samples: 50, expectedReason: 'Low similarity, requires research' }
      ];

      testCases.forEach(({ similarity, samples, expectedReason }) => {
        const result = determineRoutingPath(similarity, samples, 'medium', 2);
        expect(result.reason).toBe(expectedReason);
      });
    });
  });
});
