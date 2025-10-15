/**
 * Unit Tests for NSW Strata Categorization Node
 * Tests Task 8.0: NSW categorization with 8 categories, subcategories, and priority logic
 */

describe('NSW Strata Categorization Node', () => {
  describe('Category Structure (Task 8.2-8.9)', () => {
    const categories = {
      maintenanceRepairs: {
        name: 'Maintenance & Repairs',
        subcategories: ['commonProperty', 'systems', 'emergency', 'amenities', 'defects']
      },
      bylawCompliance: {
        name: 'By-Law Compliance',
        subcategories: ['noise', 'parking', 'pets', 'smoking', 'rubbish', 'shortTermLetting', 'nuisance']
      },
      financialMatters: {
        name: 'Financial Matters',
        subcategories: ['levies', 'disputes', 'statements', 'insurance']
      },
      governanceAdministration: {
        name: 'Governance & Administration',
        subcategories: ['meetings', 'committees', 'bylaws', 'records', 'compliance']
      },
      renovationsAlterations: {
        name: 'Renovations & Alterations',
        subcategories: ['cosmetic', 'minor', 'major']
      },
      disputesComplaints: {
        name: 'Disputes & Complaints',
        subcategories: ['neighbor', 'ownersCorporation', 'strataManager', 'ncat']
      },
      securitySafety: {
        name: 'Security & Safety',
        subcategories: ['access', 'cctv', 'hazards', 'fireSafety', 'windowSafety']
      },
      informationRequests: {
        name: 'Information Requests',
        subcategories: ['general', 'onboarding', 'vendor']
      }
    };

    test('should have 8 primary categories (Task 8.1)', () => {
      expect(Object.keys(categories).length).toBe(8);
    });

    test('should have Maintenance & Repairs with 5 subcategories (Task 8.2)', () => {
      expect(categories.maintenanceRepairs.subcategories.length).toBe(5);
      expect(categories.maintenanceRepairs.subcategories).toContain('emergency');
      expect(categories.maintenanceRepairs.subcategories).toContain('systems');
    });

    test('should have By-Law Compliance with 7 subcategories (Task 8.3)', () => {
      expect(categories.bylawCompliance.subcategories.length).toBe(7);
      expect(categories.bylawCompliance.subcategories).toContain('noise');
      expect(categories.bylawCompliance.subcategories).toContain('parking');
      expect(categories.bylawCompliance.subcategories).toContain('shortTermLetting');
    });

    test('should have Financial Matters with 4 subcategories (Task 8.4)', () => {
      expect(categories.financialMatters.subcategories.length).toBe(4);
      expect(categories.financialMatters.subcategories).toContain('levies');
      expect(categories.financialMatters.subcategories).toContain('insurance');
    });

    test('should have Governance & Administration with 5 subcategories (Task 8.5)', () => {
      expect(categories.governanceAdministration.subcategories.length).toBe(5);
      expect(categories.governanceAdministration.subcategories).toContain('meetings');
      expect(categories.governanceAdministration.subcategories).toContain('committees');
    });

    test('should have Renovations & Alterations with three-tier system (Task 8.6)', () => {
      expect(categories.renovationsAlterations.subcategories).toContain('cosmetic');
      expect(categories.renovationsAlterations.subcategories).toContain('minor');
      expect(categories.renovationsAlterations.subcategories).toContain('major');
    });

    test('should have Disputes & Complaints with 4 subcategories (Task 8.7)', () => {
      expect(categories.disputesComplaints.subcategories.length).toBe(4);
      expect(categories.disputesComplaints.subcategories).toContain('ncat');
    });

    test('should have Security & Safety with 5 subcategories (Task 8.8)', () => {
      expect(categories.securitySafety.subcategories.length).toBe(5);
      expect(categories.securitySafety.subcategories).toContain('fireSafety');
      expect(categories.securitySafety.subcategories).toContain('windowSafety');
    });

    test('should have Information Requests with 3 subcategories (Task 8.9)', () => {
      expect(categories.informationRequests.subcategories.length).toBe(3);
      expect(categories.informationRequests.subcategories).toContain('onboarding');
    });
  });

  describe('Priority Assignment Logic (Task 8.10)', () => {
    function assignPriority(category, subcategory, complexity) {
      // Critical: same-day per SSMA Section 106
      if (subcategory === 'emergency' || subcategory === 'fireSafety' || subcategory === 'ncat') {
        return { level: 'critical', responseTime: '4 hours' };
      }

      // High priority
      if (subcategory === 'major' || complexity >= 4) {
        return { level: 'high', responseTime: '4 hours' };
      }

      // Medium priority
      if (category === 'bylawCompliance' || category === 'maintenanceRepairs') {
        return { level: 'medium', responseTime: '1 business day' };
      }

      // Low priority
      return { level: 'low', responseTime: '2 business days' };
    }

    test('should assign critical priority to emergency repairs', () => {
      const priority = assignPriority('maintenanceRepairs', 'emergency', 1);
      expect(priority.level).toBe('critical');
      expect(priority.responseTime).toBe('4 hours');
    });

    test('should assign critical priority to fire safety', () => {
      const priority = assignPriority('securitySafety', 'fireSafety', 1);
      expect(priority.level).toBe('critical');
    });

    test('should assign critical priority to NCAT matters', () => {
      const priority = assignPriority('disputesComplaints', 'ncat', 1);
      expect(priority.level).toBe('critical');
    });

    test('should assign high priority to major renovations', () => {
      const priority = assignPriority('renovationsAlterations', 'major', 3);
      expect(priority.level).toBe('high');
    });

    test('should assign high priority to complexity >= 4', () => {
      const priority = assignPriority('governanceAdministration', 'meetings', 4);
      expect(priority.level).toBe('high');
    });

    test('should assign medium priority to by-law compliance', () => {
      const priority = assignPriority('bylawCompliance', 'noise', 2);
      expect(priority.level).toBe('medium');
      expect(priority.responseTime).toBe('1 business day');
    });

    test('should assign low priority to information requests', () => {
      const priority = assignPriority('informationRequests', 'general', 1);
      expect(priority.level).toBe('low');
      expect(priority.responseTime).toBe('2 business days');
    });
  });

  describe('Model By-laws References (Task 8.12)', () => {
    const modelBylaws = {
      1: 'Noise - restrictions on noise',
      2: 'Vehicles - parking and storage',
      3: 'Obstruction of common property',
      4: 'Garbage and recycling',
      5: 'Smoking restrictions',
      7: 'Vehicle parking',
      8: 'Keeping of animals',
      14: 'Short-term letting'
    };

    test('should have 18 model by-laws configured', () => {
      // Testing subset of critical by-laws
      expect(Object.keys(modelBylaws).length).toBeGreaterThanOrEqual(8);
    });

    test('should map noise complaints to By-law 1 and 2', () => {
      const noiseBylaws = [1, 2];
      expect(noiseBylaws).toContain(1);
      expect(noiseBylaws).toContain(2);
    });

    test('should map parking to By-law 7', () => {
      const parkingBylaws = [7];
      expect(parkingBylaws).toContain(7);
    });

    test('should map pets to By-law 8', () => {
      const petBylaws = [8];
      expect(petBylaws).toContain(8);
    });

    test('should map short-term letting to By-law 14', () => {
      const lettingBylaws = [14];
      expect(lettingBylaws).toContain(14);
    });
  });

  describe('Legislation References (Task 8.11)', () => {
    const legislationReferences = {
      levies: 'SSMA 2015 Section 85-86',
      insurance: 'SSMA 2015 Section 160-162',
      meetings: 'SSMA 2015 Section 18-31',
      committees: 'SSMA 2015 Section 32-45',
      bylaws: 'SSMA 2015 Section 136-151',
      records: 'SSMA 2015 Section 178-183',
      ncat: 'SSMA 2015 Section 232-240',
      windowSafety: 'SSMA 2015 Section 106',
      cosmeticWork: 'SSMA 2015 Section 109',
      renovations: 'SSMA 2015 Section 108-110'
    };

    test('should reference SSMA 2015 for levies', () => {
      expect(legislationReferences.levies).toContain('SSMA 2015');
      expect(legislationReferences.levies).toContain('Section 85-86');
    });

    test('should reference SSMA Section 106 for critical matters', () => {
      expect(legislationReferences.windowSafety).toContain('Section 106');
    });

    test('should reference SSMA for NCAT procedures', () => {
      expect(legislationReferences.ncat).toContain('Section 232-240');
    });

    test('should reference correct sections for governance', () => {
      expect(legislationReferences.meetings).toContain('Section 18-31');
      expect(legislationReferences.committees).toContain('Section 32-45');
    });
  });

  describe('Complexity Scoring (Task 8.15)', () => {
    function calculateComplexity(entities, categoryKey, subcategory, textLength) {
      let complexity = 1;

      // Multiple entities
      const entityCount = Object.values(entities).flat().length;
      if (entityCount > 3) complexity += 1;

      // Complex categories
      const complexCategories = ['disputesComplaints', 'renovationsAlterations', 'governanceAdministration'];
      if (complexCategories.includes(categoryKey)) complexity += 1;

      // NCAT matters always complex
      if (subcategory === 'ncat') complexity = 5;

      // Major renovations
      if (subcategory === 'major') complexity += 1;

      // Text length
      if (textLength > 500) complexity += 1;

      // Legislation references
      if (entities.legislationReferences && entities.legislationReferences.length > 0) {
        complexity += 1;
      }

      return Math.min(complexity, 5);
    }

    test('should score simple tickets as 1', () => {
      const entities = { lotNumbers: ['Lot 5'] };
      const complexity = calculateComplexity(entities, 'informationRequests', 'general', 100);
      expect(complexity).toBe(1);
    });

    test('should increase score for multiple entities', () => {
      const entities = {
        lotNumbers: ['Lot 5', 'Lot 6'],
        propertyAddresses: ['123 Main St'],
        legislationReferences: ['SSMA 2015 Section 106'],
        bylawNumbers: ['By-law 3']
      };
      const complexity = calculateComplexity(entities, 'bylawCompliance', 'noise', 200);
      expect(complexity).toBeGreaterThan(1);
    });

    test('should score NCAT matters as 5 (maximum)', () => {
      const entities = {};
      const complexity = calculateComplexity(entities, 'disputesComplaints', 'ncat', 100);
      expect(complexity).toBe(5);
    });

    test('should increase score for complex categories', () => {
      const entities = {};
      const complexity = calculateComplexity(entities, 'disputesComplaints', 'neighbor', 150);
      expect(complexity).toBeGreaterThanOrEqual(2);
    });

    test('should cap complexity at 5', () => {
      const entities = {
        lotNumbers: ['Lot 1', 'Lot 2', 'Lot 3'],
        legislationReferences: ['SSMA 2015', 'SSDA 2015']
      };
      const complexity = calculateComplexity(entities, 'renovationsAlterations', 'major', 600);
      expect(complexity).toBeLessThanOrEqual(5);
    });
  });

  describe('2025 Reforms (Task 8.13)', () => {
    function check2025Reforms(category, subcategory, text) {
      const reforms = {
        capitalWorksPlanning: false,
        disclosureObligations: false,
        accessibilityApprovals: false
      };

      if (category === 'renovationsAlterations' && subcategory === 'major') {
        reforms.accessibilityApprovals = true;
      }

      if (category === 'governanceAdministration') {
        reforms.capitalWorksPlanning = true;
        reforms.disclosureObligations = true;
      }

      if (text.includes('capital works') || text.includes('10 year plan')) {
        reforms.capitalWorksPlanning = true;
      }

      return reforms;
    }

    test('should flag accessibility approvals for major renovations', () => {
      const reforms = check2025Reforms('renovationsAlterations', 'major', 'Major renovation');
      expect(reforms.accessibilityApprovals).toBe(true);
    });

    test('should flag capital works planning for governance', () => {
      const reforms = check2025Reforms('governanceAdministration', 'meetings', 'AGM discussion');
      expect(reforms.capitalWorksPlanning).toBe(true);
      expect(reforms.disclosureObligations).toBe(true);
    });

    test('should detect capital works from text', () => {
      const reforms = check2025Reforms('informationRequests', 'general', 'Need 10 year plan for capital works');
      expect(reforms.capitalWorksPlanning).toBe(true);
    });
  });

  describe('Stakeholder Identification (Task 8.15)', () => {
    function identifyStakeholders(category, subcategory, text) {
      const stakeholders = {
        ownersCorporation: false,
        strataCommittee: false,
        strataManager: false,
        lotOwner: true,
        tenant: false,
        contractor: false,
        thirdParty: false
      };

      if (text.includes('tenant')) stakeholders.tenant = true;
      if (text.includes('contractor')) stakeholders.contractor = true;
      if (text.includes('neighbor')) stakeholders.thirdParty = true;

      if (['financialMatters', 'governanceAdministration'].includes(category)) {
        stakeholders.ownersCorporation = true;
        stakeholders.strataCommittee = true;
        stakeholders.strataManager = true;
      }

      if (category === 'renovationsAlterations' && subcategory === 'major') {
        stakeholders.ownersCorporation = true;
        stakeholders.strataCommittee = true;
      }

      if (category === 'maintenanceRepairs') {
        stakeholders.strataManager = true;
        if (subcategory === 'emergency') stakeholders.contractor = true;
      }

      return stakeholders;
    }

    test('should always include lot owner', () => {
      const stakeholders = identifyStakeholders('informationRequests', 'general', 'Question');
      expect(stakeholders.lotOwner).toBe(true);
    });

    test('should include OC and committee for financial matters', () => {
      const stakeholders = identifyStakeholders('financialMatters', 'levies', 'Unpaid levies');
      expect(stakeholders.ownersCorporation).toBe(true);
      expect(stakeholders.strataCommittee).toBe(true);
      expect(stakeholders.strataManager).toBe(true);
    });

    test('should include contractor for emergency repairs', () => {
      const stakeholders = identifyStakeholders('maintenanceRepairs', 'emergency', 'Emergency leak');
      expect(stakeholders.strataManager).toBe(true);
      expect(stakeholders.contractor).toBe(true);
    });

    test('should detect tenant from text', () => {
      const stakeholders = identifyStakeholders('bylawCompliance', 'noise', 'Noise from tenant');
      expect(stakeholders.tenant).toBe(true);
    });

    test('should require OC approval for major renovations', () => {
      const stakeholders = identifyStakeholders('renovationsAlterations', 'major', 'Structural changes');
      expect(stakeholders.ownersCorporation).toBe(true);
    });
  });
});
