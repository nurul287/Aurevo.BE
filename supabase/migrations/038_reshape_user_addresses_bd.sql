-- Reshape user_addresses to the Bangladesh checkout address shape.
--
-- Saved addresses exist so users can reuse them at checkout, but the table
-- carried US-style fields (address_line_1, city, state, postal_code, country)
-- while orders take { name, phone, address, district, upazila }. Align the
-- table with the order shape and add a display label (Home / Work).

ALTER TABLE public.user_addresses
  ADD COLUMN IF NOT EXISTS label    text,
  ADD COLUMN IF NOT EXISTS name     text,
  ADD COLUMN IF NOT EXISTS address  text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS upazila  text;

-- Backfill from the legacy columns so existing rows stay usable.
UPDATE public.user_addresses
SET
  name     = COALESCE(name, NULLIF(TRIM(first_name || ' ' || last_name), '')),
  address  = COALESCE(address, TRIM(address_line_1 || COALESCE(', ' || NULLIF(address_line_2, ''), ''))),
  district = COALESCE(district, state),
  upazila  = COALESCE(upazila, city)
WHERE name IS NULL OR address IS NULL OR district IS NULL OR upazila IS NULL;

ALTER TABLE public.user_addresses
  ALTER COLUMN name     SET NOT NULL,
  ALTER COLUMN address  SET NOT NULL,
  ALTER COLUMN district SET NOT NULL,
  ALTER COLUMN upazila  SET NOT NULL;

ALTER TABLE public.user_addresses
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS company,
  DROP COLUMN IF EXISTS address_line_1,
  DROP COLUMN IF EXISTS address_line_2,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS country;
