# Phase 7 — Deployment & DevOps

## Local Development Setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker Desktop (for Supabase local stack)

### Step 1 — Clone repos
```bash
git clone https://github.com/nurul287/Aurevo.BE
git clone https://github.com/nurul287/Aurevo.UI
```

### Step 2 — Start local Supabase (owned by Aurevo.BE)
```bash
cd Aurevo.BE
pnpm install
pnpm db:start        # pulls + starts Supabase Docker containers
pnpm db:reset        # applies all migrations + seed data
```

Local Supabase endpoints (from `supabase/config.toml`):
```
API URL:      http://127.0.0.1:54321
DB URL:       postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL:   http://127.0.0.1:54323
```

Keys and the JWT secret are printed by `supabase start` / `pnpm db:start`.

### Step 3 — Configure backend
```bash
cd Aurevo.BE
cp .env.example .env.local   # fill in values from db:start output
pnpm dev                     # http://localhost:5000
                             # Swagger: http://localhost:5000/api/docs
```

`.env.local` shape (see `.env.example` for the full list):
```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role_key from db:start>
SUPABASE_JWT_SECRET=<jwt_secret from db:start>
SUPABASE_PUBLISHABLE_KEY=<publishable key from db:start>
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
ANTHROPIC_API_KEY=<your key>
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
# SENTRY_DSN=   # leave unset locally — Sentry is a no-op without it
```

### Step 4 — Configure frontend
```bash
cd Aurevo.UI
cp .env.example .env.local
pnpm install
pnpm dev    # http://localhost:5173
```

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon_key from db:start>
VITE_API_URL=http://localhost:5000
```

---

## Supabase Storage Setup

The `product-images` bucket must be created before image uploads work. Run once after `db:start`:

```bash
curl -X POST "http://127.0.0.1:54321/storage/v1/bucket" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"id":"product-images","name":"product-images","public":true}'
```

---

## Running Tests

```bash
cd Aurevo.BE
# Supabase must be running (pnpm db:start)
pnpm test
```

Integration tests use the local Docker DB. `SENTRY_DSN` should stay unset so tests never send events.

---

## Production Deployment

### Infrastructure Map

```
Vercel (Aurevo.UI)
    │
    │  REST API calls
    ▼
Railway (Aurevo.BE)  ← Dockerfile / Nixpacks, healthcheck /api/health
    │
    │  postgres:// connection
    ▼
Supabase Cloud (Production DB + Auth + Storage)
```

### Aurevo.BE — Railway

`railway.json` configures deploy behavior:
- Start: `node dist/server.js`
- Health check: `GET /api/health` (deep — pings Postgres; 503 if DB is down)
- Restart on failure (max 3 retries)

Railway deploys via the native **"Wait for CI"** setting — it triggers only after all CI checks on `main` pass. No `RAILWAY_TOKEN` or `railway up` in the workflow.

Set these environment variables in the Railway dashboard:

```env
DATABASE_URL=<supabase prod connection string>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<prod service role key>
SUPABASE_JWT_SECRET=<prod JWT secret — Supabase → Settings → API>
SUPABASE_PUBLISHABLE_KEY=<prod publishable key>
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://aurevo.vercel.app
BACKEND_URL=https://<railway-app>.railway.app
ANTHROPIC_API_KEY=<prod key>
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
SENTRY_DSN=https://xxx@oXXXX.ingest.de.sentry.io/XXXX
```

`SENTRY_DSN` is optional in config validation but required in production for error tracking. Leave it unset in local/CI so nothing is sent.

Build: `pnpm build` (`tsc`). A multi-stage `Dockerfile` (Node 22 Alpine) is also available if Railway is switched to Docker builds.

### Aurevo.UI — Vercel

Connect the GitHub repo to Vercel. Set environment variables:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<prod anon key>
VITE_API_URL=https://<railway-app>.railway.app
```

---

## Environment Variable Security

| Variable | Local | Production | Notes |
|----------|-------|-----------|-------|
| `DATABASE_URL` | local Docker | Supabase prod | Never in git |
| `SUPABASE_SERVICE_ROLE_KEY` | local key | prod key | Full DB access — server only |
| `SUPABASE_JWT_SECRET` | local secret | prod secret | Used to verify all auth tokens |
| `ANTHROPIC_API_KEY` | real key | real key | Rate limited at account level |
| `SENTRY_DSN` | unset | set | No-op when unset; only unexpected 500s are captured |
| `VITE_*` | local | prod | Bundled into client JS — anon key only (public by design) |

**Critical rule:** `SYNC_PROD_DATABASE_URL` (if it exists in `.env.local`) must **never** be used in migrations or seeding scripts. All local DB work goes to the Docker instance only.

---

## CI/CD

Configured in `.github/workflows/ci.yml` and `.github/workflows/merge-back.yml`.

### Pipeline (`ci.yml`) — on PR / push to `main`

1. **test** — build, start local Supabase, apply migrations, run Vitest integration suite
2. **migrate** — on push to `main` only when `supabase/migrations/**` changed: link prod project, validate, `supabase db push`, lint schema
3. **deploy-functions** — after tests pass (migrate success or skipped): deploy `meta-conversions` edge function

Railway then deploys the new server because CI passed ("Wait for CI").

Required GitHub Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PROJECT_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_PUBLISHABLE_KEY`, `BACKEND_URL`, `ANTHROPIC_API_KEY`

### Merge-back (`merge-back.yml`) — on push to `main`

Squash-merges leave commits only on `main`, so `dev` drifts. This workflow checks out `dev`, merges `origin/main`, and pushes. On conflict the job fails and the merge must be done locally.

---

## Monitoring

| Concern | Tool | Status |
|---------|------|--------|
| Unexpected API errors (500s) | Sentry (`@sentry/node`) | Implemented — see `src/lib/sentry.ts` |
| Structured request/app logs | pino + pino-http (JSON in prod) | Implemented — Railway log drain |
| Deep health / uptime | `GET /api/health` (DB ping) | Implemented — Railway healthcheck |
| Database performance | Supabase Dashboard → Query Performance | Platform |
| AI chat costs | Anthropic Console → Usage | Platform |
| Frontend analytics | Vercel Analytics | UI repo |

**Sentry behavior:** initialized before the Express app loads when `SENTRY_DSN` is set. Only unhandled errors that reach the final 500 branch of `globalErrorHandler` are captured — `AppError`, Zod validation, and Postgres unique violations (`23505` → 409) are not sent.
