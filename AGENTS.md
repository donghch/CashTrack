# AGENTS.md - Expenditure Tracker Backend

This file contains essential information for AI agents working on this codebase, including build commands, code style guidelines, and development workflows.

## Build Commands

```bash
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled application (node dist/index.js)
```

The TypeScript configuration (`tsconfig.json`) uses:
- `rootDir`: `./src`
- `outDir`: `./dist`
- `target`: `esnext`
- `module`: `nodenext`
- `strict`: true
- `verbatimModuleSyntax`: true
- `isolatedModules`: true
- Source maps and declaration files enabled

## Lint and Type Checking

Currently, no linting tool (ESLint) is configured. Type checking is performed by the TypeScript compiler:

```bash
npx tsc --noEmit    # Type check without emitting files
```

**Note**: Currently type checking fails due to configuration files outside `src/`. Consider adding `exclude` to `tsconfig.json` (e.g., `["drizzle.config.ts", "wrangler.toml"]`) or moving configuration files into `src/`.

Consider adding ESLint with appropriate rules for consistent code style.

## Test Commands

No test framework is currently configured. The `npm test` script is a placeholder:

```bash
npm test    # Currently echoes "Error: no test specified"
```

To add tests, consider using a testing framework like Jest, Vitest, or Node's built-in test runner.

## Code Style Guidelines

### Imports
- Use ES module syntax (`import`/`export`)
- Use double quotes for module specifiers: `import { Hono } from "hono";`
- Group imports logically (external dependencies first, then internal modules)
- Use `type` imports for types when appropriate (enforced by `verbatimModuleSyntax`)

### Formatting
- Use **4-space indentation** (configured in `.prettierrc`)
- Use semicolons at the end of statements
- Let Prettier handle formatting (run `npx prettier --write .` if needed)
- Maximum line length: not explicitly configured (default 80)

### Naming Conventions
- **Database tables**: `snake_case` plural (`transactions`, `items`, `item_categories`)
- **Database columns**: `snake_case` (`total_minor`, `transaction_time`)
- **TypeScript schema fields**: `camelCase` (`totalMinor`, `transactionTime`) mapping to snake_case columns
- **Variables and functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE` for global constants, otherwise `camelCase`
- **Types and interfaces**: `PascalCase`

### TypeScript Usage
- Enable strict type checking (`strict: true` in tsconfig)
- Use explicit types for function parameters and return values
- Avoid `any`; use `unknown` or specific types
- Use interfaces for object shapes, types for unions
- Leverage TypeScript's structural typing where appropriate

### Error Handling
- Use try/catch for synchronous operations that may throw
- For async operations, use `try/catch` with `await` or `.catch()`
- Create custom error classes for domain-specific errors
- Log errors appropriately using the configured logging system (Pino)

### Logging
- Use Pino for structured logging
- Import `pino` or `pino-http` as needed
- Log at appropriate levels (`debug`, `info`, `warn`, `error`)

### Database Schema (Drizzle ORM)
- Define tables in `src/model/db/schema.ts`
- Use Drizzle's `sqliteTable` function with proper column definitions
- Map camelCase TypeScript field names to snake_case SQL column names
- Define indexes for performance-critical columns
- Use `relations` to define table relationships
- Export tables and relations as named exports

### API Design (Hono Framework)
- Define routes using Hono's router methods (`app.get`, `app.post`, etc.)
- Use typed context via Hono's generic parameters
- Group related routes using Hono's `.basePath()` or separate route files
- Implement proper HTTP status codes and error responses

## Database Migrations

```bash
npx drizzle-kit generate    # Generate new migration based on schema changes
npx drizzle-kit migrate     # Apply migrations to the database
```

Configuration in `drizzle.config.ts`:
- Schema: `./src/model/db/schema.ts`
- Output: `./migrations`
- Dialect: `sqlite`
- Driver: `d1-http` (Cloudflare D1)
- Requires Cloudflare credentials (accountId, databaseId, token)

## Cloudflare Workers

```bash
npx wrangler dev    # Start local development server
npx wrangler deploy # Deploy to Cloudflare Workers
```

Configuration in `wrangler.toml`:
- Name: `cash-track`
- Main: `src/index.ts`
- Compatibility date: `2026-03-01`
- D1 database binding: `DB`
- Database ID: `5500f846-5453-434f-8418-3073cfe5077f`
- Migrations directory: `drizzle`

## Project Structure

```
expenditure-tracker-backend/
├── src/
│   ├── index.ts              # Main application entry point
│   └── model/
│       └── db/
│           └── schema.ts     # Database schema definitions
├── migrations/               # Database migration SQL files
├── dist/                     # Compiled output (gitignored)
├── node_modules/             # Dependencies (gitignored)
├── drizzle/                  # Drizzle migrations config
├── .claude/                  # Claude workspace files (gitignored)
├── package.json
├── package-lock.json
├── tsconfig.json
├── drizzle.config.ts
├── wrangler.toml
├── worker-configuration.d.ts
├── .env                      # Environment variables (gitignored)
├── .gitignore
├── .prettierrc
├── LICENSE
└── README.md
```

## Environment Variables

Required in `.env` file (gitignored):
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID for D1
- `CLOUDFLARE_D1_DATABASE_ID` - D1 database ID
- `CLOUDFLARE_D1_TOKEN` - API token for D1 access
- `CLOUDFLARE_R2_ACCESS_KEY_ID` - R2 storage access key
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - R2 storage secret key
- `DEEPSEEK_API_KEY` - API key for DeepSeek LLM/OCR services
- `OCR_API_KEY` - Alternative OCR service API key (optional)

## Development Workflow

1. **Local Development**: Use `npx wrangler dev` for local development with Cloudflare Workers simulation
2. **Database Changes**: Update `schema.ts`, then run `npx drizzle-kit generate` to create migration
3. **Type Checking**: Run `npx tsc --noEmit` to verify types
4. **Building**: Run `npm run build` to compile TypeScript
5. **Testing**: Add tests as needed (no framework currently configured)
6. **Deployment**: Run `npx wrangler deploy` to deploy to Cloudflare

## Additional Notes

- **Monetary Values**: Store as integer minor units (e.g., cents) to avoid floating-point rounding errors
- **Timestamps**: Use ISO-8601 text format (e.g., `2026-03-22T11:08:20-07:00`)
- **State Management**: The application is stateless; state is stored in D1 database and R2 storage
- **Authentication**: Not yet implemented; planned for future development
- **Error Responses**: Use consistent error response format across API endpoints

## References

- [Project Memory](./PROJECT_MEMORY.md) - Detailed project overview and design decisions
- [Design Document](https://www.notion.so/Expenditure-Tracker-3235e7062f428066bdacd66ba9417cb3) - Notion design document
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

---

*This file should be updated as the project evolves. Last updated: 2026-03-27*