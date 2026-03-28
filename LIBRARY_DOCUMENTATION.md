# Library Documentation - Expenditure Tracker Backend

This document contains documentation for the main libraries used in this project, gathered using Context7.

## Project Overview

Expenditure Tracker Backend is a TypeScript application built with:
- **Hono** (web framework)
- **Drizzle ORM** (database ORM for SQLite/Cloudflare D1)
- **Pino** (HTTP logging)
- **Cloudflare Workers** (serverless deployment platform)

---

## 1. Hono Web Framework

**Context7 Library ID:** `/websites/hono_dev`

### Basic Setup

```typescript
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hello Cloudflare Workers!'))

export default app
```

### Initialize Hono Application

```typescript
import { Hono } from 'hono'

const app = new Hono()

export default app
```

### Cloudflare Workers Deployment

To start a new Hono project for Cloudflare Workers, use the `create-hono` command. Select the `cloudflare-workers` template when prompted.

**Deploy Command:** `npm run deploy`

### GitHub Actions Deployment

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 2. Drizzle ORM (SQLite)

**Context7 Library ID:** `/drizzle-team/drizzle-orm-docs`

### Define SQLite Schema

```typescript
import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";
import { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const users = table(
  "users",
  {
    id: t.int().primaryKey({ autoIncrement: true }),
    firstName: t.text("first_name"),
    lastName: t.text("last_name"),
    email: t.text().notNull(),
    invitee: t.int().references((): AnySQLiteColumn => users.id),
    role: t.text().$type<"guest" | "user" | "admin">().default("guest"),
  },
  (table) => [
    t.uniqueIndex("email_idx").on(table.email)
  ]
);
```

### Simple Table Definition

```typescript
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users_table", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  age: int().notNull(),
  email: text().notNull().unique(),
});
```

### Index and Unique Index

```typescript
import { integer, text, index, uniqueIndex, sqliteTable } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name"),
  email: text("email"),
}, (table) => [
  index("name_idx").on(table.name),
  uniqueIndex("email_idx").on(table.email),
]);
```

### CRUD Operations

```typescript
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sqlite-cloud';
import { usersTable } from './db/schema';

async function main() {
  const db = drizzle();

  // Insert
  const user: typeof usersTable.$inferInsert = {
    name: 'John',
    age: 30,
    email: 'john@example.com',
  };
  await db.insert(usersTable).values(user);

  // Select
  const users = await db.select().from(usersTable);

  // Update
  await db
    .update(usersTable)
    .set({ age: 31 })
    .where(eq(usersTable.email, user.email));

  // Delete
  await db.delete(usersTable).where(eq(usersTable.email, user.email));
}

main();
```

### Multi-Column Foreign Key

```typescript
import { integer, text, primaryKey, foreignKey, sqliteTable, AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  firstName: text("firstName"),
  lastName: text("lastName"),
}, (table) => [
  primaryKey({ columns: [table.firstName, table.lastName]})
]);

export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userFirstName: text("user_first_name"),
  userLastName: text("user_last_name"),
}, (table) => [
  foreignKey({
    columns: [table.userFirstName, table.userLastName],
    foreignColumns: [user.firstName, user.lastName],
    name: "custom_name"
  })
]);
```

---

## 3. Cloudflare Workers D1 Database

**Context7 Library ID:** `/websites/developers_cloudflare_workers`

### D1 Database Binding Configuration (wrangler.toml)

```toml
[[d1_databases]]
binding = "<BINDING_NAME>"
database_name = "<DATABASE_NAME>"
database_id = "<DATABASE_ID>"
```

### Example Configuration

```toml
[[d1_databases]]
binding = "DB"
database_name = "database"
database_id = "abc-def-geh"
```

### D1 Overview

D1 is Cloudflare's SQL-based, serverless database optimized for global access from Workers. Features:
- Scales with multiple smaller databases (10GB each)
- Supports per-user, per-tenant, or per-entity database architectures
- Pricing based on query and storage costs
- Integrates with Prisma and Drizzle ORMs
- Accessible via Workers bindings or REST API

---

## 4. Pino HTTP Logger

**Context7 Library ID:** `/pinojs/pino-http`

### Express Middleware Logging

```javascript
const express = require('express')
const pinoHttp = require('pino-http')

const app = express()
const logger = pinoHttp()

app.use(logger)

app.get('/', (req, res) => {
  req.log.info('handling root route')
  res.send('hello world')
})

app.get('/users/:id', (req, res) => {
  req.log.info({ userId: req.params.id }, 'fetching user')
  res.json({ id: req.params.id, name: 'John Doe' })
})

app.listen(3000)
```

### Basic HTTP Server Logging

```javascript
const http = require('http')
const pinoHttp = require('pino-http')

const logger = pinoHttp()

const server = http.createServer((req, res) => {
  logger(req, res)
  req.log.info('processing request')
  res.end('hello world')
})

server.listen(3000)
```

### Pretty Printing with pino-pretty

```javascript
const http = require('http')
const pinoHttp = require('pino-http')

const logger = pinoHttp({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '{req.method} {req.url} {msg}',
      singleLine: false
    }
  }
})

const server = http.createServer((req, res) => {
  logger(req, res)
  req.log.info('handling request')
  res.end('hello world')
})

server.listen(3000)
```

### Reuse Existing Pino Logger

```javascript
const http = require('http')
const pino = require('pino')
const pinoHttp = require('pino-http')

const baseLogger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  }
})

const httpLogger = pinoHttp({
  logger: baseLogger,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  }
})

baseLogger.info('Application starting')

const server = http.createServer((req, res) => {
  httpLogger(req, res)
  req.log.info('handling request')
  res.end('ok')
})

server.listen(3000, () => {
  baseLogger.info({ port: 3000 }, 'Server listening')
})
```

### Disable Auto-Logging

```javascript
const http = require('http')
const pinoHttp = require('pino-http')

const logger = pinoHttp({
  autoLogging: false
})

const server = http.createServer((req, res) => {
  logger(req, res)
  const startTime = Date.now()
  req.log.info({ url: req.url }, 'request started')
  res.end('ok')
  const duration = Date.now() - startTime
  req.log.info({
    statusCode: res.statusCode,
    duration,
    cached: false
  }, 'request finished')
})

server.listen(3000)
```

---

## Project Structure Reference

```
expenditure-tracker-backend/
├── src/
│   ├── index.ts              # Main Hono app entry
│   └── model/
│       └── db/
│           └── schema.ts     # Drizzle ORM schema
├── migrations/               # Drizzle migrations
├── dist/                     # Compiled output
├── drizzle.config.ts         # Drizzle Kit config
├── wrangler.toml             # Cloudflare Workers config
└── package.json
```

---

## Key Database Schema (Current Project)

### Transactions Table
- `id`: integer (primary key, auto-increment)
- `merchant`: text (not null)
- `currency`: text (not null)
- `totalMinor`: integer (stored as `total_minor`, not null)
- `transactionTime`: text (stored as `transaction_time`, not null, indexed)

### Item Categories Table
- `id`: integer (primary key, auto-increment)
- `name`: text (not null)

### Items Table
- `id`: integer (primary key, auto-increment)
- `transactionId`: integer (foreign key to transactions, not null, indexed)
- `name`: text (not null)
- `quantity`: real (nullable)
- `unit`: text (nullable)
- `unitPriceMinor`: integer (nullable)
- `lineTotalMinor`: integer (nullable)
- `categoryId`: integer (foreign key to item_categories, indexed)

---

*Generated using Context7 MCP server. Documentation sourced from official library documentation.*