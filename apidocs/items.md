# Items API

Base path: /items

## Response envelope

All endpoints return a response envelope with this shape:

- code: number
  - 0 = SUCCESS
  - 1 = ERROR
- text: string
- data: optional payload
- pagination: optional pagination metadata

---

## GET /items

Returns a paginated list of items.

### Query parameters

- transactionId: optional integer
  - Filter by parent transaction id
- categoryId: optional integer
  - Filter by category id
- limit: optional integer
  - Default 20, min 1, max 100
- offset: optional integer
  - Default 0

### Success response

Status: 200

```json
{
  "code": 0,
  "text": "Items retrieved successfully",
  "data": [
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
- 500: internal server error while retrieving items

---

## POST /items

Creates an item.

### Request body

JSON object with required fields:

- transactionId: integer
  - Required, positive transaction id
- name: string
  - Required, trimmed, 1 to 255 chars
- quantity: number
  - Optional, positive finite number
- unit: string
  - Optional, trimmed, 1 to 100 chars
- unitPriceMinor: integer
  - Optional, nonnegative
- lineTotalMinor: integer
  - Optional, nonnegative
- categoryId: integer or null
  - Optional, positive category id or null

Example:

```json
{
  "transactionId": 1,
  "name": "Milk",
  "quantity": 1,
  "unit": "pc",
  "unitPriceMinor": 399,
  "lineTotalMinor": 399,
  "categoryId": 3
}
```

### Success response

Status: 201

```json
{
  "code": 0,
  "text": "Item created successfully",
  "data": {
    "id": 100
  }
}
```

### Error responses

- 400: invalid JSON or invalid request body
- 404: transaction or category not found
- 500: internal server error while creating item

---

## GET /items/:id

Returns one item by id.

### Path parameter

- id: required integer

### Success response

Status: 200

```json
{
  "code": 0,
  "text": "Item retrieved successfully",
  "data": {
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
}
```

### Error responses

- 400: id missing or not a number
- 404: item not found

---

## PATCH /items/:id

Updates one item with partial fields.

### Path parameter

- id: required integer

### Request body

Any of the following fields:

- transactionId
- name
- quantity
- unit
- unitPriceMinor
- lineTotalMinor
- categoryId

Example:

```json
{
  "name": "Whole Milk",
  "lineTotalMinor": 429
}
```

### Success response

Status: 200

```json
{
  "code": 0,
  "text": "Item updated successfully",
  "data": {
    "item": {
      "id": 100,
      "transactionId": 1,
      "name": "Whole Milk",
      "quantity": 1,
      "unit": "pc",
      "unitPriceMinor": 399,
      "lineTotalMinor": 429,
      "categoryId": 3
    },
    "category": {
      "id": 3,
      "name": "Groceries"
    }
  }
}
```

### Error responses

- 400: id missing or not a number, invalid JSON, or invalid request body
- 404: item not found, transaction not found, or category not found
- 500: internal server error while updating item

---

## PUT /items/:id

Updates one item. This endpoint currently accepts the same partial payload as PATCH.

### Error responses

- Same as PATCH /items/:id

---

## DELETE /items/:id

Deletes one item.

### Path parameter

- id: required integer

### Success response

Status: 200

```json
{
  "code": 0,
  "text": "Item deleted successfully",
  "data": {
    "id": 100
  }
}
```

### Error responses

- 400: id missing or not a number
- 404: item not found
- 500: internal server error while deleting item
