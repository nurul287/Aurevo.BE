-- Catch-up migration: adds columns/tables that were in missing migrations 004-006, 015.
-- Safe to run multiple times (all statements use IF NOT EXISTS / DO NOTHING patterns).

-- product_variants: stock tracking columns
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_stock integer NOT NULL DEFAULT 0;

-- orders: payment method and flat shipping columns
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS shipping_name text,
  ADD COLUMN IF NOT EXISTS shipping_phone text,
  ADD COLUMN IF NOT EXISTS shipping_email text,
  ADD COLUMN IF NOT EXISTS shipping_district text,
  ADD COLUMN IF NOT EXISTS shipping_upazila text;

-- guest_sessions table
CREATE TABLE IF NOT EXISTS guest_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT NOW() NOT NULL
);
