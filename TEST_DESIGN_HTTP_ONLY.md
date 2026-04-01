# HTTP-Only Integration Test Suite Design

## 1. Overall Test Architecture

### Directory Structure

```
tests/
├── integration/                    # HTTP-only integration tests
│   ├── client/                     # HTTP client and utilities
│   │   ├── api-client.ts          # Typed Axios-based API client
│   │   ├── test-config.ts         # Environment configuration
│   │   └── health-check.ts        # Backend availability verification
│   ├── factories/                  # Test data factories (API-based)
│   │   ├── transaction-factory.ts # Create transactions via POST /transactions
│   │   ├── item-factory.ts        # Create items (if API supports)
│   │   └── category-factory.ts    # Create categories (if API supports)
│   ├── suites/                     # Test suites by domain
│   │   ├── transactions.test.ts   # Transaction endpoint tests
│   │   ├── ocr.test.ts            # OCR/upload endpoint tests
│   │   └── health.test.ts         # Health/availability tests
│   ├── setup.ts                    # Vitest setup (no server startup)
│   ├── teardown.ts                 # Cleanup via API (if available)
│   └── types/                      # Test-specific types
│       └── test-types.ts
├── .env.test                       # Test environment variables
└── vitest.integration.config.ts    # Separate Vitest config for integration tests
```

### Test Philosophy

| Aspect | Approach |
|--------|----------|
| **Backend State** | Assumed running at configurable URL |
| **Database** | Managed by backend (D1 or SQLite) |
| **Test Data** | Created via POST API calls only |
| **Cleanup** | Via DELETE API or test-isolation strategy |
| **Isolation** | Unique test identifiers + cleanup after each test |

---

## 2. HTTP Client Design

### ApiClient Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ApiClient                            │
├─────────────────────────────────────────────────────────────┤
│  - axios instance with base URL from env                    │
│  - typed methods for each endpoint                          │
│  - automatic error transformation                           │
│  - request/response interceptors for logging                │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Transaction  │    │     OCR       │    │    Auth       │
│   Methods     │    │   Methods     │    │   Methods     │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ getAll()      │    │ uploadImage() │    │ login()       │
│ getById(id)   │    │               │    │ register()    │
│ create(data)  │    │               │    │               │
│ filter(params)│    │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Client Capabilities

