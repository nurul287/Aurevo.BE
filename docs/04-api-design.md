# Phase 4 — API Design

## Base URL
```
http://localhost:5000/api
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
| `authLimiter` | 20 req / 15 min | Login/register/password reset — brute-force protection |
| `cartLimiter` | 60 req / min | Cart writes (add item) — routine shopper actions, not brute-force targets |
| `trackingLimiter` | 30 req / min | Public parcel tracking lookup (`GET /courier/track/:trackingCode`) |
| `strictLimiter` | 5 req / min | Sensitive write operations |
| `uploadLimiter` | 20 req / min | File upload endpoints |
| `chatLimiter` | 10 req / min | AI chat (expensive) |

`POST /cart/items` used to share `authLimiter` with login/register, so a shopper adding several items back-to-back could plausibly trip a limiter meant for brute-force protection. Moved to its own `cartLimiter`.

---

## Endpoint Reference

### Health — `/health` · `/api/health`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Deep health check (DB ping) |
| GET | `/api/health` | Public | Same handler — used by Railway |

**Response:** `200` when Postgres answers `SELECT 1`; `503` when the DB is unreachable (`status: "degraded"`, `db: "down"`). Not rate-limited; excluded from request access logs.

---

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
| GET | `/stats` | Admin | Aggregate counts by status + total revenue |
| GET | `/by-number/:orderNumber` | Optional | Lookup by order number (guest confirmation page) |
| GET | `/by-number/:orderNumber/invoice` | Optional | Download invoice PDF (`application/pdf` attachment) |
| POST | `/claim` | Auth | Claim guest orders on login (match by session/email/phone) |
| GET | `/:id` | Optional | Get order detail (auth user/admin or guestToken param) |
| PATCH | `/:id/cancel` | Auth | Cancel order |
| PATCH | `/:id/status` | Admin | Update order status |
| PATCH | `/:id/payment` | Admin | Update payment status |
| PATCH | `/:id/tracking` | Admin | Set tracking number |
| PATCH | `/:id/fulfillment` | Admin | Update fulfillment status |

**Order creation:** Validates all variants exist and have sufficient stock. Runs in a single transaction: inserts order + line items (with `productName`, `variantName`, `sku`, `unitPrice`, `totalPrice`) + atomically decrements inventory (`quantity - reserved_quantity >= N` guard so concurrent checkouts cannot oversell). Assigns a sequential order number via `order_number_seq` (`ORD-` + 12 zero-padded digits). Price resolution: `variant.price ?? product.basePrice`. Accepts optional `shippingAmount`. `shippingAddress` is BD-shaped: `{ name, phone, address, district, upazila }`. On success the controller fire-and-forgets `sendOrderConfirmationEmail` (Resend + PDF invoice attachment) — email failure never fails the order response.

**Invoice PDF:** `GET /by-number/:orderNumber/invoice` uses the same guest-token / owner / admin access rules as order lookup. Generated fresh with `pdfkit` on every request (never stored). Response headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="invoice-{orderNumber}.pdf"`.

**Stats endpoint:** `GET /stats` must be registered before `/:id` in the router to avoid the UUID validator matching the literal string "stats".

**Guest access:** `GET /by-number/:orderNumber`, `GET /by-number/:orderNumber/invoice`, and `GET /:id` accept `?guestToken=<token>` as an alternative to a Bearer JWT. Tokens expire after 30 days.

**Claim:** On login, `POST /claim` with `{ sessionId?, phone? }` assigns all matching guest orders (null `userId`) to the authenticated user via session ID, email, and phone matching.

**Cancel:** User can cancel own pending order. Admin can cancel any non-delivered order. Cancellation restores stock in a transaction (same helper as courier-driven cancel).

**Search (GET /):** Supports `?search=` — matches order number, shipping name, phone, and email via `ilike`.

---

### Courier — `/api/courier`

Steadfast Courier integration (Bangladesh). No-op / refuses booking when `COURIER_API_KEY` / `COURIER_SECRET_KEY` are unset. Thin client: `src/lib/steadfast.ts`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders/:id/ship` | Admin | Book a Steadfast consignment (explicit — commits real money; refuses double-book / terminal orders) |
| POST | `/orders/:id/refresh` | Admin | Re-fetch delivery status from Steadfast for one order |
| GET | `/balance` | Admin | Current Steadfast account balance |
| GET | `/track/:trackingCode` | Public | Parcel status + event timeline — **no recipient PII** (`trackingLimiter`) |
| POST | `/webhook` | Bearer `COURIER_WEBHOOK_TOKEN` | Steadfast `delivery_status` / `tracking_update` webhook |

**Ship:** Maps order shipping fields → Steadfast `create_order`. Sets `courier_provider`, `courier_consignment_id`, `tracking_number`, `courier_status`, advances order `status` to `shipped`, appends a timeline row. COD amount = full total when `payment_method === cash` and not yet paid; otherwise `0`.

**Webhook:** Timing-safe Bearer compare; fail-closed if token unset. Resolves order by `invoice` (= `order_number`) + matching `consignment_id`. Maps courier status → order/fulfillment/payment effects (delivered → paid for COD; cancelled → stock restore via `restoreOrderStock`). Exact-replay dedupe on `(order_id, event_at, status, message)`. Unknown invoices ack `200` and are ignored (no mutation).

**Public track response shape:** `{ trackingCode, provider, courierStatus, orderStatus, estimatedDeliveryDate, events: [{ status, message, eventAt }] }` (FE converts keys to snake_case).

---

### Internal — `/api/internal`

Machine-to-machine only. Header: `x-internal-task-token: <INTERNAL_TASK_TOKEN>` (no JWT).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat/cleanup` | Delete expired chat conversations (90d users / 48h guests) |
| POST | `/courier/poll` | Reconciliation poll for in-flight Steadfast shipments (missed webhooks) |

