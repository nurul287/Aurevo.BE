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
- **Order Management** — atomic, race-safe stock decrement at checkout (guarded by available quantity, so concurrent orders can't oversell), full order lifecycle (pending → shipped → delivered), sequential 16-char order numbers (`ORD-` + 12-digit Postgres sequence), admin status/payment/tracking/fulfillment controls, order confirmation email via Resend (`orders@aurevofashion.store`) with a link back to the live order and a PDF invoice attached
- **Courier Tracking (Steadfast)** — admin-triggered consignment booking, a Bearer-guarded webhook that auto-advances order status (including stock restore on cancellation), a reconciliation poll for missed webhooks, and a public no-PII tracking lookup — see [docs/05-implementation.md](docs/05-implementation.md)
- **Order Invoice PDF** — generated on demand with `pdfkit` (no headless browser), embeds the Aurevo wordmark as vector SVG and a bundled Noto Sans Bengali font for Bangla addresses/notes; never persisted to disk, regenerated fresh on every download or email send so it always reflects current order state
- **Inventory System** — per-variant stock tracking, audit log of every movement (`inventoryMovements`), low-stock alerts
- **Auth & Profiles** — backend-driven auth (email/password + Google/Facebook OAuth, all via Aurevo.BE — no Supabase SDK on the client), user profiles, saved address book with checkout autofill
- **Internationalization** — English/বাংলা (Bangla) via i18next; English by default, user-selected and persisted via a header toggle
- **AI Shopping Assistant** — full RAG pipeline: Claude + Voyage AI embeddings; **hybrid retrieval (pgvector + FTS via RRF) with Voyage cross-encoder reranking** over `kb_chunks`, real token streaming, auth-gated order lookup, conversation persistence with retention cleanup, retrieval + answer-quality eval harnesses, and a `chat_metrics` admin monitoring dashboard — see [docs/09-ai-chatbot-rag.md](docs/09-ai-chatbot-rag.md)
- **Bulk Product Import** — spreadsheet/JSON/NDJSON upload processed asynchronously (Redis + BullMQ worker): brand/category resolution, variant/inventory creation, image fetch+re-host to Supabase Storage, batch-embedded into the AI chatbot's knowledge base, idempotent re-import by `(source, external_id)`. Also fed by a standalone scraper package pulling real product data from external sites — see [docs/10-bulk-import-pipeline.md](docs/10-bulk-import-pipeline.md)
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
| 8. Load Testing Plan | [docs/08-load-testing-plan.md](docs/08-load-testing-plan.md) |
| 9. AI Chatbot (RAG) | [docs/09-ai-chatbot-rag.md](docs/09-ai-chatbot-rag.md) |
| 10. Bulk Import Pipeline | [docs/10-bulk-import-pipeline.md](docs/10-bulk-import-pipeline.md) |

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
pnpm ingest:knowledge   # backfills the AI chat's knowledge base (products + content/policies/*.md) — required for the chatbot to answer anything; needs VOYAGE_API_KEY set first
# Optional, manual (real API calls, local DB only — never CI):
pnpm eval:retrieval     # precision/recall/hit-rate/MRR for retrieve() vs a golden set
pnpm eval:answers       # LLM-as-judge quality of the chatbot's full answers
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

### 4. (Optional) Bulk product import
Needs a local Redis for the queue, plus the worker process alongside the API:
```bash
docker run -d -p 6379:6379 redis:7-alpine
cd Aurevo.BE
pnpm worker                  # separate terminal — consumes the import-processing queue
```
See [docs/10-bulk-import-pipeline.md](docs/10-bulk-import-pipeline.md) for the full pipeline, and [`../scraper/README.md`](../scraper/README.md) for the standalone scraper that can feed it real product data.

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

Required GitHub Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PROJECT_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_PUBLISHABLE_KEY`, `BACKEND_URL`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`

Production Railway env must also set `VOYAGE_API_KEY` and `INTERNAL_TASK_TOKEN` (both required — the app won't boot without them, same as `ANTHROPIC_API_KEY`) and should set `SENTRY_DSN` (optional — Sentry is a no-op when unset). After merges to `main`, `.github/workflows/merge-back.yml` fast-forwards `dev` so the branches stay aligned.

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
