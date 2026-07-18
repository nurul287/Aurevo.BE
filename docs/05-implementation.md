# Phase 5 — Implementation

## Build Order & Rationale

Modules were built in dependency order — each module only depends on tables that already have a working API:

```
Phase 0: Foundation      ← config, middleware, error handling, DB client, storage helpers
Phase 1: Categories      ← no dependencies
Phase 2: Brands          ← no dependencies
Phase 3: Products        ← depends on categories + brands
Phase 4: Variants        ← depends on products (nested routes)
Phase 5: Images          ← depends on products + variants + Supabase Storage
Phase 6: Cart            ← depends on products + variants + profiles
Phase 7: Orders          ← depends on cart + variants (stock transactions)
Phase 8: Inventory       ← depends on variants (audit log + movements)
Phase 9: Auth/Profile    ← depends on profiles + user_addresses
Phase 10: AI Chat        ← RAG (knowledge + chat modules)
Phase 11: Courier        ← Steadfast consignments + tracking (depends on orders)
Phase 12: Invoice PDF    ← pdfkit invoice + Resend attachment (orders email path)
```

---

## Foundation Layer (Phase 0)

### `src/db/index.ts` — Drizzle client
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(config.DATABASE_URL);
export const db = drizzle(client, { schema });
```
Singleton pattern — one connection pool for the process lifetime.

### `src/lib/storage.ts` — Supabase Storage helpers
```ts
export async function uploadFile(bucket, path, buffer, mimetype) → publicUrl
export async function deleteFile(bucket, path) → void
```
Used by the images module. The BE uploads via service role key (full access, no RLS).

### `src/app/middlewares/auth.ts` — JWT verification
```ts
const { data, error } = await supabaseAdmin.auth.getClaims(token);
req.user = { id: data.claims.sub, email: data.claims.email, role: data.claims.app_metadata?.role };
```
Supabase signs JWTs with an asymmetric key (ES256) by default now, not the static `SUPABASE_JWT_SECRET` — `jsonwebtoken.verify(token, SUPABASE_JWT_SECRET)` rejects every such token. `getClaims` fetches and caches the project's JWKS and validates locally, so there's still no per-request round-trip to Supabase — auth stays stateless and fast.

### `src/app/middlewares/validate.ts` — Zod middleware
```ts
const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
if (!result.success) throw new ValidationError(result.error.flatten());
req.body = result.data.body;  // replace raw with parsed + coerced values
```

---

## Key Implementation Patterns

### Composite Filter Pattern (Products, Orders, Inventory)

Rather than building WHERE clauses with string concatenation, conditions are accumulated as a `SQL[]` array:

```ts
const conditions: SQL[] = [eq(products.isActive, true)];

if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
if (filters.search)     conditions.push(ilike(products.name, `%${filters.search}%`));
if (filters.minPrice)   conditions.push(gte(products.basePrice, filters.minPrice.toString()));

db.select().from(products).where(and(...conditions))
```

This pattern is type-safe, easily extensible, and produces clean SQL.

---

### Dual Owner Cart (`CartOwner` union type)

```ts
type CartOwner = { userId: string } | { sessionId: string };