1. **Environment-based Configuration**
   - Base URL from TEST_BASE_URL env var (default: http://localhost:8787)
   - Optional API key from TEST_API_KEY for authenticated endpoints
   - Timeout configuration via TEST_TIMEOUT

2. **Type Safety**
   - Full TypeScript support with request/response types
   - Reuses types from src/model/types/
   - Generic response wrapper handling

3. **Error Handling**
   - Transforms HTTP errors to typed ApiError objects
   - Distinguishes network errors (backend not running) from API errors
   - Provides retry logic for transient failures

4. **Request Helpers**
   - Automatic Content-Type headers
   - Request ID injection for traceability
   - Optional request/response logging

---

## 3. Test Data Management

### Factory Pattern (API-Based)

Since direct database access is not available, factories make HTTP POST calls to create test data:

```
TransactionFactory
├── create(overrides?) → POST /transactions
│   └── Returns created transaction from response
├── createMany(count, overrides?) → Batch creation
│   └── Parallel POST requests
└── build(overrides?) → Returns data object only
    └── No API call, just data generation

Data Generation Strategy:
├── Unique identifiers per test run
│   └── Use timestamp + random suffix
├── Self-contained test data
│   └── No dependencies on existing data
└── Cleanup tracking
    └── Store created IDs for later cleanup
```

### Factory Implementation Example

1. **create() Method**
   - Generates unique merchant name (e.g., "TestMerchant_1679876543210")
   - Calls POST /transactions with generated data
   - Returns created transaction from API response
   - Stores ID in cleanup registry

2. **build() Method**
   - Returns valid transaction data without API call
   - Useful for testing validation errors
   - Allows custom overrides

3. **createMany() Method**
   - Parallel creation for bulk test scenarios
   - Uses Promise.all for efficiency

### Cleanup Strategies

| Strategy | When to Use | Implementation |
|----------|-------------|----------------|
| **API DELETE** | If DELETE /transactions/:id exists | Call after each test |
| **Test Prefix** | Always | Prefix test data with "TEST_" + timestamp |
| **Bulk Cleanup** | After test suite | API endpoint to delete by prefix pattern |
| **Isolated DB** | CI/CD environments | Each test run uses fresh database |

---

## 4. Test Suites

### Suite Organization

```
tests/integration/suites/
├── health.test.ts              # Verify backend connectivity
├── transactions.test.ts        # CRUD + filter operations
├── transactions-filter.test.ts # Complex filtering scenarios
└── ocr.test.ts                 # File upload tests
```

### Health Suite

Purpose: Verify backend is running before running other tests

| Test Case | Expected Result |
|-----------|-----------------|
| GET /health or GET / (fallback) | Returns 200, confirms connectivity |
| Backend not available | Fail fast with clear error message |
| Wrong base URL configured | Helpful error indicating config issue |

### Transactions Suite

#### GET /transactions

| Test Case | Scenario |
|-----------|----------|
| Returns paginated list | Default pagination (limit=20) |
| Supports custom limit | limit=5 returns 5 items |
| Supports offset | offset=10 skips first 10 |
| Filters by date range | startDate + endDate |
| Filters by merchant | Partial match on merchant name |
| Filters by currency | Exact currency match |
| Filters by amount range | minAmount + maxAmount |
| Sorting by transactionTime | asc and desc order |
| Sorting by totalMinor | asc and desc order |
| Invalid filter params | Returns 400 with validation errors |
| Empty result set | Returns empty array with hasMore=false |

#### GET /transactions/:id

| Test Case | Scenario |
|-----------|----------|
| Returns transaction by ID | Existing transaction |
| Returns 404 for non-existent | Random ID that does not exist |
| Returns 400 for invalid ID | String instead of number |
| Returns transaction with items | When includeItems=true |

#### POST /transactions

| Test Case | Scenario |
|-----------|----------|
| Creates valid transaction | All required fields present |
| Rejects missing merchant | Returns 400 |
| Rejects missing currency | Returns 400 |
| Rejects missing totalMinor | Returns 400 |
| Rejects missing transactionTime | Returns 400 |
| Rejects invalid JSON | Returns 400 |
| Creates with optional fields | Notes, location, etc. |

### OCR Suite

#### POST /ocr

| Test Case | Scenario |
|-----------|----------|
| Uploads valid image | Returns 201 with signedUrl |
| Rejects non-image file | Returns 400 |
| Rejects oversized image | > 10MB returns 400 |
| Requires X-User-ID header | Missing header returns 400 |
| Requires multipart/form-data | Wrong content-type returns 400 |

---

## 5. Example Test Code

### Sample: Transaction Creation Test

```typescript
// tests/integration/suites/transactions.test.ts
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { apiClient } from "../client/api-client";
import { transactionFactory } from "../factories/transaction-factory";
import type { TransactionWithItems } from "../../../src/model/types/response";

describe("POST /transactions", () => {
    // Track created transactions for cleanup
    const createdIds: number[] = [];

    afterEach(async () => {
        // Cleanup: Delete all created transactions
        for (const id of createdIds) {
            try {
                await apiClient.transactions.delete(id);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        createdIds.length = 0;
    });

    it("should create a valid transaction", async () => {
        // Arrange: Build test data
        const transactionData = transactionFactory.build({
            merchant: "TestStore_" + Date.now(),
            currency: "USD",
            totalMinor: 999,
            transactionTime: new Date().toISOString(),
        });

        // Act: Create via API
        const response = await apiClient.transactions.create(transactionData);

        // Assert: Verify response
        expect(response.status).toBe(201);
        expect(response.data.code).toBe(0); // ServerResponseCode.SUCCESS
        expect(response.data.text).toContain("created successfully");

        // Track for cleanup
        if (response.data.data?.id) {
            createdIds.push(response.data.data.id);
        }
    });

    it("should reject transaction without merchant", async () => {
        // Arrange: Invalid data (missing merchant)
        const invalidData = {
            currency: "USD",
            totalMinor: 999,
            transactionTime: new Date().toISOString(),
        };

        // Act & Assert: Expect validation error
        await expect(
            apiClient.transactions.create(invalidData)
        ).rejects.toMatchObject({
            status: 400,
            code: 1, // ServerResponseCode.ERROR
        });
    });
});
```

### Sample: Factory Implementation

```typescript
// tests/integration/factories/transaction-factory.ts
import { apiClient } from "../client/api-client";
import type { InsertTransaction } from "../../../src/model/db/schema";

type TransactionOverrides = Partial<InsertTransaction>;

export const transactionFactory = {
    /**
     * Build transaction data without API call
     */
    build(overrides: TransactionOverrides = {}): InsertTransaction {
        const timestamp = Date.now();
        return {
            merchant: `TestMerchant_${timestamp}`,
            currency: "USD",
            totalMinor: 1000,
            transactionTime: new Date().toISOString(),
            ...overrides,
        };
    },

    /**
     * Create transaction via API
     */
    async create(overrides: TransactionOverrides = {}) {
        const data = this.build(overrides);
        const response = await apiClient.transactions.create(data);
        return {
            ...response.data,
            // Include request data for assertions
            requestData: data,
        };
    },

    /**
     * Create multiple transactions in parallel
     */
    async createMany(count: number, overrides: TransactionOverrides = {}) {
        const promises = Array.from({ length: count }, () =>
            this.create(overrides)
        );
        return Promise.all(promises);
    },
};
```

---

## 6. Environment Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| TEST_BASE_URL | No | http://localhost:8787 | Backend base URL |
| TEST_API_KEY | No | - | API key for authenticated endpoints |
| TEST_TIMEOUT | No | 10000 | Request timeout in ms |
| TEST_SKIP_CLEANUP | No | false | Skip cleanup (for debugging) |
| TEST_RETRY_COUNT | No | 3 | Retries for transient failures |

### Configuration Files

1. **.env.test** (gitignored)
   ```
   TEST_BASE_URL=http://localhost:8787
   TEST_TIMEOUT=10000
   ```

2. **vitest.integration.config.ts**
   - Separate from unit test config
   - Loads .env.test automatically
   - Longer timeout for HTTP calls
   - Sequential test execution (for data isolation)

3. **GitHub Actions / CI**
   - Set TEST_BASE_URL to deployed preview URL
   - Or start backend in background before tests

---

## 7. Test Execution

### NPM Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest --config vitest.config.ts",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "test:integration:ui": "vitest --config vitest.integration.config.ts --ui",
    "test:api": "npm run test:integration -- --grep 'API'",
    "test:health": "npm run test:integration -- tests/integration/suites/health.test.ts"
  }
}
```

### Execution Flow

```
1. Developer starts backend:
   $ npx wrangler dev
   
