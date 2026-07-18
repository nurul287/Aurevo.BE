# Aurevo — Load Testing (k6, full user journey, against production)

> **Status: planned, not started.** This is a design doc, not yet implemented. Nothing in this
> document has been built — no schema changes, no middleware, no k6 scripts exist yet. Pull this
> back into an active plan when ready to build it.

## Context

"Load testing" is an open Backlog item (see `01-requirements.md`) with no tooling or plan decided yet. The intent is to load-test the full user journey (browse → cart → checkout, plus auth traffic) against **production** (Railway BE + prod Supabase) — there is no staging environment (`01-requirements.md`'s Decisions Log confirms this was a deliberate cost tradeoff).

A codebase audit surfaced hard constraints this plan must work around:

- **No money risk**: no live payment gateway exists yet (`orders.schema.ts` — `paymentMethod` is inert stored text, `01-requirements.md` confirms gateway integration is deferred). A checkout load test cannot trigger a real charge.
- **Real risk — inventory & order pollution**: every order creation permanently decrements real stock (`orders.service.ts:236-262`) and inserts a permanent, admin-visible order row (`orders.service.ts:198-221`). No synthetic/test-order flag exists anywhere in the schema.
- **Real risk — real user rows**: `POST /auth/register` creates real Supabase Auth users (`auth.service.ts:49-74`) with zero teardown mechanism. The e2e suite's safety net (`Aurevo.UI/e2e/global-setup.ts`) explicitly refuses to run against anything non-local — it does not generalize to prod.
- **Rate limiters will fail the test before anything else does**: `authLimiter` (20 req/15min), `chatLimiter` (10/min), `cartLimiter` (60/min) are IP-keyed (`rateLimiter.ts`, `app.ts:17` trust proxy) and will throttle sustained k6 traffic almost immediately.
- **CORS is not a safety boundary** — it's a browser-only origin check; k6 makes direct HTTP calls and is unaffected by it.

Given this, the plan adds the minimum safety infrastructure needed to make a production run survivable and cleanly reversible, rather than pretending prod behaves like a disposable test environment.

### What professional teams actually do differently

The first pass of this plan relied on fragile heuristics (SKU prefix, email domain) to identify synthetic traffic after the fact. Real production load-testing practice — as done at companies without a full staging replica (a common constraint, not unique to Aurevo) — goes further in a few ways this revision adopts:

1. **First-class synthetic tagging, not string-matching.** A dedicated `X-Load-Test-Run-Id` header, generated once per test run, flows through the whole request lifecycle and gets stamped onto DB rows via a nullable `loadTestRunId` column (orders) rather than inferred from email/SKU. This is exact, not heuristic — cleanup and future analytics filtering both key off it directly. Email/SKU tagging is kept as a *secondary* human-readable signal, not the primary mechanism.
2. **Synthetic traffic must not leak into side systems.** Order confirmation emails (including invoice PDF generation/attachment), Meta Pixel/CAPI conversion events, and Sentry breadcrumbs would all fire for a real checkout — a load test blasting these means: (a) marketing/analytics dashboards get polluted with fake conversions, permanently skewing historical reporting long after cleanup deletes the DB rows, and (b) Resend sends transactional email to `@loadtest.invalid` addresses, which will hard-bounce and can hurt sending-domain reputation. The request-scoped `loadTestRunId`/header must gate all of these side effects off, not just the DB write path.
3. **Test taxonomy, not one generic "load test."** Industry practice distinguishes: **smoke test** (a handful of VUs, seconds, sanity-check the script), **load test** (sustained traffic at expected real peak), **stress test** (push past capacity to find the breaking point), **soak/endurance test** (extended duration to catch connection/memory leaks). Running a stress or soak test against shared production infra is materially riskier than a load test at expected-peak levels — this plan runs smoke → load only against prod, and explicitly excludes stress/soak from the production target (those belong against a local or ephemeral environment sized like prod, or scheduled as a separate, more heavily-guarded exercise later).
4. **Capacity ceiling must be known before ramping.** Postgres (Supabase) has a hard `max_connections` limit and Railway's BE instance has its own concurrency ceiling — these will be hit independently of the app's own rate limiters. Check both before choosing a target VU count so the test's ramp target is "expected peak," not "whatever k6 can throw."
5. **The kill-switch watches real users, not just the synthetic run.** An error-rate spike in k6's own output only proves the synthetic traffic is failing — it doesn't tell you whether real customers are also degraded. The abort condition must include watching Sentry/Railway metrics filtered to *non-synthetic* traffic during the run.
6. **Idempotency under retry.** k6 (and real browsers) retry on timeout. If `POST /orders` isn't idempotent, a slow response under load can produce duplicate orders/duplicate stock decrements that have nothing to do with the load-test tagging — this must be verified before trusting any of the run's data.
7. **Change management.** Professional practice treats a production load test like a deploy: a scheduled window communicated in advance, an owner watching dashboards live, a documented rollback (Railway redeploy to the prior version if the BE itself misbehaves under load, independent of the data cleanup script), and — since there's no PITR confirmed on the current Supabase plan (per the Decisions Log) — an explicit acknowledgment that a bad outcome here has no database undo button beyond this plan's own cleanup script.
8. **Cost guardrails.** Railway and Supabase usage-based billing means a load test is also a spend event — confirm any autoscaling/usage alerts are in place before ramping, not after.

## Design

**Tool**: k6 (Grafana) — TS/JS scripting fits the existing stack, scripts can live in the repo like the Playwright e2e specs, scales from a laptop run to CI to distributed cloud runs later.

### 1. Rate-limiter bypass (small BE change, no-op by default)

Add an opt-in bypass to `Aurevo.BE/src/app/middlewares/rateLimiter.ts`, following the exact "optional, no-op unless configured" convention already used for Sentry/email (`src/lib/sentry.ts`):
- New config: `LOAD_TEST_BYPASS_TOKEN: z.string().min(1).optional()` in `src/app/config/index.ts`.
- In each limiter, skip rate-limiting only if `config.LOAD_TEST_BYPASS_TOKEN` is set **and** the request's `x-load-test-token` header matches it exactly.
- Unset in production normally — the user sets this Railway env var only for the scheduled test window, then unsets it immediately after. No permanent security relaxation.

### 2. Synthetic-traffic tagging: `X-Load-Test-Run-Id` header → `loadTestRunId` column

- New small migration: nullable `load_test_run_id text` column on `orders` (and optionally `payments` if/when a gateway exists later).
- New lightweight middleware in `Aurevo.BE/src/app.ts` (or a dedicated `loadTest.ts` middleware): if the `x-load-test-run-id` header is present **and** `LOAD_TEST_BYPASS_TOKEN` is configured and the accompanying bypass token header matches, attach `req.loadTestRunId` to the request; otherwise ignore the header entirely (so it can never be spoofed to tag real orders as synthetic, or vice versa, without the shared secret).
- `orders.service.ts`'s `createOrder` accepts and persists `loadTestRunId` when present.
- Every side effect gated on the same signal: order-confirmation email send, Meta Pixel/CAPI conversion events, and any marketing-facing hooks all check `if (loadTestRunId) return;` (or log-and-skip) before firing. Sentry gets `loadTestRunId` added as request-scoped context instead of being suppressed, so synthetic-traffic errors are still visible but clearly filterable, not confused with real incidents.
- Auth users created during the run are additionally tagged via Supabase's `user_metadata` (`{ loadTestRunId }`) at signup, giving an exact match for cleanup instead of relying only on the email pattern.

### 3. Seed a dedicated load-test product (manual, before each run)

Create one product + variant in production specifically for load testing, with a recognizable SKU prefix (e.g. `LOADTEST-`) and a large stock quantity. All checkout-scenario traffic targets this variant only — never a real catalog item. This is a manual admin-dashboard step, done immediately before the test and re-topped-up if a rerun is needed. (SKU prefix + `@loadtest.invalid` email remain as a secondary, human-readable safety net alongside the exact `loadTestRunId` tagging above — belt and suspenders, not a replacement.)

### 4. k6 scripts (new `Aurevo.BE/loadtest/` directory)

- `loadtest/scenarios/browse.js` — GET `/products` (list) and `/products/:id` (detail), read-heavy path.
- `loadtest/scenarios/auth.js` — register + login using a clearly-tagged, filterable email pattern: `loadtest-<vu>-<timestamp>@loadtest.invalid`.
- `loadtest/scenarios/checkout.js` — full journey: browse → add the seeded load-test variant to cart → guest checkout. Every request in every scenario sends `x-load-test-run-id` (a run ID generated once at test start) and the bypass token header.
- `loadtest/config.js` — shared options: three named profiles — `smoke` (a few VUs, ~30s, sanity-check only), `load` (ramping-VUs stages up to the pre-checked expected-peak ceiling), and `stress`/`soak` (present in the script for later use against a local/ephemeral environment, but the README explicitly says not to point these at production). Thresholds on p95 latency and error rate abort the run automatically if breached.
- `loadtest/idempotency-check.js` (or a short section in checkout.js) — a small dedicated scenario that fires the same checkout request twice with an artificially slow/held connection to confirm the API doesn't double-create an order on client retry, run once during the local dry-run pass before ever trusting prod results.
- `loadtest/README.md` — safety checklist (capacity ceiling checked? seed product done? bypass token set? off-hours window communicated? cleanup script ready? rollback plan understood?), required env vars (`BASE_URL`, `LOAD_TEST_BYPASS_TOKEN`, `LOAD_TEST_RUN_ID`), and how to run each scenario/profile individually or combined.

### 5. Cleanup script (new `Aurevo.BE/loadtest/cleanup.ts`)

Run immediately after every prod load test, keyed primarily by the exact `loadTestRunId` (falling back to the SKU/email heuristic only to catch anything that predates the tagging or slipped through):
- Finds orders where `load_test_run_id` matches the run, or (fallback) line items reference the `LOADTEST-` SKU / customer email matches `%@loadtest.invalid`.
- Cancels those orders via the existing `cancelOrder`/status-update path so `restoreOrderStock` (`orders.service.ts:421-444`) runs and real inventory arithmetic is undone. (Order rows themselves will remain — `deleteOrder` is blocked if reviews/inventory movements reference it — so the script hard-deletes only where safe, and reports what it could/couldn't remove.)
- Deletes matching Supabase Auth users via `supabaseAdmin.auth.admin.listUsers` + `deleteUser`, filtered by `user_metadata.loadTestRunId` (primary) or the `@loadtest.invalid` email pattern (fallback).
- Prints a summary (orders cancelled/deleted, users deleted, any it skipped and why) so the user can manually verify the admin dashboard afterward.

### 6. Execution runbook

1. Confirm capacity ceiling first: check Supabase's plan `max_connections` and Railway's BE instance concurrency/instance count; pick a `load` profile VU target that reflects expected real peak, not an arbitrary number.
2. Dry-run every scenario (including the idempotency check) against the **local** stack first (reusing the existing local Supabase + BE + FE setup already used for Playwright e2e) — confirms the scripts work and the API is idempotent before ever pointing at prod.
3. Schedule an off-hours window, communicated in advance; confirm Railway/Supabase usage alerts are active (cost guardrail); set `LOAD_TEST_BYPASS_TOKEN` in Railway; seed the dedicated load-test product.
4. Run the `smoke` profile against prod first (a handful of VUs, ~30s) — confirm the run-ID tagging, side-effect suppression, and cleanup script all work end-to-end on a tiny blast radius before scaling up.
5. Run the `load` profile with gradual ramp, watching Railway logs, Supabase dashboard, Sentry (filtered to *exclude* `loadTestRunId` context, to watch real-user health), and the `/health` endpoint in real time; be ready to Ctrl-C (kill switch) if real-user error rates/latency spike, not just the synthetic run's own numbers.
6. Do **not** run `stress`/`soak` profiles against production as part of this plan — they're scoped to a future, separately-approved exercise against a prod-sized non-production environment.
7. Immediately after: unset `LOAD_TEST_BYPASS_TOKEN`, run `cleanup.ts`, manually spot-check the admin dashboard and marketing/analytics dashboards that only load-test artifacts were touched and nothing bled into real reporting.

## Files to touch (when this is picked back up)

- `Aurevo.BE/src/db/schema.ts` + a new numbered migration — nullable `load_test_run_id` column on `orders`
- `Aurevo.BE/src/app/middlewares/rateLimiter.ts` — opt-in bypass check
- `Aurevo.BE/src/app/middlewares/` — new small middleware (or extend an existing one) that reads `x-load-test-run-id` + the bypass token header and attaches `req.loadTestRunId`
- `Aurevo.BE/src/app/config/index.ts` — `LOAD_TEST_BYPASS_TOKEN` optional env var
- `Aurevo.BE/src/app/modules/orders/orders.service.ts` — accept/persist `loadTestRunId`; gate order-confirmation email send on it
- `Aurevo.BE/src/app/modules/auth/auth.service.ts` — stamp `user_metadata.loadTestRunId` on synthetic signups
- Meta Pixel/CAPI event-firing code (wherever conversion events are sent) — gate on `loadTestRunId`
- `Aurevo.BE/.env.example` — document the new var, same commented-out style as `SENTRY_DSN`
- `Aurevo.BE/loadtest/` (new) — `scenarios/browse.js`, `scenarios/auth.js`, `scenarios/checkout.js`, `config.js` (smoke/load/stress/soak profiles), `cleanup.ts`, `README.md`
- `01-requirements.md` — move "Load testing" from Backlog to a Decisions Log entry once done, noting the k6 + safeguards approach, the test taxonomy actually exercised against prod (smoke + load only), and that prod is the only environment (no staging)

## Verification (when this is picked back up)

- `pnpm exec tsc --noEmit` clean in Aurevo.BE after the schema/middleware/service changes; run the new migration locally (`pnpm db:reset` or equivalent) and confirm it applies cleanly.
- Confirm the rate-limit bypass is truly no-op when `LOAD_TEST_BYPASS_TOKEN` is unset — hit a rate-limited route in excess locally without the header and confirm it still 429s normally.
- Confirm the `x-load-test-run-id` header is inert without a matching bypass token — sending it alone must not tag or otherwise affect a normal request.
- Run all k6 scenarios (including the idempotency check) against the **local** stack end-to-end before any prod run; confirm a retried/duplicated checkout request does not create two orders.
- Confirm order-confirmation email and Meta Pixel/CAPI events are suppressed for tagged synthetic requests, and still fire normally for untagged (real) requests.
- Against prod: run `smoke` first, verify `cleanup.ts` finds and removes everything it created (by exact `loadTestRunId`, with the SKU/email fallback also checked), before proceeding to `load`.
- After the full run: confirm `cleanup.ts` output is clean, spot-check the admin dashboard and any analytics/marketing dashboards, confirm no non-loadtest inventory, orders, or reported conversions were affected.
- Commit per concern (micro-commits, `Authored-By: nurul287 <nurulalamarif2@gmail.com>`), no push until asked; never run the prod-scale (`load`) test itself, and never run `stress`/`soak` against prod at all, without the user explicitly scheduling/confirming the window.
