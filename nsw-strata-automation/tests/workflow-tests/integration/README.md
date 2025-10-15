# Integration Tests

End-to-end integration tests for NSW Strata Automation workflows with Freshdesk API integration.

## Overview

These integration tests validate the complete workflow from webhook receipt through Freshdesk API interactions to final ticket resolution. Tests use mock HTTP servers to simulate real-world scenarios including successful processing, error conditions, and retry mechanisms.

## Test Files

### webhook-integration.test.js (Task 14.2)

**30 tests** covering:
- Webhook receipt and HMAC-SHA256 signature verification
- Freshdesk API integration (GET ticket, POST reply, PUT update)
- Retry logic with 3 attempts and 5-second delays (Task 11.1)
- Entity extraction from NSW strata tickets
- NSW categorization (8 categories, Task 8.0)
- 5-path routing decision engine (Task 5.0)
- Error handling and fallback mechanisms (Task 11.0)
- Complete end-to-end workflow validation
- Multi-scenario testing across all ticket types

**Key Test Scenarios:**
- Maintenance & Repairs: Roof leak with lot number extraction
- By-Law Compliance: Noise complaint with by-law references
- Financial Matters: Unpaid levies with SSMA 2015 Section 85
- Renovations: Minor alteration approval (timber flooring)
- Emergency: Gas leak requiring immediate escalation
- NCAT Disputes: Tribunal matters with complexity=5
- Information Requests: New owner onboarding

### error-recovery.test.js (Task 14.12)

**19 tests** covering:
- Retry logic with exponential backoff (Task 11.1, 6.7)
- Circuit breaker pattern (Task 11.8)
- Fallback mechanisms (Task 11.9-11.11)
- Error classification (transient/systematic/critical, Task 11.7)
- Error logging with full context (Task 11.4)
- Slack notifications for critical errors (Task 11.5)
- Redis queue for failed operations (Task 11.6)
- Manual intervention workflow (Task 11.12)
- Error pattern detection (Task 11.14)

**Circuit Breaker Tests:**
- Opens after 3 failures
- Blocks requests when open
- Transitions to half-open after timeout
- Resets on successful call

**Retry Scenarios:**
- 3 attempts with 5-second delays
- Exponential backoff (5s, 10s, 20s)
- Respect for Retry-After headers
- Rate limit handling (429 responses)

## Test Fixtures

### webhook-payloads.js

Realistic webhook payloads for 7 different NSW strata scenarios:
- `maintenanceTicket`: Roof leak in common area
- `bylawComplianceTicket`: Late night noise complaint
- `financialTicket`: Unpaid levies for 3 quarters
- `renovationTicket`: Timber flooring approval request
- `emergencyTicket`: Gas leak in basement car park
- `ncatDisputeTicket`: NCAT application received
- `informationRequestTicket`: New owner records access

Each payload includes:
- Valid HMAC-SHA256 signature
- Complete ticket details with custom fields
- Requester information
- NSW-specific entities (addresses, lot numbers, legislation)

### Invalid Payloads

Error testing scenarios:
- Missing ticket ID
- Invalid signature
- Malformed JSON
- Empty payload
- Missing required fields

## Helpers

### freshdesk-mock.js

Mock server helper using `nock` for Freshdesk API simulation:

**Methods:**
- `mockGetTicket(id, data, options)` - Mock ticket retrieval
- `mockPostReply(id, options)` - Mock reply posting
- `mockUpdateTicket(id, updates, options)` - Mock ticket updates
- `mockGetConversations(id, data)` - Mock conversation history
- `mockRateLimit(endpoint, retryAfter)` - Mock 429 responses
- `mockAuthFailure(endpoint)` - Mock 401 responses
- `mockSuccessfulWorkflow(id, data)` - Mock complete flow
- `mockRetryScenario(id, failCount)` - Mock retry attempts

**Options:**
- `statusCode`: HTTP response code (default: 200)
- `delay`: Response delay in milliseconds
- `times`: Number of times to match (default: 1)
- `shouldFail`: Force error response
- `failCount`: Number of failures before success

## Running Tests

### Run All Integration Tests

```bash
npm run test:integration
```

### Run Specific Test File

```bash
npx jest tests/workflow-tests/integration/webhook-integration.test.js
npx jest tests/workflow-tests/integration/error-recovery.test.js
```

### Run with Verbose Output

```bash
npx jest tests/workflow-tests/integration --verbose
```

### Run in Watch Mode

```bash
npx jest tests/workflow-tests/integration --watch
```

## Test Results

```
Test Suites: 2 passed, 2 total
Tests:       49 passed, 49 total
Time:        ~0.9s
```

**Breakdown:**
- Webhook Integration: 30 tests ✅
- Error Recovery: 19 tests ✅

## Environment Variables

