-- Full-text search column for hybrid retrieval (vector + keyword RRF fusion).
--
-- Plain cosine-distance vector search is weak on exact/messy-title lookups
-- ("Shoes1.1", "{Shoe1:1}", SKU-ish queries) where lexical match is the
-- signal. A generated tsvector column keeps the keyword leg zero-maintenance:
-- the app never writes it, so ingestion/upsert code is untouched.
--
-- NOTE: deliberately NOT mapped in src/db/schema.ts — GENERATED ALWAYS
-- columns reject explicit inserts, and knowledge.test.ts round-trips full
-- kb_chunks rows (snapshot/restore). keywordSearch() references the column
-- via raw SQL instead.

ALTER TABLE public.kb_chunks
  ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || content)
  ) STORED;

CREATE INDEX idx_kb_chunks_fts ON public.kb_chunks USING gin (fts);
