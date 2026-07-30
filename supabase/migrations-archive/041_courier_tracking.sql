-- Courier (Steadfast) integration — consignment booking + parcel tracking.
-- Adds carrier fields to `orders` and a tracking-event timeline table.
-- courier_tracking_events follows the meta_capi_sent / kb_chunks convention:
-- RLS enabled, no policies — only the BE's own service connection touches it.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS courier_provider TEXT,
  ADD COLUMN IF NOT EXISTS courier_consignment_id BIGINT,
  ADD COLUMN IF NOT EXISTS courier_status TEXT,
  ADD COLUMN IF NOT EXISTS courier_status_updated_at TIMESTAMPTZ;

-- One Steadfast consignment maps to exactly one order; unique when set so a
-- webhook's consignment_id resolves to a single order and re-booking is blocked.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_courier_consignment
  ON orders (courier_consignment_id)
  WHERE courier_consignment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS courier_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'steadfast',
  status TEXT,
  message TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE courier_tracking_events IS
  'Courier parcel tracking timeline — one row per status/tracking update (webhook or reconciliation poll). Backend-only (RLS enabled, no policies).';

CREATE INDEX IF NOT EXISTS idx_courier_events_order
  ON courier_tracking_events (order_id, event_at);

ALTER TABLE courier_tracking_events ENABLE ROW LEVEL SECURITY;
-- No policies: only the BE's service connection reads/writes this table.
