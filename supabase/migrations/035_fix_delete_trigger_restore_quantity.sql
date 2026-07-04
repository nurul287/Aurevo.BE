-- Fix order-delete trigger to also restore inventory.quantity.
--
-- The old trigger only released reserved_quantity when an order was hard-deleted
-- (e.g. admin SQL / wipe scripts). Since the app decrements inventory.quantity
-- at order-creation time, deleting an order without restoring quantity left
-- stock permanently lower than reality.
--
-- Corrected behaviour: restore quantity AND release reserved_quantity so the
-- net effect of delete mirrors the cancel API path.

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
      quantity          = quantity + r.quantity,
      reserved_quantity = GREATEST(0, reserved_quantity - r.quantity),
      updated_at        = now()
    WHERE variant_id = r.variant_id;
  END LOOP;
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.release_inventory_for_deleted_order() IS
  'Before an order row is deleted, restores inventory.quantity and releases
   reserved_quantity for every line item, mirroring what the cancel API does.';
