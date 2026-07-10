# Phase 6 — Testing Strategy

## Philosophy: Real DB, No Mocks on the Data Layer

All backend tests run against a real local PostgreSQL instance (Supabase Docker). No Drizzle queries, FK constraints, or DB-level rules are mocked.

**Why:** Mocks pass when production fails. The cart FK chain (`cart_items → profiles → auth.users`) is a real example — a mocked test would never catch that `auth.users` needs to be seeded before `profiles` can be inserted.

The only mock in the test suite is the Anthropic SDK in `chat.test.ts` — because we don't want to spend real API tokens in CI.

---

## Test Setup

### Stack
- **Test runner:** Vitest 4
- **HTTP testing:** Supertest (in-process, no network)
- **Database:** Local Supabase Docker (`127.0.0.1:55322`)
- **Auth:** JWTs signed with the local Supabase JWT secret (same secret the middleware uses)

### Key config (`vitest.config.ts`)
```ts
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    fileParallelism: false,   // sequential files — prevents FK violations on shared DB
    testTimeout: 15000,
  },
});
```

`fileParallelism: false` is the Vitest 4 equivalent of the old `singleThread: true`. Without it, test files run in parallel and produce FK violations when multiple files simultaneously insert/delete from shared tables.

---

## Test Helpers (`src/test/helpers.ts`)

### Mock users
Two test users with fixed UUIDs, inserted into `auth.users` before any test that needs profile data:

```ts
export const MOCK_ADMIN_USER = { id: "00000000-0000-0000-0000-000000000001", role: "admin" };
export const MOCK_USER       = { id: "00000000-0000-0000-0000-000000000002", role: "user" };

export const adminToken = `Bearer ${generateToken(MOCK_ADMIN_USER)}`;
export const userToken  = `Bearer ${generateToken(MOCK_USER)}`;
```

### `seedTestUsers()`
Required in `beforeAll` for any module that touches tables with FK chains to `auth.users`:

```ts
export async function seedTestUsers() {
  // 1. Seed auth.users (Supabase internal schema)
  await db.execute(sql`INSERT INTO auth.users (...) ON CONFLICT (id) DO NOTHING`);
  // 2. Seed profiles
  await db.insert(profiles).values([...]).onConflictDoNothing();
}
```

### `generateToken(user)`
Creates a valid JWT signed with the local `SUPABASE_JWT_SECRET` — identical to what Supabase would issue in production. The `authenticate` middleware verifies it identically.

---

## Coverage by Module

| Module | Tests | What's Covered |
|--------|-------|----------------|
| Categories | 22 | CRUD, slug uniqueness, 401/403 auth gates, pagination, search, 422 delete-with-children |
| Brands | 21 | Same + 422 delete-with-products |
| Products | 32 | All 7 filters (category, brand, gender, price range, search, isActive, isFeatured), featured endpoint, by-slug, bulk status, bulk delete |
| Variants | 23 | Nested routing, cross-product 404 protection, SKU conflict on create + update, stock adjust, 422 negative stock |
| Images | 21 | Real Supabase Storage upload, auto-primary logic, set-primary (clears old), delete (removes from Storage), multer file type + size limits |
| Cart | 22 | Auth + guest dual paths, upsert on re-add, 422 insufficient stock, 422 inactive variant, cart migration with quantity merge |
| Orders | 27 | Stock decremented on create, guest order, 422 insufficient stock, user isolation (can't see others' orders), cancel + stock restore, 409 already-cancelled, admin cancel any, admin status/payment/tracking/fulfillment patches |
| Inventory | 19 | Upsert, adjust (transaction integrity), low-stock filter, 422 negative adjustment, movement audit log entries |
| Auth/Profile | 21 | Profile upsert (creates on first call), BD address create (district/upazila), default address clearing, cross-user address 404, gender enum validation |
| AI Chat | 8 | SSE headers, stream contains [DONE], 400 empty message, 400 too long, invalid sessionId, optional sessionId — service mocked |

**Total: 216 tests**

---

## Test Structure Pattern

Every test file follows the same structure:

```ts
// 1. Create a minimal Express app with just this module's router
const app = createTestApp(categoryRoutes);

// 2. Seed + clean state
beforeAll(async () => { await seedTestUsers(); });     // if needed
beforeEach(async () => { await cleanDb(); });          // fresh state per test
afterAll(async () => { await cleanTestUsers(); });     // full teardown

// 3. Tests grouped by endpoint
describe("GET /categories", () => {
  it("returns empty list", async () => { ... });
  it("returns paginated results", async () => { ... });
  it("filters by search", async () => { ... });
});

describe("POST /categories", () => {
  it("creates a category (admin)", async () => { ... });
  it("rejects duplicate slug", async () => { ... });
  it("returns 401 with no auth", async () => { ... });
  it("returns 403 for non-admin", async () => { ... });
});
```

### `createTestApp(router)`
```ts
export function createTestApp(router: Router) {
  const app = express();
  app.use(express.json());
  app.use("/", router);
  app.use(globalErrorHandler);
  return app;
}
```

No full server needed — Supertest calls the Express app directly in-process.

---

## FK-Safe Cleanup Order

When cleaning the database between tests, deletion order must respect FK constraints:

```ts
export async function cleanDb() {
  await db.delete(orderItems);       // depends on orders + variants
  await db.delete(orders);           // depends on profiles
  await db.delete(cartItems);        // depends on profiles + variants
  await db.delete(productVariants);  // depends on products
  await db.delete(products);         // depends on categories + brands
  await db.delete(categories);
  await db.delete(brands);
}
```

Deleting in wrong order causes FK violation errors mid-test.

---

## Running Tests

```bash
# Prerequisite: Supabase Docker must be running
cd Aurevo.UI && pnpm db:start

# Run all tests
cd Aurevo.BE
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres pnpm test

# Watch mode during development
pnpm test:watch
```

Expected output:
```
Test Files  10 passed (10)
     Tests  216 passed (216)
  Duration  ~17s
```
