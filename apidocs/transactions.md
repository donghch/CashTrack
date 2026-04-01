# Transactions API

Base path: /transactions

## Response envelope

All endpoints return a response envelope with this shape:

- code: number
  - 0 = SUCCESS
  - 1 = ERROR
- text: string
- data: optional payload
- pagination: optional pagination metadata

---

## GET /transactions

Returns a paginated list of transactions, with optional filtering and sorting.

### Query parameters

- startDate: optional string
  - ISO datetime
- endDate: optional string
  - ISO datetime
- merchant: optional string
  - Case-insensitive partial match
- currency: optional string
  - Exact match
- category: optional number or string
  - Category id or category name
- minTotal: optional integer
  - Lower bound amount in minor units
- maxTotal: optional integer
  - Upper bound amount in minor units
- limit: optional integer
  - Default 20, min 1, max 100
- offset: optional integer
  - Default 0
- sortBy: optional enum
  - transactionTime | total | merchant
  - Default transactionTime
- sortOrder: optional enum
  - asc | desc
  - Default desc
- includeItems: optional boolean
  - true to include nested items and categories
  - Default false

### Success response

Status: 200

Example:

```json
{
  "code": 0,
  "text": "Transactions retrieved successfully",
  "data": [
    {
      "transaction": {
        "id": 1,
        "merchant": "Sample Store",
        "currency": "USD",
        "totalMajor": 12,
        "totalMinor": 34,
        "transactionTime": "2026-03-22T11:08:20-07:00"
      },
      "items": [
        {
          "item": {
            "id": 100,
            "transactionId": 1,
            "name": "Milk",
            "quantity": 1,
            "unit": "pc",
            "unitPriceMinor": 399,
            "lineTotalMinor": 399,
            "categoryId": 3
          },
          "category": {
            "id": 3,
            "name": "Groceries"
          }
        }
      ]
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### Error responses

- 400: invalid query parameters
- 500: internal server error while retrieving transactions

---

## POST /transactions

Creates a transaction.

### Request body

JSON object with required fields:

- merchant: string
  - Required, trimmed, 1 to 255 chars
- currency: string
  - Required, 3-letter code, uppercased
- totalMajor: integer
  - Required, nonnegative
- totalMinor: integer
  - Required, 0 to 99
- transactionTime: string
  - Required ISO 8601 datetime with timezone offset
  - Example: 2026-03-22T11:08:20-07:00

Example:

```json
{
  "merchant": "Sample Store",
  "currency": "USD",
  "totalMajor": 12,
  "totalMinor": 34,
  "transactionTime": "2026-03-22T11:08:20-07:00"
}
```

### Success response

Status: 201

```json
{
  "code": 0,
  "text": "Transaction created successfully"
}
```

### Error responses

- 400: invalid JSON or invalid request body
- 500: internal server error while creating transaction

---

## GET /transactions/:id

Returns one transaction by id.

### Path parameter

- id: required integer

### Success response

Status: 200

```json
{
  "code": 0,
  "text": "Transaction retrieved successfully",
  "data": {
    "id": 1,
    "merchant": "Sample Store",
    "currency": "USD",
    "totalMajor": 12,
    "totalMinor": 34,
    "transactionTime": "2026-03-22T11:08:20-07:00"
  }
}
```

### Error responses

- 400: id missing or not a number
- 404: transaction not found
