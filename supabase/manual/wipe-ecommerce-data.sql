-- ============================================================
-- ONE-OFF ONLY — not run by `supabase db reset` / migrations.
-- Run manually in Studio or psql when you intentionally want to
-- clear catalog + orders while keeping auth + profiles + addresses.
-- ============================================================
-- Purpose : Reset all e-commerce data so it can be re-entered
--           manually through the admin dashboard.
-- Keeps   : auth.users, public.profiles, public.user_addresses
-- Wipes   : products, variants, images, inventory, inventory_movements,
--           categories, brands, cart, wishlist, reviews,
--           orders, order_items, payments
-- Safe    : Wrapped in a transaction. Triggers are temporarily
--           disabled (session_replication_role = replica) so any
--           audit / webhook triggers do not fire during the wipe.
-- ============================================================

BEGIN;

SET session_replication_role = replica;

TRUNCATE TABLE
  public.payments,
  public.order_items,
  public.orders
RESTART IDENTITY CASCADE;

TRUNCATE TABLE
  public.cart_items,
  public.wishlist_items,
  public.product_reviews
RESTART IDENTITY CASCADE;

TRUNCATE TABLE
  public.inventory_movements,
  public.inventory,
  public.product_images,
  public.product_variants,
  public.products
RESTART IDENTITY CASCADE;

TRUNCATE TABLE
  public.categories,
  public.brands
RESTART IDENTITY CASCADE;

SET session_replication_role = DEFAULT;

COMMIT;
