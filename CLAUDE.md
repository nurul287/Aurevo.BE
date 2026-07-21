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
2. **Test — mandatory before every push, not just typecheck/build.** Run `pnpm test` against local Supabase (see Commands below) and confirm it actually passes; don't push on typecheck/build passing alone. Update the sibling `*.test.ts` whenever you change a module file. **If you add a new required (non-optional) env var to `src/app/config/index.ts`, every test file fails config validation until it's also added to `.github/workflows/ci.yml`'s `test` job env block** — update both in the same change, and re-run `pnpm test` locally to confirm before pushing, since a passing local build/typecheck does not catch this.
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

**Order confirmation email** — `src/lib/email.ts` mirrors `sentry.ts`'s no-op-if-unconfigured pattern: sends via Resend only if `RESEND_API_KEY` is set, otherwise logs and returns. Triggered fire-and-forget in `orders.controller.ts` right after `createOrder` resolves — the `.catch()` there must never be removed, since a slow/failed email must not fail the order response. Sends from `orders@aurevofashion.store` (`EMAIL_FROM`), which requires the domain to stay verified in Resend (SPF/DKIM DNS records on Vercel). Attaches a freshly generated invoice PDF; if PDF generation fails, the email still sends without the attachment. An earlier version used Gmail SMTP before the team owned a real domain — switched to Resend once `aurevofashion.store` was purchased and verified, since Gmail's 500/day cap and generic sender address were only ever a stopgap.

**Order invoice PDF** — `src/lib/invoice-pdf.ts` (pdfkit, no headless browser). Regenerated on every confirmation email and every `GET /orders/by-number/:orderNumber/invoice` (same guest-token / owner / admin access as order lookup). Never persisted. Bundles Noto Sans Bengali static TTFs under `assets/fonts/` (variable font breaks fontkit subsetting) and the Aurevo wordmark SVG under `assets/logo/`. Order numbers are fixed-width via `order_number_seq` (`ORD-` + 12 digits) so the PDF layout stays stable.

**Courier tracking (Steadfast)** — `src/app/modules/courier/` + `src/lib/steadfast.ts`. Admin-only explicit booking (`POST /courier/orders/:id/ship`) — never automatic (commits real COD/delivery money; Steadfast has no cancel endpoint). Bearer-token webhook (`POST /courier/webhook`) auto-advances order status including stock restore on `cancelled` (idempotent). Reconciliation poll (`POST /internal/courier/poll`) for missed webhooks. Public no-PII lookup (`GET /courier/track/:trackingCode`, `trackingLimiter`). Optional env: `COURIER_API_KEY`, `COURIER_SECRET_KEY`, `COURIER_WEBHOOK_TOKEN` (default base URL Packzy).

**AI chat / RAG** (`src/app/modules/chat/`, `src/app/modules/knowledge/`) — full architecture, diagram, eval results, and rollout checklist in [`docs/09-ai-chatbot-rag.md`](docs/09-ai-chatbot-rag.md). Customer-facing only, no admin mode. `knowledge.service.ts` embeds product/policy/FAQ text via Voyage AI (`src/lib/voyage.ts`) into `kb_chunks`. `chat.service.ts` streams real Anthropic tokens (`stream: true`, not simulated) through a tool-use loop with three tools: `search_knowledge` (`retrieve()`, `topK = 3`, optional `sourceType` filter), `get_product_details` (live stock/price by slug, resolves multiple slugs concurrently), and `get_my_orders` — **only ever added to the tool list when the request is authenticated**, and its query is hard-scoped to `req.user.id` server-side regardless of tool input, so neither a guest session nor a prompt-injection attempt has any path to another customer's orders.
- **Retrieval defaults to `hybrid+rerank`** (not plain vector): pgvector cosine + Postgres FTS (generated `fts` tsvector, migration 043) fused via Reciprocal Rank Fusion, then reranked by Voyage `rerank-2.5-lite` — best-effort, falls back to fusion order on any failure so a rerank outage degrades to hybrid, never a hard error. `opts.mode` on `retrieve()` also allows `vector`/`hybrid`. This default was **eval-gated** (measured strictly ≥ vector, MRR 1.000) — don't change the mode or the RRF/rerank logic without re-running `pnpm eval:retrieval` across all three modes. Optional env `VOYAGE_RERANK_MODEL` (default `rerank-2.5-lite`).
- **Eval harnesses** are manual scripts (real API calls + local DB, never CI): `pnpm eval:retrieval` (precision/recall/hit-rate/MRR vs `content/eval/retrieval-golden.json`) and `pnpm eval:answers` (LLM-as-judge over the full `streamChat` answer vs `content/eval/answer-golden.json`). Their deterministic scoring cores are unit-tested (`knowledge.test.ts`, `answer-eval.ts`/`answer-eval.test.ts`); the retrieval eval is saturated (MRR 1.000) while the answer eval discriminates (pass rate ~0.53).
- **Monitoring**: `chat_metrics` (migration 044) captures per-request latency, tokens (from the Anthropic stream `usage`), tool-call counts, and retrieval stats — written fire-and-forget in `chat.service.ts` (never fails/delays the chat). `GET /admin/ai-metrics?days=N` (admin-gated) aggregates it for the Aurevo.UI `/admin/ai` dashboard; `chat.metrics.ts`'s `deleteOldChatMetrics` runs a 90-day retention inside `POST /internal/chat/cleanup`.
- **Auto-embed, not CDC**: `products.service.ts`'s create/update/delete paths fire-and-forget a single-product re-embed after the DB write (`.catch()` swallows failures, same pattern as the order-confirmation email). This keeps `kb_chunks` fresh without event infra, but only scales to the catalog's current small size — full CDC/delta indexing is a Backlog item if that changes. `pnpm ingest:knowledge` does a full backfill (products + `content/policies/*.md`) for initial setup or bulk edits.
- **Retention**: conversations persist per `sessionId` — 90 days for logged-in users, 48 hours for guests — cleaned up by `POST /internal/chat/cleanup` (shared-secret `x-internal-task-token` header against `INTERNAL_TASK_TOKEN`, no JWT auth — machine-to-machine only), meant to be triggered daily by a Railway cron. `messages` cascade-delete with their `conversations` row.
- **History management**: a sliding window of the last ~6 turns plus a rolling `intent_summary` (refreshed every 3 user turns via a cheap Haiku call) is sent to Claude instead of the full transcript, so a long conversation's token cost stays roughly flat.
- **Product card matching** (`chat.service.ts`): cards are matched against the assistant's own reply text, not shown for every raw retrieval result — and the match can't be a simple substring check, since the catalog has messy titles (`"...Shoes1.1"`, `"...{shoe1:1}"`) that the model doesn't always reproduce byte-for-byte on a reformatted reply. Uses a whitespace-normalized exact match first (keeps suffixes intact, since two real catalog products can differ *only* by such a suffix), then a suffix-stripped fuzzy fallback for whatever wasn't caught — with a guard so the fuzzy tier can't re-add a near-duplicate of something already matched exactly. See the doc above for the full reasoning; this took three iterations to get right and isn't obvious from a quick read of the code.