2. In another terminal, run tests:
   $ npm run test:integration
   
3. Tests execute:
   a. Check backend health -> fail fast if not available
   b. Run test suites sequentially
   c. Each test:
      - Create data via POST
      - Make assertions
      - Cleanup via DELETE (or tracked cleanup)
   d. Report results
```

### CLI Commands

| Command | Purpose |
|---------|---------|
| npm run test:integration | Run all integration tests |
| npm run test:integration -- --reporter=verbose | Verbose output |
| npm run test:integration -- transactions.test.ts | Single file |
| npm run test:integration -- -t "should create" | Filter by test name |

---

## 8. Error Handling

### Backend Not Available

```
Detection: Health check before test suite
Response: 
  - Clear error: "Backend not available at http://localhost:8787"
  - Instructions: "Start backend with 'npx wrangler dev'"
  - Exit code: 1 (fail fast)
```

### Network Errors During Tests

| Error Type | Handling |
|------------|----------|
| Connection refused | Fail test with helpful message |
| Timeout | Retry 3 times, then fail |
| 5xx errors | Retry with backoff, then fail |
| 4xx errors | No retry, immediate failure |

### Test Data Cleanup Failures

```
Strategy:
1. Log cleanup failure (non-blocking)
2. Continue with other tests
3. Consider test prefix for manual cleanup later
4. In CI: isolated DB per run makes cleanup optional
```

---

## 9. CI/CD Considerations

### GitHub Actions Workflow

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install dependencies
        run: npm ci
      
      # Option 1: Test against deployed preview
      - name: Run integration tests (deployed)
        if: github.event.deployment_status.state == 'success'
        env:
          TEST_BASE_URL: ${{ github.event.deployment_status.target_url }}
        run: npm run test:integration
      
      # Option 2: Start backend locally
      - name: Start backend and run tests
        if: github.event.deployment_status.state != 'success'
        run: |
          npm run dev &
          sleep 5  # Wait for startup
          npm run test:integration
```

