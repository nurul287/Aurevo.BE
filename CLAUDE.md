# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See [`README.md`](README.md) / [`docs/`](docs/) for full SDLC documentation, and [`SKILLS.md`](SKILLS.md) for BE conventions/patterns reference.

## Workspace-wide decisions

These apply across both Aurevo repos (this one and [`../Aurevo.UI`](../Aurevo.UI/CLAUDE.md)):

- **Two-environment model**: local Docker Supabase for dev/test, one production Supabase — no separate staging project (see `docs/01-requirements.md` decisions log).
- **CI/CD**: runs on every push/PR to `main` in both repos (test → migrate → deploy-functions). PRs target `dev`, merge to `main` via `gh pr merge --auto --squash`, and a `merge-back.yml` workflow fast-forwards `dev` afterward.
- **No Supabase SDK on the frontend** — all auth (including Google/Facebook OAuth) goes through this repo.
- **i18n**: English/বাংলা via i18next, English default, opt-in via a header toggle.
- **Observability**: structured pino logs, optional Sentry (FE + BE, no-op unless configured), deep `/api/health` check, graceful shutdown.

## Development workflow (always apply)

1. **Build** — `pnpm build` (runs `tsc`); fix all type errors.
2. **Test** — `pnpm test` against local Supabase (see Commands below). Update the sibling `*.test.ts` whenever you change a module file.
3. **Micro-commit** — small, one-concern commits with conventional messages. Never bundle unrelated changes.
4. **Never deploy until told** — push only when asked. CI applies migrations and deploys automatically on merge to `main`; no manual `railway up`.

## Commands

```bash
pnpm db:start       # start local Supabase Docker stack
pnpm db:reset       # apply all migrations + seed data
pnpm db:status      # verify: shows local URLs + keys
pnpm dev            # tsx watch, localhost:5000
pnpm build          # tsc
pnpm test           # vitest run — real local Postgres, no mocked data layer
pnpm test:watch
```

Tests run with `fileParallelism: false` — test files share one local Postgres instance, so parallel runs cause FK violations when one file inserts while another deletes.

## Architecture

**Auth** — `supabaseAdmin.auth.getClaims(token)` (JWKS-based, cached) verifies every request in the `authenticate` middleware — not a static-secret `jsonwebtoken.verify()`, because Supabase signs with an asymmetric key (ES256) by default now. Google/Facebook OAuth is fully backend-driven:
- `GET /auth/oauth/url` generates a PKCE pair server-side, stores the verifier keyed by a `state` value carried **inside** `redirect_to` — not as the top-level `state` param, since GoTrue owns that for its own provider handshake. Sending our own top-level `state` breaks every callback with "OAuth state parameter is invalid."
- `GET /auth/oauth/callback` exchanges the code, stores tokens under a one-time exchange code, redirects to `{FRONTEND_URL}/?oauth_code=...`. Every failure path must `res.redirect` to the FE error page — it's a browser navigation, not an API call, so a JSON error body strands the user.
- `GET /auth/oauth/session` redeems the one-time code. In-memory `Map`s with TTL sweep every 5 min; refuses to persist across replicas (fine at 1 replica, would need Redis to scale out).
- Logout calls `supabaseAdmin.auth.admin.signOut(token, 'global')` — this is why OAuth had to move server-side at all: the FE can't reliably hold onto a Supabase session to kill it.

**Stock accounting** — order creation does **one** atomic operation: `UPDATE inventory SET quantity = quantity - N WHERE quantity - reserved_quantity >= N`, guarded so concurrent checkouts can't oversell the same units. There is no separate "reserve then decrement" step — an earlier version incremented `reserved_quantity` *and* decremented `quantity` for the same sale, which double-counted every order in availability math (`quantity - reserved_quantity`) until stock silently hit zero. `reserved_quantity` stays at 0 by design now; cancel/admin-status-change restore stock via the shared `restoreOrderStock` helper (both paths must stay identical — that was a duplicated-logic bug once).

**Saved addresses** — `user_addresses` matches the Bangladesh checkout shape exactly (`label, name, phone, address, district, upazila`), not the original US-style schema (migration 038 reshaped it). `getAddresses` orders by `created_at ASC` — without an explicit order, Postgres can return rows in a different physical order after an `UPDATE` (e.g. toggling `is_default`), which visibly swapped card positions in the FE grid.

**Rate limiters** (`src/app/middlewares/rateLimiter.ts`) — `authLimiter` (20/15min) is for login/register brute-force protection only. `POST /cart/items` has its own `cartLimiter` (60/min) — routine "add to cart" clicks are not a brute-force target, and sharing `authLimiter` meant a shopper adding a few items back-to-back (or a repeated local test run) could trip a login-abuse limiter.

**Observability** — `src/lib/logger.ts` (pino, JSON in prod / pretty in dev / silent in tests) replaced morgan. `src/lib/sentry.ts` initializes `@sentry/node` only if `SENTRY_DSN` is set; the global error handler only reports genuinely unexpected errors that reach the 500 branch — business errors (404, validation, insufficient stock) never hit Sentry. `/api/health` pings the DB and returns 503 + `db: down` on failure — point Railway's healthcheck path here. `server.ts` exits non-zero if the DB is unreachable at boot (fail fast) and drains in-flight requests on SIGTERM/SIGINT before closing the pool.

**Products visibility** — `GET /products` (and by-id/by-slug) force `isActive: true` for non-admin callers regardless of query params; only requests with an admin JWT (`optionalAuth` + role check) can see inactive/draft products.

**Order confirmation email** — `src/lib/email.ts` mirrors `sentry.ts`'s no-op-if-unconfigured pattern: sends via Gmail SMTP (`smtp.gmail.com`, `nodemailer`) only if `GMAIL_APP_PASSWORD` is set, otherwise logs and returns. Triggered fire-and-forget in `orders.controller.ts` right after `createOrder` resolves — the `.catch()` there must never be removed, since a slow/failed email must not fail the order response. `GMAIL_APP_PASSWORD` is a Google **App Password** (requires 2-Step Verification on the account), not the account's login password.

## Environment

Config validated by Zod in `src/app/config/index.ts` — invalid/missing env vars crash on boot with a clear error, not a runtime surprise. See `.env.example` for every var with placeholders. `SENTRY_DSN` is optional (Sentry no-ops without it).

**Local DB only**: `DATABASE_URL` in dev must always point at `127.0.0.1:54322` (local Supabase Docker). `SYNC_PROD_DATABASE_URL` (if present in Aurevo.UI's `.env.local`) is never used in migrations or seed scripts.

## Key gotchas

- The dev server (`tsx watch`) doesn't always pick up an edit reliably — if behavior doesn't match a just-saved change, kill whatever process holds port 5000 and restart rather than assuming the fix is wrong.
- `pnpm test` truncates most tables between files, **including `user_addresses`** — running the full suite against your local dev DB while manually testing addresses in the browser will wipe your test data.
- CI's `test` job is the only required check on `main`; the `migrate` and `deploy-functions` stages only run on push to `main` (never on PRs) and only touch prod after `test` passes.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
