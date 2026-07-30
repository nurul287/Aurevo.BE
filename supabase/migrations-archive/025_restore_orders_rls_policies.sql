-- Migration 002 enabled RLS on orders/order_items but dropped prior policies and
-- never recreated them, so authenticated clients could not SELECT any rows.
-- Recreate user + admin access so dashboards and admin tools work.

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all order items" ON public.order_items
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON TABLE public.orders IS 'RLS: users see own rows; admins full access; guests use order confirmation token flow.';
