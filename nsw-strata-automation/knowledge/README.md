# Knowledge Base

This directory contains NSW strata management knowledge entries stored as Markdown files with YAML frontmatter.

## Directory Structure

```
knowledge/
├── maintenance-repairs/
│   ├── common-property/
│   │   ├── 001-roof-leak.md
│   │   └── 002-facade-damage.md
│   ├── building-systems/
│   │   ├── 001-lift-malfunction.md
│   │   └── 002-plumbing-issues.md
│   ├── emergency-repairs/
│   ├── amenities/
│   └── defects/
├── by-law-compliance/
│   ├── noise/
│   │   └── 001-late-night-noise.md
│   ├── parking/
│   ├── pets/
│   ├── smoking/
│   ├── rubbish/
│   ├── short-term-letting/
│   └── nuisance/
├── financial-matters/
│   ├── levies/
│   ├── disputes/
│   ├── statements/
│   └── insurance/
├── governance-administration/
│   ├── meetings/
│   ├── committees/
│   ├── by-laws/
│   ├── records/
│   └── compliance/
├── renovations-alterations/
│   ├── cosmetic/
│   ├── minor/
│   └── major/
├── disputes-complaints/
│   ├── neighbor/
│   ├── owners-corporation/
│   ├── strata-manager/
│   └── ncat/
├── security-safety/
│   ├── access-control/
│   ├── cctv/
│   ├── hazards/
│   ├── fire-safety/
│   └── window-safety/
└── information-requests/
    ├── general/
    ├── onboarding/
    └── vendor/
```

## Knowledge Entry Template

Each knowledge entry follows this structure:

```markdown
---
id: 001-roof-leak
title: Roof Leak in Common Property
category: maintenance-repairs
subcategory: common-property
created: 2024-10-14
updated: 2024-10-14
author: john.smith
status: active
success_rate: 0.95
resolution_time_avg: 172800
requires_human_review: false
version: 1.0.0
legislation:
  - SSMA 2015 Section 106
  - SSDA 2015 Section 132
related_bylaws:
  - Model By-law 3 (Damage to Property)
  - Model By-law 7 (Notice of Alterations)
---

# Roof Leak in Common Property

## Issue Description

What property owners and tenants typically report:
- Water leaking through ceiling
- Visible water damage on walls
- Damp patches appearing after rain
- Mould developing in affected areas

## NSW Legal Context

**Relevant Legislation:**
- **SSMA 2015, Section 106:** Owners corporation duty to maintain and repair common property
- **SSDA 2015, Section 132:** Defect liability and building warranties

**Priority Level:** Critical (emergency repairs affecting safety/habitability)

**Responsibility:** Owners Corporation (unless caused by lot owner alterations)

**2025 Reforms:** Capital works fund planning must include roof maintenance in 10-year plan

## Solution Steps

1. **Immediate Response (within 24 hours)**
   - Contact owners corporation emergency maintenance provider
   - Arrange temporary waterproofing if needed
   - Document damage with photos

2. **Assessment (within 3-5 business days)**
   - Engage licensed building inspector
   - Determine extent of damage
   - Identify cause (general wear vs specific damage)

3. **Repair Coordination (within 2 weeks)**
   - Obtain quotes from licensed waterproofing contractors
   - If cost >$30,000, may require committee approval
   - Schedule repairs considering weather conditions

4. **Follow-up (post-repair)**
   - Inspect affected lots for secondary damage
   - Update maintenance records
   - Consider insurance claim if applicable

## Prevention Advice

- Schedule annual roof inspections (especially pre-winter)
- Include roof maintenance in capital works fund planning
- Address minor issues promptly before escalation
- Keep gutters and drainage clear

## Estimated Resolution Time

- **Emergency waterproofing:** Same day
- **Full repair:** 2-4 weeks (weather dependent)
- **Insurance claims:** Additional 4-6 weeks

## Stakeholder Responsibilities

| Stakeholder | Responsibility |
|------------|---------------|
| Owners Corporation | Organize and fund repairs to common property |
| Strata Manager | Coordinate contractors, obtain quotes, manage process |
| Building Manager | Initial response, temporary measures |
| Affected Lot Owners | Report issue, provide access for inspection |
| Committee | Approve expenditure if required |

## Required Documentation

- Building inspection report
- Contractor quotes (minimum 3 for major works)
- Photos of damage (before/during/after)
- Insurance assessment (if claiming)
- Committee meeting minutes (if approval required)
- Completion certificate from licensed contractor

## Success Rate

**95%** (based on 43 historical tickets)

- Average resolution time: 48 hours (2 days)
- Customer satisfaction: 4.7/5
- Reopened tickets: 2%

## Keywords

roof, leak, water damage, ceiling, common property, emergency repair, waterproofing, SSMA Section 106

## Related Knowledge Entries

- [002-facade-damage.md](002-facade-damage.md)
- [../building-systems/002-plumbing-issues.md](../building-systems/002-plumbing-issues.md)
- [../../financial-matters/insurance/001-building-damage-claims.md](../../financial-matters/insurance/001-building-damage-claims.md)

## Version History

- **v1.0.0** (2024-10-14): Initial entry created from 43 historical tickets
```

