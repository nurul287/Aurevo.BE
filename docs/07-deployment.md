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

### Step 2 — Start local Supabase
```bash
cd Aurevo.UI
pnpm install
pnpm db:start        # pulls + starts Supabase Docker containers
pnpm db:reset        # applies all migrations + seed data
pnpm db:status       # verify: shows local URLs + keys
```

Local Supabase endpoints:
```
API URL:      http://127.0.0.1:55321
DB URL:       postgresql://postgres:postgres@127.0.0.1:55322/postgres
Studio URL:   http://127.0.0.1:54323
JWT Secret:   super-secret-jwt-token-with-at-least-32-characters-long
```

### Step 3 — Configure backend
```bash
cd Aurevo.BE
pnpm install
```

Create `.env.local`:
```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_SERVICE_ROLE_KEY=<service_role_key from db:status>
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=<your key>
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

```bash
pnpm dev    # http://localhost:3001
            # Swagger: http://localhost:3001/api/docs
```

### Step 4 — Configure frontend
```bash
cd Aurevo.UI
```

Create `.env.local`:
```env
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_ANON_KEY=<anon_key from db:status>
VITE_API_URL=http://localhost:3001
```

```bash
pnpm dev    # http://localhost:5173
```

---

## Supabase Storage Setup

The `product-images` bucket must be created before image uploads work. Run once after `db:start`:

```bash
curl -X POST "http://127.0.0.1:55321/storage/v1/bucket" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"id":"product-images","name":"product-images","public":true}'
```

---

## Running Tests

```bash
cd Aurevo.BE
# Supabase must be running (pnpm db:start in Aurevo.UI)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres pnpm test
```

---

## Production Deployment

### Infrastructure Map

```
Vercel (Aurevo.UI)
    │
    │  REST API calls
    ▼
Railway / Render (Aurevo.BE)
    │
    │  postgres:// connection
    ▼
Supabase Cloud (Production DB + Auth + Storage)
```

### Aurevo.BE — Railway (recommended)

Railway auto-detects Node.js apps. Set these environment variables in the Railway dashboard:

```env
DATABASE_URL=<supabase prod connection string>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<prod service role key>
SUPABASE_JWT_SECRET=<prod JWT secret — from Supabase dashboard → Settings → API>
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://aurevo.vercel.app
ANTHROPIC_API_KEY=<prod key>
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

Build command: `pnpm build` → `tsc`
Start command: `node dist/server.js`

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
| `VITE_*` | local | prod | Bundled into client JS — anon key only (public by design) |

**Critical rule:** `SYNC_PROD_DATABASE_URL` (if it exists in `.env.local` of Aurevo.UI) must **never** be used in migrations or seeding scripts. All local DB work goes to the Docker instance only.

---

## CI/CD (Recommended Setup)

Not yet configured — proposed GitHub Actions pipeline:

```yaml
# .github/workflows/test.yml
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      supabase:
        image: supabase/postgres:15
        # ... local DB for CI

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
```

---

## Monitoring (Production Recommendations)

| Concern | Tool |
|---------|------|
| API errors + latency | Sentry (Express SDK) |
| Database performance | Supabase Dashboard → Query Performance |
| Uptime | Railway built-in health checks |
| AI chat costs | Anthropic Console → Usage Dashboard |
| Frontend analytics | Vercel Analytics (already installed in UI) |
