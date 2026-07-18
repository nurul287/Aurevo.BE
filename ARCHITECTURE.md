# Aurevo Fashion — Application Overview & Architecture

Single-file summary of the whole system (Aurevo.BE + Aurevo.UI). For full depth on any section, see the linked docs — this file is the map, not the territory.

📐 [Lucidchart diagram](https://lucid.app/lucidchart/306c8028-e767-4769-8909-ffbf29c0f216/view) · 📊 [Mermaid.ai diagram](https://mermaid.ai/d/a656ee2d-d320-43ac-a7d0-5cae87032a5d) · 📚 [Full SDLC docs](docs/)

---

## 1. What this is

Aurevo Fashion is a full-stack e-commerce platform (fashion/apparel storefront + admin panel) built as a portfolio-grade demonstration of production engineering across the whole SDLC — not a toy CRUD app. Two independently deployed repos:

| Repo | Stack | Deploys to |
|---|---|---|
| `Aurevo.BE` | Express + TypeScript + Drizzle ORM | Railway |
| `Aurevo.UI` | React 19 + Vite + TanStack Query + Tailwind v4 + Radix UI | Vercel |

Both talk to one shared **Supabase** project (Postgres 15 + Auth + Storage).

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Aurevo.UI                            │
│      React 19 + Vite + TanStack Query + Tailwind + i18n     │
│         Storefront · Admin Panel · বাংলা/English             │
│      No Supabase SDK — all auth (incl. OAuth) via REST      │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (all calls, incl. auth)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       Aurevo.BE                              │
│          Express + TypeScript + Drizzle ORM                  │
│   Categories · Products · Cart · Orders · Inventory · Chat   │
└──────────────────────────┬──────────────────────────────────┘
                           │ PostgreSQL + Storage + Auth Admin
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Supabase                              │
│        PostgreSQL 15 · Auth (JWT/JWKS) · Storage             │
│        Row-Level Security · Edge Functions                   │
└─────────────────────────────────────────────────────────────┘
```

**The single most important architectural decision in this system**: the frontend has **no Supabase SDK at all**. Every auth flow — email/password, Google/Facebook OAuth, logout — is initiated and completed through Aurevo.BE's `/api/auth/*` endpoints. The browser never holds a Supabase session directly. This is what makes server-side logout reliable and keeps the client bundle free of a second auth system to reason about.

---

## 3. Backend (Aurevo.BE)

**Pattern**: Modular monolith + BFF. A single deployable Express app, organized into domain modules, chosen deliberately over microservices (simpler to run/test locally, no inter-service networking overhead, extractable later if scale ever demands it).

**Module structure** — every domain follows the same 4-file pattern:
```
src/app/modules/{domain}/
├── {domain}.schema.ts      ← Zod schemas (body/query/params)
├── {domain}.service.ts     ← Drizzle queries + business logic (no Express)
├── {domain}.controller.ts  ← thin Express handlers
├── {domain}.routes.ts      ← router + middleware wiring
└── {domain}.test.ts        ← Vitest + Supertest integration tests
```
Domains: `categories`, `brands`, `products`, `variants`, `images`, `cart`, `orders`, `courier`, `inventory`, `auth`, `chat`, `knowledge`, `admin`, `internal`.

**Request lifecycle**:
```
cors + helmet + pino-http → compression + express.json(1mb) → /health
    → router → rateLimiter → authenticate/optionalAuth → requireAdmin → validate(Zod)
    → controller → service (Drizzle) → Postgres
    → { success, data } or globalErrorHandler → typed JSON / Sentry (unexpected only)
```

**Auth** — `supabaseAdmin.auth.getClaims(token)` (JWKS-based, cached) verifies every request; not a static-secret `jsonwebtoken.verify()`, because Supabase signs with an asymmetric key (ES256) by default. Google/Facebook OAuth is fully backend-driven: the BE generates the PKCE pair server-side, carries `state` inside `redirect_to` (GoTrue owns the top-level `state` param), exchanges the code, and hands the FE a one-time exchange code via redirect. Logout calls `supabaseAdmin.auth.admin.signOut(token, 'global')`.

**Stock accounting** — one atomic guarded UPDATE at checkout (`quantity - N WHERE quantity - reserved_quantity >= N`), not a separate reserve-then-decrement step, so concurrent checkouts can't oversell. Cancel/status-change restores stock via a shared `restoreOrderStock` helper.

**Rate limiters** (`src/app/middlewares/rateLimiter.ts`):

| Limiter | Limit | Applied to |
|---|---|---|
| `publicLimiter` | 100/15min | Public GET endpoints |
| `authLimiter` | 20/15min | Login/register — brute-force protection |
| `cartLimiter` | 60/min | Cart writes (routine shopper actions) |
| `trackingLimiter` | 30/min | Public parcel tracking lookup |
| `strictLimiter` | 5/min | Sensitive admin writes |
| `uploadLimiter` | 20/min | File uploads |
| `chatLimiter` | 10/min | AI chat (expensive) |

**Observability** — pino (structured JSON logs), optional Sentry (`@sentry/node`, no-op unless `SENTRY_DSN` set, only unexpected 500s reported), deep `/api/health` (DB ping, 503 on failure), graceful shutdown (drains in-flight requests on SIGTERM/SIGINT, exits non-zero if DB unreachable at boot).

**AI Shopping Assistant** — full RAG pipeline: real Claude token streaming (`stream: true`), tool use over `search_knowledge` (semantic retrieval, pgvector `kb_chunks`, Voyage AI embeddings), `get_product_details` (live stock/price), and `get_my_orders` (auth-gated, hard-scoped server-side). Full detail: [`docs/09-ai-chatbot-rag.md`](docs/09-ai-chatbot-rag.md).

**Order confirmation email** — sent via Resend (`src/lib/email.ts`) from `orders@aurevofashion.store`, fire-and-forget right after order creation so a slow/failed send never blocks the order response. No-op unless `RESEND_API_KEY` is set, same convention as Sentry. Includes a link back to the live order-confirmation page and the invoice PDF as an attachment (degrades gracefully — a PDF-generation failure still sends the email, just without the attachment).

**Order invoice PDF** (`src/lib/invoice-pdf.ts`) — generated with `pdfkit`, deliberately not a headless-browser render (keeps the Railway image light). Regenerated fresh on every request (`GET /orders/by-number/:orderNumber/invoice`, same guest-token/owner/admin auth as the order-lookup endpoint) and on every confirmation email — never persisted to disk or storage, so it's always in sync with current order state (e.g. payment status). Bundles a Noto Sans Bengali font (static TTF, not the variable font — fontkit's glyph subsetting corrupts variable-font glyphs) since shipping names/addresses/notes can be Bangla script, and draws the Aurevo wordmark as vectors via `svg-to-pdfkit` rather than rasterizing a logo image.

**Courier tracking (Steadfast)** (`src/app/modules/courier/`) — admin-only consignment booking (`POST /courier/orders/:id/ship`, never automatic — booking commits real COD/delivery money and Steadfast has no cancel endpoint), a Bearer-token-guarded webhook (`POST /courier/webhook`) that auto-advances order status including stock restore on `cancelled` (idempotent — a webhook replay can't double-restore), a reconciliation poll (`POST /internal/courier/poll`, `x-internal-task-token` guarded, meant for a Railway cron) as a safety net for missed webhooks, and a public no-PII tracking lookup (`GET /courier/track/:trackingCode`).

Full detail: [`docs/02-system-design.md`](docs/02-system-design.md), [`docs/04-api-design.md`](docs/04-api-design.md), [`docs/05-implementation.md`](docs/05-implementation.md).

---

## 4. Frontend (Aurevo.UI)

React 19 + Vite + TanStack Query v5 (server state) + Tailwind CSS v4 + Radix UI (accessible headless components). Two surfaces: customer storefront and admin panel, same codebase.

**No Supabase SDK** — `@supabase/supabase-js` is not a dependency. `VITE_SUPABASE_URL` is optional, used only to build storage image-transform URLs.

**OAuth redirect flow** — `useSignInWithOAuth` calls `GET /auth/oauth/url` and does a full-page redirect; after the provider round-trip the BE redirects to `/?oauth_code=...`, which `OAuthSuccessLandingRedirect` catches, redeems via `GET /auth/oauth/session`, and stores tokens in `localStorage`.

**i18n** — i18next, English/বাংলা. English is always the default; Bangla is opt-in via a header toggle only — no timezone/locale auto-detection (deliberately removed after an earlier version defaulted Asia/Dhaka timezones to Bangla).

**Saved addresses & checkout autofill** — an untouched checkout form auto-fills from the user's default address; the Bangladesh-shaped address fields (`district`, `upazila`) map directly with no remapping.

**Order confirmation & invoice** — confirmation page shows a Download invoice link to `GET /orders/by-number/:orderNumber/invoice` (guest token in query when needed). Confirmation email (Resend) also attaches the same PDF.

**Courier tracking** — public `/tracking` page looks up `GET /courier/track/:trackingCode` (status + timeline, no PII). Admin order detail can book Steadfast (`POST /courier/orders/:id/ship`) and refresh status; never auto-books.

**Error boundary** — wraps the whole app, reports to Sentry (if configured) with component stack. **Sentry** (`@sentry/react`) — session replay at 10% of normal sessions, 100% of sessions that error.

**E2E tests** — Playwright, local-only (not in CI): guest checkout, logged-in checkout with saved address, cart math. Needs the full stack running; a global setup tops up stock before each run since specs place real orders.

Full detail: [`Aurevo.UI/CLAUDE.md`](../Aurevo.UI/CLAUDE.md).

---

## 5. Data layer

PostgreSQL 15 via Supabase. 23 tables, 11 enums, RLS on every table. The BE connects via the **service role key** (bypasses RLS, enforces access control in the application layer); nothing on the FE talks to Postgres directly.

Core entity shape:
```
auth.users (Supabase) ── profiles (1:1) ── user_addresses, cart_items, orders, reviews, wishlist
categories (self-ref tree) ── products ── product_variants ── cart_items, order_items, inventory
orders ── order_items, payments, courier_tracking_events
kb_chunks (RAG knowledge base) ── conversations ── messages
```

Notable design points:
- **`user_addresses`** matches the Bangladesh checkout shape exactly (`label, name, phone, address, district, upazila`) — reshaped in migration 038 from an original US-style schema. Rows are returned `ORDER BY created_at ASC` to keep card positions stable across `is_default` toggles.
- **`order_number`** is fixed-width (`ORD-` + 12 digits from `order_number_seq`, migration 042) so invoice PDF layout stays predictable.
- **Courier fields** on `orders` (`courier_provider`, `courier_consignment_id`, `courier_status`, …) plus `courier_tracking_events` timeline (migration 041).
- **`inventory.available_quantity`** is a Postgres *generated column* (`quantity - reserved_quantity`), never stored, always consistent.
- Every stock change writes an immutable `inventory_movements` audit row.

Full detail: [`docs/03-database-design.md`](docs/03-database-design.md).

---

## 6. CI/CD & environments

**Two-environment model** — local Docker Supabase for dev/test, one production Supabase. No separate staging project: CI's fresh Docker Postgres on every run already acts as an ephemeral staging environment for every PR. The gap this leaves: no free-tier backups on prod Supabase (upgrade to Pro once order volume makes data irreplaceable).

**Pipeline** (`.github/workflows/ci.yml`), same shape in both repos:
1. **test** — build, lint, full integration suite against a fresh local Supabase Docker stack
2. **migrate** — push to `main` only, only if `supabase/migrations/**` changed: link prod, `supabase db push` + lint
3. **deploy-functions** — deploy Supabase Edge Functions after test/migrate succeed

Branch protection requires `test` to pass on `main`; PRs target `dev`, merge via `gh pr merge --auto --squash`; `merge-back.yml` fast-forwards `dev` after every merge to `main`. Railway/Vercel deploy automatically once CI passes ("Wait for CI") — no manual `railway up`.

Full detail: [`docs/07-deployment.md`](docs/07-deployment.md).

---

## 7. Testing

- **BE**: Vitest + Supertest, real local Postgres — no mocked data layer (only the Anthropic SDK is mocked, to avoid burning API tokens in CI). Module integration suites cover commerce + courier + chat; lib unit tests cover email/invoice PDF. `fileParallelism: false` since test files share one DB instance.
- **FE**: Vitest + Testing Library + MSW (network-mocked), ~98 test files.
- **E2E**: Playwright, local-only, money-critical flows only.

Full detail: [`docs/06-testing.md`](docs/06-testing.md).

---

## 8. Codebase knowledge graph

Both repos have a `graphify-out/graph.json` (tree-sitter AST, no LLM cost) queryable via `graphify query "<question>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concept>"` — Claude Code and Cursor are both wired to prefer this over grepping raw files. Rebuild after code changes with `graphify update .` (AST-only, free).

---

## 9. Full documentation index

| Phase | Document |
|---|---|
| 1. Requirements | [docs/01-requirements.md](docs/01-requirements.md) |
| 2. System Design | [docs/02-system-design.md](docs/02-system-design.md) |
| 3. Database Design | [docs/03-database-design.md](docs/03-database-design.md) |
| 4. API Design | [docs/04-api-design.md](docs/04-api-design.md) |
| 5. Implementation | [docs/05-implementation.md](docs/05-implementation.md) |
| 6. Testing Strategy | [docs/06-testing.md](docs/06-testing.md) |
| 7. Deployment | [docs/07-deployment.md](docs/07-deployment.md) |
| 8. Load Testing Plan | [docs/08-load-testing-plan.md](docs/08-load-testing-plan.md) |
| 9. AI Chatbot (RAG) | [docs/09-ai-chatbot-rag.md](docs/09-ai-chatbot-rag.md) |
| BE conventions | [SKILLS.md](SKILLS.md) |
| BE agent guide | [CLAUDE.md](CLAUDE.md) |
| FE agent guide | [../Aurevo.UI/CLAUDE.md](../Aurevo.UI/CLAUDE.md) |
