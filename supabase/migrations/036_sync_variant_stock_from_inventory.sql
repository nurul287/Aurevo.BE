-- Sync product_variants.stock from inventory.quantity for all existing rows.
--
-- Migration 003 (sample products) inserted variants before the stock column
-- existed (added by 033), so all sample variants have stock = 0 while
-- inventory.quantity holds the real on-hand values (60-100 for seed data,
-- actual counts for production rows).
--
-- This is a one-time catch-up; ongoing writes in the application keep both
-- columns in sync via db.transaction().

UPDATE product_variants pv
SET
  stock      = COALESCE(i.quantity, 0),
  updated_at = now()
FROM (
  -- Aggregate across locations in case a variant has multiple inventory rows
  SELECT variant_id, SUM(quantity) AS quantity
  FROM inventory
  GROUP BY variant_id
) i
WHERE pv.id = i.variant_id
  AND pv.stock != COALESCE(i.quantity, 0);

-- Also update the denormalised products.stock_quantity to match
UPDATE products p
SET
  stock_quantity = sq.total,
  updated_at     = now()
FROM (
  SELECT pv.product_id, COALESCE(SUM(i.quantity), 0)::integer AS total
  FROM product_variants pv
  LEFT JOIN inventory i ON i.variant_id = pv.id
  GROUP BY pv.product_id
) sq
WHERE p.id = sq.product_id
  AND p.stock_quantity != sq.total;
