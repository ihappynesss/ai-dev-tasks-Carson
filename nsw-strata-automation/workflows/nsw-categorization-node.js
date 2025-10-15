// Task 8.0: NSW Strata Categorization System
// This node implements comprehensive NSW strata ticket categorization
// with 8 primary categories, subcategories, priority logic, and compliance tracking

function categorizeNSWStrataTicket(ticket) {
  const text = ticket.normalizedText.toLowerCase();
  const entities = ticket.entities;

  // Task 8.2-8.9: Define all 8 primary categories with subcategories and keywords
  const categories = {
    // Task 8.2: Maintenance & Repairs
    maintenanceRepairs: {
      name: 'Maintenance & Repairs',
      priority: 'high', // Default, will be refined
      subcategories: {
        commonProperty: {
          keywords: ['roof', 'leak', 'common area', 'lobby', 'hallway', 'stairwell', 'facade', 'building exterior', 'common wall', 'shared'],
          examples: ['roof leak', 'common area damage', 'lobby repair']
        },
        systems: {
          keywords: ['lift', 'elevator', 'plumbing', 'electrical', 'hvac', 'air conditioning', 'heating', 'ventilation', 'hot water', 'water system'],
          examples: ['lift malfunction', 'plumbing issue', 'electrical fault']
        },
        emergency: {
          keywords: ['emergency', 'urgent', 'immediate', 'critical', 'dangerous', 'hazardous', 'safety risk', 'flood', 'gas leak', 'power outage'],
          examples: ['emergency repair', 'gas leak', 'flood damage'],
          priorityOverride: 'critical'
        },
        amenities: {
          keywords: ['pool', 'gym', 'sauna', 'bbq', 'garden', 'playground', 'tennis court', 'recreation', 'amenity'],
          examples: ['pool maintenance', 'gym equipment', 'garden repair']
        },
        defects: {
          keywords: ['defect', 'warranty', 'building defect', 'structural', 'crack', 'water ingress', 'mould', 'mold'],
          examples: ['building defect', 'structural issue', 'water damage']
        }
      }
    },

    // Task 8.3: By-Law Compliance
    bylawCompliance: {
      name: 'By-Law Compliance',
      priority: 'medium',
      subcategories: {
        noise: {
          keywords: ['noise', 'loud', 'noisy', 'disturbance', 'party', 'music', 'tv', 'construction noise', 'late night', 'barking'],
          examples: ['noise complaint', 'loud music', 'late night disturbance'],
          bylaws: [1, 2] // Model By-laws 1 & 2
        },
        parking: {
          keywords: ['parking', 'car', 'vehicle', 'garage', 'car space', 'visitor parking', 'unauthorized parking'],
          examples: ['parking violation', 'unauthorized vehicle'],
          bylaws: [7] // Model By-law 7
        },
        pets: {
          keywords: ['pet', 'dog', 'cat', 'animal', 'pet approval', 'barking dog'],
          examples: ['unauthorized pet', 'pet complaint'],
          bylaws: [8] // Model By-law 8
        },
        smoking: {
          keywords: ['smoking', 'smoke', 'cigarette', 'tobacco', 'vaping'],
          examples: ['smoking complaint', 'secondhand smoke'],
          bylaws: [5] // Model By-law 5
        },
        rubbish: {
          keywords: ['rubbish', 'garbage', 'waste', 'trash', 'recycling', 'bin'],
          examples: ['rubbish disposal', 'garbage issue'],
          bylaws: [4] // Model By-law 4
        },
        shortTermLetting: {
          keywords: ['airbnb', 'short-term', 'short term', 'rental', 'letting', 'holiday rental', 'accommodation'],
          examples: ['Airbnb complaint', 'short-term letting'],
          bylaws: [14], // Model By-law 14
          priorityOverride: 'high'
        },
        nuisance: {
          keywords: ['nuisance', 'disturbance', 'antisocial', 'harassment', 'behavior', 'behaviour'],
          examples: ['nuisance complaint', 'antisocial behavior'],
          bylaws: [3] // Model By-law 3
        }
      }
    },

    // Task 8.4: Financial Matters
    financialMatters: {
      name: 'Financial Matters',
      priority: 'medium',
      subcategories: {
        levies: {
          keywords: ['levy', 'levies', 'strata levy', 'admin fund', 'sinking fund', 'capital works fund', 'overdue', 'arrears', 'payment plan'],
          examples: ['unpaid levies', 'levy arrears', 'payment plan'],
          legislation: ['SSMA 2015 Section 85-86']
        },
        disputes: {
          keywords: ['financial dispute', 'levy dispute', 'charge dispute', 'cost dispute', 'billing error'],
          examples: ['disputed levy', 'incorrect charge'],
          legislation: ['SSMA 2015 Section 232']
        },
        statements: {
          keywords: ['financial statement', 'levy notice', 'statement', 'invoice', 'account', 'balance'],
          examples: ['request statement', 'levy notice inquiry']
        },
        insurance: {
          keywords: ['insurance', 'claim', 'building insurance', 'contents insurance', 'public liability', 'strata insurance'],
          examples: ['insurance claim', 'insurance inquiry'],
          legislation: ['SSMA 2015 Section 160-162']
        }
      }
    },

    // Task 8.5: Governance & Administration
    governanceAdministration: {
      name: 'Governance & Administration',
      priority: 'medium',
      subcategories: {
        meetings: {
          keywords: ['agm', 'annual general meeting', 'egm', 'extraordinary general meeting', 'general meeting', 'meeting', 'notice', 'agenda', 'minutes'],
          examples: ['AGM inquiry', 'meeting notice', 'minutes request'],
          legislation: ['SSMA 2015 Section 18-31']
        },
        committees: {
          keywords: ['committee', 'strata committee', 'executive committee', 'nomination', 'election'],
          examples: ['committee nomination', 'committee inquiry'],
          legislation: ['SSMA 2015 Section 32-45']
        },
        bylaws: {
          keywords: ['by-law', 'bylaw', 'strata by-law', 'model by-law', 'by-law change', 'special resolution'],
          examples: ['by-law inquiry', 'change by-law'],
          legislation: ['SSMA 2015 Section 136-151']
        },
        records: {
          keywords: ['records', 'documents', 'strata records', 'roll', 'register', 'inspection', 'access'],
          examples: ['access records', 'document request'],
          legislation: ['SSMA 2015 Section 178-183']
        },
        compliance: {
          keywords: ['compliance', 'regulation', 'requirement', 'obligation', 'duty', 'responsibility'],
          examples: ['compliance inquiry', 'legal obligation'],
          legislation: ['SSMA 2015', 'SSDA 2015']
        }
      }
    },

    // Task 8.6: Renovations & Alterations (Three-tier system)
    renovationsAlterations: {
      name: 'Renovations & Alterations',
      priority: 'medium',
      subcategories: {
        cosmetic: {
          keywords: ['paint', 'carpet', 'curtain', 'blind', 'cosmetic', 'internal painting', 'floor covering'],
          examples: ['painting request', 'carpet replacement'],
          approvalRequired: false,
          legislation: ['SSMA 2015 Section 109'] // Cosmetic work definition
        },
        minor: {
          keywords: ['flooring', 'timber floor', 'laminate', 'tile', 'kitchen', 'bathroom', 'minor renovation', 'internal alteration'],
          examples: ['timber flooring', 'kitchen renovation'],
          approvalRequired: true,
          approvalType: 'committee',
          legislation: ['SSMA 2015 Section 108-110']
        },
        major: {
          keywords: ['structural', 'major renovation', 'wall removal', 'balcony', 'window', 'external', 'major alteration', 'building work'],
          examples: ['structural change', 'balcony enclosure'],
          approvalRequired: true,
          approvalType: 'general_meeting_special_resolution',
          priorityOverride: 'high',
          legislation: ['SSMA 2015 Section 108', 'SSDA 2015']
        }
      }
    },

    // Task 8.7: Disputes & Complaints
    disputesComplaints: {
      name: 'Disputes & Complaints',
      priority: 'high',
      subcategories: {
        neighbor: {
          keywords: ['neighbor', 'neighbour', 'lot owner', 'resident', 'tenant', 'dispute with neighbor'],
          examples: ['neighbor dispute', 'resident complaint']
        },
        ownersCorporation: {
          keywords: ['owners corporation', 'oc dispute', 'strata scheme', 'body corporate'],
          examples: ['dispute with OC', 'OC complaint']
        },
        strataManager: {
          keywords: ['strata manager', 'managing agent', 'property manager', 'manager complaint'],
          examples: ['strata manager complaint', 'service issue']
        },
        ncat: {
          keywords: ['ncat', 'tribunal', 'civil and administrative tribunal', 'mediation', 'hearing', 'application', 'order'],
          examples: ['NCAT application', 'tribunal matter'],
          priorityOverride: 'critical',
          legislation: ['SSMA 2015 Section 232-240']
        }
      }
    },

    // Task 8.8: Security & Safety
    securitySafety: {
      name: 'Security & Safety',
      priority: 'high',
      subcategories: {
        access: {
          keywords: ['access', 'entry', 'intercom', 'key', 'fob', 'lock', 'security gate', 'access control'],
          examples: ['access issue', 'key request', 'intercom fault']
        },
        cctv: {
          keywords: ['cctv', 'camera', 'surveillance', 'security camera', 'recording', 'privacy'],
          examples: ['CCTV inquiry', 'camera installation'],
          legislation: ['Privacy Act 1988']
        },
        hazards: {
          keywords: ['hazard', 'dangerous', 'unsafe', 'safety concern', 'risk', 'trip hazard'],
          examples: ['safety hazard', 'unsafe condition'],
          priorityOverride: 'critical'
        },
        fireSafety: {
          keywords: ['fire', 'fire safety', 'smoke alarm', 'fire alarm', 'extinguisher', 'fire exit', 'emergency exit', 'evacuation'],
          examples: ['fire safety issue', 'smoke alarm'],
          priorityOverride: 'critical',
          legislation: ['Environmental Planning and Assessment Regulation 2021']
        },
        windowSafety: {
          keywords: ['window', 'window safety', 'balustrade', 'railing', 'fall prevention', 'child safety'],
          examples: ['window safety', 'balustrade issue'],
          legislation: ['SSMA 2015 Section 106'] // Window safety devices
        }
      }
    },

    // Task 8.9: Information Requests
    informationRequests: {
      name: 'Information Requests',
      priority: 'low',
      subcategories: {
        general: {
          keywords: ['information', 'inquiry', 'question', 'how to', 'what is', 'general inquiry', 'clarification'],
          examples: ['general inquiry', 'information request']
        },
        onboarding: {
          keywords: ['new owner', 'new tenant', 'move in', 'moving in', 'onboarding', 'welcome', 'first time'],
          examples: ['new owner inquiry', 'moving in information']
        },
        vendor: {
          keywords: ['vendor', 'contractor', 'tradesperson', 'approved contractor', 'service provider'],
          examples: ['contractor inquiry', 'vendor list request']
        }
      }
    }
  };

  // Task 8.14: Keyword-based initial classification
  function performKeywordClassification() {
    const scores = {};

    // Score each category based on keyword matches
    for (const [categoryKey, category] of Object.entries(categories)) {
      scores[categoryKey] = { score: 0, subcategory: null, matchedKeywords: [] };

      for (const [subcatKey, subcat] of Object.entries(category.subcategories)) {
        let subcatScore = 0;
        const matched = [];

        for (const keyword of subcat.keywords) {
          if (text.includes(keyword.toLowerCase())) {
            subcatScore += 1;
            matched.push(keyword);
          }
        }

        if (subcatScore > scores[categoryKey].score) {
          scores[categoryKey] = {
            score: subcatScore,
            subcategory: subcatKey,
            matchedKeywords: matched,
            subcategoryData: subcat
          };
        }
      }
    }

    // Find best match
    let bestCategory = null;
    let bestScore = 0;

    for (const [categoryKey, data] of Object.entries(scores)) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestCategory = {
          category: categoryKey,
          categoryName: categories[categoryKey].name,
          ...data
        };
      }
    }

    return bestCategory;
  }

  // Task 8.15: Complexity scoring (1-5)
  function calculateComplexityScore(classification) {
    let complexity = 1; // Base complexity

    // Factor 1: Multiple entity types mentioned
    const entityCount =
      (entities.propertyAddresses?.length || 0) +
      (entities.lotNumbers?.length || 0) +
      (entities.strataPlanNumbers?.length || 0) +
      (entities.legislationReferences?.length || 0) +
      (entities.bylawNumbers?.length || 0);

    if (entityCount > 3) complexity += 1;

    // Factor 2: Multiple keywords matched
    if (classification && classification.score > 5) complexity += 1;

    // Factor 3: Category-specific complexity
    if (classification) {
      const complexCategories = ['disputesComplaints', 'renovationsAlterations', 'governanceAdministration'];
      if (complexCategories.includes(classification.category)) complexity += 1;

      // NCAT matters are always complex
      if (classification.subcategory === 'ncat') complexity = 5;

      // Major renovations are complex
      if (classification.subcategory === 'major') complexity += 1;
    }

    // Factor 4: Text length (longer = potentially more complex)
    if (ticket.textLength > 500) complexity += 1;

    // Factor 5: Legislation references (indicates legal complexity)
    if (entities.legislationReferences?.length > 0) complexity += 1;

    // Cap at 5
    return Math.min(complexity, 5);
  }

  // Task 8.15: Stakeholder type identification
  function identifyStakeholders(classification) {
    const stakeholders = {
      ownersCorporation: false,
      strataCommittee: false,
      strataManager: false,
      lotOwner: true, // Always involved (requester)
      tenant: false,
      contractor: false,
      thirdParty: false
    };

    // Identify from text
    if (text.includes('tenant') || text.includes('renter')) stakeholders.tenant = true;
    if (text.includes('contractor') || text.includes('tradesperson')) stakeholders.contractor = true;
    if (text.includes('neighbor') || text.includes('neighbour')) stakeholders.thirdParty = true;

    // Category-based stakeholders
    if (classification) {
      const category = classification.category;

      // OC always involved in financial, governance, and major works
      if (['financialMatters', 'governanceAdministration'].includes(category)) {
        stakeholders.ownersCorporation = true;
        stakeholders.strataCommittee = true;
        stakeholders.strataManager = true;
      }

      // Committee approval required for minor renovations
      if (category === 'renovationsAlterations' && classification.subcategory === 'minor') {
        stakeholders.strataCommittee = true;
      }

      // Major works require OC approval
      if (category === 'renovationsAlterations' && classification.subcategory === 'major') {
        stakeholders.ownersCorporation = true;
        stakeholders.strataCommittee = true;
      }

      // Maintenance typically involves strata manager
      if (category === 'maintenanceRepairs') {
        stakeholders.strataManager = true;
        if (classification.subcategory === 'emergency') {
          stakeholders.contractor = true;
        }
      }
    }

    return stakeholders;
  }

  // Task 8.10: Priority assignment logic
  function assignPriority(classification, complexity) {
    // Task 8.10: Critical priority (same-day per SSMA Section 106)
    if (classification && classification.subcategoryData?.priorityOverride === 'critical') {
      return {
        level: 'critical',
        responseTime: '4 hours', // Same business day
        dueBy: addHours(new Date(), 4),
        legislation: 'SSMA 2015 Section 106'
      };
    }

    // Emergency repairs
    if (classification?.subcategory === 'emergency') {
      return {
        level: 'critical',
        responseTime: '4 hours',
        dueBy: addHours(new Date(), 4),
        legislation: 'SSMA 2015 Section 106'
      };
    }

    // High priority (4-hour response)
    if (classification?.subcategoryData?.priorityOverride === 'high' ||
        ticket.priority === 'urgent' ||
        complexity >= 4) {
      return {
        level: 'high',
        responseTime: '4 hours',
        dueBy: addHours(new Date(), 4)
      };
    }

    // Medium priority (1 business day)
    if (classification?.category === 'bylawCompliance' ||
        classification?.category === 'maintenanceRepairs' ||
        complexity === 3) {
      return {
        level: 'medium',
        responseTime: '1 business day',
        dueBy: addBusinessDays(new Date(), 1)
      };
    }

    // Low priority (2 business days)
    return {
      level: 'low',
      responseTime: '2 business days',
      dueBy: addBusinessDays(new Date(), 2)
    };
  }

  // Helper functions
  function addHours(date, hours) {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result.toISOString();
  }

  function addBusinessDays(date, days) {
    const result = new Date(date);
    let addedDays = 0;

    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      // Skip weekends
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        addedDays++;
      }
    }

    return result.toISOString();
  }

  // Main classification process
  const classification = performKeywordClassification();
  const complexity = calculateComplexityScore(classification);
  const stakeholders = identifyStakeholders(classification);
  const priority = assignPriority(classification, complexity);

  // Task 8.11: Legislation references
  const legislationReferences = [];
  if (classification && classification.subcategoryData?.legislation) {
    legislationReferences.push(...classification.subcategoryData.legislation);
  }
  // Add extracted legislation from ticket text
  if (entities.legislationReferences?.length > 0) {
    legislationReferences.push(...entities.legislationReferences);
  }

  // Task 8.12: By-laws references
  const bylawReferences = [];
  if (classification && classification.subcategoryData?.bylaws) {
    bylawReferences.push(...classification.subcategoryData.bylaws);
  }
  // Add extracted by-laws from ticket text
  if (entities.bylawNumbers?.length > 0) {
    bylawReferences.push(...entities.bylawNumbers);
  }

  // Task 8.13: Check for 2025 reforms applicability
  const reforms2025 = {
    capitalWorksPlanning: false,
    disclosureObligations: false,
    accessibilityApprovals: false
  };

  if (classification?.category === 'renovationsAlterations' && classification?.subcategory === 'major') {
    reforms2025.accessibilityApprovals = true;
  }
  if (classification?.category === 'governanceAdministration') {
    reforms2025.capitalWorksPlanning = true;
    reforms2025.disclosureObligations = true;
  }
  if (text.includes('capital works') || text.includes('10 year plan')) {
    reforms2025.capitalWorksPlanning = true;
  }

  // Return comprehensive categorization result
  return {
    // Primary classification
    primaryCategory: classification?.categoryName || 'Uncategorized',
    primaryCategoryKey: classification?.category || null,
    subcategory: classification?.subcategory || null,
    subcategoryName: classification?.subcategoryData?.examples?.[0] || null,

    // Scoring
    matchScore: classification?.score || 0,
    matchedKeywords: classification?.matchedKeywords || [],
    confidence: classification ? Math.min(classification.score / 10, 1.0) : 0,

    // Task 8.15: Complexity and stakeholders
    complexity: complexity,
    complexityDescription: ['Very Simple', 'Simple', 'Moderate', 'Complex', 'Very Complex'][complexity - 1],
    stakeholders: stakeholders,
    stakeholderCount: Object.values(stakeholders).filter(Boolean).length,

    // Task 8.10: Priority
    priority: priority,

    // Task 8.11: Legislation
    legislationReferences: [...new Set(legislationReferences)],

    // Task 8.12: By-laws
    bylawReferences: [...new Set(bylawReferences)],

    // Task 8.13: 2025 reforms
    reforms2025: reforms2025,

    // Approval requirements (for renovations)
    approvalRequired: classification?.subcategoryData?.approvalRequired || false,
    approvalType: classification?.subcategoryData?.approvalType || null,

    // Metadata
    classificationTimestamp: new Date().toISOString(),
    classificationMethod: classification && classification.score > 2 ? 'keyword-match' : 'fallback-required'
  };
}

// Export for n8n Code node
return categorizeNSWStrataTicket($json);