## Entry Naming Convention

Files should be named: `{number}-{brief-description}.md`

Examples:
- `001-roof-leak.md` ✅
- `002-noise-complaint.md` ✅
- `003-levy-payment-query.md` ✅
- `roof_leak.md` ❌ (no number)
- `001.md` ❌ (no description)

## YAML Frontmatter Fields

### Required Fields

- **id**: Unique identifier (format: `{number}-{slug}`)
- **title**: Human-readable title
- **category**: Primary category (must match directory name)
- **subcategory**: Subcategory (must match parent directory)
- **created**: Creation date (YYYY-MM-DD)
- **updated**: Last update date (YYYY-MM-DD)
- **author**: Author username
- **status**: Entry status (active, inactive, draft, review)
- **success_rate**: Decimal 0-1 (calculated from historical tickets)
- **version**: Semantic version (MAJOR.MINOR.PATCH)

### Optional Fields

- **resolution_time_avg**: Average resolution time in seconds
- **requires_human_review**: Boolean flag
- **legislation**: Array of NSW legislation references
- **related_bylaws**: Array of relevant by-laws
- **property_specific**: Boolean if property-specific
- **complexity**: Integer 1-5
- **stakeholder_types**: Array (owner, tenant, committee, manager)

## Creating New Knowledge Entries

### 1. From Historical Tickets

When 3+ similar tickets are resolved successfully:

```bash
# Create new entry file
touch knowledge/by-law-compliance/noise/003-construction-hours.md

# Use template above
# Fill in all required fields
# Document solution based on successful resolutions
```

### 2. From NSW Legislation Updates

When regulations change:

```bash
# Create entry documenting new requirements
touch knowledge/governance-administration/compliance/006-2025-capital-works-planning.md

# Reference legislation sections
# Explain implications for strata schemes
# Provide compliance steps
```

### 3. From Manual Creation

For proactive knowledge:

```bash
# Research topic thoroughly
# Validate with NSW legislation
# Get approval from subject matter expert
# Create entry with status: draft
```

## Updating Existing Entries

### Version Updates

- **PATCH (1.0.X)**: Minor corrections, updated stats
- **MINOR (1.X.0)**: Additional information, new sections
- **MAJOR (X.0.0)**: Significant changes, restructuring

```markdown
---
version: 1.1.0  # Incremented from 1.0.0
updated: 2024-10-15
---

... content ...

## Version History

- **v1.1.0** (2024-10-15): Added prevention advice section, updated success rate
- **v1.0.0** (2024-10-14): Initial entry
```

### Success Rate Updates

Run nightly:

