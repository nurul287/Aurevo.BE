-- 026_rls_revalidation.sql
-- Re-align live RLS with repo intent (002 + 025 + 009):
--   - orders / order_items had policies but RLS disabled → policies never applied.
--   - inventory_movements had no RLS.
--   - Restore admin + authenticated catalog policies from 002 where missing.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) orders / order_items — policies from 025 exist; enforce them
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) inventory_movements — audit table; admin-only (app writes via RPC/trigger
--    as definer still work depending on owner; direct client access is locked down)
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage inventory movements" ON public.inventory_movements;
CREATE POLICY "Admins can manage inventory movements"
  ON public.inventory_movements
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.inventory_movements IS
  'RLS enabled — only admins may SELECT/INSERT/UPDATE/DELETE directly; service/definer paths unaffected.';

-- ---------------------------------------------------------------------------
-- 3) Admin coverage missing on live DB (see 002_complete_rls_setup.sql)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage all wishlist items" ON public.wishlist_items;
CREATE POLICY "Admins can manage all wishlist items"
  ON public.wishlist_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all cart items" ON public.cart_items;
CREATE POLICY "Admins can manage all cart items"
  ON public.cart_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.user_addresses;
CREATE POLICY "Admins can manage all addresses"
  ON public.user_addresses
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4) Authenticated staff read-all catalog (inactive rows, prepublish, etc.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view all categories" ON public.categories;
CREATE POLICY "Authenticated users can view all categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view all brands" ON public.brands;
CREATE POLICY "Authenticated users can view all brands"
  ON public.brands
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view all products" ON public.products;
CREATE POLICY "Authenticated users can view all products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view all product variants" ON public.product_variants;
CREATE POLICY "Authenticated users can view all product variants"
  ON public.product_variants
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
