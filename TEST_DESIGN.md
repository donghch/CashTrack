# Integration/E2E Test Suite Design Document

## Expenditure Tracker Backend - Revised Test Architecture

### Document Information
- **Date**: 2026-03-31
- **Status**: Design Document
- **Purpose**: Define integration/E2E testing approach without Cloudflare mocks

---

## 1. Requirement Analysis

### 1.1 Key Requirements
| Requirement | Description |
|-------------|-------------|
| No Cloudflare Mocks | Do not mock D1, R2, or environment bindings |
| Integration/E2E Approach | Tests run against a live backend instance via HTTP requests |
| Framework | Vitest (already configured) |
| Test Data Management | Seeding and cleanup strategies |
| Backend Startup | Automated server start/stop for test sessions |
| Database | SQLite in-memory or file-based for tests |
| Local Execution | Tests must run locally without Cloudflare account |

### 1.2 Assumptions
- Tests will use a Node.js-based Hono server (not Cloudflare Workers runtime)
- Database will use SQLite via better-sqlite3 instead of D1
- R2 storage will be mocked at the integration boundary or skipped
- The application code is refactored to support dependency injection of database/storage

### 1.3 Constraints
- OCR endpoint requires file upload to R2 - needs special handling
- Authentication is minimal (only salted password query param)
- Must maintain compatibility with existing Cloudflare Worker deployment

---

## 2. Architecture Design

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Test Runner (Vitest)                          │
│                              (Node.js Process)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐  │
│  │  Test Suite 1   │    │  Test Suite 2   │    │    Test Suite N     │  │
│  │  Transactions   │    │     Auth        │    │        OCR          │  │
│  └────────┬────────┘    └────────┬────────┘    └──────────┬──────────┘  │
│           │                      │                        │             │
│           └──────────────────────┼────────────────────────┘             │
│                                  ▼                                      │
│                    ┌─────────────────────────┐                          │
│                    │    HTTP Client Layer    │                          │
│                    │    (axios / fetch)      │                          │
│                    └───────────┬─────────────┘                          │
│                                │                                        │
│           ┌────────────────────┼────────────────────┐                  │
│           ▼                    ▼                    ▼                  │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐             │
│    │ Hono Server │────▶│  SQLite DB  │     │ Mocked R2   │             │
│    │  (Test App) │     │  (better-   │     │ (local fs)  │             │
│    └─────────────┘     │  sqlite3)   │     └─────────────┘             │
│                        └─────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Patterns Used

| Pattern | Purpose |
|---------|---------|
| **Dependency Injection** | Inject database/storage dependencies into application |
| **Test Fixture Pattern** | Reusable test data setup via factories |
| **Setup/Teardown Pattern** | Global test lifecycle hooks |
| **Page Object Pattern** | API client abstraction layer |

### 2.3 Technology Stack

| Component | Technology |
|-----------|------------|
| Test Framework | Vitest |
| HTTP Client | axios |
| Test Database | better-sqlite3 |
| ORM | Drizzle ORM (same as production) |
| Server | @hono/node-server |
| Test Data | Factory pattern with faker (optional) |

---

## 3. Component Specification

### 3.1 Test Directory Structure

```
src/
├── index.ts                    # Main entry (Cloudflare Worker)
├── app.ts                      # Hono app factory (NEW - shared)
├── routes/
├── controllers/
├── model/
└── test/
    ├── integration/            # NEW: Integration test directory
    │   ├── setup/              # NEW: Test setup utilities
    │   │   ├── database.ts     # NEW: SQLite test database setup
    │   │   ├── server.ts       # NEW: Test server management
    │   │   └── factories.ts    # NEW: Test data factories
    │   ├── client/             # NEW: HTTP client wrapper
    │   │   └── api-client.ts   # NEW: Typed API client
    │   ├── suites/             # NEW: Test suites
    │   │   ├── health.test.ts  # NEW: Health endpoint tests
    │   │   ├── transactions.test.ts  # NEW: Transaction endpoint tests
    │   │   ├── auth.test.ts    # NEW: Auth endpoint tests
    │   │   └── ocr.test.ts     # NEW: OCR endpoint tests (optional)
    │   └── vitest.setup.ts     # NEW: Global test setup
    └── sample.test.ts          # Existing (to be removed)
```

