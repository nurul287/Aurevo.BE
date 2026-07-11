# Aurevo Fashion — Full-Stack E-Commerce Platform

Aurevo Fashion is a full-stack e-commerce portfolio project built to demonstrate production-grade software engineering across the entire SDLC — from database design to REST API to a React storefront with an AI shopping assistant.

---

## Live Architecture

📊 **[Detailed request-flow diagram (Mermaid.ai)](https://mermaid.ai/d/a656ee2d-d320-43ac-a7d0-5cae87032a5d)** — middleware chain, domain modules, and data-layer detail.

```
┌─────────────────────────────────────────────────────────────┐
│                        Aurevo.UI                            │
│      React 19 + Vite + TanStack Query + Tailwind + i18n     │
│         Storefront  ·  Admin Panel  ·  বাংলা/English         │
│      No Supabase SDK — all auth (incl. OAuth) via REST      │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (all calls, incl. auth)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       Aurevo.BE                             │
│          Express + TypeScript + Drizzle ORM                 │
│   Categories · Products · Cart · Orders · Inventory · Chat  │
└──────────────────────────┬──────────────────────────────────┘
                           │ PostgreSQL + Storage + Auth Admin
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Supabase                             │
│        PostgreSQL 15  ·  Auth (JWT)  ·  Storage             │
│        Row-Level Security  ·  Edge Functions                │
└─────────────────────────────────────────────────────────────┘
```

---

## Repositories

| Repo | Stack | Purpose |
|------|-------|---------|
| `Aurevo.UI` | React 19, Vite, TanStack Query, Tailwind CSS v4, Radix UI | Customer storefront + admin panel |
| `Aurevo.BE` | Node.js, Express, TypeScript, Drizzle ORM, Zod, Vitest | REST API — business logic, validation, AI chat |

---

## Key Features

- **Product Catalog** — categories, brands, products with variants (size/color/SKU), image management
- **Guest + Auth Cart** — dual-owner cart (session-based for guests, user-based for logged-in), cart migration on sign-in
- **Order Management** — atomic, race-safe stock decrement at checkout (guarded by available quantity, so concurrent orders can't oversell), full order lifecycle (pending → shipped → delivered), admin status/payment/tracking/fulfillment controls
- **Inventory System** — per-variant stock tracking, audit log of every movement (`inventoryMovements`), low-stock alerts
- **Auth & Profiles** — backend-driven auth (email/password + Google/Facebook OAuth, all via Aurevo.BE — no Supabase SDK on the client), user profiles, saved address book with checkout autofill
- **Internationalization** — English/বাংলা (Bangla) via i18next; English by default, user-selected and persisted via a header toggle
- **AI Shopping Assistant** — SSE-streamed responses via Claude API with tool use (product search, detail lookup, category listing)
- **Admin Dashboard** — product/order/inventory management, bulk operations, analytics
- **Observability** — structured pino logs, Sentry error tracking (FE + BE, optional/no-op unless configured), deep health check, graceful shutdown

---

## SDLC Documentation

| Phase | Document |
|-------|----------|
| 1. Requirements | [docs/01-requirements.md](docs/01-requirements.md) |
| 2. System Design | [docs/02-system-design.md](docs/02-system-design.md) |
| 3. Database Design | [docs/03-database-design.md](docs/03-database-design.md) |
| 4. API Design | [docs/04-api-design.md](docs/04-api-design.md) |
| 5. Implementation | [docs/05-implementation.md](docs/05-implementation.md) |
| 6. Testing Strategy | [docs/06-testing.md](docs/06-testing.md) |
| 7. Deployment | [docs/07-deployment.md](docs/07-deployment.md) |

---

## Quick Start

### Prerequisites
- Node.js 20+, pnpm 9+
- Docker Desktop (for local Supabase)

### 1. Start local database
```bash
cd Aurevo.BE
pnpm db:start          # starts Supabase Docker stack (Docker required)
pnpm db:reset          # applies all migrations + seed data
```

### 2. Run the backend API
```bash
cd Aurevo.BE
cp .env.example .env.local   # fill in Supabase local keys
pnpm dev                     # http://localhost:5000
# Swagger docs: http://localhost:5000/api/docs
```

### 3. Run the frontend
```bash
cd Aurevo.UI
cp .env.example .env.local   # fill in Supabase local keys
pnpm dev                     # http://localhost:5173
```

---

## Database Scripts

DB ownership lives here. All migrations, seed data, and Supabase CLI scripts are in `supabase/`. Scripts use pinned `supabase@2.98.2` via `pnpm dlx`.

```bash
pnpm db:start          # start local Supabase Docker stack
pnpm db:stop           # stop it
pnpm db:reset          # apply all migrations + seed
pnpm db:migrate:new    # create a new migration file
pnpm db:push           # push pending migrations to linked project
pnpm db:validate       # validate migration file naming/ordering
pnpm db:types:local    # regenerate TypeScript types from local DB
pnpm db:sync-from-prod # dump prod data → restore to local DB
pnpm db:studio         # Drizzle Studio (read-only introspection)
```

## Deployment (Railway)

`railway.json` configures Railway deployment. CI/CD is in `.github/workflows/ci.yml`:

1. **test** — build, lint, and run integration tests against local Supabase Docker
2. **migrate** — link to production Supabase, validate migrations, run `supabase db push`
3. **deploy-functions** — deploy edge functions to Supabase

Railway deploys automatically via the native **"Wait for CI"** setting — it triggers only after all CI checks on `main` pass, ensuring tests and DB migrations succeed before the new server goes live. No `RAILWAY_TOKEN` or `railway up` needed.

Required GitHub Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PROJECT_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_PUBLISHABLE_KEY`, `BACKEND_URL`, `ANTHROPIC_API_KEY`

Production Railway env should also set `SENTRY_DSN` (optional locally — Sentry is a no-op when unset). After merges to `main`, `.github/workflows/merge-back.yml` fast-forwards `dev` so the branches stay aligned.

---

## Tech Decisions at a Glance

| Decision | Choice | Why |
|----------|--------|-----|
| Database | Supabase (PostgreSQL 15) | Managed Postgres + built-in Auth + Storage + RLS |
| ORM | Drizzle ORM | Type-safe, introspect-first, zero magic |
| API Framework | Express + TypeScript | Explicit, well-understood, easy to test |
| Validation | Zod | Schema-first, integrates cleanly with TypeScript |
| Frontend | React 19 + Vite | Latest concurrent features, fast DX |
| State/Data | TanStack Query v5 | Server-state management, caching, optimistic updates |
| UI Components | Radix UI + Tailwind CSS v4 | Accessible headless components + utility CSS |
| AI | Anthropic Claude + tool use | Agentic product search over real catalog |
| Testing | Vitest + Supertest | Fast, real DB integration tests, no mocks on data layer |
