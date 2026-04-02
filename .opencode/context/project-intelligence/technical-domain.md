<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.1 | Updated: 2026-04-01 -->

# Technical Domain

**Purpose**: Tech stack, architecture, development patterns for expenditure-tracker-backend.
**Last Updated**: 2026-04-01

## Quick Reference
**Update Triggers**: Tech stack changes | New patterns | Architecture decisions
**Audience**: Developers, AI agents

## Primary Stack
| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Language | TypeScript | 5.9.3 | Type safety, ES modules, modern JS features |
| Framework | Hono | 4.12.8 | Lightweight, fast, middleware support |
| Runtime | Node.js | ^25.5.0 | Server-side JavaScript runtime |
| Database | SQLite (via libsql) | 0.17.2 | Embedded, local-first, Drizzle ORM compatible |
| ORM | Drizzle ORM | 0.45.1 | Type-safe queries, SQL schema definition |
| Validation | Zod + Drizzle-Zod | 3.23.8 + 0.8.3 | Runtime validation, schema generation |
| Testing | Vitest | 4.1.2 | Fast testing, watch mode, TypeScript native |
| HTTP Status | http-status-codes | ^2.3.0 | Named status codes for readability |
| Authentication | Jose (JWT) | ^6.2.2 | JWT signing/verification |

**Key Libraries**: `dotenv` (environment variables), `axios` (HTTP client), `@hono/node-server` (Hono adapter)

## Architecture Pattern
```
Type: Monolithic API server
Pattern: Hono web framework with modular routes, controllers, and models
Structure: src/controllers/, src/model/, src/routes/, src/test/
```

## Code Patterns

### API Endpoint (Hono + Zod)
```typescript
// Example from transactions.ts
transactionRoutes.get("/", async (c) => {
    // Parse and validate query parameters
    const validationResult = TransactionFilterSchema.safeParse(parsedParams);
    
    if (!validationResult.success) {
        const response: ServerResponse = {
            code: ServerResponseCode.ERROR,
            text: "Invalid query parameters",
            data: validationResult.error.errors,
        };
        return c.json(response, StatusCodes.BAD_REQUEST);
    }
    
    try {
        // Business logic
        const { transactions: filteredTransactions, total } = 
            await filterTransactions(filter);
        
        // Standardized success response
        const response: ServerResponse<TransactionWithItems[]> = {
            code: ServerResponseCode.SUCCESS,
            text: "Transactions retrieved successfully",
            data: filteredTransactions,
            pagination: { total, limit, offset, hasMore },
        };
        return c.json(response, StatusCodes.OK);
    } catch (error) {
        // Error handling with specific error types
        if (error instanceof FilterTransactionsValidationError) {
            // Validation error response
            const response: ServerResponse = {
                code: ServerResponseCode.ERROR,
                text: "Invalid query parameters",
                data: error.issues,
            };
            return c.json(response, StatusCodes.BAD_REQUEST);
        }
        
        // Generic error response (no stack traces)
        const response: ServerResponse = {
            code: ServerResponseCode.ERROR,
            text: "Internal server error while retrieving transactions",
        };
        return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
    }
});
```

### Controller Pattern
```typescript
// Modular controllers with database operations
const getTransaction = async (id: number) => {
    const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, id));
    return result.length > 0 ? result[0] : null;
};

// Validation delegation to separate modules
const createTransaction = async (transactionData: NewTransaction) => {
    const validatedData = validateCreateTransactionInput(transactionData);
    const result = await db.insert(transactions).values(validatedData);
    return result;
};
```

## Naming Conventions
| Type | Convention | Example |
|------|-----------|---------|
| Files | camelCase with descriptive suffix | `dbcontroller.ts`, `transaction-validation.ts` |
| Routes | Plural resource names | `transactions.ts`, `auth.ts`, `ocr.ts` |
| Directories | Singular, descriptive | `controllers/`, `model/`, `routes/`, `test/` |
| Variables | camelCase | `transactionRoutes`, `validationResult` |
| Types/Interfaces | PascalCase | `ServerResponse`, `TransactionFilter` |
| Database Tables | snake_case, plural | `transactions`, `item_categories`, `items` |
| Database Columns | snake_case | `total_major`, `transaction_time` |
| Schema Fields | camelCase (Drizzle) | `totalMajor`, `transactionTime` |
| Test Files | `.test.ts` suffix | `transactions.test.ts` |

## Code Standards

### TypeScript Configuration
- `strict: true` – Strict type checking enabled
- `noUncheckedIndexedAccess: true` – Safer array/object access
- `exactOptionalPropertyTypes: true` – Precise optional property handling
- `verbatimModuleSyntax: true` – Explicit import/export syntax
- ES modules (`"module": "nodenext"`)

### Development Standards
- **Formatting**: Prettier with 4-space tabs
- **Imports**: ES modules with explicit `.js` extensions (even for TypeScript files)
- **Error Handling**: Custom error classes with specific error types
- **Validation**: Comprehensive Zod schemas with custom error messages
- **Response Format**: Standardized `ServerResponse<T>` structure across all endpoints
- **HTTP Status Codes**: Use named constants from `http-status-codes` package

### Testing Standards
- **Framework**: Vitest for unit and integration tests
- **Test Structure**: `.test.ts` suffix, organized in `src/test/` directory
- **Test Data**: Helper functions for generating test data
- **Cleanup**: Transaction IDs tracked for cleanup in `afterAll`

## Security Requirements

### Authentication & Authorization
- **JWT-based authentication** using `jose` library
- **HttpOnly cookies** for token storage (prevents XSS access)
- **Secure cookie attributes**: `HttpOnly; Path=/; Max-Age=7200; SameSite=Strict`
- **Password validation** against environment variable
- **2-hour token expiration** for session management

### Input Validation & Sanitization
- **Comprehensive Zod validation** for all inputs
- **Custom validation schemas** with specific error messages
- **Input sanitization**: `.trim()` on string inputs, type transformations
- **Business rule validation**: e.g., `totalMinor` must be 0-99
- **ISO 8601 datetime validation** with timezone offset requirement

### API Security
- **CORS enabled** for all routes (`app.use("*", cors())`)
- **Standardized error responses** to avoid information leakage
- **HTTP status code best practices**: 400 for validation errors, 401 for auth failures, 500 for internal errors
- **JSON parsing validation** with try-catch blocks

### Environment & Configuration Security
- **Sensitive data in environment variables**: `ADMIN_PASSWORD`, `JWT_SECRET`, `DB_FILE_NAME`
- **Dotenv configuration** for local development
- **No hardcoded secrets** in source code

## 📂 Codebase References
**Implementation Examples**:
- `src/routes/transactions.ts` – API endpoint pattern with validation
- `src/controllers/dbcontroller.ts` – Controller pattern with database operations
- `src/controllers/transaction-validation.ts` – Validation pattern with custom error classes
- `src/routes/auth.ts` – Authentication & security implementation
- `src/model/db/schema.ts` – Database schema definitions
- `src/test/unit/routes/transactions.test.ts` – Testing patterns

**Config Files**: `package.json`, `tsconfig.json`, `.prettierrc`

## Related Files
- `business-domain.md` – Business context and problem statement
- `business-tech-bridge.md` – Business → technical mapping
- `decisions-log.md` – Major decisions with rationale
- `living-notes.md` – Active issues and open questions