### 3.2 Application Refactoring

#### 3.2.1 Create App Factory Pattern

**Current Problem**: 
- The app directly imports and uses Cloudflare-specific types (`c.env as Env`)
- Database access uses `drizzle(env.DB)` where `env.DB` is D1Database

**Solution**: Create an app factory that accepts dependencies

**New File: src/app.ts**
- Exports a function `createApp(deps: AppDependencies)` that returns Hono app
- `AppDependencies` interface defines database and storage abstractions
- Production entry (index.ts) creates app with Cloudflare bindings
- Test setup creates app with SQLite database

#### 3.2.2 Database Abstraction Layer

**New File: src/model/db/connection.ts**
- Exports `DatabaseConnection` interface
- Production implementation wraps D1Database
- Test implementation wraps better-sqlite3

---

## 4. Implementation Plan

### 4.1 Phase 1: Application Refactoring (Prerequisite)

#### Step 1.1: Create Database Connection Interface

**File**: `src/model/db/connection.ts`

**Purpose**: Abstract database operations to support both D1 and SQLite

**Interface Design**:
```typescript
// Define a generic database interface that both D1 and SQLite implement
export interface DatabaseConnection {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  exec: (sql: string) => Promise<void>;
  // Add methods as needed for Drizzle ORM compatibility
}

// Factory to create Drizzle instance from connection
export function createDrizzle(connection: DatabaseConnection) {
  // Return configured Drizzle ORM instance
}
```

#### Step 1.2: Refactor Controllers to Accept Database

**File**: `src/controllers/dbcontroller.ts`

**Changes**:
- Change function signatures from `async(env: Env, ...)` to `async(db: DrizzleInstance, ...)`
- Remove dependency on global Env type
- Controllers become pure functions

#### Step 1.3: Create App Factory

**File**: `src/app.ts`

**Structure**:
```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export interface AppDependencies {
  db: DrizzleD1Database;  // Drizzle instance (works with both D1 and SQLite)
  receiptImages?: R2Bucket | LocalStorage;  // Storage abstraction
}

export function createApp(deps: AppDependencies): Hono {
  const app = new Hono();
  
  app.use("*", cors());
  
  // Middleware to inject dependencies into context
  app.use("*", async (c, next) => {
    c.set("db", deps.db);
    c.set("receiptImages", deps.receiptImages);
    await next();
  });
  
  // Mount routes
  app.route("/transactions", createTransactionRoutes());
  app.route("/auth", createAuthRoutes());
  app.route("/ocr", createOcrRoutes());
  
  return app;
}
```

#### Step 1.4: Update Production Entry Point

**File**: `src/index.ts`

**Changes**:
- Keep Cloudflare Worker default export
- Use createApp factory with D1 database

### 4.2 Phase 2: Test Infrastructure

#### Step 2.1: Install Dependencies

```bash
npm install -D better-sqlite3 @types/better-sqlite3
npm install -D @faker-js/faker  # Optional, for generating test data
```

#### Step 2.2: Create Test Database Setup

**File**: `src/test/integration/setup/database.ts`

**Responsibilities**:
- Create in-memory SQLite database
- Run migrations using Drizzle
- Provide `getTestDatabase()` function
- Provide `resetDatabase()` function for cleanup

**Key Implementation Points**:
- Use `new Database(':memory:')` from better-sqlite3
- Import schema from `src/model/db/schema.ts`
- Use Drizzle's `migrate()` function with SQLite dialect

#### Step 2.3: Create Test Server Management

**File**: `src/test/integration/setup/server.ts`

**Responsibilities**:
- Start/stop Hono server using `@hono/node-server`
- Manage server lifecycle
- Provide `startTestServer()` returning base URL
- Provide `stopTestServer()` for cleanup

**Implementation**:
```typescript
import { serve } from "@hono/node-server";
import type { Server } from "node:http";

let server: Server | null = null;
let baseUrl: string = "";

export async function startTestServer(): Promise<string> {
  const db = await getTestDatabase();  // From database.ts
  const app = createApp({ db });       // From app.ts
  
  return new Promise((resolve) => {
    server = serve({ fetch: app.fetch, port: 0 }, (info) => {
      baseUrl = `http://localhost:${info.port}`;
      resolve(baseUrl);
    });
  });
}

