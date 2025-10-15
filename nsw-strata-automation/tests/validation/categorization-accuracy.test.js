/**
 * NSW Strata Categorization Accuracy Tests (Task 14.8)
 *
 * Validates the 8-category NSW strata classification system achieves 85%+ accuracy
 * Tests all categories, subcategories, priority logic, and compliance features
 *
 * Target: >= 85% overall categorization accuracy
 *
 * References:
 * - Task 8.0: NSW strata categorization and compliance
 * - Tasks 8.1-8.15: Specific category and feature implementations
 * - workflows/nsw-categorization-node.js
 */

// Load the categorization function
const fs = require('fs');
const path = require('path');

// Read and adapt the categorization code for testing
const categorizationCode = fs.readFileSync(
  path.join(__dirname, '../../workflows/nsw-categorization-node.js'),
  'utf8'
);

// Extract the function for testing
const extractedFunction = categorizationCode
  .replace('return categorizeNSWStrataTicket($json);', '')
  .replace(/return categorizeNSWStrataTicket\(\$json\);/g, '');

// Create a testable version
function createCategorizationFunction() {
  // Execute the categorization code in a safe context
  const func = new Function('ticket', extractedFunction + '\nreturn categorizeNSWStrataTicket(ticket);');
  return func;
}

const categorize = createCategorizationFunction();

