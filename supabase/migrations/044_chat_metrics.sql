-- Per-request telemetry for the RAG chatbot — feeds the admin AI-metrics
-- dashboard (latency, token usage/cost, tool usage, retrieval quality).
-- Follows the kb_chunks / courier_tracking_events convention: RLS enabled,
-- no policies — only the BE's own service connection writes and reads it.
--
-- conversation_id is ON DELETE SET NULL (not CASCADE): the chat-history
-- cleanup cron deletes conversations on a 48h/90d window, but metrics keep
-- their own retention (see chat.metrics.ts), so a purged conversation must
-- not drag its historical metrics rows out of the aggregates with it.

CREATE TABLE IF NOT EXISTS chat_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  retrieval_latency_ms INTEGER,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  tool_calls JSONB NOT NULL DEFAULT '{}'::jsonb,
  retrieval_result_count INTEGER,
  retrieval_top_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- All dashboard aggregates filter/bucket by created_at over a rolling window.
CREATE INDEX IF NOT EXISTS idx_chat_metrics_created ON chat_metrics (created_at);

ALTER TABLE chat_metrics ENABLE ROW LEVEL SECURITY;