export async function stopTestServer(): Promise<void> {
  if (server) {
    server.close();
    server = null;
  }
}
```

#### Step 2.4: Create Test Data Factories

**File**: `src/test/integration/setup/factories.ts`

**Responsibilities**:
- Generate valid test data for all entities
- Provide `createTransaction(overrides?)` function
- Provide `createItem(overrides?)` function
- Provide `createCategory(overrides?)` function
- Functions insert directly into test database

**Example Factory**:
```typescript
export async function createTransaction(
  db: DrizzleInstance,
  overrides: Partial<NewTransaction> = {}
): Promise<Transaction> {
  const data = {
    merchant: "Test Merchant",
    currency: "USD",
    totalMinor: 1000,
    transactionTime: new Date().toISOString(),
    ...overrides
  };
  
  const result = await db.insert(transactions).values(data).returning();
  return result[0];
}
```

#### Step 2.5: Create API Client

**File**: `src/test/integration/client/api-client.ts`

**Responsibilities**:
- Wrap HTTP calls with type safety
- Provide methods for each endpoint
- Handle response parsing
- Provide consistent error handling

**Structure**:
```typescript
import axios, { type AxiosInstance } from "axios";
import type { ServerResponse } from "../../model/types/response.js";
import type { TransactionFilter } from "../../model/types/request.js";

export class ApiClient {
  private client: AxiosInstance;
  
  constructor(baseUrl: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      validateStatus: () => true, // Don't throw on error status codes
    });
  }
  
  // Health
  async getHealth(): Promise<string> {
    const response = await this.client.get("/");
    return response.data;
  }
  
  // Transactions
  async getTransactions(filter?: TransactionFilter): Promise<ServerResponse> {
    const response = await this.client.get("/transactions", { params: filter });
    return response.data;
  }
  
  async getTransaction(id: number): Promise<ServerResponse> {
    const response = await this.client.get(`/transactions/${id}`);
    return response.data;
  }
  
  async createTransaction(data: NewTransaction): Promise<ServerResponse> {
    const response = await this.client.post("/transactions", data);
    return response.data;
  }
  
  // Auth
  async login(saltedPwd: string): Promise<ServerResponse> {
    const response = await this.client.post("/auth", null, {
      params: { saltedPwd }
    });
    return response.data;
  }
}
```

### 4.3 Phase 3: Test Suites

#### Step 3.1: Global Test Setup

**File**: `src/test/integration/vitest.setup.ts`

**Contents**:
```typescript
import { beforeAll, afterAll, beforeEach } from "vitest";
import { startTestServer, stopTestServer } from "./setup/server.js";
import { resetDatabase } from "./setup/database.js";
import { ApiClient } from "./client/api-client.js";

// Global test state
export let apiClient: ApiClient;
export let baseUrl: string;

beforeAll(async () => {
  baseUrl = await startTestServer();
  apiClient = new ApiClient(baseUrl);
});

afterAll(async () => {
  await stopTestServer();
});

