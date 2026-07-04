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
Phase 10: AI Chat        ← depends on products + categories (tool use)
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
const decoded = jsonwebtoken.verify(token, config.SUPABASE_JWT_SECRET);
req.user = { id: decoded.sub, email: decoded.email, role: decoded.app_metadata?.role };
```
No Supabase SDK call per request — stateless, fast.

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

### Transactional Stock Reservation (Orders)

Order creation runs entirely in one DB transaction. If any step fails, everything rolls back:

```ts
await db.transaction(async (tx) => {
  // 1. Insert order
  const [order] = await tx.insert(orders).values(orderData).returning();

  // 2. Insert line items
  await tx.insert(orderItems).values(lineItems);

  // 3. Decrement stock on every variant
  for (const item of lineItems) {
    await tx.update(productVariants).set({
      stock: variant.stock - item.quantity,
      reservedStock: variant.reservedStock + item.quantity,
    }).where(eq(productVariants.id, item.variantId));
  }
});
```

Cancel reverses the same quantities in a transaction.

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

### AI Chat — Agentic Tool Use Loop

The chat service runs an agentic loop: it keeps calling Claude until `stop_reason === "end_turn"`, handling tool calls in between:

```ts
export async function* streamChat(message: string): AsyncGenerator<string> {
  const messages = [{ role: "user", content: message }];

  while (true) {
    const response = await anthropic.messages.create({ tools: TOOLS, messages });

    for (const block of response.content) {
      if (block.type === "text") yield block.text;  // stream to client
    }

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      // Execute DB queries for each tool call
      const results = await Promise.all(toolUseBlocks.map(executeToolCall));
      // Feed results back to Claude
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: results });
      continue;  // loop again
    }

    break;
  }
}
```

The generator yields text chunks as they come. The controller writes each chunk as an SSE `data:` event.

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
feat: orders module — 13 endpoints + 27 integration tests (transactional stock)
feat: inventory module — 11 endpoints + 19 integration tests (audit log)
feat: auth/profile module — 6 endpoints + 21 integration tests
feat: AI chat module — SSE streaming + Claude tool use + 8 tests
```
