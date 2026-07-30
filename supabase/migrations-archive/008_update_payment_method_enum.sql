-- Update payment_method enum to use 'cash' and 'online'
-- Migration: 008_update_payment_method_enum.sql
-- This version avoids the "unsafe use of new value" error by creating a new enum directly

-- Step 1: Create a new enum type with the desired values
CREATE TYPE payment_method_new AS ENUM ('cash', 'online');

-- Step 2: Alter the payments table to use the new enum type
-- This will convert existing values during the migration
ALTER TABLE public.payments
  ALTER COLUMN payment_method TYPE payment_method_new
  USING (
    CASE payment_method::text
      WHEN 'cash_on_delivery' THEN 'cash'::payment_method_new
      WHEN 'stripe' THEN 'online'::payment_method_new
      WHEN 'paypal' THEN 'online'::payment_method_new
      ELSE 'cash'::payment_method_new  -- Default fallback for any other values
    END
  );

-- Step 3: Drop the old enum type and rename the new one
DROP TYPE payment_method;
ALTER TYPE payment_method_new RENAME TO payment_method;

-- Step 4: Update the create_order function to use the new enum values
DROP FUNCTION IF EXISTS public.create_order(uuid, text, text, jsonb, jsonb, jsonb, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_order(
  user_id uuid,
  email text,
  phone text,
  items jsonb,
  billing_address jsonb,
  shipping_address jsonb,
  notes text,
  session_id text,
  payment_method text DEFAULT 'cash',
  guest_token text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_order_id uuid;
  order_number text := concat('ORD-', to_char(NOW(), 'YYYYMMDDHH24MISS'));
  item record;
  created_order jsonb;
  guest_token_expires timestamptz;
  product_data record;
  variant_data record;
BEGIN
  -- Set guest token expiration for guest orders
  IF user_id IS NULL AND guest_token IS NOT NULL THEN
    guest_token_expires := NOW() + INTERVAL '1 month';
  ELSE
    guest_token_expires := NULL;
  END IF;

  -- Insert the order
  INSERT INTO public.orders(
    id, order_number, user_id, email, phone,
    subtotal, tax_amount, shipping_amount, discount_amount, total_amount,
    status, payment_status, fulfillment_status,
    billing_address, shipping_address, notes,
    session_id, guest_token, guest_token_expires,
    created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), order_number, user_id, email, phone,
    0, 0, 0, 0, 0,
    'pending'::order_status, 'pending'::payment_status, 'unfulfilled'::fulfillment_status,
    billing_address, shipping_address, notes,
    session_id, guest_token, guest_token_expires,
    now(), now()
  )
  RETURNING id INTO new_order_id;

  -- Process each item
  FOR item IN SELECT * FROM jsonb_to_recordset(items) as (product_id uuid, variant_id uuid, quantity int, unit_price numeric)
  LOOP
    -- Check inventory availability
    PERFORM 1 FROM public.inventory
    WHERE variant_id = item.variant_id
    AND (quantity - reserved_quantity) >= item.quantity
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient inventory for variant %', item.variant_id;
    END IF;

    -- Get product and variant information
    SELECT p.name as product_name, p.sku as product_sku
    INTO product_data
    FROM public.products p
    WHERE p.id = item.product_id;

    SELECT pv.name as variant_name, pv.sku as variant_sku
    INTO variant_data
    FROM public.product_variants pv
    WHERE pv.id = item.variant_id;

    -- Insert order item with proper product information
    INSERT INTO public.order_items(
      id, order_id, product_id, variant_id,
      product_name, variant_name, sku,
      quantity, unit_price, total_price,
      created_at
    )
    VALUES (
      gen_random_uuid(), new_order_id, item.product_id, item.variant_id,
      COALESCE(product_data.product_name, ''),
      COALESCE(variant_data.variant_name, ''),
      COALESCE(variant_data.variant_sku, product_data.product_sku, ''),
      item.quantity, item.unit_price, (item.quantity * item.unit_price),
      now()
    );

    -- Reserve inventory
    UPDATE public.inventory
    SET reserved_quantity = reserved_quantity + item.quantity,
        updated_at = now()
    WHERE variant_id = item.variant_id;
  END LOOP;

  -- Calculate and update order totals
  UPDATE public.orders
  SET subtotal = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM public.order_items
      WHERE order_id = new_order_id
    ),
    total_amount = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM public.order_items
      WHERE order_id = new_order_id
    ),
    updated_at = now()
  WHERE id = new_order_id;

  -- Create payment record with the new enum values
  INSERT INTO public.payments(
    id, order_id, payment_method, amount, currency, status, created_at
  )
  VALUES (
    gen_random_uuid(),
    new_order_id,
    payment_method::payment_method,
    (SELECT total_amount FROM public.orders WHERE id = new_order_id),
    'BDT',
    'pending',
    now()
  );

  -- Clean up cart items
  IF user_id IS NOT NULL THEN
    -- For authenticated users, remove cart items by user_id and variant_ids
    DELETE FROM public.cart_items ci
    WHERE ci.user_id = create_order.user_id
      AND ci.variant_id IN (
        SELECT oi.variant_id
        FROM public.order_items oi
        WHERE oi.order_id = new_order_id
      );
  ELSE
    -- For guest users, remove cart items by session_id and variant_ids
    IF session_id IS NOT NULL THEN
      DELETE FROM public.cart_items ci
      WHERE ci.session_id = create_order.session_id
        AND ci.variant_id IN (
          SELECT oi.variant_id
          FROM public.order_items oi
          WHERE oi.order_id = new_order_id
        );
    END IF;
  END IF;

  -- Return the created order with guest token
  SELECT row_to_json(o.*) INTO created_order
  FROM (
    SELECT *
    FROM public.orders
    WHERE id = new_order_id
  ) o;

  RETURN created_order;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_order(uuid, text, text, jsonb, jsonb, jsonb, text, text, text, text) TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.create_order(uuid, text, text, jsonb, jsonb, jsonb, text, text, text, text) FROM public;

-- Add comment
COMMENT ON FUNCTION public.create_order(uuid, text, text, jsonb, jsonb, jsonb, text, text, text, text) IS 'Creates a new order with proper inventory management and cart cleanup. Payment methods: cash, online';

-- Add comment on the enum type
COMMENT ON TYPE payment_method IS 'Payment methods: cash (cash on delivery), online (stripe, paypal, etc.)';