function ownerCondition(owner: CartOwner) {
  if ("userId" in owner) return eq(cartItems.userId, owner.userId);
  return eq(cartItems.sessionId, owner.sessionId);
}
```

Every cart query takes a `CartOwner` and applies the right WHERE condition. One code path handles both auth users and guests.

---

### Transactional Stock Decrement (Orders)

Order creation runs entirely in one DB transaction. Stock is decremented with an availability guard so concurrent checkouts cannot oversell (`quantity - reserved_quantity >= N`). There is no separate "reserve then decrement" step — `reserved_quantity` stays at 0 for normal sales; cancel and courier-driven cancel both restore stock via the shared `restoreOrderStock` helper.

```ts
await db.transaction(async (tx) => {
  const orderNumber = await generateOrderNumber(tx); // ORD- + 12-digit sequence
  const [order] = await tx.insert(orders).values({ ...orderData, orderNumber }).returning();
  await tx.insert(orderItems).values(lineItems);

  for (const item of lineItems) {
    const updated = await tx.execute(sql`
      UPDATE inventory
      SET quantity = quantity - ${item.quantity}
      WHERE variant_id = ${item.variantId}
        AND quantity - reserved_quantity >= ${item.quantity}
      RETURNING *
    `);
    if (!updated.length) throw new BusinessRuleError("Insufficient stock");
  }
});
```

Cancel (user/admin) and courier `cancelled` webhooks reverse the same quantities via `restoreOrderStock`.

---

### Order Confirmation Email + Invoice PDF

`src/lib/email.ts` mirrors Sentry's no-op-if-unconfigured pattern: sends via Resend only when `RESEND_API_KEY` is set. Triggered fire-and-forget in `orders.controller.ts` after `createOrder` — the `.catch()` must never be removed.

`src/lib/invoice-pdf.ts` builds an A4 PDF with `pdfkit` (no headless browser). Bundled assets under `assets/fonts/` (Noto Sans Bengali static Regular/Bold) and `assets/logo/aurevo-logo-black.svg`. Regenerated on every email attach and every `GET /orders/by-number/:orderNumber/invoice` — never persisted. PDF generation failure degrades gracefully: the confirmation email still sends without the attachment.

---

### Courier Tracking (Steadfast)

`src/app/modules/courier/` + thin client `src/lib/steadfast.ts`. Booking is admin-only and never automatic. Status mapping (`mapCourierStatus`) is pure and unit-tested: delivered advances order + marks COD paid; cancelled restores stock once (replay-safe); approval-pending / unknown states record timeline only.

Webhook + poll share `recordCourierEvent`. Internal poll: `POST /internal/courier/poll` with `x-internal-task-token`.

---

### Inventory Movement Audit Log

Every stock adjustment writes an immutable movement record:

```ts
await db.transaction(async (tx) => {
  // 1. Update inventory quantity
  await tx.update(inventory).set({ quantity: newQty }).where(eq(inventory.id, id));

  // 2. Write audit record
  await tx.insert(inventoryMovements).values({
    variantId, movementType, reason, quantityChange,
    quantityBefore: current.quantity, quantityAfter: newQty,
    userId: actorId, notes,
  });

  // 3. Sync product_variants.stock
  await tx.update(productVariants).set({ stock: newQty }).where(eq(productVariants.id, variantId));
});
```

The audit log is append-only — records are never updated or deleted.

---

### Nested Router Pattern (Variants + Images)

Variants and images live under `/api/products/:productId/variants` and `/api/products/:productId/images`. The route registrations use `Router({ mergeParams: true })` so `:productId` is accessible inside the nested router:

```ts
// routes/index.ts
router.use("/products/:productId/variants", variantRoutes);

// variants.routes.ts
const router = Router({ mergeParams: true });  // ← key
router.get("/:id", getVariant);                // req.params = { productId, id }
```

The service validates that the variant actually belongs to the given product — protecting against URL manipulation.

---

### AI Chat — RAG Pipeline (rebuilt)

The chat service was rebuilt from a bare tool-use loop with simulated streaming (a non-streaming `anthropic.messages.create` call per turn, yielding whole text blocks after the fact) into a full retrieval-augmented generation pipeline: real Anthropic token streaming (`stream: true`), semantic retrieval over `kb_chunks` (pgvector, via Voyage AI embeddings), conversation persistence (`conversations`/`messages` tables) with a sliding-window + rolling-`intent_summary` history strategy, and retention cleanup.

Full architecture, tool definitions, ingestion pipeline, and data model: see `docs/09-ai-chatbot-rag.md`.

---

### effectivePrice Helper (Cart + Orders)

Variants can have a `price` of `null`, meaning they inherit from the parent product's `basePrice`. A single helper resolves this everywhere:

```ts
function effectivePrice(variant: { price: string | null }, product: { basePrice: string | null }) {
  return Number(variant.price ?? product.basePrice ?? "0");
}
```

Both cart total calculation and order line-item pricing use this. Forgetting the fallback produces ৳0 cart items and zero-value orders.

---

### Variant–Inventory Transaction (Create/Bulk Create)

Every new variant must have a matching `inventory` row. This is enforced in the service, not in the DB:

```ts
return db.transaction(async (tx) => {
  const [variant] = await tx.insert(productVariants).values(variantData).returning();
  await tx.insert(inventory).values({
    variantId: variant!.id,
    location: "main",
    quantity: input.stock ?? 0,
  });
  return variant!;
});
```

If the inventory insert fails, the variant is also rolled back — no orphaned variants without inventory rows.

---

### Inventory Upsert Syncs Both Ledgers

The `PUT /inventory` upsert updates both the `inventory` table AND `product_variants.stock` in the same transaction:

```ts
await db.transaction(async (tx) => {
  await tx.insert(inventory).values(...).onConflictDoUpdate(...);
  await tx.update(productVariants).set({ stock: input.quantity })
    .where(eq(productVariants.id, input.variantId));
});
```

This keeps two ledgers in sync: `inventory.quantity` (Inventory admin reads) and `product_variants.stock` (cart availability + checkout reads).

---

### Cart `getCart` — Full JOIN

`GET /cart` returns joined product + variant + image data so the cart panel can display names, prices, and thumbnails without extra round-trips:

```ts
const rows = await db
  .select({ cartItem: cartItems, product: products, variant: productVariants })
  .from(cartItems)
  .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
  .leftJoin(products, eq(productVariants.productId, products.id))
  .where(ownerCondition(owner));
