# Phase 2 — System Design

## Architecture Pattern: Modular Monolith + BFF

The backend is a **modular monolith** — a single deployable Express application organized into domain modules. This was chosen over microservices deliberately:

- Simpler to develop, test, and run locally
- No inter-service networking overhead
- Easy to extract a module to a service later if scale demands it
- Sufficient for an e-commerce store at realistic traffic

The frontend talks to Supabase directly for auth and storage, and will call the Express BE for all business logic (cart, orders, products, AI chat).

---

## System Diagram

```
Browser (React SPA)
        │
        ├──── Supabase Auth (sign in/up/out, JWT tokens)
        ├──── Supabase Storage (avatar upload → avatars bucket)
        │
        └──── Aurevo.BE (Express REST API)  ← primary data layer
                     │
                     ├── /api/products      (read + admin write)
                     ├── /api/categories
                     ├── /api/brands
                     ├── /api/products/:id/variants
                     ├── /api/products/:id/images  ← multer → Supabase Storage
                     ├── /api/cart          (auth + guest)
                     ├── /api/orders        (transactional)
                     ├── /api/inventory     (admin only)
                     ├── /api/auth          (profile + addresses)
                     └── /api/chat          (SSE + Claude tool use)
                                │
                                └── PostgreSQL (Supabase)
                                        ├── 19 tables
                                        ├── 9 enums
                                        ├── Row Level Security policies
                                        └── DB-level constraints + indexes
```

---

## Tech Stack Decisions

### Backend: Express + TypeScript

**Chosen over:** NestJS, Fastify, Hono

**Why Express:**
- No magic — every middleware and route is explicit
- Easy to unit-test individual handlers
- Massive ecosystem; any pattern you need exists
- The verbosity is a feature for a portfolio — reviewers can read every line

**Why TypeScript strict mode:**
- Catches shape mismatches at compile time
- Forces explicit typing on all service inputs/outputs
- No implicit `any` means every Drizzle result shape is known

### ORM: Drizzle ORM (introspect-first)

**Chosen over:** Prisma, TypeORM, raw SQL

**Why Drizzle:**
- Schema generated from the existing live DB via `drizzle-kit introspect` — no schema drift
- Queries compile to plain SQL; no N+1 magic
- Type-safe without code generation at runtime
- Lightweight — no Prisma binary, no ORM startup cost

**Introspect-first rationale:** The database already existed (built with Supabase migrations). Rather than rewriting schema definitions, `drizzle-kit introspect` read the live Postgres schema and generated `src/db/schema.ts` exactly matching production. This is the correct approach when the DB is the source of truth.

### Database: Supabase (PostgreSQL 15)

**Why Supabase over bare Postgres:**
- Built-in Auth (JWT, OAuth, magic links) — avoids building auth from scratch
- Storage (S3-compatible) — product images without a separate service
- Row Level Security — data access policies at DB level for the direct-Supabase paths
- Local Docker stack (`supabase start`) — full parity between dev and prod

### Validation: Zod

**Chosen over:** Joi, class-validator, yup

**Why Zod:**
- TypeScript-native — inferred types from schemas, not the other way around
- `z.infer<typeof schema>` means one source of truth for request shapes
- Clean error messages with field-level details
- Integrates cleanly as Express middleware (`validate.ts`)

### Testing: Vitest + Supertest

**Chosen over:** Jest, Mocha

**Why Vitest:**
- Faster than Jest on TypeScript (no Babel, ESM-native)
- Same API as Jest — zero learning curve
- `fileParallelism: false` runs test files sequentially to prevent FK violations on shared local DB

**Why real DB over mocks:**
- Mocks pass when prod fails — the cart FK chain (`cart_items → profiles → auth.users`) would never be caught by mocked tests
- Integration tests against local Supabase Docker give full confidence in Drizzle queries, transactions, and constraints

---

## Request Lifecycle

```
HTTP Request
    │
    ▼
cors() + helmet() + morgan()       ← security + logging
    │
    ▼
express.json()                     ← body parsing
    │
    ▼
Router (/api/...)
    │
    ├── rateLimiter (publicLimiter / authLimiter / chatLimiter)
    ├── authenticate / optionalAuth  ← JWT verify via Supabase secret
    ├── requireAdmin                 ← role check from app_metadata
    ├── validate(schema)             ← Zod parse; 400 on failure
    │
    ▼
Controller                         ← thin: calls service, sends response
    │
    ▼
Service                            ← all business logic + Drizzle queries
    │
    ▼
PostgreSQL (Supabase)
    │
    ▼
Controller                         ← { success: true, data: ... }
    │
    ▼ (on error)
globalErrorHandler                 ← AppError → JSON { success: false, error: { code, message } }
```

---

## Module Structure

Every domain follows the same 4-file pattern:

```
src/app/modules/{domain}/
├── {domain}.schema.ts      ← Zod schemas for request body, query, params
├── {domain}.service.ts     ← Drizzle queries + business logic (no Express)
├── {domain}.controller.ts  ← Express handlers (thin: call service, send response)
├── {domain}.routes.ts      ← Router: method + path + middleware + handler
└── {domain}.test.ts        ← Vitest + Supertest integration tests
```

**Why this separation:**
- Services are pure functions — testable without HTTP
- Controllers never contain business logic — easy to swap transport layer
- Routes declare the contract — middleware order is explicit and readable
- Tests import the router directly — no need to spin up the full server

---

## Error Hierarchy

```
AppError (base)
├── NotFoundError      → 404  NOT_FOUND
├── ValidationError    → 400  VALIDATION_ERROR
├── UnauthorizedError  → 401  UNAUTHORIZED
├── ForbiddenError     → 403  FORBIDDEN
├── ConflictError      → 409  CONFLICT
└── BusinessRuleError  → 422  BUSINESS_RULE
```

All errors are caught by `globalErrorHandler`. Unhandled errors return 500 `INTERNAL_ERROR` with no stack trace in production.

---

## Auth Design

Supabase issues JWTs signed with `SUPABASE_JWT_SECRET`. The BE verifies these tokens using `jsonwebtoken.verify()` — no Supabase SDK call needed per request, so auth is stateless and fast.

```
User signs in → Supabase Auth → JWT (sub = userId, app_metadata.role = "admin"|"user")
                                     │
                              Authorization: Bearer <token>
                                     │
                              authenticate middleware
                                     │
                              jsonwebtoken.verify(token, SUPABASE_JWT_SECRET)
                                     │
                              req.user = { id, email, role }
```

Guest users are identified by a UUID stored in localStorage, sent as `X-Guest-Session` header. The BE extracts this and uses it as a `sessionId` for cart lookups.