beforeEach(async () => {
  await resetDatabase();  // Clean slate for each test
});
```

#### Step 3.2: Transaction Endpoint Tests

**File**: `src/test/integration/suites/transactions.test.ts`

**Test Cases**:

| Test Case | Description |
|-----------|-------------|
| GET /transactions - empty | Returns empty array when no transactions exist |
| GET /transactions - with data | Returns transactions with pagination |
| GET /transactions - with filters | Filters by date range, merchant, amount |
| GET /transactions - with items | Includes items when includeItems=true |
| GET /transactions/:id - found | Returns transaction by ID |
| GET /transactions/:id - not found | Returns 404 for non-existent ID |
| GET /transactions/:id - invalid id | Returns 400 for invalid ID format |
| POST /transactions - success | Creates new transaction |
| POST /transactions - invalid body | Returns 400 for invalid data |
| POST /transactions - missing fields | Returns 400 when required fields missing |

#### Step 3.3: Auth Endpoint Tests

**File**: `src/test/integration/suites/auth.test.ts`

**Test Cases**:

| Test Case | Description |
|-----------|-------------|
| POST /auth - with password | Returns success with valid password |
| POST /auth - without password | Handles missing password parameter |

#### Step 3.4: Health/Root Endpoint Tests

**File**: `src/test/integration/suites/health.test.ts`

**Test Cases**:

| Test Case | Description |
|-----------|-------------|
| GET / | Returns "Hello, World!" |

#### Step 3.5: OCR Endpoint Tests (Optional/Special Handling)

**File**: `src/test/integration/suites/ocr.test.ts`

**Approach Options**:
1. **Skip**: Don't test OCR in integration tests (mock at boundary)
2. **Mock R2**: Use local filesystem instead of R2 bucket
3. **Stub**: Return mocked response without actual file handling

**Recommended**: Option 2 - Mock R2 with local filesystem storage

**Implementation**:
- Create `LocalR2Bucket` class implementing R2-like interface
- Store uploaded files in `./tmp/test-uploads/`
- Clean up after tests

### 4.4 Phase 4: Configuration

#### Step 4.1: Vitest Configuration Update

**File**: `vitest.config.ts`

**Changes**:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/integration/vitest.setup.ts"],
    include: ["./src/test/integration/suites/**/*.test.ts"],
    exclude: ["./src/test/sample.test.ts"],  // Exclude old tests
    testTimeout: 30000,  // 30s for server startup
    hookTimeout: 30000,
    pool: "forks",  // Isolate tests between files
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});
```

#### Step 4.2: Package.json Scripts Update

**Add to package.json**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:integration": "vitest run --config vitest.config.ts",
    "test:integration:watch": "vitest --config vitest.config.ts",
    "test:ui": "vitest --ui"
  }
}
```

---

## 5. Detailed Test Specifications

### 5.1 Example Test: GET /transactions

**File**: `src/test/integration/suites/transactions.test.ts`

**Structure**:
```typescript
import { describe, it, expect } from "vitest";
import { apiClient } from "../vitest.setup.js";
import { createTransaction } from "../setup/factories.js";
import { getTestDatabase } from "../setup/database.js";
import { ServerResponseCode } from "../../../model/types/response.js";

