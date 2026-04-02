# Item Categories API

Base path: /item-categories

## Response envelope

All endpoints return a response envelope with this shape:

- code: number
  - 0 = SUCCESS
  - 1 = ERROR
- text: string
- data: optional payload
- pagination: optional pagination metadata

---

## GET /item-categories

Returns a paginated list of item categories.

### Query parameters

- limit: optional integer
  - Default 20, min 1, max 100
- offset: optional integer
  - Default 0

### Success response

Status: 200

```json
{
  "code": 0,
  "text": "Item categories retrieved successfully",
  "data": [
    {
      "itemCategory": {
        "id": 3,
        "name": "Groceries"
      },
      "itemCount": 4
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
- 500: internal server error while retrieving item categories

---

## POST /item-categories

Creates an item category.

### Request body

JSON object with required fields:

- name: string
  - Required, trimmed, 1 to 255 chars

Example:

```json
{
  "name": "Groceries"
}
```

### Success response

Status: 201

```json
{
  "code": 0,
  "text": "Item category created successfully",
  "data": {
    "id": 3
  }
}
```

### Error responses

- 400: invalid JSON or invalid request body
- 500: internal server error while creating item category

---

## GET /item-categories/:id

Returns one item category by id.

### Path parameter

- id: required integer

### Success response

Status: 200

```json
{
  "code": 0,
  "text": "Item category retrieved successfully",
  "data": {
    "id": 3,
    "name": "Groceries"
  }
}
```

### Error responses

- 400: id missing or not a number
- 404: item category not found

---

## PATCH /item-categories/:id

Updates one item category with partial fields.

### Path parameter

- id: required integer

### Request body

Any of the following fields:

- name

Example:

```json
{
  "name": "Household Goods"
}
```

### Success response

Status: 200

```json
{
  "code": 0,
  "text": "Item category updated successfully",
  "data": {
    "id": 3,
    "name": "Household Goods"
  }
}
```

### Error responses

- 400: id missing or not a number, invalid JSON, or invalid request body
- 404: item category not found
- 500: internal server error while updating item category

---

## PUT /item-categories/:id

Updates one item category. This endpoint currently accepts the same partial payload as PATCH.

### Error responses

- Same as PATCH /item-categories/:id

---

## DELETE /item-categories/:id

Deletes one item category.

### Path parameter

- id: required integer

### Success response

Status: 200

```json
{
  "code": 0,
  "text": "Item category deleted successfully",
  "data": {
    "id": 3
  }
}
```

### Error responses

- 400: id missing or not a number
- 404: item category not found
- 409: item category is in use
- 500: internal server error while deleting item category
