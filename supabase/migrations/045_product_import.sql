-- Bulk product import pipeline — jobs/rows for tracking async spreadsheet
-- (or scraper) imports, plus provenance columns on products so a re-import
-- of the same source row updates the existing product instead of duplicating.
-- RLS enabled, no policies — same convention as kb_chunks/chat_metrics/
-- courier_tracking_events: only the BE's own service connection touches these.

CREATE TYPE import_job_status AS ENUM ('pending', 'running', 'completed', 'partial', 'failed');
CREATE TYPE import_row_status AS ENUM ('pending', 'processing', 'done', 'failed', 'skipped');

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status import_job_status NOT NULL DEFAULT 'pending',
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status import_row_status NOT NULL DEFAULT 'pending',
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_rows_job ON import_rows (job_id, status);
-- One (source, external_id) can appear in many jobs over time (re-imports),
-- but never twice within the *same* job — that would just be a duplicate row
-- in the uploaded sheet.
CREATE UNIQUE INDEX IF NOT EXISTS idx_import_rows_job_external
  ON import_rows (job_id, source, external_id);

-- Provenance on products: nullable (manually-created products have none),
-- unique when present so re-uploading the same sheet/scrape UPDATEs the
-- existing product instead of creating a duplicate.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_source_external
  ON products (source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;
