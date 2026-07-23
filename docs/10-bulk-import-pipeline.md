# Phase 10 — Bulk Product Import Pipeline

## Overview

Populating the catalog by hand through the admin UI (one product → variants → images at a time) doesn't scale past a handful of items. This feature adds three decoupled parts that all converge on one internal contract, so the import pipeline itself never needs to know where a product came from:

- **Import pipeline** (this repo) — accepts a spreadsheet/JSON/NDJSON upload, queues it, and processes it asynchronously: resolves brands/categories, creates products + variants + inventory, re-hosts images, and batch-embeds everything into the AI chatbot's knowledge base.
- **Admin UI** (`Aurevo.UI`) — `/admin/imports`: download the template, drag-and-drop upload, live progress, rejected/failed-row tables.
- **Scraper** (`Aurevo/scraper`, a separate standalone package) — pulls real product data from external sites and feeds it into the same pipeline via the same upload endpoint.

**Status:** implemented and verified end-to-end with real infrastructure (Redis + worker + Postgres + Supabase Storage) and real scraped data (see [Verification](#verification)).

---

## Architecture

```
[ Excel/CSV/.json/.ndjson upload ] ─┐
                                    ├─parse→ NormalizedProduct[] ─→ POST /admin/imports
[ Scraper (standalone package)   ] ─┘                                     |
                                                    import_jobs / import_rows (Postgres)
                                                                    | enqueue
                                                          [ BullMQ queue (Redis) ]
                                                                    |
                                                         [ Import Worker process ]
                    resolve brand/category · slug · product (no per-row embed hook)
                    · variants+inventory · fetch+rehost images · batch-embed at the end
```

### The seam: `NormalizedProduct`

The one shape everything converges on — the spreadsheet parser produces it, and the scraper produces it independently — so the importer is completely input-source-agnostic. Defined in `src/app/modules/imports/imports.schema.ts` (and duplicated, deliberately, in the scraper package — see [Scraper](#scraper)):

```ts
type NormalizedProduct = {
  source: string;            // e.g. "spreadsheet", "klothen" — provenance
  externalId: string;        // stable per-source id → idempotency/dedupe
  title: string;
  description?: string;
  brand?: string;             // name → resolve-or-create
  category: string;           // free text → resolve-or-create
  gender: "men" | "women" | "unisex";
  basePrice: number;
  compareAtPrice?: number;
  tags: string[];
  variants: { size?: string; color?: string; colorCode?: string; sku?: string; price?: number; stock?: number }[];
  images: { url: string; isPrimary?: boolean; sortOrder?: number; alt?: string }[];
};
```

---

## Data Model

Migration: `supabase/migrations/045_product_import.sql`

| Table | Purpose | Key columns |
|---|---|---|
| `import_jobs` | One row per upload | `source`, `status` (`pending`\|`running`\|`completed`\|`partial`\|`failed`), `total_rows`, `processed_rows`, `succeeded`, `failed`, `created_by`, `error`, `started_at`, `finished_at` |
| `import_rows` | One row per product in the upload | `job_id` (FK cascade), `row_number`, `source`, `external_id`, `payload jsonb` (the raw `NormalizedProduct`), `status` (`pending`\|`processing`\|`done`\|`failed`\|`skipped`), `product_id` (FK set null), `error`, `attempts` |

`import_rows` has a **unique index on `(job_id, source, external_id)`** — de-dupes rows sharing an external_id within one upload at create time.

`products` gained two nullable columns: `external_id text`, `source text`, with a **unique partial index on `(source, external_id) WHERE both not null`** — this is what makes re-importing the same source row an *update*, not a duplicate.

---

## Upload Endpoints (`src/app/modules/imports/`)

Admin-gated (`authenticate` + `requireAdmin`), mounted at `/admin/imports`.

| Endpoint | Purpose |
|---|---|
| `GET /admin/imports/template` | Downloads a blank `.xlsx` template (one example row) with the documented column layout |
| `POST /admin/imports` | Accepts a `.xlsx`/`.xls`/`.csv`/`.json`/`.ndjson` file (multer, form field `file`) **or** a small raw `NormalizedProduct[]` JSON body. Validates every row, creates one `import_jobs` + N `import_rows`, enqueues the job. Returns `{ jobId, total, status, rejected: [{rowNumber, error}] }` for rows that failed validation *before* ever becoming a queued row. |
| `GET /admin/imports` | Paginated list of recent jobs |
| `GET /admin/imports/:jobId` | Single job status/counts |
| `GET /admin/imports/:jobId/rows` | Paginated rows for a job, optional `?status=` filter |
| `POST /admin/imports/:jobId/retry` | Re-enqueues only rows still `failed` — `done` rows are untouched |

### Spreadsheet format (`src/app/modules/imports/spreadsheet.ts`)

**One row = one product colorway** (matches the existing catalog's per-colorway product model — e.g. "White / 41" and "White / 42" are two separate products). `sizes` is pipe-delimited and fans out into one variant per size within that row.

| Column | Required | Notes |
|---|---|---|
| `external_id` | recommended | stable id for idempotent re-import; auto-derived from `title` + row number if left blank |
| `title` | ✓ | |
| `description`, `short_description` | | |
| `brand` | | name → resolve-or-create |
| `category` | ✓ | free text → resolve-or-create |
| `gender` | | `men`/`women`/`unisex` (default `unisex`) |
| `base_price` | ✓ | number (BDT) |
| `compare_at_price` | | number |
| `color`, `color_code` | | single colorway for this row |
| `sizes` | | pipe-delimited, e.g. `S\|M\|L` → one variant per size |
| `stock` | | applied to each generated variant |
| `sku_prefix` | | per-variant SKU = `<prefix>-<size>` |
| `tags` | | comma-delimited |
| `image_urls` | | comma-delimited; first = primary |

`.csv` uses the exact same columns — `XLSX.read()` auto-detects the format from the buffer, so there's no branching on file extension in the parser itself (only the upload route's `fileFilter` checks the extension, to reject genuinely unsupported files early).

---

## Import Worker (`src/app/modules/imports/imports.worker-logic.ts`, entrypoint `src/workers/import.worker.ts`)

A separate process (`pnpm worker`), **not** part of the API server — a Railway/production deployment needs both `pnpm start` and `pnpm worker` running.

The BullMQ job payload is just `{ jobId }`. All real progress state lives in `import_rows`, committed **per row** — so a worker crash or redeploy mid-job is safe: BullMQ redelivers the job and the worker resumes from whatever rows are still `pending`, with no loss and no double-creation.

Per job:
1. Drain `pending` rows in batches of 50, claiming each batch (`status → processing`) up front so a crash mid-batch is visible, not silently mistaken for untouched.
2. Per row, with 5 rows processed concurrently:
   - Resolve brand/category by name → id, race-safe (`SELECT` → `INSERT ... ON CONFLICT DO NOTHING` → re-`SELECT` if the insert lost the race), cached per-job so repeated names in one batch share one DB round-trip (`src/app/modules/imports/resolvers.ts`).
   - **Find-or-create by `(source, external_id)`.** If a product with that source+externalId already exists, update its price/name/description/tags/category/brand in place and sync any SKU-matched variants — this is what makes re-scraping/re-uploading the same batch idempotent instead of duplicating. If not, generate a unique slug (`generateUniqueProductSlug`, tries the bare slug then `-2`, `-3`, ... with the DB's unique constraint as the final backstop for a same-batch race) and insert a brand-new product via `insertProduct` — the **hook-free** core extracted from `products.service.ts`'s `createProduct`, deliberately bypassing the per-product embed hook that the normal admin-UI create path fires.
   - For a brand-new product only: fetch each image, compress to webp (`sharp`), upload to the `product-images` Supabase Storage bucket, and create the `product_images` row. One dead image URL only skips that one image — it never fails the row.
3. After every row in the job is done: **batch-embed** every product touched by the job in one pass (`knowledge.service.ts`'s `batchUpsertProductChunks`) — a handful of Voyage API calls (batches of 100) instead of one call per product, which is the whole reason the per-row embed hook is bypassed in the first place.
4. Roll the job up to `completed` (0 failed), `partial` (some failed, some succeeded), or `failed` (nothing succeeded).

### Failure semantics

Two independent retry layers:
- **Job level** — BullMQ `attempts: 3` with exponential backoff, for transient infra failures (Redis hiccup, etc).
- **Row level** — a per-row try/catch records `import_rows.error` without killing the rest of the batch. `POST /admin/imports/:jobId/retry` re-enqueues only the rows still `failed`.

The most common real-world row failure is a **slug collision**: two products in the same batch resolving to the same base slug (e.g. two colorways both scraped/entered as "Men's Printed Panjabi") can race each other's `generateUniqueProductSlug` check under the worker's row concurrency. The DB's unique constraint on `products.slug` catches it, the row is marked `failed`, and a single retry succeeds — by then the winning row's slug is already committed and visible to the `SELECT`. Verified live during scraper testing (see [Verification](#verification)).

---

## Admin UI (`Aurevo.UI`, `/admin/imports`)

`src/pages/admin/admin-imports-page.tsx` + `src/services/imports/`. Follows the existing `admin-ai-metrics-page.tsx` shell (stat-card-style header, `Card` sections, `Skeleton` loading, error-Card-plus-Retry). Three pieces:

- **Upload** — a drag-and-drop dropzone (single file, `.xlsx`/`.xls`/`.csv`/`.json`/`.ndjson`) that POSTs via `apiFetchForm`, plus a "Download template" button using the existing `apiDownloadFile`.
- **Current job** — once a job exists, `useImportJob(jobId)` polls every 2s (`refetchInterval`, the first use of that pattern in this codebase) until the job reaches a terminal status, rendering a manual `<div>`-based progress bar (this codebase has no shadcn `Progress` component — see `admin-ai-metrics-page.tsx`'s tool-usage bars for the same idiom) plus a failed-rows table with a **Retry failed rows** button.
- **Recent imports** — a table of past jobs; clicking a row switches the "Current job" panel to that job.

---

## Scraper (`Aurevo/scraper`, standalone package)

Deliberately **not** part of the API server or either FE/BE repo — scraping has its own dependency/runtime concerns (a crash or a slow site shouldn't touch production infra) and its own git history. Full usage guide: [`scraper/README.md`](../../scraper/README.md).

- **Generic Shopify JSON adapter** (`src/adapters/shopify-json.ts`) reads a store's standard public `/products.json` endpoint rather than scraping rendered HTML — simpler, more robust, and (for the current target sites) explicitly within what the site permits.
- **Site configs** (`src/sites/`) are ~10-line files: a base URL, brand override, and gender default, reusing the shared adapter. Two are wired up: `klothen.shop` (which publishes `agents.md` granting explicit no-auth, read-only catalog access to automated agents — the strongest possible permission signal) and `twelvebd.com` (permissive `robots.txt`, checked before building the adapter).
- **Guardrails** (`src/guardrails.ts`): checks `robots.txt` before the first request and refuses to scrape if disallowed; rate-limited with `Retry-After`-aware 429 backoff; an on-disk response cache keyed by URL so an interrupted run resumes instead of re-fetching; a real, contactable User-Agent string. Never touches checkout/cart/payment endpoints — catalog reads only.
- **Category mapping** (`src/category-map.ts`) is keyword-based (not an exact lookup table), since different sites spell/capitalize categories differently.
- Its own CLI (`pnpm scrape <site> [--limit N] [--upload]`) writes NDJSON and optionally uploads it straight through `POST /admin/imports` using an admin bearer token — the exact same endpoint the admin UI's dropzone uses.

---

## Verification

Run end to end with real infrastructure, not just unit tests:

1. Local Redis (Docker), `pnpm db:reset` (applies migration 045), `pnpm dev` + `pnpm worker` both running.
2. Downloaded the real `/admin/imports/template`, built a 10-product batch, uploaded as `.xlsx`, confirmed `.csv` of the same data parses identically.
3. Re-uploaded the same batch — confirmed 0 duplicate products (idempotent update via `(source, external_id)`).
4. Confirmed in Postgres: correct variant/inventory sync, brand/category resolution with no duplicates, and (once a fresh Storage bucket was created — this environment's local Storage doesn't persist across `db reset`) images correctly re-hosted with none still pointing at the original external URL.
5. Confirmed `kb_chunks` was batch-embedded (one `embedDocuments` call per job, not one per product) and that `retrieve()` surfaces an imported product as the top-ranked result for a relevant natural-language query.
6. Ran the real scraper against `klothen.shop` (5 real products, `--limit 5 --upload`), which surfaced and exercised the slug-collision retry path for real (two real products both titled "Men's Printed Panjabi") and confirmed the retry self-heals it.
7. `pnpm test` green (BE: 375 tests; the imports module alone: spreadsheet parser, resolvers, service, controller/routes, worker logic including idempotency and image-fetch-failure resilience), `pnpm build` clean, `graphify update` after every change.

---

## Known Limitations / Backlog

- **`Content-Disposition` isn't exposed via CORS** (`src/app.ts`'s manual CORS middleware never sets `Access-Control-Expose-Headers`) — every admin file download, including the import template, saves with a generic "download" filename in the browser instead of the real one. Pre-existing, not specific to this feature; flagged as a separate fix.
- **A Redis outage during upload can leave a job stuck at `pending` forever.** `createImportJob` commits the job + row inserts, then calls `enqueueImportJob` — if that throws (Redis unreachable), the rows are already committed but never enqueued, and the existing retry endpoint only handles rows already marked `failed`, not a job that was never enqueued at all. Flagged as a separate fix (in progress).
- **No admin promotion/audit UI** for the scraper's brand/category auto-resolution — a scraped site's messy category taxonomy maps through keyword matching (`category-map.ts`), which is decent but not perfect; worth a manual spot-check on a fresh site's first batch.
- **The scraper only supports Shopify-based sites today.** A non-Shopify source needs a genuinely new HTML-scraping adapter (Playwright/Cheerio), not just a new site config.

---

## File Reference

**Aurevo.BE**
- `supabase/migrations/045_product_import.sql`, `src/db/schema.ts` (`importJobs`, `importRows`, `products.externalId`/`source`)
- `src/lib/slugify.ts`, `src/lib/queue.ts`
- `src/app/modules/imports/{imports.schema,spreadsheet,resolvers,imports.service,imports.controller,imports-admin.routes,imports.worker-logic}.ts`
- `src/workers/import.worker.ts`
- `src/app/modules/products/products.service.ts` (`insertProduct` hook-free core)
- `src/app/modules/knowledge/knowledge.service.ts` (`batchUpsertProductChunks`)
- `src/app/modules/imports/*.test.ts` (spreadsheet, resolvers, service, routes, worker logic)

**Aurevo.UI**
- `src/pages/admin/admin-imports-page.tsx`
- `src/services/imports/{types,use-imports-queries,use-imports-mutations}.ts`
- `src/routes/admin-routes.tsx`, `src/components/admin/app-sidebar.tsx`, `src/constants/app-paths.ts` (`/admin/imports` wiring)

**Aurevo/scraper** (standalone package, own git repo)
- `src/types.ts`, `src/title-clean.ts`, `src/category-map.ts`, `src/guardrails.ts`, `src/output.ts`, `src/upload.ts`
- `src/adapters/shopify-json.ts`
- `src/sites/{klothen,twelvebd}.ts`
- `src/cli.ts`
- `README.md` (full usage guide)
