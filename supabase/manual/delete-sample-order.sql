-- Run in Supabase → SQL Editor (as a user with rights to delete from `orders`).
-- `order_items` and `payments` rows for this order are removed by ON DELETE CASCADE.

DELETE FROM public.orders
WHERE order_number = 'ORD-20260501143517';

-- If your test order uses a different number, change the WHERE clause.
