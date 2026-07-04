-- Release reserved stock when an order is deleted (e.g. admin/SQL cleanup)
-- so checkout is not blocked by orphan reservations.
-- When fulfillment_status becomes fulfilled, decrement on-hand qty and
-- release the reservation for that sale.

CREATE OR REPLACE FUNCTION public.release_inventory_for_deleted_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT variant_id, quantity
    FROM public.order_items
    WHERE order_id = OLD.id
  LOOP
    UPDATE public.inventory
    SET
      reserved_quantity = GREATEST(0, reserved_quantity - r.quantity),
      updated_at = now()
    WHERE variant_id = r.variant_id;
  END LOOP;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_release_inventory_before_delete ON public.orders;

CREATE TRIGGER trg_orders_release_inventory_before_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.release_inventory_for_deleted_order();

CREATE OR REPLACE FUNCTION public.apply_inventory_on_order_fulfilled()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.fulfillment_status = 'fulfilled'::fulfillment_status
     AND OLD.fulfillment_status IS DISTINCT FROM 'fulfilled'::fulfillment_status THEN
    FOR r IN
      SELECT variant_id, quantity
      FROM public.order_items
      WHERE order_id = NEW.id
    LOOP
      UPDATE public.inventory
      SET
        quantity = GREATEST(0, quantity - r.quantity),
        reserved_quantity = GREATEST(0, reserved_quantity - r.quantity),
        updated_at = now()
      WHERE variant_id = r.variant_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_apply_inventory_on_fulfilled ON public.orders;

CREATE TRIGGER trg_orders_apply_inventory_on_fulfilled
  AFTER UPDATE OF fulfillment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_inventory_on_order_fulfilled();

COMMENT ON FUNCTION public.release_inventory_for_deleted_order() IS
  'Unreserves inventory for all line items before order row is removed.';

COMMENT ON FUNCTION public.apply_inventory_on_order_fulfilled() IS
  'When an order becomes fulfilled, decrements physical qty and reserved qty per line item.';