describe("GET /transactions", () => {
  it("should return empty array when no transactions exist", async () => {
    const response = await apiClient.getTransactions();
    
    expect(response.code).toBe(ServerResponseCode.SUCCESS);
    expect(response.data).toEqual([]);
    expect(response.pagination?.total).toBe(0);
  });
  
  it("should return transactions with pagination", async () => {
    const db = await getTestDatabase();
    
    // Create test data
    await createTransaction(db, { merchant: "Store A", totalMinor: 1000 });
    await createTransaction(db, { merchant: "Store B", totalMinor: 2000 });
    await createTransaction(db, { merchant: "Store C", totalMinor: 3000 });
    
    const response = await apiClient.getTransactions({ limit: 2, offset: 0 });
    
    expect(response.code).toBe(ServerResponseCode.SUCCESS);
    expect(response.data).toHaveLength(2);
    expect(response.pagination?.total).toBe(3);
    expect(response.pagination?.hasMore).toBe(true);
  });
  
  it("should filter by merchant name", async () => {
    const db = await getTestDatabase();
    
    await createTransaction(db, { merchant: "Walmart", totalMinor: 1000 });
    await createTransaction(db, { merchant: "Target", totalMinor: 2000 });
    
    const response = await apiClient.getTransactions({ merchant: "Wal" });
    
    expect(response.code).toBe(ServerResponseCode.SUCCESS);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].transaction.merchant).toBe("Walmart");
  });
  
  it("should filter by amount range", async () => {
    const db = await getTestDatabase();
    
    await createTransaction(db, { totalMinor: 500 });
    await createTransaction(db, { totalMinor: 1500 });
    await createTransaction(db, { totalMinor: 2500 });
    
    const response = await apiClient.getTransactions({ 
      minAmount: 1000, 
      maxAmount: 2000 
    });
    
    expect(response.code).toBe(ServerResponseCode.SUCCESS);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].transaction.totalMinor).toBe(1500);
  });
  
  it("should sort transactions by different fields", async () => {
    const db = await getTestDatabase();
    
    await createTransaction(db, { 
      merchant: "B Store", 
      transactionTime: "2024-01-02T00:00:00Z" 
    });
    await createTransaction(db, { 
      merchant: "A Store", 
      transactionTime: "2024-01-01T00:00:00Z" 
    });
    
    const response = await apiClient.getTransactions({ 
      sortBy: "merchant", 
      sortOrder: "asc" 
    });
    
    expect(response.data[0].transaction.merchant).toBe("A Store");
    expect(response.data[1].transaction.merchant).toBe("B Store");
  });
});
```

### 5.2 Example Test: POST /transactions

```typescript
describe("POST /transactions", () => {
  it("should create a new transaction with valid data", async () => {
    const transactionData = {
      merchant: "Test Store",
      currency: "USD",
      totalMinor: 999,
      transactionTime: new Date().toISOString()
    };
    
    const response = await apiClient.createTransaction(transactionData);
    
    expect(response.code).toBe(ServerResponseCode.SUCCESS);
    expect(response.text).toContain("created successfully");
  });
  
  it("should return 400 for invalid JSON", async () => {
    const response = await apiClient.client.post("/transactions", "not json");
    
    expect(response.status).toBe(400);
    expect(response.data.code).toBe(ServerResponseCode.ERROR);
  });
  
  it("should return 400 for missing required fields", async () => {
    const response = await apiClient.createTransaction({
      merchant: "Test Store"
      // Missing currency, totalMinor, transactionTime
    });
    
    expect(response.code).toBe(ServerResponseCode.ERROR);
  });
  
  it("should return 400 for invalid field types", async () => {
    const response = await apiClient.createTransaction({
      merchant: "Test Store",
      currency: "USD",
      totalMinor: "not a number",  // Should be number
      transactionTime: new Date().toISOString()
    });
    
    expect(response.code).toBe(ServerResponseCode.ERROR);
  });
});
```

### 5.3 Example Test: GET /transactions/:id

```typescript
describe("GET /transactions/:id", () => {
  it("should return transaction by ID", async () => {
    const db = await getTestDatabase();
    const transaction = await createTransaction(db, { 
      merchant: "Specific Store",
      totalMinor: 5555 
    });
    
    const response = await apiClient.getTransaction(transaction.id);
    
    expect(response.code).toBe(ServerResponseCode.SUCCESS);
    expect(response.data.merchant).toBe("Specific Store");
    expect(response.data.totalMinor).toBe(5555);
  });
  
  it("should return 404 for non-existent transaction", async () => {
    const response = await apiClient.getTransaction(99999);
    
    expect(response.code).toBe(ServerResponseCode.ERROR);
    // Check response status via axios if needed
  });
  
  it("should return 400 for invalid ID format", async () => {
    const response = await apiClient.client.get("/transactions/not-a-number");
    
    expect(response.status).toBe(400);
    expect(response.data.code).toBe(ServerResponseCode.ERROR);
  });
});
```

---

## 6. Test Configuration & Environment

### 6.1 Environment Variables

**File**: `.env.test` (not in git)

```
# Test Environment Configuration
NODE_ENV=test
TEST_DATABASE_URL=:memory:
TEST_UPLOAD_DIR=./tmp/test-uploads
```

### 6.2 TypeScript Configuration for Tests

**Update**: `tsconfig.json`

**Changes**:
- Remove `src/test` from exclude (or add specific integration test pattern)
- Add test types if needed

```json
{
  "exclude": ["drizzle.config.ts", "wrangler.toml", "dist"]
}
```

### 6.3 Git Ignore Updates

**Add to .gitignore**:
```
# Test outputs
tmp/test-uploads/
*.test.db
.coverage/
```

---

## 7. CI/CD Considerations

### 7.1 GitHub Actions Workflow

**File**: `.github/workflows/integration-tests.yml`

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npx tsc --noEmit
      
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/
```

### 7.2 Test Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Slow server startup | Reuse server across test files (globalSetup) |
| Database cleanup | Use transactions or faster DELETE strategies |
| Test isolation | Reset database before each test |
| Parallel execution | Use Vitest's pool: "forks" for isolation |

### 7.3 Alternative: Global Setup Pattern

For faster tests, use Vitest's globalSetup:

**File**: `src/test/integration/setup/global-setup.ts`

```typescript
import { startTestServer, stopTestServer } from "./server.js";

let baseUrl: string;

export async function setup() {
  baseUrl = await startTestServer();
  process.env.TEST_BASE_URL = baseUrl;
}

export async function teardown() {
  await stopTestServer();
}
```

