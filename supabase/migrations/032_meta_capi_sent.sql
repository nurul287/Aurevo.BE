-- Idempotency for Meta Conversions API (server Purchase per order).
-- Edge Function meta-conversions inserts here after a successful send.

CREATE TABLE IF NOT EXISTS meta_capi_sent (
  order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE meta_capi_sent IS
  'Tracks orders for which a Meta CAPI Purchase event was sent (dedupe webhook retries).';

ALTER TABLE meta_capi_sent ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (Edge Function) can read/write.
