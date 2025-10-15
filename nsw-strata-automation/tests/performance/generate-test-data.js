/**
 * Test Data Generator for Performance Testing
 * Generates 10K+ knowledge base entries with embeddings for vector search testing
 */

const crypto = require('crypto');

// NSW Strata categories and subcategories (Task 8.0)
const categories = {
  'Maintenance & Repairs': ['commonProperty', 'systems', 'emergency', 'amenities', 'defects'],
  'By-Law Compliance': ['noise', 'parking', 'pets', 'smoking', 'rubbish', 'shortTermLetting', 'nuisance'],
  'Financial Matters': ['levies', 'disputes', 'statements', 'insurance'],
  'Governance & Administration': ['meetings', 'committees', 'bylaws', 'records', 'compliance'],
  'Renovations & Alterations': ['cosmetic', 'minor', 'major'],
  'Disputes & Complaints': ['neighbor', 'ownersCorporation', 'strataManager', 'ncat'],
  'Security & Safety': ['access', 'cctv', 'hazards', 'fireSafety', 'windowSafety'],
  'Information Requests': ['general', 'onboarding', 'vendor']
};

// Sample knowledge entry templates
const knowledgeTemplates = [
  {
    titlePattern: '{issue} in {location} - Resolution Process',
    issueTypes: ['Roof Leak', 'Plumbing Issue', 'Electrical Fault', 'HVAC Problem', 'Lift Malfunction'],
    locations: ['Common Area', 'Lot', 'Building Exterior', 'Parking Area', 'Amenities']
  },
  {
    titlePattern: '{bylaw} Violation - {issue}',
    bylaws: ['Noise', 'Parking', 'Pet', 'Smoking', 'Rubbish Disposal'],
    issues: ['Complaint Handling', 'Warning Process', 'Enforcement Procedure']
  },
  {
    titlePattern: '{financial} - {action}',
    financial: ['Unpaid Levies', 'Special Levy', 'Budget Planning', 'Insurance Claim'],
    actions: ['Recovery Process', 'Payment Plan', 'Resolution Steps']
  },
  {
    titlePattern: '{governance} - Requirements and Procedures',
    governance: ['AGM', 'EGM', 'Committee Meeting', 'By-Law Amendment', 'Records Access']
  },
  {
    titlePattern: '{renovation} Approval - {type}',
    renovation: ['Flooring', 'Kitchen', 'Bathroom', 'Balcony', 'Window'],
    types: ['Process', 'Requirements', 'Documentation']
  }
];

/**
 * Generate a random embedding vector (1536 dimensions for text-embedding-3-small)
 */
