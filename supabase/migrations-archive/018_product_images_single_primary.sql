-- ============================================================
-- 018_product_images_single_primary.sql
-- ============================================================
-- Purpose : Enforce at-most-one primary image per product.
--
-- 1) A BEFORE INSERT/UPDATE trigger automatically clears the
--    `is_primary` flag on every other image of the same product
--    whenever a row is being marked as primary. This makes the
--    UX "set primary" idempotent: the caller does not need to
--    pre-clear other rows.
--
-- 2) A partial unique index acts as a hard backstop so the
--    database rejects any attempt to leave two primaries behind
--    (e.g. by a buggy client bypassing the trigger).
--
-- 3) Existing data is cleaned up: for any product that currently
--    has >1 primary, only the most recently created row keeps
--    `is_primary = true`; the rest are reset to false.
-- ============================================================

-- 1) Trigger function: on INSERT/UPDATE, if NEW.is_primary then
--    clear is_primary on all other rows of the same product.
CREATE OR REPLACE FUNCTION public.product_images_enforce_single_primary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_primary IS TRUE THEN
    UPDATE public.product_images
    SET is_primary = FALSE
    WHERE product_id = NEW.product_id
      AND is_primary = TRUE
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_primary
  ON public.product_images;

CREATE TRIGGER enforce_single_primary
  BEFORE INSERT OR UPDATE OF is_primary, product_id
  ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.product_images_enforce_single_primary();

-- 2) One-shot data cleanup: if any product still has multiple
--    primaries (legacy data), keep the most recent and unset the rest.
WITH ranked AS (
  SELECT
    id,
    product_id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.product_images
  WHERE is_primary = TRUE
)
UPDATE public.product_images p
SET is_primary = FALSE
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- 3) Hard backstop: at most one primary per product, ever.
DROP INDEX IF EXISTS public.product_images_one_primary_per_product;

CREATE UNIQUE INDEX product_images_one_primary_per_product
  ON public.product_images (product_id)
  WHERE is_primary = TRUE;
