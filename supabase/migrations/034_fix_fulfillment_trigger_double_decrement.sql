-- Fix double stock decrement on order fulfillment.
--
-- The app decrements inventory.quantity at order creation time and increments
-- reserved_quantity. The old trigger then decremented quantity AGAIN when
-- fulfillment_status changed to 'fulfilled', causing phantom stock loss.
--
-- Corrected behaviour: on fulfillment, only release the reservation (the
-- quantity was already reduced at order placement by the application layer).

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
        reserved_quantity = GREATEST(0, reserved_quantity - r.quantity),
        updated_at = now()
      WHERE variant_id = r.variant_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.apply_inventory_on_order_fulfilled() IS
  'On fulfillment, releases the reservation only. inventory.quantity was already
   decremented by the application at order-creation time.';
