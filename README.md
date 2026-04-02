# CashTrack

A RESTful backend API for tracking personal expenditures, built with Hono and SQLite. Provides transaction management, item categorization, and JWT-based authentication for single-user expense tracking.

## Features

- **Transaction Management** - Create, retrieve, and filter transactions with merchant, currency, and timestamp data
- **Item Tracking** - Manage individual items within transactions with quantities, pricing, and categories
- **Category System** - Organize items with customizable categories
- **JWT Authentication** - Secure API endpoints with token-based authentication (single-user)
- **SQLite Database** - Lightweight, file-based storage using libsql/Drizzle ORM
- **Input Validation** - Zod schemas for request validation and type safety
- **Pagination Support** - Efficient data retrieval with limit/offset pagination

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Hono (lightweight web framework)
- **Database**: SQLite via libsql client
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Authentication**: JWT tokens (jose library)
- **Testing**: Vitest with integration and unit tests

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd expenditure-tracker-backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Required: PASSWORD, JWT_SECRET, DB_FILE_NAME
```

## Quick Start

```bash
# Start development server
npm run dev

# Server runs at http://localhost:3000
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database configuration
DB_FILE_NAME=file:data/data.db

# Authentication
PASSWORD=your_secure_password_here
JWT_SECRET=your_jwt_secret_key_here

# Test configuration (optional)
TEST_BASE_URL=http://localhost:3000
```

## Database Setup

```bash
# Generate migration files from schema
npm run db:generate

# Apply migrations
npm run db:migrate

# Clear local database (for development)
npm run clear-db
```

## API Endpoints

### Authentication

- `POST /auth` - Authenticate with password, returns JWT token in cookie

### Transactions (Protected)

- `GET /transactions` - List transactions with filtering and pagination
- `POST /transactions` - Create new transaction
- `GET /transactions/:id` - Get transaction by ID

### Items (Protected)

- `GET /items` - List items with filtering and pagination
- `POST /items` - Create new item
- `GET /items/:id` - Get item by ID
- `PATCH /items/:id` - Update item
- `PUT /items/:id` - Update item (full)
- `DELETE /items/:id` - Delete item

### Item Categories (Protected)

- `GET /item-categories` - List categories with pagination
- `POST /item-categories` - Create new category
- `GET /item-categories/:id` - Get category by ID
- `PATCH /item-categories/:id` - Update category
- `PUT /item-categories/:id` - Update category (full)
- `DELETE /item-categories/:id` - Delete category

### OCR (Protected)

- `GET /ocr` - OCR endpoint (placeholder)

For detailed API documentation, see the [apidocs/](apidocs/) directory.

## Authentication

The API uses JWT tokens for authentication:

1. **Login**: `POST /auth` with `{"pwd": "your_password"}`
2. **Token**: Received in `token` cookie (HttpOnly, 2-hour expiry)
3. **Usage**: Include token in `Authorization: Bearer <token>` header or rely on cookie

Protected routes require authentication. Public routes (`/auth`) do not.

## Project Structure

```
src/
├── controllers/     # Business logic and validation
├── middleware/       # Authentication middleware
├── model/           # Database schema and types
│   ├── db/          # Drizzle ORM schema
│   └── types/       # TypeScript interfaces
├── routes/          # Hono route handlers
└── test/            # Unit and integration tests
```

## Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Build
npm run build        # Compile TypeScript to dist/

# Production
npm start            # Run compiled server

# Testing
npm test             # Run all tests
npm run test:integration        # Run integration tests only
npm run test:integration:watch  # Watch integration tests

# Database
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations
npm run clear-db     # Clear local database
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Houchuan Dong
