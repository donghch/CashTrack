# Expenditure Tracker Backend - Agent Guidelines

## Project Overview
TypeScript backend API using Hono framework, Drizzle ORM, and Cloudflare Workers. The project follows a modular structure with controllers, models, routes, and integration tests.

## Build & Development Commands

### Core Commands
```bash
npm run build          # Compile TypeScript to dist/
npm start             # Run compiled application
npm run dev           # Start development server with wrangler
npm test              # Run all tests with Vitest
```

### Testing Commands
```bash
npm test                              # Run all tests
npm run test:integration              # Run integration tests only
npm run test:integration:watch        # Run integration tests in watch mode
npx vitest run src/test/unit/         # Run unit tests
npx vitest run path/to/specific.test.ts  # Run single test file
npx vitest --run --reporter=verbose   # Run with verbose output
```

### Database Commands
```bash
npm run clear-db      # Apply D1 migrations locally
```

## Code Style Guidelines

### TypeScript Configuration
- Strict TypeScript enabled (`"strict": true`)
- `noUncheckedIndexedAccess: true` - arrays require bounds checking
- `exactOptionalPropertyTypes: true` - precise optional property handling
- `verbatimModuleSyntax: true` - explicit import/export syntax
- ES modules with `"module": "nodenext"`
- Target: `"esnext"`

### Formatting & Linting
- Prettier configured with 4-space tabs (`.prettierrc`)
- No ESLint configuration found - consider adding if needed
- Run formatting: `npx prettier --write src/`

### Import Patterns
```typescript
// Named imports from packages
import { z } from "zod";
import { Hono } from "hono";
import { describe, it, expect } from "vitest";

// Default imports for modules
import axios from "axios";
import fs from "fs";
import path from "path";

// Relative imports with .js extension (ES modules)
import { getTestConfig } from "../client/test-config.js";
import { transactions } from "../db/schema.js";
```

### Export Patterns
```typescript
// Default exports for main module functionality
export default config;
export default authRoutes;

// Named exports for types, interfaces, constants
export type Config = z.infer<typeof configSchema>;
export interface ServerResponse<T = any> { ... }
export enum ServerResponseCode { SUCCESS, ERROR }

// Named exports for functions
export function getConfigPath(): string { ... }
```

### Naming Conventions
- **Interfaces/Types**: PascalCase (e.g., `TransactionWithItems`, `PaginatedResponse`)
- **Variables/Functions**: camelCase (e.g., `getConfigPath`, `createDefaultConfig`)
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for configuration
- **Files**: kebab-case for routes/controllers (e.g., `configcontroller.ts`, `auth.ts`)
- **Directories**: kebab-case (e.g., `integration/suites/`)

### Error Handling
```typescript
// Use try-catch with specific error type checking
try {
    const configContent = fs.readFileSync(configPath, "utf8");
    const configJson = JSON.parse(configContent);
    return configSchema.parse(configJson);
} catch (error) {
    if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON: ${error.message}`);
    }
    if (error instanceof z.ZodError) {
        const errorMessages = error.errors
            .map((err) => `${err.path.join(".")}: ${err.message}`)
            .join(", ");
        throw new Error(`Validation failed: ${errorMessages}`);
    }
    throw new Error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
}
```

### API Response Structure
```typescript
// Standard response interface
export interface ServerResponse<T = any> {
    code: ServerResponseCode;
    text: string;
    data?: T;
    pagination?: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

// Paginated responses
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}
```

### Testing Patterns
```typescript
// Test structure with Vitest
import { describe, it, expect } from "vitest";
import axios from "axios";

describe("POST /auth - Authentication", () => {
    it("should return success without password parameter", async () => {
        const config = getTestConfig();
        const response = await axios.post(`${config.baseUrl}/auth`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("message");
        expect(response.data.message).toBe("User login");
    });
});

// Use factories for test data
import { createTransaction } from "../factories/transaction-factory.js";
```

### Database Patterns
- Use Drizzle ORM for database operations
- Schema definitions in `src/model/db/schema.ts`
- Use `typeof table.$inferSelect` for type inference
- Database controllers in `src/controllers/db/`

### Route Patterns
```typescript
import { Hono } from "hono";

const authRoutes = new Hono();

authRoutes.post("/", (c) => {
    const saltedPwd = c.req.query("saltedPwd");
    return c.json({ message: "User login" });
});

export default authRoutes;
```

### File Organization
```
src/
├── controllers/     # Business logic and data access
│   ├── configcontroller.ts
│   └── db/         # Database controllers
├── model/          # Data models and types
│   ├── db/         # Database schemas
│   └── types/      # TypeScript interfaces
├── routes/         # API route definitions
└── test/           # Test files
    ├── integration/ # Integration tests
    │   ├── client/  # Test clients
    │   ├── factories/ # Test data factories
    │   ├── suites/  # Test suites by feature
    │   └── utils/   # Test utilities
    └── unit/       # Unit tests
```

## Development Workflow

1. **Before making changes**: Run `npm test` to ensure existing tests pass
2. **When adding features**: Write tests in appropriate test suite
3. **When modifying code**: Follow existing patterns and conventions
4. **Before committing**: Run `npm run build` to check TypeScript compilation
5. **Testing**: Use `npm run test:integration` for integration tests

## Context-Mode Routing Rules

### BLOCKED Commands
- `curl` / `wget` - Use `context-mode_ctx_fetch_and_index()` instead
- Inline HTTP calls - Use `context-mode_ctx_execute()` sandbox
- Direct web fetching - Use fetch-and-index pattern

### REDIRECTED Tools
- Shell (>20 lines output) - Use `context-mode_ctx_batch_execute()` or `context-mode_ctx_execute()`
- File reading for analysis - Use `context-mode_ctx_execute_file()`
- grep/search large results - Use `context-mode_ctx_execute()` sandbox

### Tool Selection Hierarchy
1. **GATHER**: `context-mode_ctx_batch_execute()` - Primary tool for batch operations
2. **FOLLOW-UP**: `context-mode_ctx_search()` - Query indexed content
3. **PROCESSING**: `context-mode_ctx_execute()` - Sandbox execution
4. **WEB**: `context-mode_ctx_fetch_and_index()` - Fetch and index web content
5. **INDEX**: `context-mode_ctx_index()` - Store content in knowledge base

### Output Constraints
- Keep responses under 500 words
- Write artifacts to FILES - never return as inline text
- Use descriptive source labels for indexed content

## Quality Assurance
- Always run `npm run build` after code changes
- Ensure tests pass with `npm test`
- Follow TypeScript strict mode requirements
- Maintain consistent formatting with Prettier
- Use Zod for runtime validation where appropriate