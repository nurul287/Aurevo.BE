# Phase 4 — API Design

## Base URL
```
http://localhost:3001/api
```

## Interactive Docs
Swagger UI available at: `GET /api/docs`

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <supabase-jwt>
```

Guest endpoints (cart, orders) additionally accept:
```
X-Guest-Session: <uuid>
```

---

## Response Shape

**Success:**
```json
{ "success": true, "data": { ... } }
```

**List with pagination:**
```json
{
  "success": true,
  "data": [...],
  "meta": { "pagination": { "page": 1, "limit": 12, "total": 45, "totalPages": 4 } }
}
```

**Error:**
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Product not found" } }
```

---

## Rate Limits

| Limiter | Limit | Applied to |
|---------|-------|-----------|
| `publicLimiter` | 100 req / 15 min | Public GET endpoints |
| `authLimiter` | 20 req / 15 min | Auth-required mutations |
| `strictLimiter` | 5 req / min | Sensitive write operations |
| `uploadLimiter` | 20 req / min | File upload endpoints |
| `chatLimiter` | 10 req / min | AI chat (expensive) |

---

## Endpoint Reference

### Categories — `/api/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List all categories (paginated, search) |
| GET | `/:id` | Public | Get category by ID |
| POST | `/` | Admin | Create category |
| PATCH | `/:id` | Admin | Update category |
| DELETE | `/:id` | Admin | Delete category (422 if has products/subcategories) |

**Query params (GET /):** `page`, `limit`, `search`, `isActive`, `parentId`

---

### Brands — `/api/brands`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List all brands (paginated, search) |
| GET | `/:id` | Public | Get brand by ID |
| POST | `/` | Admin | Create brand |
| PATCH | `/:id` | Admin | Update brand |
| DELETE | `/:id` | Admin | Delete brand (422 if has products) |

---

### Products — `/api/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List products (paginated, all filters) |
| GET | `/featured` | Public | Featured active products |
| GET | `/by-slug/:slug` | Public | Product detail by URL slug |
| GET | `/:id` | Public | Product detail by UUID |
| POST | `/` | Admin | Create product |
| PATCH | `/:id` | Admin | Update product |
| DELETE | `/:id` | Admin | Delete product |
| PATCH | `/bulk/status` | Admin | Bulk activate/deactivate |
| DELETE | `/bulk/delete` | Admin | Bulk delete |

**Query params (GET /):** `page`, `limit`, `search`, `categoryId`, `brandId`, `gender`, `minPrice`, `maxPrice`, `isActive`, `isFeatured`, `sortBy` (price|createdAt), `sortOrder` (asc|desc)

---

### Product Variants — `/api/products/:productId/variants`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List variants for a product |
| GET | `/:id` | Public | Get single variant |
| POST | `/` | Admin | Create variant |
| PATCH | `/:id` | Admin | Update variant |
| DELETE | `/:id` | Admin | Delete variant |
| PATCH | `/:id/stock` | Admin | Adjust stock directly |

**Notes:**
- Variants are nested under products (`Router({ mergeParams: true })`)
- Cross-product access returns 404 (variant must belong to the given productId)
- Stock adjust returns 422 if adjustment would result in negative stock

---

### Product Images — `/api/products/:productId/images`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List images for a product |
| POST | `/` | Admin | Upload image (multipart/form-data, max 5MB) |
| PATCH | `/:id/primary` | Admin | Set image as primary |
| DELETE | `/:id` | Admin | Delete image (removes from Supabase Storage too) |

**Upload:** Accepts `image/*` MIME types only. First image uploaded auto-becomes primary. Stored in Supabase `product-images` bucket.

---

### Cart — `/api/cart`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | Get cart (auth user or guest session) |
| POST | `/session` | Public | Create guest session ID |
| POST | `/items` | Optional | Add item to cart |
| PATCH | `/items/:id` | Optional | Update item quantity |
| DELETE | `/items/:id` | Optional | Remove item from cart |
| DELETE | `/` | Optional | Clear entire cart |
| POST | `/migrate` | Auth | Migrate guest cart to user account |

