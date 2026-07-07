-- Reservations are no longer taken at order creation.
--
-- The app used to decrement inventory.quantity AND increment reserved_quantity
-- for every order. Availability everywhere is computed as
-- quantity - reserved_quantity, so each sale reduced availability twice, and
-- the reservation was only released if the order was ever marked fulfilled.
--
-- The application now records a sale solely as a quantity decrement. Zero out
-- the legacy reservation counts so availability reflects reality again. The
-- fulfilled/delete triggers keep their GREATEST(0, ...) clamps, so releasing a
-- (now zero) reservation stays a harmless no-op.

UPDATE public.inventory
SET reserved_quantity = 0,
    updated_at = now()
WHERE reserved_quantity <> 0;