### Test Isolation in CI

| Approach | Implementation |
|----------|----------------|
| **Fresh Database** | Each CI job gets new D1 database |
| **Test Prefix** | All data prefixed with CI_JOB_ID |
| **Post-Test Cleanup** | Delete all data with prefix |
| **Parallel Jobs** | No shared state between jobs |

---

## 10. Potential Challenges & Mitigations

### Challenge 1: No DELETE Endpoint

**Problem**: Backend may not support deleting transactions

**Solutions**:
1. Request addition of test-only endpoints (/test/reset)
2. Use test prefixes and periodic manual cleanup
3. Use isolated test databases in CI
4. Accept test data accumulation in local dev

### Challenge 2: Data Leakage Between Tests

**Problem**: Test A creates data, Test B sees it unexpectedly

**Mitigations**:
1. Sequential test execution (not parallel)
2. Unique identifiers per test (timestamp-based)
3. Aggressive cleanup afterEach
4. Independent assertions (do not assume empty DB)

### Challenge 3: Test Flakiness from Network

**Problem**: Network timeouts causing intermittent failures

**Mitigations**:
1. Retry logic for transient errors
2. Reasonable timeouts (10s+)
3. Health check before suite
4. Local backend preferred for development

### Challenge 4: State Verification

**Problem**: Cannot query DB to verify state changes

**Workarounds**:
1. GET endpoints to verify changes
2. Test side effects (e.g., upload returns signedUrl)
3. Test at API boundary (black box testing)

### Challenge 5: File Upload Testing

**Problem**: Testing multipart uploads with binary files

**Approach**:
1. Use FormData API in Node.js 18+
2. Create test files in memory (Buffer)
3. Test with small base64-encoded images
4. Skip file size tests in constrained environments

---

## 11. Implementation Checklist

### Phase 1: Infrastructure
- [ ] Create tests/integration directory structure
- [ ] Install axios as dev dependency
- [ ] Create vitest.integration.config.ts
- [ ] Set up .env.test template

### Phase 2: HTTP Client
- [ ] Implement ApiClient class with axios
- [ ] Add error transformation
- [ ] Add logging interceptor
- [ ] Create health check utility

### Phase 3: Factories
- [ ] Implement transactionFactory
- [ ] Add unique ID generation
- [ ] Add cleanup tracking

### Phase 4: Test Suites
- [ ] Health check suite
- [ ] GET /transactions tests
- [ ] POST /transactions tests
- [ ] GET /transactions/:id tests
- [ ] OCR upload tests

### Phase 5: Documentation
- [ ] Update README with test instructions
- [ ] Document environment variables
- [ ] Add CI/CD examples

---

## 12. Type Definitions

### ApiClient Types

```typescript
// tests/integration/client/types.ts
interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  apiKey?: string;
}

interface ApiError {
  status: number;
  code: number;
  message: string;
  data?: unknown;
}

interface ApiResponse<T> {
  status: number;
  data: ServerResponse<T>;
  headers: Record<string, string>;
}
```

### Factory Types

```typescript
// tests/integration/factories/types.ts
interface Factory<T> {
  build(overrides?: Partial<T>): T;
  create(overrides?: Partial<T>): Promise<ApiResponse<T>>;
  createMany(count: number, overrides?: Partial<T>): Promise<ApiResponse<T>[]>;
}
```
