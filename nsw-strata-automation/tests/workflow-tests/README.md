# n8n Workflow Testing Suite

Comprehensive unit and integration tests for NSW Strata Automation n8n workflows.

## Overview

This test suite validates all workflow node configurations, decision logic, error handling, and integration points for the NSW Strata automation system. Tests are organized by node type and functionality to ensure complete coverage of the PRD requirements (Task 14.1).

## Test Structure

```
tests/workflow-tests/
├── README.md (this file)
├── unit/
│   └── nodes/
│       ├── webhook-node.test.js          # Webhook receiver & signature verification
│       ├── freshdesk-node.test.js        # Freshdesk API integration
│       ├── entity-extraction-node.test.js # Text normalization & entity extraction
│       ├── nsw-categorization-node.test.js # NSW strata categorization (Task 8.0)
│       ├── database-node.test.js         # Supabase vector search & queries
│       ├── routing-decision-node.test.js # 5-path routing decision engine (Task 5.0)
│       └── error-handling-node.test.js   # Error handling & retry logic (Task 11.0)
└── integration/
    └── (to be implemented in Task 14.2)
```

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Node tests only
npm run test:node

# Watch mode for development
npm run test:watch
```

### Run Individual Test Files

```bash
# Webhook tests
npx jest tests/workflow-tests/unit/nodes/webhook-node.test.js

# NSW Categorization tests
npx jest tests/workflow-tests/unit/nodes/nsw-categorization-node.test.js

# Routing tests
npx jest tests/workflow-tests/unit/nodes/routing-decision-node.test.js
```

## Test Coverage

### Current Coverage by PRD Task

- **Task 3.0 (Webhook & Ingestion)**: ✅ webhook-node.test.js
- **Task 4.0 (Knowledge Retrieval)**: ✅ database-node.test.js
- **Task 5.0 (Decision Engine)**: ✅ routing-decision-node.test.js
- **Task 8.0 (NSW Categorization)**: ✅ nsw-categorization-node.test.js
- **Task 9.0 (Conversation Management)**: 🔄 Partial (freshdesk-node.test.js)
- **Task 11.0 (Error Handling)**: ✅ error-handling-node.test.js

### Test Categories

#### 1. Webhook Node Tests (webhook-node.test.js)
- ✅ Webhook receiver configuration
- ✅ Immediate response (<500ms target)
- ✅ HMAC-SHA256 signature verification
- ✅ Security validation

**Key Tests:**
- Webhook POST method and path configuration
- Response mode for async processing
- Signature generation and validation
- Invalid signature rejection

#### 2. Freshdesk API Node Tests (freshdesk-node.test.js)
- ✅ Get ticket details configuration
- ✅ Post reply endpoint
- ✅ Update ticket status
- ✅ Retry logic (Task 11.1: 3 attempts, 5s delay)
- ✅ Status code mapping

**Key Tests:**
- API endpoint configuration
- Authentication credentials
- Timeout settings (10s)
- Retry configuration
- Custom fields for tracking

#### 3. Entity Extraction Node Tests (entity-extraction-node.test.js)
- ✅ HTML stripping
- ✅ HTML entity decoding
- ✅ NSW property address extraction
- ✅ Lot number extraction
- ✅ Strata plan number extraction
- ✅ Legislation reference extraction (SSMA/SSDA)
- ✅ By-law number extraction
- ✅ Keyword categorization

**Key Tests:**
- Regex patterns for Australian addresses
- Multiple entity extraction
- Category hint generation
- Priority mapping

#### 4. NSW Categorization Node Tests (nsw-categorization-node.test.js)
- ✅ 8 primary categories with subcategories (Task 8.1-8.9)
- ✅ Priority assignment logic (Task 8.10)
- ✅ Model by-laws references (Task 8.12)
- ✅ SSMA/SSDA legislation references (Task 8.11)
- ✅ Complexity scoring (1-5 scale, Task 8.15)
- ✅ 2025 reforms applicability (Task 8.13)
- ✅ Stakeholder identification (Task 8.15)

**Key Tests:**
- Category structure validation
- Critical priority for emergencies (SSMA Section 106)
- Three-tier renovation system (cosmetic/minor/major)
- NCAT matters complexity=5
- By-law to subcategory mapping

#### 5. Database Node Tests (database-node.test.js)
- ✅ Embedding generation (text-embedding-3-small)
- ✅ Hybrid search (vector + keyword)
- ✅ Reciprocal Rank Fusion scoring
- ✅ Fallback keyword-only search
- ✅ Lazy loading for content
- ✅ HNSW index configuration (m=16, ef_construction=64)
- ✅ Metadata filtering
- ✅ Connection pooling
- ✅ Redis caching (1-hour TTL)

**Key Tests:**
- pgvector <-> operator
- pg_trgm similarity function
- Top-5 result selection
- Query latency <200ms target
- Database retry configuration

#### 6. Routing Decision Node Tests (routing-decision-node.test.js)
- ✅ 5 routing paths (Task 5.1)
- ✅ Path 1: Auto-Respond (>0.85 similarity, Task 5.2)
- ✅ Path 2: Auto-Refine (0.75-0.85, Task 5.3)
- ✅ Path 3: Generate Draft (0.50-0.75, Task 5.4)
- ✅ Path 4: Deep Research (<0.50, Task 5.5)
- ✅ Path 5: Immediate Escalation (urgent/complex, Task 5.6)
- ✅ Tag assignment (Task 5.12)
- ✅ Status updates (Task 5.11)
- ✅ Dynamic threshold tuning (Task 5.14)

**Key Tests:**
- Similarity threshold validation
- Training sample requirements
- Priority override logic
- Human review flags
- Quality check integration
- Confidence score calculation

#### 7. Error Handling Node Tests (error-handling-node.test.js)
- ✅ Node-level retry (3 attempts, 5s, Task 11.1)
- ✅ Error classification (transient/systematic/critical, Task 11.7)
- ✅ Error logging schema (Task 11.4)
- ✅ Slack notifications within 1 minute (Task 11.5)
- ✅ Redis retry queue (7-day TTL, Task 11.6)
- ✅ Circuit breaker pattern (Task 11.8)
- ✅ Fallback strategies (Task 11.9-11.11)
- ✅ Error pattern detection (Task 11.14)
- ✅ Runbook procedures (Task 11.15)

**Key Tests:**
- Retry configuration on all critical nodes
- Error type classification logic
- Circuit breaker state transitions
- Fallback hierarchy (Claude → GPT-4o → GPT-4o Mini)
- Repeating and cascading error detection

## Coverage Goals

The test suite aims for:
- **Branches**: 70%+
- **Functions**: 70%+
- **Lines**: 70%+
- **Statements**: 70%+

Run `npm test` to see current coverage report.

## Test Data

### Mock Data Examples

#### Sample Ticket
```javascript
{
  id: 123,
  subject: 'Roof leak in common area',
  description: '<p>Water leaking from roof in Lot 5</p>',
  priority: 3,
  requester_id: 456,
  tags: ['urgent'],
  customFields: {
    property_address: '123 George St, Sydney NSW 2000',
    complexity: 3
  }
}
```

#### Sample Knowledge Entry
```javascript
{
  id: 'uuid-123',
  title: 'Roof Leak Resolution Process',
  summary: 'Steps for handling roof leaks in common property',
  vector_similarity: 0.87,
  keyword_score: 0.72,
  combined_score: 0.85,
  metadata: {
    category: 'Maintenance & Repairs',
    subcategory: 'commonProperty',
    success_rate: 0.92,
    status: 'active'
  }
}
```

## Adding New Tests

### Test File Template

```javascript
/**
 * Unit Tests for [Node Name]
 * Tests [Task Reference]: [Description]
 */

