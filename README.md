# Aurevo Fashion — Full-Stack E-Commerce Platform

Aurevo Fashion is a full-stack e-commerce portfolio project built to demonstrate production-grade software engineering across the entire SDLC — from database design to REST API to a React storefront with an AI shopping assistant.

---

## Live Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Aurevo.UI                            │
│         React 19 + Vite + TanStack Query + Tailwind         │
│              Storefront  ·  Admin Panel                     │
└──────────────────┬────────────────┬────────────────────────┘
                   │ REST API       │ Direct (Auth + Storage)
                   ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                       Aurevo.BE                             │
│          Express + TypeScript + Drizzle ORM                 │
│   Categories · Products · Cart · Orders · Inventory · Chat  │
└──────────────────────────────┬──────────────────────────────┘
                               │ PostgreSQL + Storage + Auth
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
- **Order Management** — transactional stock reservation, full order lifecycle (pending → shipped → delivered), admin status/payment/tracking/fulfillment controls
- **Inventory System** — per-variant stock tracking, audit log of every movement (`inventoryMovements`), low-stock alerts
- **Auth & Profiles** — Supabase JWT auth, user profiles, saved address book (billing/shipping)
- **AI Shopping Assistant** — SSE-streamed responses via Claude API with tool use (product search, detail lookup, category listing)
- **Admin Dashboard** — product/order/inventory management, bulk operations, analytics

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
cd Aurevo.UI
pnpm db:start          # starts Supabase Docker stack
pnpm db:reset          # applies migrations + seed data
```

### 2. Run the backend API
```bash
cd Aurevo.BE
cp .env.example .env.local   # fill in Supabase local keys
pnpm dev                     # http://localhost:3001
# Swagger docs: http://localhost:3001/api/docs
```

### 3. Run the frontend
```bash
cd Aurevo.UI
cp .env.example .env.local   # fill in Supabase local keys
pnpm dev                     # http://localhost:5173
```

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