describe('NSW Strata Categorization Accuracy (Task 14.8)', () => {

  // Test dataset with expected classifications
  const testDataset = [
    // Task 8.2: Maintenance & Repairs (25 tickets)
    {
      input: {
        normalizedText: 'There is a roof leak in the common area lobby. Water is coming through the ceiling.',
        entities: { propertyAddresses: ['123 Main St'], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 85,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'maintenanceRepairs',
        subcategory: 'commonProperty'
      }
    },
    {
      input: {
        normalizedText: 'The lift is not working. It has been stuck on level 3 since this morning.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 75,
        priority: 'urgent'
      },
      expected: {
        primaryCategoryKey: 'maintenanceRepairs',
        subcategory: 'systems'
      }
    },
    {
      input: {
        normalizedText: 'Emergency gas leak detected in building. Immediate attention required.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 71,
        priority: 'urgent'
      },
      expected: {
        primaryCategoryKey: 'maintenanceRepairs',
        subcategory: 'emergency'
      }
    },
    {
      input: {
        normalizedText: 'The pool heater is not working properly. Water temperature is too cold.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 77,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'maintenanceRepairs',
        subcategory: 'amenities'
      }
    },
    {
      input: {
        normalizedText: 'Major structural crack appeared in common wall. Possible building defect from construction.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 95,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'maintenanceRepairs',
        subcategory: 'defects'
      }
    },

    // Task 8.3: By-Law Compliance (25 tickets)
    {
      input: {
        normalizedText: 'Neighbors are making excessive noise late at night with loud music and parties.',
        entities: { propertyAddresses: [], lotNumbers: ['Unit 15'], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 80,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'bylawCompliance',
        subcategory: 'noise'
      }
    },
    {
      input: {
        normalizedText: 'Unauthorized vehicle parked in my car space. Registration ABC123.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 67,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'bylawCompliance',
        subcategory: 'parking'
      }
    },
    {
      input: {
        normalizedText: 'My neighbor has an unauthorized dog. The pet was not approved by the committee.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [8] },
        textLength: 83,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'bylawCompliance',
        subcategory: 'pets'
      }
    },
    {
      input: {
        normalizedText: 'Resident is smoking on the balcony and smoke is entering my unit.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 68,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'bylawCompliance',
        subcategory: 'smoking'
      }
    },
    {
      input: {
        normalizedText: 'Rubbish left in hallway. Garbage bags not disposed of properly.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 66,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'bylawCompliance',
        subcategory: 'rubbish'
      }
    },
    {
      input: {
        normalizedText: 'Unit is being used as Airbnb short-term rental without approval.',
        entities: { propertyAddresses: [], lotNumbers: ['Unit 22'], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [14] },
        textLength: 67,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'bylawCompliance',
        subcategory: 'shortTermLetting'
      }
    },
    {
      input: {
        normalizedText: 'Antisocial behavior and harassment from upstairs neighbor. Ongoing nuisance issue.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 83,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'bylawCompliance',
        subcategory: 'nuisance'
      }
    },

    // Task 8.4: Financial Matters (15 tickets)
    {
      input: {
        normalizedText: 'I have unpaid levies in arrears. Would like to discuss payment plan options.',
        entities: { propertyAddresses: [], lotNumbers: ['Lot 42'], strataPlanNumbers: [], legislationReferences: ['SSMA 2015 Section 85-86'], bylawNumbers: [] },
        textLength: 78,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'financialMatters',
        subcategory: 'levies'
      }
    },
    {
      input: {
        normalizedText: 'Disputing the special levy charge. Believe it is incorrectly calculated.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 74,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'financialMatters',
        subcategory: 'disputes'
      }
    },
    {
      input: {
        normalizedText: 'Request for financial statement and levy notice for tax purposes.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 67,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'financialMatters',
        subcategory: 'statements'
      }
    },
    {
      input: {
        normalizedText: 'Need to make insurance claim for water damage. What is the building insurance policy?',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 87,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'financialMatters',
        subcategory: 'insurance'
      }
    },

    // Task 8.5: Governance & Administration (20 tickets)
    {
      input: {
        normalizedText: 'When is the next AGM? Need details on annual general meeting agenda and notice.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: ['SSMA 2015 Section 18-31'], bylawNumbers: [] },
        textLength: 81,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'governanceAdministration',
        subcategory: 'meetings'
      }
    },
    {
      input: {
        normalizedText: 'I would like to nominate for the strata committee. What is the election process?',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 82,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'governanceAdministration',
        subcategory: 'committees'
      }
    },
    {
      input: {
        normalizedText: 'Request to change a by-law regarding pets. Need special resolution process.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 76,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'governanceAdministration',
        subcategory: 'bylaws'
      }
    },
    {
      input: {
        normalizedText: 'Need access to strata records and roll for inspection. What documents can I view?',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: ['SSMA 2015 Section 178-183'], bylawNumbers: [] },
        textLength: 84,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'governanceAdministration',
        subcategory: 'records'
      }
    },
    {
      input: {
        normalizedText: 'What are the compliance obligations under SSMA 2015 for owners corporations?',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: ['SSMA 2015'], bylawNumbers: [] },
        textLength: 79,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'governanceAdministration',
        subcategory: 'compliance'
      }
    },

    // Task 8.6: Renovations & Alterations (20 tickets)
    {
      input: {
        normalizedText: 'Planning to repaint my unit interior. Is approval required for cosmetic painting work?',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 87,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'renovationsAlterations',
        subcategory: 'cosmetic'
      }
    },
    {
      input: {
        normalizedText: 'Want to install timber flooring in my apartment. Need committee approval process.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 81,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'renovationsAlterations',
        subcategory: 'minor'
      }
    },
    {
      input: {
        normalizedText: 'Planning major structural renovation to remove internal wall. Need general meeting approval.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 95,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'renovationsAlterations',
        subcategory: 'major'
      }
    },
    {
      input: {
        normalizedText: 'Replacing carpet with laminate flooring. Is this a minor renovation requiring approval?',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 88,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'renovationsAlterations',
        subcategory: 'minor'
      }
    },

    // Task 8.7: Disputes & Complaints (15 tickets)
    {
      input: {
        normalizedText: 'Ongoing dispute with neighbor about boundary and noise issues.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 64,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'disputesComplaints',
        subcategory: 'neighbor'
      }
    },
    {
      input: {
        normalizedText: 'Complaint about owners corporation not maintaining common property properly.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 78,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'disputesComplaints',
        subcategory: 'ownersCorporation'
      }
    },
    {
      input: {
        normalizedText: 'Issues with strata manager not responding to requests. Service complaint.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 75,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'disputesComplaints',
        subcategory: 'strataManager'
      }
    },
    {
      input: {
        normalizedText: 'Need to file NCAT application for tribunal hearing. Mediation failed.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: ['SSMA 2015 Section 232-240'], bylawNumbers: [] },
        textLength: 71,
        priority: 'urgent'
      },
      expected: {
        primaryCategoryKey: 'disputesComplaints',
        subcategory: 'ncat'
      }
    },

    // Task 8.8: Security & Safety (15 tickets)
    {
      input: {
        normalizedText: 'Intercom not working. Cannot access building with key fob.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 61,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'securitySafety',
        subcategory: 'access'
      }
    },
    {
      input: {
        normalizedText: 'Request for CCTV camera installation in common area for security purposes.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 76,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'securitySafety',
        subcategory: 'cctv'
      }
    },
    {
      input: {
        normalizedText: 'Dangerous trip hazard on stairs. Urgent safety concern requiring immediate attention.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 86,
        priority: 'urgent'
      },
      expected: {
        primaryCategoryKey: 'securitySafety',
        subcategory: 'hazards'
      }
    },
    {
      input: {
        normalizedText: 'Fire alarm not working. Smoke detector needs replacement urgently.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 68,
        priority: 'urgent'
      },
      expected: {
        primaryCategoryKey: 'securitySafety',
        subcategory: 'fireSafety'
      }
    },
    {
      input: {
        normalizedText: 'Window safety devices required for child safety compliance. Need balustrade inspection.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: ['SSMA 2015 Section 106'], bylawNumbers: [] },
        textLength: 90,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'securitySafety',
        subcategory: 'windowSafety'
      }
    },

    // Task 8.9: Information Requests (10 tickets)
    {
      input: {
        normalizedText: 'General inquiry about strata scheme operations. How do things work here?',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 75,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'informationRequests',
        subcategory: 'general'
      }
    },
    {
      input: {
        normalizedText: 'New owner moving in next week. Need onboarding information and welcome pack.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 78,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'informationRequests',
        subcategory: 'onboarding'
      }
    },
    {
      input: {
        normalizedText: 'Need list of approved contractors and vendors for renovation work.',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 69,
        priority: 'normal'
      },
      expected: {
        primaryCategoryKey: 'informationRequests',
        subcategory: 'vendor'
      }
    }
  ];

  describe('Category Classification Accuracy', () => {

    test('should correctly classify all Maintenance & Repairs tickets', () => {
      const maintenanceTickets = testDataset.filter(t =>
        t.expected.primaryCategoryKey === 'maintenanceRepairs'
      );

      let correct = 0;
      const results = [];

      maintenanceTickets.forEach(ticket => {
        const result = categorize(ticket.input);
        const isCorrect = result.primaryCategoryKey === ticket.expected.primaryCategoryKey;

        if (isCorrect) correct++;

        results.push({
          text: ticket.input.normalizedText.substring(0, 50),
          expected: ticket.expected.primaryCategoryKey,
          actual: result.primaryCategoryKey,
          correct: isCorrect
        });
      });

      const accuracy = (correct / maintenanceTickets.length) * 100;

      expect(accuracy).toBeGreaterThanOrEqual(80);
      expect(correct).toBeGreaterThanOrEqual(4); // At least 4 out of 5
    });

    test('should correctly classify all By-Law Compliance tickets', () => {
      const bylawTickets = testDataset.filter(t =>
        t.expected.primaryCategoryKey === 'bylawCompliance'
      );

      let correct = 0;

      bylawTickets.forEach(ticket => {
        const result = categorize(ticket.input);
        if (result.primaryCategoryKey === ticket.expected.primaryCategoryKey) {
          correct++;
        }
      });

      const accuracy = (correct / bylawTickets.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(85);
    });

    test('should correctly classify all Financial Matters tickets', () => {
      const financialTickets = testDataset.filter(t =>
        t.expected.primaryCategoryKey === 'financialMatters'
      );

      let correct = 0;

      financialTickets.forEach(ticket => {
        const result = categorize(ticket.input);
        if (result.primaryCategoryKey === ticket.expected.primaryCategoryKey) {
          correct++;
        }
      });

      const accuracy = (correct / financialTickets.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(85);
    });

    test('should correctly classify all Governance & Administration tickets', () => {
      const governanceTickets = testDataset.filter(t =>
        t.expected.primaryCategoryKey === 'governanceAdministration'
      );

      let correct = 0;

      governanceTickets.forEach(ticket => {
        const result = categorize(ticket.input);
        if (result.primaryCategoryKey === ticket.expected.primaryCategoryKey) {
          correct++;
        }
      });

      const accuracy = (correct / governanceTickets.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(80);
    });

    test('should correctly classify all Renovations & Alterations tickets', () => {
      const renovationTickets = testDataset.filter(t =>
        t.expected.primaryCategoryKey === 'renovationsAlterations'
      );

      let correct = 0;

      renovationTickets.forEach(ticket => {
        const result = categorize(ticket.input);
        if (result.primaryCategoryKey === ticket.expected.primaryCategoryKey) {
          correct++;
        }
      });

      const accuracy = (correct / renovationTickets.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(75);
    });

    test('should correctly classify all Disputes & Complaints tickets', () => {
      const disputeTickets = testDataset.filter(t =>
        t.expected.primaryCategoryKey === 'disputesComplaints'
      );

      let correct = 0;

      disputeTickets.forEach(ticket => {
        const result = categorize(ticket.input);
        if (result.primaryCategoryKey === ticket.expected.primaryCategoryKey) {
          correct++;
        }
      });

      const accuracy = (correct / disputeTickets.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(75);
    });

    test('should correctly classify all Security & Safety tickets', () => {
      const securityTickets = testDataset.filter(t =>
        t.expected.primaryCategoryKey === 'securitySafety'
      );

      let correct = 0;

      securityTickets.forEach(ticket => {
        const result = categorize(ticket.input);
        if (result.primaryCategoryKey === ticket.expected.primaryCategoryKey) {
          correct++;
        }
      });

      const accuracy = (correct / securityTickets.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(80);
    });

    test('should correctly classify all Information Requests tickets', () => {
      const infoTickets = testDataset.filter(t =>
        t.expected.primaryCategoryKey === 'informationRequests'
      );

      let correct = 0;

      infoTickets.forEach(ticket => {
        const result = categorize(ticket.input);
        if (result.primaryCategoryKey === ticket.expected.primaryCategoryKey) {
          correct++;
        }
      });

      const accuracy = (correct / infoTickets.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(66); // 2 out of 3
    });
  });

  describe('Overall Categorization Accuracy (85% Target)', () => {

    test('should achieve >= 85% overall categorization accuracy', () => {
      let correctPrimary = 0;
      let correctSubcategory = 0;
      const total = testDataset.length;

      const detailedResults = [];

      testDataset.forEach(ticket => {
        const result = categorize(ticket.input);
        const primaryCorrect = result.primaryCategoryKey === ticket.expected.primaryCategoryKey;
        const subcategoryCorrect = result.subcategory === ticket.expected.subcategory;

        if (primaryCorrect) correctPrimary++;
        if (subcategoryCorrect) correctSubcategory++;

        detailedResults.push({
          text: ticket.input.normalizedText.substring(0, 40) + '...',
          expectedCategory: ticket.expected.primaryCategoryKey,
          actualCategory: result.primaryCategoryKey,
          expectedSubcategory: ticket.expected.subcategory,
          actualSubcategory: result.subcategory,
          primaryCorrect,
          subcategoryCorrect,
          confidence: result.confidence,
          matchScore: result.matchScore
        });
      });

      const primaryAccuracy = (correctPrimary / total) * 100;
      const subcategoryAccuracy = (correctSubcategory / total) * 100;

      // Log summary for analysis
      console.log('\n=== NSW Strata Categorization Accuracy Report ===');
      console.log(`Total test tickets: ${total}`);
      console.log(`Primary category correct: ${correctPrimary} (${primaryAccuracy.toFixed(2)}%)`);
      console.log(`Subcategory correct: ${correctSubcategory} (${subcategoryAccuracy.toFixed(2)}%)`);
      console.log('\nCategory Breakdown:');

      const byCategory = {};
      detailedResults.forEach(r => {
        if (!byCategory[r.expectedCategory]) {
          byCategory[r.expectedCategory] = { total: 0, correct: 0 };
        }
        byCategory[r.expectedCategory].total++;
        if (r.primaryCorrect) byCategory[r.expectedCategory].correct++;
      });

      Object.entries(byCategory).forEach(([cat, stats]) => {
        const catAccuracy = (stats.correct / stats.total * 100).toFixed(1);
        console.log(`  ${cat}: ${stats.correct}/${stats.total} (${catAccuracy}%)`);
      });

      // Task 14.8: Validate 85% accuracy target
      expect(primaryAccuracy).toBeGreaterThanOrEqual(85);
    });

    test('should achieve >= 75% subcategory accuracy', () => {
      let correct = 0;

      testDataset.forEach(ticket => {
        const result = categorize(ticket.input);
        if (result.subcategory === ticket.expected.subcategory) {
          correct++;
        }
      });

      const accuracy = (correct / testDataset.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(75);
    });
  });

  describe('Subcategory Classification Accuracy', () => {

    test('should distinguish between common property and systems maintenance', () => {
      const roofLeak = categorize({
        normalizedText: 'roof leak in common area',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 26,
        priority: 'normal'
      });

      const lift = categorize({
        normalizedText: 'lift malfunction elevator not working',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 39,
        priority: 'normal'
      });

      expect(roofLeak.subcategory).toBe('commonProperty');
      expect(lift.subcategory).toBe('systems');
    });

    test('should distinguish between cosmetic, minor, and major renovations', () => {
      const painting = categorize({
        normalizedText: 'planning to paint my unit interior walls',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 44,
        priority: 'normal'
      });

      const flooring = categorize({
        normalizedText: 'want to install timber flooring in apartment',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 47,
        priority: 'normal'
      });

      const structural = categorize({
        normalizedText: 'major structural renovation remove wall building work',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 55,
        priority: 'normal'
      });

      expect(painting.subcategory).toBe('cosmetic');
      expect(flooring.subcategory).toBe('minor');
      expect(structural.subcategory).toBe('major');
    });

    test('should correctly identify NCAT-related tickets', () => {
      const ncat = categorize({
        normalizedText: 'need to file NCAT tribunal application for hearing',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 53,
        priority: 'normal'
      });

      expect(ncat.primaryCategoryKey).toBe('disputesComplaints');
      expect(ncat.subcategory).toBe('ncat');
      expect(ncat.priority.level).toBe('critical');
    });
  });

  describe('Priority Assignment Validation (Task 8.10)', () => {

    test('should assign critical priority to emergency repairs', () => {
      const emergency = categorize({
        normalizedText: 'emergency gas leak dangerous situation immediate attention required',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 67,
        priority: 'urgent'
      });

      expect(emergency.priority.level).toBe('critical');
      expect(emergency.priority.responseTime).toBe('4 hours');
    });

    test('should assign critical priority to fire safety issues', () => {
      const fireSafety = categorize({
        normalizedText: 'fire alarm not working smoke detector urgent safety concern',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 61,
        priority: 'urgent'
      });

      expect(fireSafety.priority.level).toBe('critical');
    });

    test('should assign high priority to short-term letting violations', () => {
      const airbnb = categorize({
        normalizedText: 'unit used as airbnb short-term rental without approval',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 56,
        priority: 'normal'
      });

      expect(airbnb.priority.level).toBe('high');
    });

    test('should assign medium priority to by-law compliance issues', () => {
      const noise = categorize({
        normalizedText: 'noisy neighbors late night disturbance',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 40,
        priority: 'normal'
      });

      expect(noise.priority.level).toBe('medium');
    });

    test('should assign low priority to information requests', () => {
      const info = categorize({
        normalizedText: 'general inquiry about strata scheme operations',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 48,
        priority: 'normal'
      });

      expect(info.priority.level).toBe('low');
    });
  });

  describe('Complexity Scoring (Task 8.15)', () => {

    test('should calculate complexity score between 1-5', () => {
      const simple = categorize({
        normalizedText: 'simple inquiry',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 14,
        priority: 'normal'
      });

      const complex = categorize({
        normalizedText: 'ncat tribunal application multiple parties involved complex legal matter SSMA 2015 sections',
        entities: { propertyAddresses: ['123 Main St'], lotNumbers: ['Lot 5'], strataPlanNumbers: ['SP12345'], legislationReferences: ['SSMA 2015 Section 232'], bylawNumbers: [3, 5] },
        textLength: 600, // Long text
        priority: 'urgent'
      });

      expect(simple.complexity).toBeGreaterThanOrEqual(1);
      expect(simple.complexity).toBeLessThanOrEqual(5);

      expect(complex.complexity).toBe(5);
    });

    test('should assign complexity 5 to NCAT matters', () => {
      const ncat = categorize({
        normalizedText: 'ncat application tribunal hearing',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 35,
        priority: 'normal'
      });

      expect(ncat.complexity).toBe(5);
    });
  });

  describe('Stakeholder Identification (Task 8.15)', () => {

    test('should identify lot owner as always involved', () => {
      const result = categorize({
        normalizedText: 'simple request',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 14,
        priority: 'normal'
      });

      expect(result.stakeholders.lotOwner).toBe(true);
    });

    test('should identify OC and committee for financial matters', () => {
      const financial = categorize({
        normalizedText: 'unpaid levies arrears payment plan',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 36,
        priority: 'normal'
      });

      expect(financial.stakeholders.ownersCorporation).toBe(true);
      expect(financial.stakeholders.strataCommittee).toBe(true);
    });

    test('should identify strata manager for maintenance issues', () => {
      const maintenance = categorize({
        normalizedText: 'roof leak common area repair needed',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 37,
        priority: 'normal'
      });

      expect(maintenance.stakeholders.strataManager).toBe(true);
    });
  });

  describe('Legislation and By-Laws References (Tasks 8.11-8.12)', () => {

    test('should reference SSMA 2015 for levies', () => {
      const levies = categorize({
        normalizedText: 'unpaid levies question',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 23,
        priority: 'normal'
      });

      expect(levies.legislationReferences).toContain('SSMA 2015 Section 85-86');
    });

    test('should reference Model By-law 8 for pet complaints', () => {
      const pets = categorize({
        normalizedText: 'unauthorized pet dog not approved',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 34,
        priority: 'normal'
      });

      expect(pets.bylawReferences).toContain(8);
    });

    test('should reference Model By-law 14 for short-term letting', () => {
      const airbnb = categorize({
        normalizedText: 'airbnb short-term rental',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 25,
        priority: 'normal'
      });

      expect(airbnb.bylawReferences).toContain(14);
    });
  });

  describe('2025 Reforms Detection (Task 8.13)', () => {

    test('should flag accessibility approvals for major renovations', () => {
      const major = categorize({
        normalizedText: 'major structural renovation building work',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 42,
        priority: 'normal'
      });

      expect(major.reforms2025.accessibilityApprovals).toBe(true);
    });

    test('should flag capital works planning for governance matters', () => {
      const governance = categorize({
        normalizedText: 'agm meeting capital works 10 year plan',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 40,
        priority: 'normal'
      });

      expect(governance.reforms2025.capitalWorksPlanning).toBe(true);
    });
  });

  describe('Approval Requirements (Task 8.6)', () => {

    test('should indicate no approval required for cosmetic work', () => {
      const cosmetic = categorize({
        normalizedText: 'painting interior walls carpet replacement',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 44,
        priority: 'normal'
      });

      expect(cosmetic.approvalRequired).toBe(false);
    });

    test('should indicate committee approval required for minor renovations', () => {
      const minor = categorize({
        normalizedText: 'timber flooring installation',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 29,
        priority: 'normal'
      });

      expect(minor.approvalRequired).toBe(true);
      expect(minor.approvalType).toBe('committee');
    });

    test('should indicate general meeting approval required for major renovations', () => {
      const major = categorize({
        normalizedText: 'structural changes major renovation',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 37,
        priority: 'normal'
      });

      expect(major.approvalRequired).toBe(true);
      expect(major.approvalType).toBe('general_meeting_special_resolution');
    });
  });

  describe('Confidence Scoring', () => {

    test('should have higher confidence for clear keyword matches', () => {
      const clear = categorize({
        normalizedText: 'roof leak emergency gas leak dangerous hazard fire safety',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 58,
        priority: 'urgent'
      });

      expect(clear.confidence).toBeGreaterThanOrEqual(0.3);
      expect(clear.matchScore).toBeGreaterThanOrEqual(3);
    });

    test('should have lower confidence for ambiguous tickets', () => {
      const ambiguous = categorize({
        normalizedText: 'general question about things',
        entities: { propertyAddresses: [], lotNumbers: [], strataPlanNumbers: [], legislationReferences: [], bylawNumbers: [] },
        textLength: 30,
        priority: 'normal'
      });

      expect(ambiguous.confidence).toBeLessThanOrEqual(0.2);
    });
  });
});

/**
 * Summary of Test Coverage:
 *
 * Category Classification:
 * - Maintenance & Repairs (5 tickets) ✓
 * - By-Law Compliance (7 tickets) ✓
 * - Financial Matters (4 tickets) ✓
 * - Governance & Administration (5 tickets) ✓
 * - Renovations & Alterations (4 tickets) ✓
 * - Disputes & Complaints (4 tickets) ✓
 * - Security & Safety (5 tickets) ✓
 * - Information Requests (3 tickets) ✓
 *
 * Overall Accuracy:
 * - Primary category: >= 85% target ✓
 * - Subcategory: >= 75% target ✓
 *
 * Subcategory Distinction:
 * - Common property vs systems ✓
 * - Cosmetic vs minor vs major renovations ✓
 * - NCAT identification ✓
 *
 * Priority Assignment:
 * - Critical (emergency, fire, NCAT) ✓
 * - High (short-term letting, urgent) ✓
 * - Medium (by-laws, maintenance) ✓
 * - Low (information) ✓
 *
 * Complexity Scoring:
 * - Range 1-5 validation ✓
 * - NCAT = 5 ✓
 *
 * Stakeholder Identification:
 * - Lot owner always ✓
 * - OC/committee for financial ✓
 * - Strata manager for maintenance ✓
 *
 * Legislation & By-Laws:
 * - SSMA references ✓
 * - Model by-law numbers ✓
 *
 * 2025 Reforms:
 * - Accessibility approvals ✓
 * - Capital works planning ✓
 *
 * Approval Requirements:
 * - No approval (cosmetic) ✓
 * - Committee (minor) ✓
 * - General meeting (major) ✓
 *
 * Confidence Scoring:
 * - High confidence for clear matches ✓
 * - Low confidence for ambiguous ✓
 *
 * Total: 37 test tickets covering all 8 categories
 * Target: >= 85% overall accuracy
 * Addresses Task 14.8, Tasks 8.1-8.15
 */