Meant to be triggered by Railway crons.

---

### Inventory — `/api/inventory`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | List inventory levels (paginated, filters) |
| PUT | `/` | Admin | Upsert inventory record for a variant |
| PATCH | `/:id/adjust` | Admin | Adjust quantity with reason + movement log |
| GET | `/movements` | Admin | Paginated audit log of all movements |
| GET | `/low-stock` | Admin | Variants where quantity ≤ threshold (paginated) |
| GET | `/export` | Admin | Download full inventory as .xlsx (server-side) |

**Query params (GET /):** `page`, `limit`, `search` (matches product name / SKU), `location`, `lowStock` (boolean)

**Adjust:** Validates new quantity ≥ 0. Runs transaction: updates `inventory.quantity` + inserts `inventory_movements` row + syncs `product_variants.stock`.

**Upsert sync:** `PUT /` also syncs `product_variants.stock` in the same transaction so the two ledgers stay consistent.

**Export:** `GET /export` builds an .xlsx buffer server-side using `xlsx` and streams it with `Content-Disposition: attachment; filename="inventory-<timestamp>.xlsx"`. CORS must expose `Content-Disposition` via `exposedHeaders` so the browser can read the filename.

**Variant availability:** `GET /api/variants/:variantId/availability` reads from `product_variants.stock - product_variants.reserved_stock` (not `inventory.quantity`) — this matches what checkout and add-to-cart validate against.

---

### Auth & Profile — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | Public | Email/password sign in |
| POST | `/register` | Public | Email/password sign up |
| POST | `/logout` | Auth | Revokes the Supabase session globally (`supabaseAdmin.auth.admin.signOut`) |
| POST | `/refresh` | Public | Exchange a refresh token for a new access token |
| GET | `/oauth/url?provider=google\|facebook` | Public | Returns the provider's authorize URL. The BE generates the PKCE pair and stores the verifier server-side, keyed by a `state` value carried inside `redirect_to` (not the top-level `state` param — GoTrue owns that for its own provider handshake) |
| GET | `/oauth/callback` | Public | Provider redirects here with `?code=&state=`. The BE exchanges the code via Supabase's REST API, stores the resulting tokens under a one-time exchange code, and redirects the browser to `{FRONTEND_URL}/?oauth_code=...`. Never rate-limited — it's an external redirect target, not a client-initiated call |
| GET | `/oauth/session?code=` | Public | One-time redemption of the exchange code for `{ accessToken, refreshToken, expiresAt }`. The code is deleted on first use |
| GET | `/me` | Auth | Get current user's profile |
| PATCH | `/profile` | Auth | Update profile (firstName, lastName, phone, gender, dateOfBirth, avatarUrl) |
| GET | `/addresses` | Auth | List saved addresses |
| POST | `/addresses` | Auth | Create address |
| PATCH | `/addresses/:id` | Auth | Update address |
| DELETE | `/addresses/:id` | Auth | Delete address |

**No Supabase SDK on the frontend.** Every auth flow — email/password, Google/Facebook OAuth, logout — is initiated and completed through these BE endpoints. The frontend never talks to Supabase directly; this is what lets logout reliably kill the server session (`supabaseAdmin.auth.admin.signOut` runs on the BE, which owns the token).

**Profile upsert:** First `PATCH /profile` creates the profile row if it doesn't exist yet.

**Address body (BD checkout shape):** `{ type?, isDefault?, label?, name, phone, address, district, upazila }`. Same fields as order `shippingAddress`, plus optional `label`. Creating an address ensures a `profiles` row exists (FK to `profiles.id`).

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
Real Anthropic token streaming (`stream: true`), not simulated — see `docs/09-ai-chatbot-rag.md`.

**Tool use (RAG, not the original tool-use-only bot):**
The assistant has access to 3 tools called automatically when relevant:
- `search_knowledge` — semantic retrieval over `kb_chunks` (pgvector), optional `sourceType` filter (`product`/`policy`/`faq`)
- `get_product_details` — live stock/price + variants by slug
- `get_my_orders` — **auth-gated only**, added to the tool list only on an authenticated request and hard-scoped server-side to `req.user.id`

See `docs/09-ai-chatbot-rag.md` for the full architecture (ingestion pipeline, data model, retention, guardrails).

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
| 409 | Conflict | Duplicate slug/SKU, Postgres unique violation (`23505`), already-cancelled order |
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