describe('[Node Name] Configuration', () => {
  describe('[Feature Group]', () => {
    test('should [expected behavior]', () => {
      // Arrange
      const config = { /* ... */ };

      // Act
      const result = functionUnderTest(config);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Best Practices

1. **Name tests clearly**: Use descriptive test names that explain the expected behavior
2. **Reference PRD tasks**: Include task numbers (e.g., "Task 11.1") in test descriptions
3. **Test edge cases**: Include boundary conditions and error scenarios
4. **Use realistic data**: Base test data on actual NSW strata scenarios
5. **Keep tests isolated**: Each test should be independent and not rely on others
6. **Mock external services**: Don't make real API calls in unit tests

## Integration Tests

Integration tests (Task 14.2) will be added in a separate phase and will cover:
- End-to-end webhook processing
- Freshdesk API integration
- Supabase database operations
- Multi-node workflow execution
- Error recovery flows

## Continuous Integration

Tests should be run:
- Before every commit (pre-commit hook)
- On every pull request (GitHub Actions)
- Before deployment to staging/production
- Nightly for full regression testing

## Troubleshooting

### Common Issues

**Tests failing with "Cannot find module"**
```bash
npm install
```

**Coverage not generating**
```bash
npm test -- --coverage --verbose
```

**Jest not finding test files**
- Ensure test files end with `.test.js` or `.spec.js`
- Check `jest.testMatch` configuration in package.json

**Mock data issues**
- Verify test data matches workflow node expectations
- Check that environment variables are properly mocked

## Related Documentation

- [PRD: NSW Strata Automation](../../tasks/tasks-0001-prd-nsw-strata-automation.md)
- [Workflow README](../../workflows/README.md)
- [Error Handling Runbook](../../config/error-handling-runbook.md)
- [Database Schema](../../database/schema.sql)

## Contributors

Tests created as part of Task 14.1: Create unit tests for each workflow node configuration.

Last Updated: 2025-10-15