function generateRandomEmbedding() {
  const dimensions = 1536;
  const embedding = [];

  for (let i = 0; i < dimensions; i++) {
    // Generate values between -0.5 and 0.5
    embedding.push((Math.random() - 0.5));
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

/**
 * Generate a single knowledge base entry
 */
function generateKnowledgeEntry(id, category, subcategory) {
  const template = knowledgeTemplates[Math.floor(Math.random() * knowledgeTemplates.length)];

  // Generate title
  let title = template.titlePattern;
  Object.keys(template).forEach(key => {
    if (key !== 'titlePattern' && Array.isArray(template[key])) {
      const value = template[key][Math.floor(Math.random() * template[key].length)];
      title = title.replace(`{${key}}`, value);
    }
  });

  // Generate summary
  const summaries = [
    `Comprehensive guide for handling ${category.toLowerCase()} issues in strata schemes.`,
    `Step-by-step process for resolving ${subcategory} matters in NSW strata properties.`,
    `Legal requirements and best practices for ${category.toLowerCase()} under SSMA 2015.`,
    `Practical advice for strata managers dealing with ${subcategory} situations.`,
    `Resolution procedures compliant with NSW strata legislation and model by-laws.`
  ];
  const summary = summaries[Math.floor(Math.random() * summaries.length)];

  // Generate full content
  const content = `
## ${title}

### Issue Description
This knowledge entry covers ${subcategory} issues within the ${category} category.

### NSW Legal Context
Relevant legislation: SSMA 2015, SSDA 2015
Model By-laws: ${Math.floor(Math.random() * 18) + 1}

### Solution Steps
1. Assess the situation and gather relevant information
2. Review applicable by-laws and legislation
3. Communicate with relevant stakeholders
4. Implement appropriate resolution steps
5. Document the outcome and update records

### Prevention Advice
- Regular maintenance and inspections
- Clear communication of by-laws and procedures
- Prompt response to issues
- Proper documentation and record keeping

### Estimated Resolution Time
${Math.floor(Math.random() * 14) + 1} days

### Success Rate
Based on historical data and similar cases.

### Last Updated
${new Date().toISOString()}
  `.trim();

  // Generate search keywords
  const keywords = [
    category.toLowerCase().replace(/\s+/g, '-'),
    subcategory.toLowerCase(),
    'nsw',
    'strata',
    'ssma-2015'
  ];

  // Generate metadata
  const metadata = {
    category: category,
    subcategory: subcategory,
    status: 'active',
    success_rate: 0.70 + Math.random() * 0.25, // 0.70 to 0.95
    summary: summary,
    usage_count: Math.floor(Math.random() * 100),
    last_used: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(), // Last 6 months
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString() // Last year
  };

  return {
    id: `kb-${String(id).padStart(6, '0')}`,
    title: title,
    content: content,
    embedding: generateRandomEmbedding(),
    metadata: metadata,
    search_keywords: keywords,
    created_at: metadata.created_at,
    updated_at: new Date().toISOString()
  };
}

/**
 * Generate N knowledge base entries
 */
function generateKnowledgeBase(count = 10000) {
  console.log(`Generating ${count} knowledge base entries...`);
  const entries = [];

  const categoryKeys = Object.keys(categories);

  for (let i = 1; i <= count; i++) {
    // Distribute entries across categories
    const categoryIndex = i % categoryKeys.length;
    const category = categoryKeys[categoryIndex];
    const subcategories = categories[category];
    const subcategory = subcategories[Math.floor(Math.random() * subcategories.length)];

    const entry = generateKnowledgeEntry(i, category, subcategory);
    entries.push(entry);

    if (i % 1000 === 0) {
      console.log(`  Generated ${i}/${count} entries...`);
    }
  }

  console.log(`✓ Generated ${count} entries`);
  return entries;
}

/**
 * Export as SQL INSERT statements for Supabase
 */
function exportToSQL(entries, outputFile) {
  const fs = require('fs');
  const path = require('path');

  console.log(`\nExporting to SQL: ${outputFile}`);

  let sql = `-- Generated test data for vector search performance testing
-- Total entries: ${entries.length}
-- Generated: ${new Date().toISOString()}

`;

  // Batch inserts for better performance
  const batchSize = 100;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, Math.min(i + batchSize, entries.length));

    sql += `INSERT INTO knowledge_base (id, title, content, embedding, metadata, search_keywords, created_at, updated_at)
VALUES\n`;

    sql += batch.map(entry => {
      const embeddingArray = `[${entry.embedding.join(',')}]`;
      const metadataJson = JSON.stringify(entry.metadata).replace(/'/g, "''");
      const keywordsArray = `{${entry.search_keywords.join(',')}}`;

      return `  ('${entry.id}',
   ${JSON.stringify(entry.title)},
   ${JSON.stringify(entry.content)},
   '${embeddingArray}'::vector(1536),
   '${metadataJson}'::jsonb,
   '${keywordsArray}'::text[],
   '${entry.created_at}',
   '${entry.updated_at}')`;
    }).join(',\n');

    sql += `;\n\n`;
  }

  fs.writeFileSync(outputFile, sql);
  console.log(`✓ Exported ${entries.length} entries to ${outputFile}`);
  console.log(`  File size: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Export as JSON for testing
 */
function exportToJSON(entries, outputFile) {
  const fs = require('fs');

  console.log(`\nExporting to JSON: ${outputFile}`);

  const json = {
    metadata: {
      total_entries: entries.length,
      generated_at: new Date().toISOString(),
      categories: Object.keys(categories),
      embedding_dimensions: 1536
    },
    entries: entries.slice(0, 100) // Sample for testing (full dataset would be too large)
  };

  fs.writeFileSync(outputFile, JSON.stringify(json, null, 2));
  console.log(`✓ Exported sample (100 entries) to ${outputFile}`);
}

/**
 * Generate performance test summary
 */
function generateSummary(entries) {
  const categoryCounts = {};
  let totalSuccessRate = 0;

  entries.forEach(entry => {
    const category = entry.metadata.category;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    totalSuccessRate += entry.metadata.success_rate;
  });

  console.log(`\n=== Test Data Summary ===`);
  console.log(`Total Entries: ${entries.length}`);
  console.log(`Average Success Rate: ${(totalSuccessRate / entries.length * 100).toFixed(2)}%`);
  console.log(`\nDistribution by Category:`);

  Object.entries(categoryCounts).forEach(([category, count]) => {
    const percentage = (count / entries.length * 100).toFixed(2);
    console.log(`  ${category}: ${count} (${percentage}%)`);
  });

  console.log(`\nEmbedding Dimensions: 1536`);
  console.log(`Storage per entry: ~${(JSON.stringify(entries[0]).length / 1024).toFixed(2)} KB`);
  console.log(`Total storage: ~${(JSON.stringify(entries).length / 1024 / 1024).toFixed(2)} MB`);
}

// Main execution
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 10000;
  const format = args[1] || 'json'; // 'json' or 'sql'

  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  NSW Strata Test Data Generator       ║`);
  console.log(`╚════════════════════════════════════════╝\n`);

  // Generate entries
  const entries = generateKnowledgeBase(count);

  // Export based on format
  const outputDir = path.join(__dirname, 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (format === 'sql') {
    const sqlFile = path.join(outputDir, `test-data-${count}.sql`);
    exportToSQL(entries, sqlFile);
  } else {
    const jsonFile = path.join(outputDir, `test-data-sample.json`);
    exportToJSON(entries, jsonFile);
  }

  // Generate summary
  generateSummary(entries);

  console.log(`\n✓ Test data generation complete!`);
  console.log(`\nUsage:`);
  console.log(`  node generate-test-data.js [count] [format]`);
  console.log(`  Examples:`);
  console.log(`    node generate-test-data.js 10000 json`);
  console.log(`    node generate-test-data.js 50000 sql`);
  console.log(`    node generate-test-data.js 100000 sql\n`);
}

module.exports = {
  generateKnowledgeBase,
  generateKnowledgeEntry,
  generateRandomEmbedding,
  exportToSQL,
  exportToJSON
};