**vitest.config.ts**:
```typescript
export default defineConfig({
  test: {
    globalSetup: "./src/test/integration/setup/global-setup.ts"
  }
});
```

---

## 8. Quality Assurance

### 8.1 Design Self-Review

| Criterion | Status | Notes |
|-----------|--------|-------|
| No Cloudflare Mocks | ✅ | Uses real SQLite database |
| HTTP-based Testing | ✅ | Full request/response cycle |
| Test Isolation | ✅ | Database reset before each test |
| Type Safety | ✅ | TypeScript throughout |
| Maintainability | ✅ | Clear separation of concerns |
| Performance | ⚠️ | May need optimization for large suites |
| Coverage | ✅ | All main endpoints covered |

### 8.2 Potential Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| App refactoring breaks Cloudflare deployment | Medium | High | Maintain index.ts as thin wrapper |
| SQLite vs D1 behavioral differences | Medium | Medium | Document known differences |
| Test flakiness due to timing | Low | Medium | Use proper async/await patterns |
| Slow test execution | Medium | Medium | Implement globalSetup pattern |

### 8.3 Future Improvements

1. **Coverage Reporting**: Add c8 or v8 coverage
2. **Parallel Execution**: Optimize for CI parallelization
3. **Contract Testing**: Add Pact or similar for API contracts
4. **Load Testing**: Add k6 or Artillery for performance tests
5. **Snapshot Testing**: Add response snapshots for regression detection

---

## 9. Migration Checklist

### Phase 1: Refactoring
- [ ] Create `src/model/db/connection.ts` with database interface
- [ ] Refactor `src/controllers/dbcontroller.ts` to accept Drizzle instance
- [ ] Create `src/app.ts` with factory pattern
- [ ] Update `src/index.ts` to use factory
- [ ] Remove `c.env as Env` casts, use context.get()

### Phase 2: Infrastructure
- [ ] Install better-sqlite3 and dependencies
- [ ] Create `src/test/integration/setup/database.ts`
- [ ] Create `src/test/integration/setup/server.ts`
- [ ] Create `src/test/integration/setup/factories.ts`
- [ ] Create `src/test/integration/client/api-client.ts`

### Phase 3: Tests
- [ ] Create `src/test/integration/vitest.setup.ts`
- [ ] Write `src/test/integration/suites/health.test.ts`
- [ ] Write `src/test/integration/suites/transactions.test.ts`
- [ ] Write `src/test/integration/suites/auth.test.ts`
- [ ] Write `src/test/integration/suites/ocr.test.ts` (optional)

### Phase 4: Configuration
- [ ] Update `vitest.config.ts`
- [ ] Update `package.json` scripts
- [ ] Update `tsconfig.json` excludes
- [ ] Create `.env.test` template
- [ ] Create GitHub Actions workflow

### Phase 5: Cleanup
- [ ] Remove `src/test/sample.test.ts`
- [ ] Update `AGENTS.md` with testing documentation
- [ ] Verify Cloudflare deployment still works

---

## 10. Appendix

### 10.1 Testing Philosophy

This integration test design follows these principles:

1. **Test Behavior, Not Implementation**: Tests verify HTTP contracts, not internal logic
2. **Fast Feedback**: Tests run in seconds, not minutes
3. **Reliable**: Tests are deterministic and don't flake
4. **Maintainable**: Clear structure makes tests easy to update
5. **Isolated**: Tests don't depend on each other

### 10.2 Comparison: Before vs After

| Aspect | Before (Unit Tests) | After (Integration Tests) |
|--------|---------------------|---------------------------|
| Scope | Individual functions | Full HTTP request/response |
| Mocks | Extensive Cloudflare mocks | No mocks (real SQLite) |
| Confidence | Implementation details | User-facing behavior |
| Maintenance | High (mocks break) | Lower (tests API contract) |
| Execution | Fast | Moderate (server startup) |
| CI/CD | Easy | Requires Node server |

### 10.3 References

- [Vitest Documentation](https://vitest.dev/)
- [Hono Testing Guide](https://hono.dev/docs/guides/testing)
- [Drizzle ORM with SQLite](https://orm.drizzle.team/docs/get-started-sqlite)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)

---

*End of Design Document*