Tests use these environment variables:
- `FRESHDESK_DOMAIN`: Mock Freshdesk API URL (default: https://test.freshdesk.com)
- `FRESHDESK_WEBHOOK_SECRET`: Webhook signature secret (test-webhook-secret-12345)

## Mocking Strategy

### HTTP Mocking with nock

All Freshdesk API calls are mocked using `nock`:
- No real HTTP requests are made
- Fast test execution (<1 second total)
- Deterministic results
- Easy simulation of error conditions

### Signature Verification

Webhook signatures are generated using real crypto:
- Uses Node.js `crypto` module
- HMAC-SHA256 algorithm
- Base64 encoding
- Validates against test secret

## Test Coverage

Integration tests validate:
- ✅ Webhook signature verification (Task 3.14)
- ✅ Immediate acknowledgment <500ms (Task 3.9)
- ✅ Freshdesk API integration (Tasks 3.10, 5.10, 5.11)
- ✅ Entity extraction (Task 3.11, 3.12)
- ✅ NSW categorization (Task 8.0)
- ✅ 5-path routing logic (Task 5.0)
- ✅ Retry mechanisms (Task 11.1)
- ✅ Error classification (Task 11.7)
- ✅ Circuit breaker (Task 11.8)
- ✅ Fallback strategies (Task 11.9-11.11)
- ✅ Redis queue (Task 11.6)
- ✅ Slack notifications (Task 11.5)

## Common Test Patterns

### Successful Workflow Test

```javascript
test('should process ticket end-to-end', async () => {
  const webhook = createWebhookRequest(maintenanceTicket);
  const ticketId = maintenanceTicket.ticket.id;

  // Mock full workflow
  freshdeskMock.mockSuccessfulWorkflow(ticketId, maintenanceTicket);

  // Verify signature
  const signatureValid = verifySignature(webhook);
  expect(signatureValid).toBe(true);

  // Process ticket...
  // Assert results...
});
```

### Retry Scenario Test

```javascript
test('should retry on failure', async () => {
  const ticketId = 1001;

  // Mock: fails 2 times, succeeds on 3rd
  freshdeskMock.mockRetryScenario(ticketId, 2);

  // Simulate retry logic
  let success = await retryWithBackoff(async () => {
    return apiCall(ticketId);
  }, { maxAttempts: 3, delay: 5000 });

  expect(success).toBe(true);
});
```

### Error Classification Test

```javascript
test('should classify errors correctly', () => {
  const errors = [
    { code: 'ETIMEDOUT', expected: 'transient' },
    { status: 401, expected: 'systematic' },
    { status: 500, expected: 'critical' }
  ];

  errors.forEach(({ code, status, expected }) => {
    const classification = classifyError({ code, status });
    expect(classification.type).toBe(expected);
  });
});
```

## Debugging Failed Tests

### Check Mock Setup

```javascript
beforeEach(() => {
  freshdeskMock.reset(); // Clear all mocks
});

afterEach(() => {
  // Verify all mocks were called
  if (!freshdeskMock.isDone()) {
    console.log('Pending mocks:', freshdeskMock.getPending());
  }
});
```

### View HTTP Interceptors

```javascript
// Enable nock debugging
process.env.DEBUG = 'nock.*';
```

### Increase Test Timeout

```javascript
test('slow test', async () => {
  // Your test code
}, 10000); // 10 second timeout
```

## Adding New Tests

### 1. Create Test Fixture

```javascript
// In webhook-payloads.js
const newTicketType = {
  ticket: {
    id: 1008,
    subject: 'New scenario',
    description: 'Description...',
    // ...
  }
};
```

### 2. Write Integration Test

```javascript
test('should handle new scenario', async () => {
  const webhook = createWebhookRequest(newTicketType);

  // Mock API calls
  freshdeskMock.mockGetTicket(newTicketType.ticket.id, newTicketType);

  // Test logic
  // Assertions
});
```

### 3. Run Test

```bash
npx jest tests/workflow-tests/integration/your-test.test.js
```

## Best Practices

1. **Reset mocks between tests**: Always call `freshdeskMock.reset()` in `beforeEach`
2. **Use realistic data**: Base fixtures on actual NSW strata scenarios
3. **Test error paths**: Don't just test happy paths
4. **Verify mock calls**: Check that all expected API calls were made
5. **Keep tests fast**: Use mocks, avoid real network calls
6. **Document test intent**: Use clear test names and comments
7. **Test one thing**: Each test should validate a single behavior

## Related Documentation

- [Unit Tests README](../README.md)
- [Webhook Node Tests](../unit/nodes/webhook-node.test.js)
- [Error Handling Runbook](../../../config/error-handling-runbook.md)
- [PRD Task 14.2](../../../tasks/tasks-0001-prd-nsw-strata-automation.md#L311)

## Troubleshooting

### Tests Hanging

- Check for missing mock responses
- Verify `freshdeskMock.reset()` is called
- Look for infinite loops in retry logic

### Signature Validation Failures

- Verify `FRESHDESK_WEBHOOK_SECRET` is set
- Check payload hasn't been modified after signature generation
- Ensure JSON.stringify produces consistent output

### Mock Not Matching

- Check HTTP method (GET/POST/PUT)
- Verify endpoint URL matches exactly
- Ensure query parameters match

## Contributing

When adding integration tests:
1. Follow existing test patterns
2. Add realistic test fixtures
3. Document test purpose
4. Update this README
5. Run full test suite before committing

Last Updated: 2025-10-15