## Environment

Config validated by Zod in `src/app/config/index.ts` — invalid/missing env vars crash on boot with a clear error, not a runtime surprise. See `.env.example` for every var with placeholders. `SENTRY_DSN` and `RESEND_API_KEY` are optional (no-op without them). Courier keys (`COURIER_API_KEY`, `COURIER_SECRET_KEY`, `COURIER_WEBHOOK_TOKEN`) are optional — booking refuses with a business error when unset. `VOYAGE_API_KEY` and `INTERNAL_TASK_TOKEN` are **required** (not optional) — the app won't boot without them, same as `ANTHROPIC_API_KEY`.

**Local DB only**: `DATABASE_URL` in dev must always point at `127.0.0.1:54322` (local Supabase Docker). `SYNC_PROD_DATABASE_URL` (if present in Aurevo.UI's `.env.local`) is never used in migrations or seed scripts.

## Key gotchas

- The dev server (`tsx watch`) doesn't always pick up an edit reliably — if behavior doesn't match a just-saved change, kill whatever process holds port 5000 and restart rather than assuming the fix is wrong.
- `pnpm test` truncates most tables between files, **including `user_addresses`** — running the full suite against your local dev DB while manually testing addresses in the browser will wipe your test data. `src/test/global-teardown.ts` self-heals the two things this bit us on repeatedly: it reseeds the catalog from `supabase/seed.sql` and re-grants the `aurevo-test-admin@example.com` fixture's `public.profiles` row (its `auth.users` row/role was already self-healing via `ensureAuthUser` in `src/test/helpers.ts`) after every `pnpm test` run. If a browser session hits a `profiles`-FK error (e.g. `cart_items.user_id_fkey`) right after a test run, it's from mid-run truncation, not a stale fix — it clears itself once the run's teardown finishes.
- CI's `test` job is the only required check on `main`; the `migrate` and `deploy-functions` stages only run on push to `main` (never on PRs) and only touch prod after `test` passes.
- The `migrate` job's migration-changed detection (`dorny/paths-filter` in `.github/workflows/ci.yml`) must pin `base`/`ref` to `github.event.before`/`github.sha` explicitly. Without it, a merge-commit push falls back to comparing the live `dev`/`main` branch tips — which races `merge-back.yml` (it fast-forwards `dev` to `main` within seconds of the same push) and can silently report "0 changed files" even when the merge genuinely touched `supabase/migrations/**`. This is exactly what kept migration 039 out of production for two merges with CI reporting success the whole time — no failure, just a silently skipped stage. See `supabase/migrations/039_rag_chat_knowledge_base.sql`'s header comment for the full incident.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- **Mandatory**: after any FE or BE code change (this repo or the sibling `Aurevo.UI`) — new/edited/deleted files, not docs-only edits — run `graphify update .` in the changed repo before ending the task, so the graph never drifts stale. AST-only, no API cost, so there's no reason to skip it.
