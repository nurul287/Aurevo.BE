-- Allow guest orders without an email (no synthetic placeholder addresses).
ALTER TABLE public.orders
  ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN public.orders.email IS
  'Customer email; NULL when not provided (e.g. guest checkout without email).';
