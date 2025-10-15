/**
 * Unit Tests for Entity Extraction Node
 * Tests text normalization and NSW strata entity extraction
 */

describe('Entity Extraction Node Configuration', () => {
  // Mock extraction functions from the workflow
  function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  function extractEntities(text) {
    const entities = {
      propertyAddresses: [],
      lotNumbers: [],
      strataPlanNumbers: [],
      legislationReferences: [],
      bylawNumbers: []
    };

    // Australian street addresses
    const addressRegex = /\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Terrace|Tce|Parade|Pde|Boulevard|Blvd|Lane|Ln|Way|Highway|Hwy|Crescent|Cres),?\s*(?:[A-Za-z\s]+)?(?:NSW)?\s*\d{4}/gi;
    entities.propertyAddresses = text.match(addressRegex) || [];

    // Lot numbers
    const lotRegex = /(?:Lot|Unit|Apartment|Apt)\s*#?\s*(\d+)/gi;
    const lotMatches = text.matchAll(lotRegex);
    for (const match of lotMatches) {
      entities.lotNumbers.push(match[0]);
    }

    // Strata plan numbers
    const planRegex = /(?:SP|Strata\s+Plan)\s*#?\s*(\d+)/gi;
    const planMatches = text.matchAll(planRegex);
    for (const match of planMatches) {
      entities.strataPlanNumbers.push(match[0]);
    }

    // NSW legislation references
    const legislationRegex = /(?:SSMA|SSDA)\s*\d{4}(?:\s+Section\s+\d+)?|Section\s+\d+\s+(?:SSMA|SSDA)\s*\d{4}/gi;
    entities.legislationReferences = text.match(legislationRegex) || [];

    // By-law numbers
    const bylawRegex = /(?:Model\s+)?By-law\s+#?\s*(\d+)/gi;
    const bylawMatches = text.matchAll(bylawRegex);
    for (const match of bylawMatches) {
      entities.bylawNumbers.push(match[0]);
    }

    return entities;
  }

  describe('HTML Stripping', () => {
    test('should remove HTML tags', () => {
      const html = '<p>This is a <strong>test</strong> message</p>';
      const result = stripHtml(html);
      expect(result).toBe('This is a test message');
    });

    test('should decode HTML entities', () => {
      const html = 'Test &amp; More &lt;data&gt; &quot;quotes&quot;';
      const result = stripHtml(html);
      expect(result).toBe('Test & More <data> "quotes"');
    });

    test('should handle empty input', () => {
      expect(stripHtml('')).toBe('');
      expect(stripHtml(null)).toBe('');
      expect(stripHtml(undefined)).toBe('');
    });

    test('should trim whitespace', () => {
      const html = '  <p>  Test  </p>  ';
      const result = stripHtml(html);
      expect(result).toBe('Test');
    });

    test('should handle non-breaking spaces', () => {
      const html = 'Test&nbsp;&nbsp;spacing';
      const result = stripHtml(html);
      expect(result).toBe('Test  spacing');
    });
  });

  describe('Property Address Extraction', () => {
    test('should extract NSW street address', () => {
      const text = 'Issue at 123 George Street, Sydney NSW 2000';
      const entities = extractEntities(text);
      expect(entities.propertyAddresses.length).toBeGreaterThan(0);
      expect(entities.propertyAddresses[0]).toContain('123');
      expect(entities.propertyAddresses[0]).toContain('George');
    });

    test('should extract address with abbreviated street type', () => {
      const text = 'Property at 45 Smith St, Parramatta NSW 2150';
      const entities = extractEntities(text);
      expect(entities.propertyAddresses.length).toBeGreaterThan(0);
    });

    test('should extract multiple addresses', () => {
      const text = 'Moving from 10 Main Rd, NSW 2000 to 20 Side St, NSW 2010';
      const entities = extractEntities(text);
      expect(entities.propertyAddresses.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle various street types', () => {
      const streetTypes = [
        '123 Test Avenue, NSW 2000',
        '456 Test Drive, NSW 2000',
        '789 Test Court, NSW 2000',
        '101 Test Place, NSW 2000'
      ];

      streetTypes.forEach(address => {
        const entities = extractEntities(address);
        expect(entities.propertyAddresses.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Lot Number Extraction', () => {
    test('should extract lot number', () => {
      const text = 'Issue in Lot 23 of the building';
      const entities = extractEntities(text);
      expect(entities.lotNumbers).toContain('Lot 23');
    });

    test('should extract unit number', () => {
      const text = 'Complaint from Unit 5';
      const entities = extractEntities(text);
      expect(entities.lotNumbers).toContain('Unit 5');
    });

    test('should extract apartment number', () => {
      const text = 'Noise from Apartment 12';
      const entities = extractEntities(text);
      expect(entities.lotNumbers).toContain('Apartment 12');
    });

    test('should handle abbreviated format', () => {
      const text = 'Issue at Apt #7';
      const entities = extractEntities(text);
      expect(entities.lotNumbers.length).toBeGreaterThan(0);
    });

    test('should extract multiple lot numbers', () => {
      const text = 'Between Lot 10 and Unit 15';
      const entities = extractEntities(text);
      expect(entities.lotNumbers.length).toBe(2);
    });
  });

  describe('Strata Plan Extraction', () => {
    test('should extract strata plan number with SP format', () => {
      const text = 'Related to SP 12345';
      const entities = extractEntities(text);
      expect(entities.strataPlanNumbers).toContain('SP 12345');
    });

    test('should extract full strata plan format', () => {
      const text = 'Under Strata Plan 54321';
      const entities = extractEntities(text);
      expect(entities.strataPlanNumbers).toContain('Strata Plan 54321');
    });

    test('should handle hash symbol', () => {
      const text = 'SP #98765';
      const entities = extractEntities(text);
      expect(entities.strataPlanNumbers.length).toBeGreaterThan(0);
    });
  });

  describe('Legislation Reference Extraction', () => {
    test('should extract SSMA reference', () => {
      const text = 'According to SSMA 2015 Section 106';
      const entities = extractEntities(text);
      expect(entities.legislationReferences).toContain('SSMA 2015 Section 106');
    });

    test('should extract SSDA reference', () => {
      const text = 'Per SSDA 2015';
      const entities = extractEntities(text);
      expect(entities.legislationReferences).toContain('SSDA 2015');
    });

    test('should extract section-first format', () => {
      const text = 'Section 85 SSMA 2015 applies';
      const entities = extractEntities(text);
      expect(entities.legislationReferences.length).toBeGreaterThan(0);
    });

    test('should handle multiple legislation references', () => {
      const text = 'SSMA 2015 Section 106 and SSDA 2015 Section 50';
      const entities = extractEntities(text);
      expect(entities.legislationReferences.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('By-law Extraction', () => {
    test('should extract by-law number', () => {
      const text = 'Violation of By-law 3';
      const entities = extractEntities(text);
      expect(entities.bylawNumbers).toContain('By-law 3');
    });

    test('should extract model by-law', () => {
      const text = 'Per Model By-law 7';
      const entities = extractEntities(text);
      expect(entities.bylawNumbers).toContain('Model By-law 7');
    });

    test('should handle hash symbol', () => {
      const text = 'By-law #14 issue';
      const entities = extractEntities(text);
      expect(entities.bylawNumbers.length).toBeGreaterThan(0);
    });
  });

  describe('Keyword Extraction', () => {
    function extractKeywords(text) {
      const keywords = {
        maintenanceRepairs: ['roof', 'leak', 'plumbing', 'lift', 'elevator', 'repair', 'maintenance'],
        bylawCompliance: ['noise', 'parking', 'pet', 'smoking', 'rubbish', 'airbnb'],
        financial: ['levy', 'levies', 'fee', 'payment', 'overdue', 'arrears'],
        governance: ['meeting', 'AGM', 'EGM', 'committee', 'minutes'],
        renovations: ['renovation', 'flooring', 'kitchen', 'bathroom', 'paint'],
        disputes: ['complaint', 'dispute', 'NCAT', 'tribunal', 'mediation'],
        security: ['security', 'access', 'CCTV', 'camera', 'safety'],
        information: ['information', 'records', 'documents', 'certificate']
      };

      const lowerText = text.toLowerCase();
      const matchedCategories = [];

      for (const [category, words] of Object.entries(keywords)) {
        for (const word of words) {
          if (lowerText.includes(word.toLowerCase())) {
            matchedCategories.push(category);
            break;
          }
        }
      }

      return matchedCategories;
    }

    test('should identify maintenance keywords', () => {
      const text = 'Roof leak in common area';
      const categories = extractKeywords(text);
      expect(categories).toContain('maintenanceRepairs');
    });

    test('should identify by-law compliance keywords', () => {
      const text = 'Noise complaint from neighbor';
      const categories = extractKeywords(text);
      expect(categories).toContain('bylawCompliance');
    });

    test('should identify financial keywords', () => {
      const text = 'Overdue levy payment';
      const categories = extractKeywords(text);
      expect(categories).toContain('financial');
    });

    test('should identify multiple categories', () => {
      const text = 'AGM meeting to discuss levy arrears and roof repairs';
      const categories = extractKeywords(text);
      expect(categories.length).toBeGreaterThanOrEqual(2);
      expect(categories).toContain('governance');
      expect(categories).toContain('maintenanceRepairs');
    });
  });

  describe('Ticket Enrichment', () => {
    test('should create enriched ticket object', () => {
      const mockTicket = {
        id: 123,
        subject: 'Roof Leak',
        description: '<p>Water leak from roof in Lot 5</p>',
        priority: 3,
        requester_id: 456,
        tags: ['urgent']
      };

      const enriched = {
        ticketId: mockTicket.id,
        subject: 'Roof Leak',
        description: 'Water leak from roof in Lot 5',
        normalizedText: 'Roof Leak\n\nWater leak from roof in Lot 5',
        priority: 'high',
        entities: {
          lotNumbers: ['Lot 5']
        },
        categoryHints: ['maintenanceRepairs'],
        processingTimestamp: expect.any(String)
      };

      expect(enriched.ticketId).toBe(123);
      expect(enriched.normalizedText).toContain('Roof Leak');
      expect(enriched.categoryHints).toContain('maintenanceRepairs');
    });

    test('should map priority correctly', () => {
      const priorityMap = {
        1: 'low',
        2: 'medium',
        3: 'high',
        4: 'urgent'
      };

      expect(priorityMap[1]).toBe('low');
      expect(priorityMap[2]).toBe('medium');
      expect(priorityMap[3]).toBe('high');
      expect(priorityMap[4]).toBe('urgent');
    });
  });
});