**Guest cart:** Send `X-Guest-Session: <uuid>` header. Without auth or session header, returns empty cart.

**Cart item upsert:** Adding the same variant again increments quantity rather than creating a duplicate row.

**Stock validation:** Adding or updating quantity checks variant stock. Returns 422 if insufficient.

---

### Orders — `/api/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Optional | Create order (auth user or guest with email) |
| GET | `/` | Auth | List orders (users see own; admins see all) |
| GET | `/by-number/:orderNumber` | Public | Lookup by order number (for order tracking) |
| GET | `/:id` | Auth | Get order detail |
| PATCH | `/:id/cancel` | Auth | Cancel order |
| PATCH | `/:id/status` | Admin | Update order status |
| PATCH | `/:id/payment` | Admin | Update payment status |
| PATCH | `/:id/tracking` | Admin | Set tracking number |
| PATCH | `/:id/fulfillment` | Admin | Update fulfillment status |

**Order creation:** Validates all variants exist and have sufficient stock. Runs in a single transaction: inserts order + items + decrements `stock` + increments `reserved_stock` on each variant.

**Cancel:** User can cancel own order if status is `pending`. Admin can cancel any non-delivered order. Cancellation restores stock in a transaction.

---

### Inventory — `/api/inventory`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | List inventory (filter by variantId, location, lowStock) |
| PUT | `/` | Admin | Upsert inventory record for a variant |
| PATCH | `/:id/adjust` | Admin | Adjust quantity with reason + movement log |
| GET | `/movements` | Admin | Audit log of all inventory movements |

**Adjust:** Validates new quantity won't go below 0. Runs transaction: updates `inventory.quantity` + inserts `inventory_movements` row + syncs `product_variants.stock`.

---

### Auth & Profile — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Auth | Get current user's profile |
| PATCH | `/profile` | Auth | Update profile (firstName, lastName, phone, gender, dateOfBirth, avatarUrl) |
| GET | `/addresses` | Auth | List saved addresses |
| POST | `/addresses` | Auth | Create address |
| PATCH | `/addresses/:id` | Auth | Update address |
| DELETE | `/addresses/:id` | Auth | Delete address |

**Profile upsert:** First `PATCH /profile` creates the profile row if it doesn't exist yet.

**Default address:** When `isDefault: true` is sent on create/update, all other addresses of the same type are set to `isDefault: false` in the same operation.

---

### AI Chat — `/api/chat`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Optional | Send message, get SSE stream response |
| GET | `/health` | Public | Check AI service status |

**SSE Protocol:**
```
POST /api/chat
Content-Type: application/json
{ "message": "Show me men's sneakers under BDT 2000" }

→ Response: text/event-stream
data: {"text":"I found some great options for you!"}
data: {"text":" Here are men's sneakers..."}
data: [DONE]
```

**Tool use (agentic loop):**
The assistant has access to 3 tools called automatically when relevant:
- `search_products` — searches by name, gender, price range
- `get_product_details` — full product + variants by slug
- `get_categories` — lists all active categories

Rate limited: 10 requests/minute per IP.

---

## HTTP Status Code Reference

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET or PATCH |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Zod validation failed |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Valid JWT but insufficient role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate slug, already-cancelled order |
| 422 | Unprocessable | Business rule violation (negative stock, etc.) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled exception |

---

## Error Code Reference

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Zod schema failed; `details` contains field errors |
| `UNAUTHORIZED` | 401 | No or invalid token |
| `FORBIDDEN` | 403 | Token valid but role insufficient |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate constraint (slug, SKU, etc.) |
| `BUSINESS_RULE` | 422 | Cannot perform operation (insufficient stock, etc.) |
| `RATE_LIMIT` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unhandled server error |