```sql
-- Update success rates from ticket resolutions
UPDATE knowledge_base kb
SET success_rate = (
  SELECT COUNT(*) FILTER (WHERE satisfied = true)::float / COUNT(*)
  FROM ticket_resolutions tr
  WHERE tr.kb_id = kb.id AND tr.created_at > NOW() - INTERVAL '90 days'
)
WHERE EXISTS (
  SELECT 1 FROM ticket_resolutions tr2
  WHERE tr2.kb_id = kb.id
);
```

## Syncing with Database

### Export from Database to Markdown

```bash
# Script to export knowledge entries
#!/bin/bash
psql "postgresql://..." -c "
SELECT
  metadata->>'id' AS id,
  metadata->>'category' AS category,
  metadata->>'subcategory' AS subcategory,
  title,
  content
FROM knowledge_base
WHERE status = 'active'
" | while read id category subcategory title content; do
  mkdir -p "knowledge/$category/$subcategory"
  echo "---
id: $id
title: $title
category: $category
subcategory: $subcategory
...
---

$content" > "knowledge/$category/$subcategory/$id.md"
done
```

### Import from Markdown to Database

```bash
# Script to import knowledge entries
#!/bin/bash
for file in knowledge/**/**/*.md; do
  # Extract YAML frontmatter and content
  # Generate embeddings via OpenAI
  # Upsert to knowledge_base table
  python scripts/import_knowledge.py "$file"
done
```

## Quality Control

### Pre-Commit Checks

```bash
# Validate YAML frontmatter
python scripts/validate_knowledge.py knowledge/

# Check for required fields
# Validate category/subcategory match directory structure
# Ensure version increments properly
# Check for broken links
```

### Review Process

1. **Draft** - Initial creation
2. **Review** - Subject matter expert review
3. **Active** - Approved and in use
4. **Inactive** - Deprecated but retained for history

## Search and Discovery

### Full-Text Search

```bash
# Search across all knowledge entries
grep -r "noise complaint" knowledge/

# Search in specific category
grep -r "Section 106" knowledge/maintenance-repairs/
```

### By Category

```bash
# List all entries in category
ls -la knowledge/by-law-compliance/noise/

# Count entries per category
find knowledge/ -name "*.md" | cut -d/ -f2 | sort | uniq -c
```

## Backup and Recovery

### Backup

Knowledge entries are version controlled in Git:

```bash
# Commit changes
git add knowledge/
git commit -m "docs(knowledge): add new roof leak prevention advice"
git push
```

### Recovery

```bash
# Restore specific entry
git checkout HEAD~1 -- knowledge/maintenance-repairs/common-property/001-roof-leak.md

# Restore entire category
git checkout v1.0.0 -- knowledge/by-law-compliance/
```

## Best Practices

1. **One issue per entry** - Don't combine unrelated topics
2. **Clear, action-oriented titles** - Users should know what it's about
3. **Reference legislation** - Always cite NSW acts and sections
4. **Include examples** - Real-world scenarios help understanding
5. **Update regularly** - Keep success rates and stats current
6. **Link related entries** - Help users discover relevant information
7. **Use consistent formatting** - Follow the template structure
8. **Get expert review** - Validate technical and legal accuracy
9. **Track versions** - Document significant changes
10. **Test with users** - Ensure knowledge is helpful and clear

## NSW Legislation Resources

- [NSW Legislation](https://legislation.nsw.gov.au/)
- [Strata Schemes Management Act 2015](https://legislation.nsw.gov.au/view/html/inforce/current/act-2015-050)
- [Strata Schemes Development Act 2015](https://legislation.nsw.gov.au/view/html/inforce/current/act-2015-051)
- [NSW Fair Trading - Strata](https://www.fairtrading.nsw.gov.au/housing-and-property/strata-and-community-living)

## Related Documentation

- [Database Schema](../database/README.md)
- [Workflow Documentation](../workflows/README.md)
- [Contributing Guide](../CONTRIBUTING.md)
