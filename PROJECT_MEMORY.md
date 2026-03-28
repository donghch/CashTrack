# Expenditure Tracker Backend - Project Memory

## Project Overview
- **Name**: expenditure-tracker-backend (CashTrack)
- **Description**: Personal expenditure tracking system that processes receipt images via LLM/OCR and provides analytics
- **Type**: TypeScript backend application (stateless Cloudflare Worker)
- **Deployment**: Cloudflare Workers with D1 database and R2 storage
- **Status**: Early development stage, basic structure in place
- **Design Document**: [Notion - Expenditure Tracker](https://www.notion.so/Expenditure-Tracker-3235e7062f428066bdacd66ba9417cb3)

## System Overview

### How It Works
1. User takes picture of receipt and uploads it
2. Backend processes receipt using LLM/OCR (DeepSeek models)
3. LLM extracts structured spending data
4. User reviews and confirms extracted data
5. Data is stored in database for analytics and reporting

### Expected Functionalities
- Upload receipts to record expenditure
- Manual expense entry (without receipt upload)
- Generate monthly expenditure summaries
- Automatic expense categorization (food, transportation, utilities, etc.)
- Review and confirm LLM-extracted data before storing
- Search and filter past records by date, merchant, or category
- Duplicate detection (flag potential duplicates for review)
- Budget tracking with alerts when approaching or exceeding limits
- Multi-currency support with automatic conversion
- Export data (CSV, PDF) for tax purposes or further analysis

## Technology Stack
- **Runtime**: Node.js (ES modules)
- **Framework**: Hono (v4.12.8) for HTTP server
- **Database**: SQLite via Cloudflare D1
- **Storage**: Cloudflare R2 for receipt images
- **OCR/LLM**: DeepSeek models for receipt processing
- **ORM**: Drizzle ORM (v0.45.1)
- **Logging**: Pino (v10.3.1) with pino-http
- **Build Tool**: TypeScript compiler (tsc)
- **Package Manager**: npm (package-lock.json present)
- **Protocol**: HTTPS with potential custom Protobuf protocol
- **Development**: 
  - TypeScript (v5.9.3)
  - @types/node (v25.5.0)
  - drizzle-kit (v0.31.9) for migrations
  - wrangler (v4.35.0) for Cloudflare Workers

## Software Architecture
The system follows a modular stateless architecture designed for Cloudflare Workers:

### Core Modules
1. **Authentication & Authorization** - User management and secure data isolation
2. **LLM Receipt Handling** - Async receipt processing with LLM/OCR, job queue with retries
3. **Record Logic** - Receipt input processing and data organization with validation workflow
4. **Budget Tracking** - Budget limit management and alert/notification system
5. **Currency Conversion** - Exchange rate management and multi-currency conversion
6. **View Logic** - Filters, categorization, and search functionality
7. **Export Logic** - CSV and PDF generation for tax/analysis purposes
8. **API Gateway/Router** - Endpoint organization and request routing

### Architectural Principles
- Stateless service leveraging Cloudflare Worker infrastructure
- Storage (D1 + R2) separated from application logic
- Clear interfaces between modules for future separation/scaling
- Caching layer for frequently accessed data (monthly summaries)
- Idempotent operations with deduplication support

## Project Structure
```
expenditure-tracker-backend/
├── src/
│   ├── index.ts              # Main application entry point
│   └── model/
│       └── db/
│           └── schema.ts     # Database schema definitions
├── migrations/
│   ├── 0000_yellow_big_bertha.sql  # Initial migration SQL
│   └── meta/
│       ├── _journal.json     # Drizzle migration journal
│       └── 0000_snapshot.json
├── dist/                     # Compiled output (gitignored)
├── node_modules/             # Dependencies (gitignored)
├── drizzle/                  # Drizzle migrations config (referenced in wrangler.toml)
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

## Key Files

### package.json
- Scripts: `build` (tsc), `start` (node dist/index.js), `test` (placeholder)
- Type: module
- Dependencies: hono, drizzle-orm, @hono/node-server, pino, pino-http, dotenv, wrangler
- Dev dependencies: typescript, @types/node, drizzle-kit

### tsconfig.json
- Target: esnext
- Module: nodenext
- RootDir: ./src
- OutDir: ./dist
- Strict mode enabled
- Includes source maps and declaration files

### drizzle.config.ts
- Schema: ./src/model/db/schema.ts
- Output: ./migrations
- Dialect: sqlite
- Driver: d1-http (Cloudflare D1)
- Requires Cloudflare credentials (accountId, databaseId, token)

### wrangler.toml
- Name: cash-track
- Main: src/index.ts
- Compatibility date: 2026-03-01
- D1 database binding: "DB"
- Database name: "expenditure"
- Database ID: "5500f846-5453-434f-8418-3073cfe5077f"
- Migrations directory: "drizzle"

## Data Model

### Database Usage Scenarios
The database supports the following key query patterns:
- Retrieve money spent based on date/time range
- Retrieve spending breakdown by category
- Retrieve detailed transaction information

### Database Design Specification
*Based on design document: [Database Schema Design](https://www.notion.so/Database-Schema-Design-32b5e7062f4280ee9c7ed45e60c2b836?pvs=21)*

#### Naming Conventions
- Table names: `snake_case` plural (`transactions`, `items`, `item_categories`)
- Column names: `snake_case`
- Money values: Stored as integer minor units (e.g., cents) to avoid floating-point rounding
- Timestamps: ISO-8601 text format (e.g., `2026-03-22T11:08:20-07:00`)

#### Table Definitions

##### `transactions`
- `transaction_id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `merchant` (TEXT, NOT NULL)
- `currency` (TEXT, NOT NULL) - ISO 4217 code (e.g., `USD`, `CAD`)
- `total_minor` (INTEGER, NOT NULL) - Total amount in minor units (e.g., cents)
- `transaction_time` (TEXT, NOT NULL) - When transaction occurred (ISO-8601)

##### `items`
- `item_id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `transaction_id` (INTEGER, NOT NULL, FOREIGN KEY → `transactions.transaction_id`)
- `name` (TEXT, NOT NULL)
- `quantity` (REAL, NULL) - Quantity purchased (e.g., `2`, `1.5`)
- `unit` (TEXT, NULL) - Unit for quantity (e.g., `kg`, `bottle`, `pack`)
- `unit_price_minor` (INTEGER, NULL) - Price per unit in minor units (nullable if unknown)
- `line_total_minor` (INTEGER, NULL) - Total for this line item in minor units (nullable if not computed)
- `category_id` (INTEGER, NULL, FOREIGN KEY → `item_categories.category_id`)

##### `item_categories`
- `category_id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `name` (TEXT, NOT NULL) - Category label (e.g., `Food`, `Transportation`)

#### Recommended Indexes (for query performance)
- `transactions(transaction_time)` - For date-range queries
- `items(transaction_id)` - For joining transactions with items
- `items(category_id)` - For category-based analytics

### Current Implementation (schema.ts)
The current Drizzle ORM schema in `src/model/db/schema.ts` implements a simplified version of the design with Drizzle-specific naming conventions:

**Note on naming conventions**: Drizzle ORM uses camelCase property names in TypeScript that map to snake_case column names in SQLite:
- TypeScript: `id`, `transactionId`, `categoryId` 
- SQLite column: `id`, `transaction_id`, `category_id`
- This differs from the design specification's preference for consistent snake_case naming

#### transactions
- `id` (integer, primary key, auto-increment) - maps to `transaction_id` in design spec
- `merchant` (text, not null)
- `currency` (text, not null)
- `total_minor` (integer, not null) - amount in minor units (e.g., cents)
- `transaction_time` (text, not null)
- Index on transaction_time (`transactions_transaction_time_idx`)

#### item_categories
- `id` (integer, primary key, auto-increment) - maps to `category_id` in design spec
- `name` (text, not null)

#### items
- `id` (integer, primary key, auto-increment) - maps to `item_id` in design spec
- `transaction_id` (integer, foreign key to transactions.id)
- `name` (text, not null)
- `quantity` (real)
- `unit` (text)
- `unit_price_minor` (integer) - price per unit in minor units
- `line_total_minor` (integer) - total for line item in minor units
- `category_id` (integer, foreign key to item_categories.id)
- Indexes: `items_transaction_id_idx` on transaction_id, `items_category_id_idx` on category_id

### Relationships
- transactions (1) → items (many)
- item_categories (1) → items (many)

### Design Target Schema
The design document specifies a more comprehensive schema to support the full workflow:

#### Planned Tables
1. **receipts** - Receipt metadata (R2 key, upload status, timestamps)
2. **receipt_files** (optional) - Actual receipt files (could use R2 directly)
3. **extractions** - Raw LLM extraction results with status tracking
4. **expenses** - Finalized/canonical expense records (from confirmed extractions or manual entry)
5. **categories** - Expense categories with user-specific mappings
6. **budgets** - User budget configurations and limits
7. **currency_rates** - Exchange rate history for conversion

#### Key Design Features
- State machine fields for receipt/extraction status
- Idempotency keys and deduplication hashes
- User isolation via `user_id` on all tables
- Indexes for common queries (user_id + date, merchant, category)
- Currency fields: original amount/currency + base amount + FX metadata
- Support for review/confirmation workflow before finalizing expenses

## Environment Variables
Required in `.env` file (gitignored):
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID for D1
- `CLOUDFLARE_D1_DATABASE_ID` - D1 database ID
- `CLOUDFLARE_D1_TOKEN` - API token for D1 access
- `CLOUDFLARE_R2_ACCESS_KEY_ID` - R2 storage access key
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - R2 storage secret key
- `DEEPSEEK_API_KEY` - API key for DeepSeek LLM/OCR services
- `OCR_API_KEY` - Alternative OCR service API key (optional)

## Commands
```bash
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled application
npm test         # Placeholder (no tests configured yet)

# Drizzle migrations
npx drizzle-kit generate   # Generate new migration
npx drizzle-kit migrate    # Apply migrations

# Cloudflare Workers
npx wrangler dev    # Local development
npx wrangler deploy # Deploy to Cloudflare
```

## Current State
- **Project Setup**: Basic structure in place (TypeScript, Hono, Drizzle)
- **Database**: D1 database created with simplified schema (transactions/items/categories)
- **Core Infrastructure**: Basic Hono server with single "/" route
- **Missing**: 
  - R2 bucket for receipt storage
  - LLM/OCR integration
  - Full API endpoints per design
  - Authentication system
  - State machine for receipt processing workflow
  - Budget tracking and analytics
  - Currency conversion
  - Export functionality
- **Development**: Local dev workflow with wrangler dev
- **Testing**: No tests configured yet
- **Documentation**: README under construction, design documents in Notion

## Development Roadmap

### Phase 1: Foundation
1. **Schema Enhancement** - Update database schema to match design (receipts, extractions, expenses tables)
2. **R2 Integration** - Set up Cloudflare R2 bucket for receipt image storage
3. **Basic API Endpoints** - Implement core endpoints for manual expense entry and receipt upload flow
4. **Authentication** - Add user management and secure access control

### Phase 2: Receipt Processing
5. **LLM/OCR Integration** - Integrate DeepSeek or alternative OCR service for receipt parsing
6. **Async Job Processing** - Implement job queue for receipt processing with status tracking
7. **Review Workflow** - Build UI/API for reviewing and confirming LLM-extracted data
8. **Duplicate Detection** - Add heuristics for flagging potential duplicate expenses

### Phase 3: Analytics & Features
9. **Categorization System** - Implement automatic and manual category assignment
10. **Budget Tracking** - Add budget management with alert/notification system
11. **Currency Conversion** - Implement multi-currency support with exchange rate management
12. **Analytics Endpoints** - Create APIs for monthly summaries and spending insights

### Phase 4: Polish & Scale
13. **Export Functionality** - Add CSV/PDF export for tax and analysis purposes
14. **Caching Layer** - Implement caching for frequently accessed data (monthly summaries)
15. **Performance Optimization** - Add indexes, optimize queries, implement pagination
16. **Security Hardening** - Rate limiting, CORS, data retention policies

### Phase 5: Frontend (Separate Project)
17. **React/Next.js Frontend** - Build user interface for receipt upload, review, and analytics

## Notes & Design Decisions

### Data Handling
- All monetary values stored as **minor units** (e.g., cents for USD) to avoid floating-point errors
- Transaction times stored as ISO strings (SQLite `TEXT`)
- Item quantities can be decimal (e.g., 0.5 kg)
- Support for both receipt-based and manual expense entry

### Storage Strategy
- Receipt images stored in Cloudflare R2 with signed URLs for secure access
- Database stores metadata and extracted data, not raw images
- Separation of raw extraction data (`extractions`) from finalized expenses (`expenses`)

### Security & Privacy
- User data isolation via `user_id` scoping on all queries
- Signed URLs for R2 access to prevent unauthorized access
- Sensitive data excluded from logs
- Data retention policies needed for images/extractions

### Performance Considerations
- **Database Indexes**: Key indexes implemented for query optimization:
  - `transactions(transaction_time)` - Enables fast date-range filtering
  - `items(transaction_id)` - Accelerates transaction-item joins
  - `items(category_id)` - Improves category-based analytics performance
- **Query Patterns**: Schema designed to support common use cases:
  - Date/time range queries for spending analysis
  - Category aggregation for budget tracking
  - Transaction detail retrieval with item breakdown
- **Monetary Precision**: Minor units (integers) prevent floating-point rounding errors in calculations
- **Caching Layer**: Recommended for frequently accessed data like monthly summaries
- **Async Processing**: LLM/OCR operations should be async to prevent request timeouts
- **Pagination**: Essential for large result sets (transactions, items)

### Deployment
- Designed as stateless Cloudflare Worker service
- Can run locally with Node.js (@hono/node-server) for development
- Environment-specific configurations via wrangler.toml and .env files