```

Primary images are fetched separately and merged by product ID.

---

### CORS `exposedHeaders`

The default CORS setup does not expose `Content-Disposition` to JavaScript. Without this, `response.headers.get("Content-Disposition")` returns `null` and the download filename falls back to "download.xlsx":

```ts
cors({
  origin: allowedOrigins,
  credentials: true,
  exposedHeaders: ["Content-Disposition"],   // ← required for xlsx filename
})
```

---

### Structured Logging (pino)

`src/lib/logger.ts` is the single logger. Production emits JSON lines (Railway parses them); development uses `pino-pretty`. Tests set level to `silent`.

Request logging uses `pino-http` with `/health` and `/api/health` ignored so platform probes do not flood logs. Prefer `logger.info/error` over `console.*`.

---

### Sentry Error Tracking

`initSentry()` runs in `src/server.ts` **before** the Express app is imported, so the SDK can instrument the process. When `SENTRY_DSN` is unset (local + CI), init is a no-op.

Only unexpected errors that fall through to the 500 branch of `globalErrorHandler` call `Sentry.captureException`. Expected `AppError` / Zod / Postgres `23505` responses are not reported.

---

### Fail-Fast Boot + Graceful Shutdown

On start, the server runs `SELECT 1` against Postgres. If that fails, it exits with code 1 so Railway keeps the previous deploy live instead of advertising a broken instance.

On `SIGTERM` / `SIGINT`: stop accepting connections → close the DB pool (5s timeout) → exit. A 10s force-exit timer covers hung drains.

---

### Deep Health Check

`GET /health` and `GET /api/health` ping the database. Response is `200` with `{ db: "ok" }` or `503` with `{ db: "down", status: "degraded" }`. Railway's `healthcheckPath` is `/api/health`.

---

### BD-Shaped Saved Addresses

`user_addresses` matches checkout shipping fields (`name`, `phone`, `address`, `district`, `upazila`) plus optional `label` (Home / Work). Creating an address ensures a `profiles` row exists first — `user_addresses.user_id` FKs to `profiles.id`, and OAuth users may not have patched `/profile` yet.

---

### Server-Side XLSX Export

Inventory export runs entirely on the server to avoid sending thousands of rows to the browser:

```ts
// lib/xlsx-export.ts
export function buildXlsxBuffer(sheetName: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
```

The controller sets `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="inventory-<ts>.xlsx"`, then writes the buffer directly.

---

## Non-obvious Decisions

### `fileParallelism: false` in Vitest config

Vitest 4 removed `poolOptions.forks.singleFork`. The replacement is `fileParallelism: false`. This is required because test files share a local Postgres instance — parallel execution causes FK violations when one file inserts and another deletes categories/brands/products concurrently.

### `seedTestUsers()` in beforeAll

`cart_items.user_id → profiles.id → auth.users(id)` is a 3-hop FK chain. Test users must be pre-inserted into `auth.users` (Supabase's internal table) via raw SQL before `profiles` rows can be created:

```ts
await db.execute(sql`
  INSERT INTO auth.users (id, email, role, aud, created_at, updated_at, encrypted_password)
  VALUES ('00000000-0000-0000-0000-000000000001', 'admin@test.com', 'authenticated', ...)
  ON CONFLICT (id) DO NOTHING
`);
await db.insert(profiles).values({ id: MOCK_ADMIN_USER.id }).onConflictDoNothing();
```

### Orders use `authLimiter` not `strictLimiter`

`strictLimiter` is 5 req/min. A test suite that creates 6+ orders would hit the limiter on the 6th request and get a 429. `authLimiter` (20/15min) is permissive enough for test runs while still being production-appropriate for an order endpoint.

### Lazy Anthropic client initialization

The Anthropic client is initialized on first use, not at module load:

```ts
let _anthropic: Anthropic | null = null;
function getClient() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  return _anthropic;
}
```

This allows `vi.mock("./chat.service")` in tests to intercept calls before the client is ever created, without requiring `ANTHROPIC_API_KEY` in the test environment.

---

## Git History (Micro-Commits)

Each module was committed independently to demonstrate incremental delivery:

```
feat: foundation — Drizzle, middlewares, error handling, Swagger
feat: categories module — 5 endpoints + 22 integration tests
feat: brands module — 5 endpoints + 21 integration tests
feat: products module — 10 endpoints + 32 integration tests
feat: variants module — 7 endpoints + 23 integration tests (nested routing)
feat: images module — 5 endpoints + 21 integration tests (Supabase Storage)
feat: cart module — 6 endpoints + 22 integration tests (dual auth+guest)
feat: orders module — sequential numbers, invoice PDF endpoint, confirmation email
feat: inventory module — 11 endpoints + 19 integration tests (audit log)
feat: auth/profile module — 6 endpoints + 21 integration tests
feat: AI chat module — RAG + SSE streaming + retention cleanup
feat: courier module — Steadfast ship/webhook/poll/public track
```
