--
-- PostgreSQL database dump
--

\restrict ITiaHuDadsrRzbR7oSnSiUOaGGF2Gk8DJSNf7WvPiq8wFmtjFMImdxQzgeFAlJW

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: address_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.address_type AS ENUM (
    'billing',
    'shipping'
);


--
-- Name: chat_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.chat_role AS ENUM (
    'user',
    'assistant'
);


--
-- Name: fulfillment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fulfillment_status AS ENUM (
    'unfulfilled',
    'partial',
    'fulfilled'
);


--
-- Name: import_job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.import_job_status AS ENUM (
    'pending',
    'running',
    'completed',
    'partial',
    'failed'
);


--
-- Name: import_row_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.import_row_status AS ENUM (
    'pending',
    'processing',
    'done',
    'failed',
    'skipped'
);


--
-- Name: kb_source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kb_source_type AS ENUM (
    'product',
    'policy',
    'faq'
);


--
-- Name: movement_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.movement_reason AS ENUM (
    'purchase_order',
    'customer_order',
    'checkout_reserve',
    'payment_failed',
    'order_cancelled',
    'customer_return',
    'damaged_goods',
    'inventory_count',
    'theft_loss',
    'location_transfer',
    'manual_adjustment'
);


--
-- Name: movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.movement_type AS ENUM (
    'restock',
    'sale',
    'reserve',
    'unreserve',
    'cancel',
    'return',
    'adjustment',
    'damage',
    'theft',
    'transfer'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'online'
);


--
-- Name: TYPE payment_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.payment_method IS 'Payment methods: cash (cash on delivery), online (stripe, paypal, etc.)';


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded',
    'partially_refunded'
);


--
-- Name: product_gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_gender AS ENUM (
    'men',
    'women',
    'unisex'
);


--
-- Name: user_gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_gender AS ENUM (
    'male',
    'female',
    'other'
);


--
-- Name: add_product(text, text, numeric, text, text, text, uuid, uuid, public.product_gender, text, text, numeric, jsonb, numeric, boolean, boolean, boolean, boolean, integer, integer, text, text, text[], integer, jsonb, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_product(p_name text, p_slug text, p_base_price numeric, p_description text DEFAULT NULL::text, p_short_description text DEFAULT NULL::text, p_sku text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_brand_id uuid DEFAULT NULL::uuid, p_gender public.product_gender DEFAULT 'unisex'::public.product_gender, p_material text DEFAULT NULL::text, p_care_instructions text DEFAULT NULL::text, p_weight numeric DEFAULT NULL::numeric, p_dimensions jsonb DEFAULT NULL::jsonb, p_compare_at_price numeric DEFAULT NULL::numeric, p_is_featured boolean DEFAULT false, p_requires_shipping boolean DEFAULT true, p_track_inventory boolean DEFAULT true, p_allow_backorder boolean DEFAULT false, p_min_order_quantity integer DEFAULT 1, p_max_order_quantity integer DEFAULT NULL::integer, p_meta_title text DEFAULT NULL::text, p_meta_description text DEFAULT NULL::text, p_tags text[] DEFAULT NULL::text[], p_low_stock_threshold integer DEFAULT 10, p_variants jsonb DEFAULT '[]'::jsonb, p_initial_stock integer DEFAULT 0, p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_product_id UUID;
  v_variant_id UUID;
  v_variant JSONB;
  v_result JSONB;
  v_variants_result JSONB[] := '{}';
BEGIN
  -- Insert product
  INSERT INTO products (
    name, slug, base_price, description, short_description, sku, category_id, brand_id,
    gender, material, care_instructions, weight, dimensions,
    compare_at_price, is_featured, requires_shipping,
    track_inventory, allow_backorder, min_order_quantity, max_order_quantity,
    meta_title, meta_description, tags, low_stock_threshold
  ) VALUES (
    p_name, p_slug, p_base_price, p_description, p_short_description, p_sku, p_category_id, p_brand_id,
    p_gender, p_material, p_care_instructions, p_weight, p_dimensions,
    p_compare_at_price, p_is_featured, p_requires_shipping,
    p_track_inventory, p_allow_backorder, p_min_order_quantity, p_max_order_quantity,
    p_meta_title, p_meta_description, p_tags, p_low_stock_threshold
  ) RETURNING id INTO v_product_id;

  -- Insert variants
  FOR v_variant IN SELECT * FROM jsonb_array_elements(p_variants)
  LOOP
    INSERT INTO product_variants (
      product_id, sku, name, size, color, color_code, material, weight,
      price, compare_at_price, barcode, sort_order
    ) VALUES (
      v_product_id,
      COALESCE((v_variant->>'sku'), p_sku || '-' || (v_variant->>'size') || '-' || (v_variant->>'color')),
      COALESCE((v_variant->>'name'), p_name || ' - ' || (v_variant->>'size') || ' ' || (v_variant->>'color')),
      v_variant->>'size',
      v_variant->>'color',
      v_variant->>'color_code',
      v_variant->>'material',
      (v_variant->>'weight')::DECIMAL,
      COALESCE((v_variant->>'price')::DECIMAL, p_base_price),
      (v_variant->>'compare_at_price')::DECIMAL,
      v_variant->>'barcode',
      COALESCE((v_variant->>'sort_order')::INTEGER, 0)
    ) RETURNING id INTO v_variant_id;

    -- Create initial inventory record
    INSERT INTO inventory (variant_id, quantity, reorder_point, reorder_quantity)
    VALUES (v_variant_id, p_initial_stock, p_low_stock_threshold, p_low_stock_threshold * 2);

    -- Log initial stock movement if stock > 0
    IF p_initial_stock > 0 THEN
      PERFORM log_inventory_movement(
        v_variant_id,
        'restock',
        'purchase_order',
        p_initial_stock,
        NULL, -- order_id
        NULL, -- order_item_id
        p_user_id,
        'INITIAL_STOCK',
        'Initial stock for new product',
        NULL, -- cost_per_unit (removed cost_price reference)
        'main'
      );
    END IF;

    -- Add variant to result
    v_variants_result := array_append(v_variants_result, jsonb_build_object(
      'id', v_variant_id,
      'sku', COALESCE((v_variant->>'sku'), p_sku || '-' || (v_variant->>'size') || '-' || (v_variant->>'color')),
      'name', COALESCE((v_variant->>'name'), p_name || ' - ' || (v_variant->>'size') || ' ' || (v_variant->>'color')),
      'size', v_variant->>'size',
      'color', v_variant->>'color',
      'initial_stock', p_initial_stock
    ));
  END LOOP;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'product_id', v_product_id,
    'product_name', p_name,
    'variants', to_jsonb(v_variants_result),
    'message', 'Product added successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to add product'
    );
END;
$$;


--
-- Name: FUNCTION add_product(p_name text, p_slug text, p_base_price numeric, p_description text, p_short_description text, p_sku text, p_category_id uuid, p_brand_id uuid, p_gender public.product_gender, p_material text, p_care_instructions text, p_weight numeric, p_dimensions jsonb, p_compare_at_price numeric, p_is_featured boolean, p_requires_shipping boolean, p_track_inventory boolean, p_allow_backorder boolean, p_min_order_quantity integer, p_max_order_quantity integer, p_meta_title text, p_meta_description text, p_tags text[], p_low_stock_threshold integer, p_variants jsonb, p_initial_stock integer, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.add_product(p_name text, p_slug text, p_base_price numeric, p_description text, p_short_description text, p_sku text, p_category_id uuid, p_brand_id uuid, p_gender public.product_gender, p_material text, p_care_instructions text, p_weight numeric, p_dimensions jsonb, p_compare_at_price numeric, p_is_featured boolean, p_requires_shipping boolean, p_track_inventory boolean, p_allow_backorder boolean, p_min_order_quantity integer, p_max_order_quantity integer, p_meta_title text, p_meta_description text, p_tags text[], p_low_stock_threshold integer, p_variants jsonb, p_initial_stock integer, p_user_id uuid) IS 'Adds a new product with variants and initial inventory (cost_price removed)';


--
-- Name: apply_inventory_on_order_fulfilled(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_inventory_on_order_fulfilled() RETURNS trigger
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


--
-- Name: FUNCTION apply_inventory_on_order_fulfilled(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.apply_inventory_on_order_fulfilled() IS 'On fulfillment, releases the reservation only. inventory.quantity was already
   decremented by the application at order-creation time.';


--
-- Name: cancel_order(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_order(p_order_id uuid, p_reason text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_result JSONB;
  v_order_status order_status;
  v_order_item RECORD;
  v_movement_id UUID;
  v_restored_items JSONB[] := '{}';
  v_total_restored INTEGER := 0;
BEGIN
  -- Get current order status
  SELECT status INTO v_order_status
  FROM orders
  WHERE id = p_order_id;

  -- Check if order can be cancelled
  IF v_order_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Order not found'
    );
  END IF;

  IF v_order_status IN ('cancelled', 'delivered', 'refunded') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Order cannot be cancelled in current status: ' || v_order_status
    );
  END IF;

  -- Update order status
  UPDATE orders
  SET
    status = 'cancelled',
    internal_notes = COALESCE(internal_notes, '') ||
      CASE WHEN internal_notes IS NOT NULL THEN '; ' ELSE '' END ||
      'Cancelled on ' || NOW()::TEXT ||
      CASE WHEN p_reason IS NOT NULL THEN ': ' || p_reason ELSE '' END,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Restore stock for each order item
  FOR v_order_item IN
    SELECT oi.id, oi.variant_id, oi.quantity, oi.product_name, oi.variant_name
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    -- Restore stock
    UPDATE inventory
    SET quantity = quantity + v_order_item.quantity
    WHERE variant_id = v_order_item.variant_id;

    -- Log movement
    v_movement_id := log_inventory_movement(
      v_order_item.variant_id,
      'cancel',
      'order_cancelled',
      v_order_item.quantity,
      p_order_id,
      v_order_item.id,
      p_user_id,
      NULL, -- reference_number
      'Stock restored due to order cancellation',
      NULL, -- cost_per_unit
      'main'
    );

    -- Add to restored items
    v_restored_items := array_append(v_restored_items, jsonb_build_object(
      'order_item_id', v_order_item.id,
      'variant_id', v_order_item.variant_id,
      'product_name', v_order_item.product_name,
      'variant_name', v_order_item.variant_name,
      'quantity_restored', v_order_item.quantity,
      'movement_id', v_movement_id
    ));

    v_total_restored := v_total_restored + v_order_item.quantity;
  END LOOP;

  v_result := jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total_items_restored', array_length(v_restored_items, 1),
    'total_quantity_restored', v_total_restored,
    'restored_items', to_jsonb(v_restored_items),
    'message', 'Order cancelled and stock restored successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to cancel order'
    );
END;
$$;


--
-- Name: FUNCTION cancel_order(p_order_id uuid, p_reason text, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cancel_order(p_order_id uuid, p_reason text, p_user_id uuid) IS 'Cancels an order and restores stock to inventory';


--
-- Name: check_low_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_low_stock() RETURNS TABLE(product_id uuid, product_name text, variant_id uuid, variant_name text, current_stock integer, low_stock_threshold integer, reorder_point integer, reorder_quantity integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as product_id,
    p.name as product_name,
    pv.id as variant_id,
    pv.name as variant_name,
    i.quantity as current_stock,
    p.low_stock_threshold,
    i.reorder_point,
    i.reorder_quantity
  FROM products p
  JOIN product_variants pv ON p.id = pv.product_id
  JOIN inventory i ON pv.id = i.variant_id
  WHERE p.is_active = true
    AND pv.is_active = true
    AND i.quantity <= COALESCE(p.low_stock_threshold, 10)
  ORDER BY i.quantity ASC;
END;
$$;


--
-- Name: FUNCTION check_low_stock(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_low_stock() IS 'Tested and working - returns products below low stock threshold';


--
-- Name: create_order(uuid, text, text, jsonb, jsonb, jsonb, text, text, text, text, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_order(user_id uuid, email text, phone text, items jsonb, billing_address jsonb, shipping_address jsonb, notes text, session_id text, payment_method text DEFAULT 'cash'::text, guest_token text DEFAULT NULL::text, p_tax_amount numeric DEFAULT 0, p_shipping_amount numeric DEFAULT 0, p_discount_amount numeric DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  new_order_id uuid;
  order_number text := concat('ORD-', to_char(NOW(), 'YYYYMMDDHH24MISS'));
  item record;
  created_order jsonb;
  guest_token_expires timestamptz;
  product_data record;
  variant_data record;
  v_subtotal numeric;
BEGIN
  IF user_id IS NULL AND guest_token IS NOT NULL THEN
    guest_token_expires := NOW() + INTERVAL '1 month';
  ELSE
    guest_token_expires := NULL;
  END IF;

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

  FOR item IN SELECT * FROM jsonb_to_recordset(items) AS (
    product_id uuid,
    variant_id uuid,
    quantity int,
    unit_price numeric
  )
  LOOP
    PERFORM 1 FROM public.inventory
    WHERE variant_id = item.variant_id
      AND (quantity - reserved_quantity) >= item.quantity
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient inventory for variant %', item.variant_id;
    END IF;

    SELECT p.name AS product_name, p.sku AS product_sku
    INTO product_data
    FROM public.products p
    WHERE p.id = item.product_id;

    SELECT pv.name AS variant_name, pv.sku AS variant_sku
    INTO variant_data
    FROM public.product_variants pv
    WHERE pv.id = item.variant_id;

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

    UPDATE public.inventory
    SET reserved_quantity = reserved_quantity + item.quantity,
        updated_at = now()
    WHERE variant_id = item.variant_id;
  END LOOP;

  SELECT COALESCE(SUM(total_price), 0)
  INTO v_subtotal
  FROM public.order_items
  WHERE order_id = new_order_id;

  UPDATE public.orders
  SET
    subtotal = v_subtotal,
    tax_amount = COALESCE(p_tax_amount, 0),
    shipping_amount = COALESCE(p_shipping_amount, 0),
    discount_amount = COALESCE(p_discount_amount, 0),
    total_amount = v_subtotal
      + COALESCE(p_tax_amount, 0)
      + COALESCE(p_shipping_amount, 0)
      - COALESCE(p_discount_amount, 0),
    updated_at = now()
  WHERE id = new_order_id;

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

  IF user_id IS NOT NULL THEN
    DELETE FROM public.cart_items ci
    WHERE ci.user_id = create_order.user_id
      AND ci.variant_id IN (
        SELECT oi.variant_id
        FROM public.order_items oi
        WHERE oi.order_id = new_order_id
      );
  ELSE
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

  SELECT row_to_json(o.*) INTO created_order
  FROM (
    SELECT *
    FROM public.orders
    WHERE id = new_order_id
  ) o;

  RETURN created_order;
END;
$$;


--
-- Name: FUNCTION create_order(user_id uuid, email text, phone text, items jsonb, billing_address jsonb, shipping_address jsonb, notes text, session_id text, payment_method text, guest_token text, p_tax_amount numeric, p_shipping_amount numeric, p_discount_amount numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_order(user_id uuid, email text, phone text, items jsonb, billing_address jsonb, shipping_address jsonb, notes text, session_id text, payment_method text, guest_token text, p_tax_amount numeric, p_shipping_amount numeric, p_discount_amount numeric) IS 'Creates order with line items; applies tax/shipping/discount to total and payment amount.';


--
-- Name: decrease_stock(uuid, integer, uuid, uuid, uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrease_stock(p_variant_id uuid, p_quantity integer, p_order_id uuid DEFAULT NULL::uuid, p_order_item_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_reference_number text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_location text DEFAULT 'main'::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_movement_id UUID;
  v_current_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  SELECT COALESCE(quantity, 0) INTO v_current_quantity
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  IF v_current_quantity < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient stock. Available: ' || v_current_quantity || ', Required: ' || p_quantity
    );
  END IF;

  v_new_quantity := v_current_quantity - p_quantity;

  UPDATE inventory
  SET
    quantity = quantity - p_quantity,
    updated_at = NOW()
  WHERE variant_id = p_variant_id AND location = p_location;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Inventory record not found for variant: ' || p_variant_id
    );
  END IF;

  v_movement_id := log_inventory_movement(
    p_variant_id,
    'sale',
    'customer_order',
    -p_quantity,
    p_order_id,
    p_order_item_id,
    p_user_id,
    p_reference_number,
    p_notes,
    NULL,
    p_location
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Stock decreased successfully',
    'data', jsonb_build_object(
      'variant_id', p_variant_id,
      'location', p_location,
      'quantity_decreased', p_quantity,
      'previous_quantity', v_current_quantity,
      'new_quantity', v_new_quantity,
      'movement_id', v_movement_id
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to decrease stock: ' || SQLERRM
    );
END;
$$;


--
-- Name: get_guest_order(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_guest_order(p_order_id uuid, p_guest_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_order_id IS NULL OR p_guest_token IS NULL OR length(trim(p_guest_token)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT
    jsonb_build_object(
      'id', o.id,
      'order_number', o.order_number,
      'status', o.status,
      'payment_status', o.payment_status,
      'fulfillment_status', o.fulfillment_status,
      'subtotal', o.subtotal,
      'tax_amount', o.tax_amount,
      'shipping_amount', o.shipping_amount,
      'discount_amount', o.discount_amount,
      'total_amount', o.total_amount,
      'created_at', o.created_at,
      'order_items',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'variant_id', oi.variant_id,
              'product_name', oi.product_name,
              'variant_name', oi.variant_name,
              'sku', oi.sku,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
              'product',
              (
                SELECT jsonb_build_object(
                  'id', p.id,
                  'name', p.name,
                  'slug', p.slug,
                  'images',
                  COALESCE(
                    (
                      SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', pi.id,
                          'url', pi.url,
                          'alt_text', pi.alt_text,
                          'is_primary', pi.is_primary,
                          'sort_order', pi.sort_order
                        )
                        ORDER BY pi.is_primary DESC NULLS LAST, pi.sort_order NULLS LAST
                      )
                      FROM public.product_images pi
                      WHERE pi.product_id = p.id
                    ),
                    '[]'::jsonb
                  )
                )
                FROM public.products p
                WHERE p.id = oi.product_id
              ),
              'variant',
              (
                SELECT jsonb_build_object(
                  'id', pv.id,
                  'name', pv.name,
                  'size', pv.size,
                  'color', pv.color
                )
                FROM public.product_variants pv
                WHERE pv.id = oi.variant_id
              )
            )
            ORDER BY oi.created_at
          )
          FROM public.order_items oi
          WHERE oi.order_id = o.id
        ),
        '[]'::jsonb
      )
    )
  INTO result
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.guest_token = p_guest_token
    AND (o.guest_token_expires IS NULL OR o.guest_token_expires > now());

  RETURN result;
END;
$$;


--
-- Name: FUNCTION get_guest_order(p_order_id uuid, p_guest_token text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_guest_order(p_order_id uuid, p_guest_token text) IS 'Returns order confirmation fields + line items with product images when guest_token matches.';


--
-- Name: get_inventory_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_inventory_summary(p_product_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_result JSONB;
  v_variant_summary JSONB[] := '{}';
  v_variant RECORD;
  v_total_stock INTEGER := 0;
  v_total_reserved INTEGER := 0;
  v_total_available INTEGER := 0;
  v_low_stock_variants INTEGER := 0;
BEGIN
  -- Get variant summaries
  FOR v_variant IN
    SELECT
      pv.id as variant_id,
      pv.name as variant_name,
      pv.sku,
      pv.size,
      pv.color,
      COALESCE(i.quantity, 0) as stock_quantity,
      COALESCE(i.reserved_quantity, 0) as reserved_quantity,
      COALESCE(i.available_quantity, 0) as available_quantity,
      COALESCE(i.reorder_point, 0) as reorder_point,
      COALESCE(i.reorder_quantity, 0) as reorder_quantity,
      p.low_stock_threshold,
      CASE WHEN COALESCE(i.quantity, 0) <= COALESCE(p.low_stock_threshold, 10) THEN true ELSE false END as is_low_stock
    FROM product_variants pv
    LEFT JOIN inventory i ON pv.id = i.variant_id
    JOIN products p ON pv.product_id = p.id
    WHERE pv.product_id = p_product_id
    ORDER BY pv.sort_order, pv.name
  LOOP
    v_variant_summary := array_append(v_variant_summary, to_jsonb(v_variant));

    v_total_stock := v_total_stock + v_variant.stock_quantity;
    v_total_reserved := v_total_reserved + v_variant.reserved_quantity;
    v_total_available := v_total_available + v_variant.available_quantity;

    IF v_variant.is_low_stock THEN
      v_low_stock_variants := v_low_stock_variants + 1;
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'product_id', p_product_id,
    'total_stock', v_total_stock,
    'total_reserved', v_total_reserved,
    'total_available', v_total_available,
    'low_stock_variants', v_low_stock_variants,
    'total_variants', array_length(v_variant_summary, 1),
    'variants', to_jsonb(v_variant_summary)
  );

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION get_inventory_summary(p_product_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_inventory_summary(p_product_id uuid) IS 'Returns comprehensive inventory summary for a product';


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user has admin role in their profile
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (preferences->>'role' = 'admin' OR preferences->>'role' = 'super_admin')
  );
END;
$$;


--
-- Name: FUNCTION is_admin(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_admin() IS 'Check if current user has admin privileges';


--
-- Name: log_inventory_movement(uuid, public.movement_type, public.movement_reason, integer, uuid, uuid, uuid, text, text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_inventory_movement(p_variant_id uuid, p_movement_type public.movement_type, p_reason public.movement_reason, p_quantity integer, p_order_id uuid DEFAULT NULL::uuid, p_order_item_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_reference_number text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_cost_per_unit numeric DEFAULT NULL::numeric, p_location text DEFAULT 'main'::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_movement_id UUID;
  v_previous_quantity INTEGER;
  v_new_quantity INTEGER;
  v_on_hand INTEGER;
  v_total_cost DECIMAL(10,2);
BEGIN
  v_on_hand := COALESCE(
    (
      SELECT quantity
      FROM inventory
      WHERE variant_id = p_variant_id AND location = p_location
      LIMIT 1
    ),
    0
  );

  IF p_movement_type IN ('reserve', 'unreserve')
     OR (p_movement_type = 'sale' AND p_reason = 'customer_order') THEN
    v_previous_quantity := v_on_hand;
    v_new_quantity := v_on_hand;
  ELSE
    v_new_quantity := v_on_hand;
    v_previous_quantity := v_on_hand - p_quantity;
  END IF;

  v_total_cost := p_quantity * COALESCE(p_cost_per_unit, 0);

  INSERT INTO inventory_movements (
    variant_id,
    movement_type,
    reason,
    quantity,
    previous_quantity,
    new_quantity,
    order_id,
    order_item_id,
    user_id,
    reference_number,
    notes,
    cost_per_unit,
    total_cost,
    location
  ) VALUES (
    p_variant_id,
    p_movement_type,
    p_reason,
    p_quantity,
    v_previous_quantity,
    v_new_quantity,
    p_order_id,
    p_order_item_id,
    p_user_id,
    p_reference_number,
    p_notes,
    p_cost_per_unit,
    v_total_cost,
    p_location
  ) RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$;


--
-- Name: FUNCTION log_inventory_movement(p_variant_id uuid, p_movement_type public.movement_type, p_reason public.movement_reason, p_quantity integer, p_order_id uuid, p_order_item_id uuid, p_user_id uuid, p_reference_number text, p_notes text, p_cost_per_unit numeric, p_location text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_inventory_movement(p_variant_id uuid, p_movement_type public.movement_type, p_reason public.movement_reason, p_quantity integer, p_order_id uuid, p_order_item_id uuid, p_user_id uuid, p_reference_number text, p_notes text, p_cost_per_unit numeric, p_location text) IS 'Logs inventory movements. previous_quantity/new_quantity reflect on-hand quantity; for reserve/unreserve and sale+customer_order (reserved-only change), both match current on-hand.';


--
-- Name: process_order_completion(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_order_completion(p_order_id uuid, p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_result JSONB;
  v_order_item RECORD;
  v_movement_id UUID;
  v_processed_items JSONB[] := '{}';
  v_total_processed INTEGER := 0;
BEGIN
  -- Get order status
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = p_order_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Order not found'
    );
  END IF;

  -- Process each order item
  FOR v_order_item IN
    SELECT oi.id, oi.variant_id, oi.quantity, oi.product_name, oi.variant_name
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    -- Convert reserved stock to sold (decrease reserved quantity)
    UPDATE inventory
    SET reserved_quantity = reserved_quantity - v_order_item.quantity
    WHERE variant_id = v_order_item.variant_id;

    -- Log movement
    v_movement_id := log_inventory_movement(
      v_order_item.variant_id,
      'sale',
      'customer_order',
      -v_order_item.quantity, -- Negative for decrease
      p_order_id,
      v_order_item.id,
      p_user_id,
      NULL, -- reference_number
      'Stock sold - order completed',
      NULL, -- cost_per_unit
      'main'
    );

    -- Add to processed items
    v_processed_items := array_append(v_processed_items, jsonb_build_object(
      'order_item_id', v_order_item.id,
      'variant_id', v_order_item.variant_id,
      'product_name', v_order_item.product_name,
      'variant_name', v_order_item.variant_name,
      'quantity_sold', v_order_item.quantity,
      'movement_id', v_movement_id
    ));

    v_total_processed := v_total_processed + v_order_item.quantity;
  END LOOP;

  v_result := jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total_items_processed', array_length(v_processed_items, 1),
    'total_quantity_sold', v_total_processed,
    'processed_items', to_jsonb(v_processed_items),
    'message', 'Order completion processed successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to process order completion'
    );
END;
$$;


--
-- Name: FUNCTION process_order_completion(p_order_id uuid, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.process_order_completion(p_order_id uuid, p_user_id uuid) IS 'Converts reserved stock to sold stock';


--
-- Name: product_images_enforce_single_primary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.product_images_enforce_single_primary() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.is_primary IS TRUE THEN
    UPDATE public.product_images
    SET is_primary = FALSE
    WHERE product_id = NEW.product_id
      AND is_primary = TRUE
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: release_inventory_for_deleted_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_inventory_for_deleted_order() RETURNS trigger
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


--
-- Name: FUNCTION release_inventory_for_deleted_order(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.release_inventory_for_deleted_order() IS 'Before an order row is deleted, restores inventory.quantity and releases
   reserved_quantity for every line item, mirroring what the cancel API does.';


--
-- Name: reserve_stock(uuid, integer, uuid, uuid, uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_stock(p_variant_id uuid, p_quantity integer, p_order_id uuid DEFAULT NULL::uuid, p_order_item_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_reference_number text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_location text DEFAULT 'main'::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_movement_id UUID;
  v_current_quantity INTEGER;
  v_current_reserved INTEGER;
  v_new_reserved INTEGER;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  SELECT
    COALESCE(quantity, 0),
    COALESCE(reserved_quantity, 0)
  INTO v_current_quantity, v_current_reserved
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  IF (v_current_quantity - v_current_reserved) < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient available stock. Available: ' || (v_current_quantity - v_current_reserved) || ', Required: ' || p_quantity
    );
  END IF;

  v_new_reserved := v_current_reserved + p_quantity;

  UPDATE inventory
  SET
    reserved_quantity = reserved_quantity + p_quantity,
    updated_at = NOW()
  WHERE variant_id = p_variant_id AND location = p_location;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Inventory record not found for variant: ' || p_variant_id
    );
  END IF;

  v_movement_id := log_inventory_movement(
    p_variant_id,
    'reserve',
    'checkout_reserve',
    p_quantity,
    p_order_id,
    p_order_item_id,
    p_user_id,
    p_reference_number,
    p_notes,
    NULL,
    p_location
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Stock reserved successfully',
    'data', jsonb_build_object(
      'variant_id', p_variant_id,
      'location', p_location,
      'quantity_reserved', p_quantity,
      'previous_reserved', v_current_reserved,
      'new_reserved', v_new_reserved,
      'available_quantity', v_current_quantity - v_new_reserved,
      'movement_id', v_movement_id
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to reserve stock: ' || SQLERRM
    );
END;
$$;


--
-- Name: restock_inventory(uuid, integer, numeric, text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restock_inventory(p_variant_id uuid, p_quantity integer, p_cost_per_unit numeric DEFAULT NULL::numeric, p_reference_number text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_location text DEFAULT 'main'::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_result JSONB;
  v_movement_id UUID;
  v_current_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  -- Get current quantity
  SELECT COALESCE(quantity, 0) INTO v_current_quantity
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Calculate new quantity
  v_new_quantity := v_current_quantity + p_quantity;

  -- Update inventory using UPSERT
  INSERT INTO inventory (variant_id, quantity, location)
  VALUES (p_variant_id, p_quantity, p_location)
  ON CONFLICT (variant_id, location)
  DO UPDATE SET
    quantity = inventory.quantity + p_quantity,
    updated_at = NOW();

  -- Log movement
  v_movement_id := log_inventory_movement(
    p_variant_id,
    'restock',
    'purchase_order',
    p_quantity,
    NULL, -- order_id
    NULL, -- order_item_id
    p_user_id,
    p_reference_number,
    p_notes,
    p_cost_per_unit,
    p_location
  );

  -- Get updated quantity
  SELECT quantity INTO v_new_quantity
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Inventory restocked successfully',
    'data', jsonb_build_object(
      'variant_id', p_variant_id,
      'location', p_location,
      'quantity_added', p_quantity,
      'previous_quantity', v_current_quantity,
      'new_quantity', v_new_quantity,
      'movement_id', v_movement_id
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to restock inventory: ' || SQLERRM
    );
END;
$$;


--
-- Name: FUNCTION restock_inventory(p_variant_id uuid, p_quantity integer, p_cost_per_unit numeric, p_reference_number text, p_notes text, p_user_id uuid, p_location text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.restock_inventory(p_variant_id uuid, p_quantity integer, p_cost_per_unit numeric, p_reference_number text, p_notes text, p_user_id uuid, p_location text) IS 'Tested and working - increases stock quantity and logs movement';


--
-- Name: return_item(uuid, uuid, integer, text, boolean, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.return_item(p_order_id uuid, p_order_item_id uuid, p_quantity integer, p_reason text DEFAULT NULL::text, p_is_resellable boolean DEFAULT true, p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_result JSONB;
  v_order_item RECORD;
  v_movement_id UUID;
  v_current_quantity INTEGER;
  v_new_status order_status;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  SELECT oi.*, o.status AS order_status
  INTO v_order_item
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE oi.id = p_order_item_id AND oi.order_id = p_order_id;

  IF v_order_item.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Order item not found'
    );
  END IF;

  IF p_quantity > v_order_item.quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Return quantity cannot exceed ordered quantity',
      'ordered_quantity', v_order_item.quantity,
      'return_quantity', p_quantity
    );
  END IF;

  IF v_order_item.order_status NOT IN ('delivered', 'shipped') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Order must be delivered or shipped to process return'
    );
  END IF;

  IF p_is_resellable THEN
    SELECT COALESCE(quantity, 0) INTO v_current_quantity
    FROM inventory
    WHERE variant_id = v_order_item.variant_id;

    UPDATE inventory
    SET quantity = quantity + p_quantity
    WHERE variant_id = v_order_item.variant_id;

    v_movement_id := log_inventory_movement(
      v_order_item.variant_id,
      'return',
      'customer_return',
      p_quantity,
      p_order_id,
      p_order_item_id,
      p_user_id,
      NULL,
      'Stock restored from customer return' ||
      CASE WHEN p_reason IS NOT NULL THEN ': ' || p_reason ELSE '' END,
      NULL,
      'main'
    );
  END IF;

  v_new_status := CASE
    WHEN (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = p_order_id) =
         (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
          WHERE oi.order_id = p_order_id AND oi.id = p_order_item_id)
    THEN 'refunded'::order_status
    ELSE 'processing'::order_status
  END;

  UPDATE orders
  SET
    status = v_new_status,
    internal_notes = COALESCE(internal_notes, '') ||
      CASE WHEN internal_notes IS NOT NULL THEN '; ' ELSE '' END ||
      'Item returned on ' || NOW()::TEXT ||
      CASE WHEN p_reason IS NOT NULL THEN ': ' || p_reason ELSE '' END,
    updated_at = NOW()
  WHERE id = p_order_id;

  v_result := jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_item_id', p_order_item_id,
    'quantity_returned', p_quantity,
    'is_resellable', p_is_resellable,
    'stock_restored', p_is_resellable,
    'movement_id', CASE WHEN p_is_resellable THEN v_movement_id ELSE NULL END,
    'new_order_status', v_new_status::text,
    'message', 'Item return processed successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to process item return'
    );
END;
$$;


--
-- Name: FUNCTION return_item(p_order_id uuid, p_order_item_id uuid, p_quantity integer, p_reason text, p_is_resellable boolean, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.return_item(p_order_id uuid, p_order_item_id uuid, p_quantity integer, p_reason text, p_is_resellable boolean, p_user_id uuid) IS 'Processes item returns and optionally restores stock';


--
-- Name: unreserve_stock(uuid, integer, uuid, uuid, uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unreserve_stock(p_variant_id uuid, p_quantity integer, p_order_id uuid DEFAULT NULL::uuid, p_order_item_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_reference_number text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_location text DEFAULT 'main'::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_result JSONB;
  v_movement_id UUID;
  v_current_quantity INTEGER;
  v_current_reserved INTEGER;
  v_new_reserved INTEGER;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  -- Get current quantities
  SELECT
    COALESCE(quantity, 0),
    COALESCE(reserved_quantity, 0)
  INTO v_current_quantity, v_current_reserved
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Check if we have enough reserved stock
  IF v_current_reserved < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient reserved stock. Reserved: ' || v_current_reserved || ', Required: ' || p_quantity
    );
  END IF;

  -- Calculate new reserved quantity
  v_new_reserved := v_current_reserved - p_quantity;

  -- Update inventory
  UPDATE inventory
  SET
    reserved_quantity = reserved_quantity - p_quantity,
    updated_at = NOW()
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Inventory record not found for variant: ' || p_variant_id
    );
  END IF;

  -- Log movement
  v_movement_id := log_inventory_movement(
    p_variant_id,
    'unreserve',
    'payment_failed',
    -p_quantity, -- Negative quantity for unreserve
    p_order_id,
    p_order_item_id,
    p_user_id,
    p_reference_number,
    p_notes,
    NULL, -- cost_per_unit
    p_location
  );

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Stock unreserved successfully',
    'data', jsonb_build_object(
      'variant_id', p_variant_id,
      'location', p_location,
      'quantity_unreserved', p_quantity,
      'previous_reserved', v_current_reserved,
      'new_reserved', v_new_reserved,
      'available_quantity', v_current_quantity - v_new_reserved,
      'movement_id', v_movement_id
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to unreserve stock: ' || SQLERRM
    );
END;
$$;


--
-- Name: update_product(uuid, text, text, text, text, text, uuid, uuid, public.product_gender, text, text, numeric, jsonb, numeric, numeric, boolean, boolean, boolean, boolean, integer, integer, text, text, text[], integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product(p_product_id uuid, p_name text DEFAULT NULL::text, p_slug text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_short_description text DEFAULT NULL::text, p_sku text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_brand_id uuid DEFAULT NULL::uuid, p_gender public.product_gender DEFAULT NULL::public.product_gender, p_material text DEFAULT NULL::text, p_care_instructions text DEFAULT NULL::text, p_weight numeric DEFAULT NULL::numeric, p_dimensions jsonb DEFAULT NULL::jsonb, p_base_price numeric DEFAULT NULL::numeric, p_compare_at_price numeric DEFAULT NULL::numeric, p_is_featured boolean DEFAULT NULL::boolean, p_requires_shipping boolean DEFAULT NULL::boolean, p_track_inventory boolean DEFAULT NULL::boolean, p_allow_backorder boolean DEFAULT NULL::boolean, p_min_order_quantity integer DEFAULT NULL::integer, p_max_order_quantity integer DEFAULT NULL::integer, p_meta_title text DEFAULT NULL::text, p_meta_description text DEFAULT NULL::text, p_tags text[] DEFAULT NULL::text[], p_low_stock_threshold integer DEFAULT NULL::integer, p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $_$
DECLARE
  v_result JSONB;
  v_update_fields TEXT := '';
  v_field_value TEXT;
BEGIN
  -- Build dynamic update query
  IF p_name IS NOT NULL THEN
    v_update_fields := v_update_fields || 'name = $2, ';
  END IF;
  IF p_slug IS NOT NULL THEN
    v_update_fields := v_update_fields || 'slug = $3, ';
  END IF;
  IF p_description IS NOT NULL THEN
    v_update_fields := v_update_fields || 'description = $4, ';
  END IF;
  IF p_short_description IS NOT NULL THEN
    v_update_fields := v_update_fields || 'short_description = $5, ';
  END IF;
  IF p_sku IS NOT NULL THEN
    v_update_fields := v_update_fields || 'sku = $6, ';
  END IF;
  IF p_category_id IS NOT NULL THEN
    v_update_fields := v_update_fields || 'category_id = $7, ';
  END IF;
  IF p_brand_id IS NOT NULL THEN
    v_update_fields := v_update_fields || 'brand_id = $8, ';
  END IF;
  IF p_gender IS NOT NULL THEN
    v_update_fields := v_update_fields || 'gender = $9, ';
  END IF;
  IF p_material IS NOT NULL THEN
    v_update_fields := v_update_fields || 'material = $10, ';
  END IF;
  IF p_care_instructions IS NOT NULL THEN
    v_update_fields := v_update_fields || 'care_instructions = $11, ';
  END IF;
  IF p_weight IS NOT NULL THEN
    v_update_fields := v_update_fields || 'weight = $12, ';
  END IF;
  IF p_dimensions IS NOT NULL THEN
    v_update_fields := v_update_fields || 'dimensions = $13, ';
  END IF;
  IF p_base_price IS NOT NULL THEN
    v_update_fields := v_update_fields || 'base_price = $14, ';
  END IF;
  IF p_compare_at_price IS NOT NULL THEN
    v_update_fields := v_update_fields || 'compare_at_price = $15, ';
  END IF;
  IF p_is_featured IS NOT NULL THEN
    v_update_fields := v_update_fields || 'is_featured = $16, ';
  END IF;
  IF p_requires_shipping IS NOT NULL THEN
    v_update_fields := v_update_fields || 'requires_shipping = $17, ';
  END IF;
  IF p_track_inventory IS NOT NULL THEN
    v_update_fields := v_update_fields || 'track_inventory = $18, ';
  END IF;
  IF p_allow_backorder IS NOT NULL THEN
    v_update_fields := v_update_fields || 'allow_backorder = $19, ';
  END IF;
  IF p_min_order_quantity IS NOT NULL THEN
    v_update_fields := v_update_fields || 'min_order_quantity = $20, ';
  END IF;
  IF p_max_order_quantity IS NOT NULL THEN
    v_update_fields := v_update_fields || 'max_order_quantity = $21, ';
  END IF;
  IF p_meta_title IS NOT NULL THEN
    v_update_fields := v_update_fields || 'meta_title = $22, ';
  END IF;
  IF p_meta_description IS NOT NULL THEN
    v_update_fields := v_update_fields || 'meta_description = $23, ';
  END IF;
  IF p_tags IS NOT NULL THEN
    v_update_fields := v_update_fields || 'tags = $24, ';
  END IF;
  IF p_low_stock_threshold IS NOT NULL THEN
    v_update_fields := v_update_fields || 'low_stock_threshold = $25, ';
  END IF;

  -- Remove trailing comma and space
  v_update_fields := rtrim(v_update_fields, ', ');

  IF v_update_fields = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No fields to update'
    );
  END IF;

  -- Execute update
  EXECUTE format('UPDATE products SET %s, updated_at = NOW() WHERE id = $1', v_update_fields)
  USING p_product_id, p_name, p_slug, p_description, p_short_description, p_sku,
        p_category_id, p_brand_id, p_gender, p_material, p_care_instructions,
        p_weight, p_dimensions, p_base_price, p_compare_at_price,
        p_is_featured, p_requires_shipping, p_track_inventory, p_allow_backorder,
        p_min_order_quantity, p_max_order_quantity, p_meta_title, p_meta_description,
        p_tags, p_low_stock_threshold;

  -- Check if any rows were updated
  IF FOUND THEN
    v_result := jsonb_build_object(
      'success', true,
      'product_id', p_product_id,
      'message', 'Product updated successfully'
    );
  ELSE
    v_result := jsonb_build_object(
      'success', false,
      'message', 'Product not found'
    );
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to update product'
    );
END;
$_$;


--
-- Name: FUNCTION update_product(p_product_id uuid, p_name text, p_slug text, p_description text, p_short_description text, p_sku text, p_category_id uuid, p_brand_id uuid, p_gender public.product_gender, p_material text, p_care_instructions text, p_weight numeric, p_dimensions jsonb, p_base_price numeric, p_compare_at_price numeric, p_is_featured boolean, p_requires_shipping boolean, p_track_inventory boolean, p_allow_backorder boolean, p_min_order_quantity integer, p_max_order_quantity integer, p_meta_title text, p_meta_description text, p_tags text[], p_low_stock_threshold integer, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_product(p_product_id uuid, p_name text, p_slug text, p_description text, p_short_description text, p_sku text, p_category_id uuid, p_brand_id uuid, p_gender public.product_gender, p_material text, p_care_instructions text, p_weight numeric, p_dimensions jsonb, p_base_price numeric, p_compare_at_price numeric, p_is_featured boolean, p_requires_shipping boolean, p_track_inventory boolean, p_allow_backorder boolean, p_min_order_quantity integer, p_max_order_quantity integer, p_meta_title text, p_meta_description text, p_tags text[], p_low_stock_threshold integer, p_user_id uuid) IS 'Updates product details with dynamic field updates (cost_price removed)';


--
-- Name: update_product_stock_quantity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_stock_quantity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update the product's total stock quantity
  UPDATE products
  SET stock_quantity = (
    SELECT COALESCE(SUM(i.quantity), 0)
    FROM inventory i
    JOIN product_variants pv ON i.variant_id = pv.id
    WHERE pv.product_id = (
      SELECT pv2.product_id
      FROM product_variants pv2
      WHERE pv2.id = NEW.variant_id
    )
  )
  WHERE id = (
    SELECT pv.product_id
    FROM product_variants pv
    WHERE pv.id = NEW.variant_id
  );

  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    logo_url text,
    website_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE brands; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.brands IS 'RLS enabled - public access to active brands, admin access to all';


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id text,
    product_id uuid,
    variant_id uuid,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: TABLE cart_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cart_items IS 'RLS enabled - users manage own cart, guests use session_id';


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    parent_id uuid,
    image_url text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.categories IS 'RLS enabled - public access to active categories, admin access to all';


--
-- Name: chat_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    model text NOT NULL,
    latency_ms integer NOT NULL,
    retrieval_latency_ms integer,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    tool_calls jsonb DEFAULT '{}'::jsonb NOT NULL,
    retrieval_result_count integer,
    retrieval_top_score numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id uuid NOT NULL,
    intent_summary text,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE conversations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversations IS 'Chat conversations. user_id is null for guests. last_activity_at drives retention: guests are cleaned up after 48h, users after 90d (see /internal/chat/cleanup).';


--
-- Name: courier_tracking_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courier_tracking_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    provider text DEFAULT 'steadfast'::text NOT NULL,
    status text,
    message text,
    raw jsonb DEFAULT '{}'::jsonb NOT NULL,
    event_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE courier_tracking_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.courier_tracking_events IS 'Courier parcel tracking timeline — one row per status/tracking update (webhook or reconciliation poll). Backend-only (RLS enabled, no policies).';


--
-- Name: guest_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guest_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: import_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source text NOT NULL,
    status public.import_job_status DEFAULT 'pending'::public.import_job_status NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    processed_rows integer DEFAULT 0 NOT NULL,
    succeeded integer DEFAULT 0 NOT NULL,
    failed integer DEFAULT 0 NOT NULL,
    created_by uuid,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone
);


--
-- Name: import_rows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_rows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    row_number integer NOT NULL,
    source text NOT NULL,
    external_id text NOT NULL,
    payload jsonb NOT NULL,
    status public.import_row_status DEFAULT 'pending'::public.import_row_status NOT NULL,
    product_id uuid,
    error text,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid,
    location text DEFAULT 'main'::text,
    quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0,
    available_quantity integer GENERATED ALWAYS AS ((quantity - reserved_quantity)) STORED,
    reorder_point integer DEFAULT 0,
    reorder_quantity integer DEFAULT 0,
    last_counted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE inventory; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inventory IS 'RLS enabled - public access to inventory data, admin access to all';


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid,
    movement_type public.movement_type NOT NULL,
    reason public.movement_reason NOT NULL,
    quantity integer NOT NULL,
    previous_quantity integer NOT NULL,
    new_quantity integer NOT NULL,
    reserved_quantity integer DEFAULT 0,
    location text DEFAULT 'main'::text,
    order_id uuid,
    order_item_id uuid,
    user_id uuid,
    reference_number text,
    notes text,
    cost_per_unit numeric(10,2),
    total_cost numeric(10,2),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE inventory_movements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inventory_movements IS 'RLS enabled — only admins may SELECT/INSERT/UPDATE/DELETE directly; service/definer paths unaffected.';


--
-- Name: kb_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_type public.kb_source_type NOT NULL,
    source_id text,
    title text,
    content text NOT NULL,
    embedding extensions.vector(1024) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fts tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || content))) STORED
);


--
-- Name: TABLE kb_chunks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kb_chunks IS 'RAG knowledge base for the customer chatbot — one row per embedded chunk (product, policy, or FAQ). embedding is voyage-3 (1024-dim).';


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role public.chat_role NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS 'Individual chat turns. Cascade-deletes with its conversation — no separate cleanup needed.';


--
-- Name: meta_capi_sent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meta_capi_sent (
    order_id uuid NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE meta_capi_sent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.meta_capi_sent IS 'Tracks orders for which a Meta CAPI Purchase event was sent (dedupe webhook retries).';


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    product_id uuid,
    variant_id uuid,
    product_name text NOT NULL,
    variant_name text,
    sku text,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: order_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    user_id uuid,
    email text,
    phone text,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0,
    shipping_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    status public.order_status DEFAULT 'pending'::public.order_status,
    payment_status public.payment_status DEFAULT 'pending'::public.payment_status,
    fulfillment_status public.fulfillment_status DEFAULT 'unfulfilled'::public.fulfillment_status,
    shipping_method_id uuid,
    tracking_number text,
    estimated_delivery_date date,
    billing_address jsonb NOT NULL,
    shipping_address jsonb NOT NULL,
    notes text,
    internal_notes text,
    source text DEFAULT 'web'::text,
    session_id text,
    guest_token text,
    guest_token_expires timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    payment_method text DEFAULT 'cash'::text NOT NULL,
    shipping_name text,
    shipping_phone text,
    shipping_email text,
    shipping_district text,
    shipping_upazila text,
    courier_provider text,
    courier_consignment_id bigint,
    courier_status text,
    courier_status_updated_at timestamp with time zone
);


--
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orders IS 'RLS: users see own rows; admins full access; guests use order confirmation token flow.';


--
-- Name: COLUMN orders.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.email IS 'Customer email; NULL when not provided (e.g. guest checkout without email).';


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    payment_method public.payment_method NOT NULL,
    payment_intent_id text,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text,
    status text DEFAULT 'pending'::text,
    gateway_response jsonb,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text])))
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_id uuid,
    url text NOT NULL,
    alt_text text,
    sort_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE product_images; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_images IS 'RLS enabled - public access to all images, admin access to all';


--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    user_id uuid,
    order_id uuid,
    rating integer NOT NULL,
    title text,
    content text,
    is_verified_purchase boolean DEFAULT false,
    is_approved boolean DEFAULT false,
    helpful_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: TABLE product_reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_reviews IS 'RLS enabled - public sees approved reviews, users manage own reviews';


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    sku text,
    name text,
    size text,
    color text,
    color_code text,
    material text,
    weight numeric(8,2),
    price numeric(10,2),
    compare_at_price numeric(10,2),
    barcode text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    stock integer DEFAULT 0 NOT NULL,
    reserved_stock integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE product_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_variants IS 'RLS enabled - public access to active variants, admin access to all';


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    short_description text,
    sku text,
    category_id uuid,
    brand_id uuid,
    gender public.product_gender DEFAULT 'unisex'::public.product_gender,
    material text,
    care_instructions text,
    weight numeric(8,2),
    dimensions jsonb,
    base_price numeric(10,2) NOT NULL,
    compare_at_price numeric(10,2),
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    is_digital boolean DEFAULT false,
    requires_shipping boolean DEFAULT true,
    track_inventory boolean DEFAULT true,
    allow_backorder boolean DEFAULT false,
    min_order_quantity integer DEFAULT 1,
    max_order_quantity integer,
    meta_title text,
    meta_description text,
    tags text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    stock_quantity integer DEFAULT 0,
    low_stock_threshold integer DEFAULT 10,
    external_id text,
    source text
);


--
-- Name: TABLE products; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.products IS 'RLS enabled - public access to active products, admin access to all';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text,
    last_name text,
    phone text,
    date_of_birth date,
    gender public.user_gender,
    avatar_url text,
    preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'RLS enabled - users can manage own profile, admins can manage all';


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type public.address_type DEFAULT 'shipping'::public.address_type,
    is_default boolean DEFAULT false,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    label text,
    name text NOT NULL,
    address text NOT NULL,
    district text NOT NULL,
    upazila text NOT NULL
);


--
-- Name: wishlist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    product_id uuid,
    variant_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: brands brands_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_session_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_session_id_variant_id_key UNIQUE (session_id, variant_id);


--
-- Name: cart_items cart_items_user_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_variant_id_key UNIQUE (user_id, variant_id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: chat_metrics chat_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_metrics
    ADD CONSTRAINT chat_metrics_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: courier_tracking_events courier_tracking_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_tracking_events
    ADD CONSTRAINT courier_tracking_events_pkey PRIMARY KEY (id);


--
-- Name: guest_sessions guest_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_sessions
    ADD CONSTRAINT guest_sessions_pkey PRIMARY KEY (id);


--
-- Name: import_jobs import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_pkey PRIMARY KEY (id);


--
-- Name: import_rows import_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_rows
    ADD CONSTRAINT import_rows_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_variant_location_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_variant_location_unique UNIQUE (variant_id, location);


--
-- Name: CONSTRAINT inventory_variant_location_unique ON inventory; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT inventory_variant_location_unique ON public.inventory IS 'Ensures one inventory record per variant per location';


--
-- Name: kb_chunks kb_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_chunks
    ADD CONSTRAINT kb_chunks_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: meta_capi_sent meta_capi_sent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_capi_sent
    ADD CONSTRAINT meta_capi_sent_pkey PRIMARY KEY (order_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_product_id_user_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_user_id_order_id_key UNIQUE (product_id, user_id, order_id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: wishlist_items wishlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_pkey PRIMARY KEY (id);


--
-- Name: wishlist_items wishlist_items_user_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_user_id_variant_id_key UNIQUE (user_id, variant_id);


--
-- Name: idx_brands_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brands_is_active ON public.brands USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_cart_items_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_session ON public.cart_items USING btree (session_id);


--
-- Name: idx_cart_items_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_user ON public.cart_items USING btree (user_id);


--
-- Name: idx_categories_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_is_active ON public.categories USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_chat_metrics_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_metrics_created ON public.chat_metrics USING btree (created_at);


--
-- Name: idx_conversations_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_last_activity ON public.conversations USING btree (last_activity_at);


--
-- Name: idx_conversations_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_session ON public.conversations USING btree (session_id);


--
-- Name: idx_conversations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_user ON public.conversations USING btree (user_id);


--
-- Name: idx_courier_events_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_events_order ON public.courier_tracking_events USING btree (order_id, event_at);


--
-- Name: idx_import_rows_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_rows_job ON public.import_rows USING btree (job_id, status);


--
-- Name: idx_import_rows_job_external; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_import_rows_job_external ON public.import_rows USING btree (job_id, source, external_id);


--
-- Name: idx_inventory_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_available ON public.inventory USING btree (available_quantity);


--
-- Name: idx_inventory_movements_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_created ON public.inventory_movements USING btree (created_at);


--
-- Name: idx_inventory_movements_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_order ON public.inventory_movements USING btree (order_id);


--
-- Name: idx_inventory_movements_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_type ON public.inventory_movements USING btree (movement_type);


--
-- Name: idx_inventory_movements_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_variant ON public.inventory_movements USING btree (variant_id);


--
-- Name: idx_inventory_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_variant ON public.inventory USING btree (variant_id);


--
-- Name: idx_kb_chunks_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chunks_embedding ON public.kb_chunks USING hnsw (embedding extensions.vector_cosine_ops);


--
-- Name: idx_kb_chunks_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chunks_fts ON public.kb_chunks USING gin (fts);


--
-- Name: idx_kb_chunks_product_source; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_kb_chunks_product_source ON public.kb_chunks USING btree (source_id) WHERE (source_type = 'product'::public.kb_source_type);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id, created_at);


--
-- Name: idx_orders_courier_consignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_orders_courier_consignment ON public.orders USING btree (courier_consignment_id) WHERE (courier_consignment_id IS NOT NULL);


--
-- Name: idx_orders_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created ON public.orders USING btree (created_at);


--
-- Name: idx_orders_guest_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_guest_token ON public.orders USING btree (guest_token);


--
-- Name: idx_orders_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_session ON public.orders USING btree (session_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);


--
-- Name: idx_product_variants_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_is_active ON public.product_variants USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_active ON public.products USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_brand ON public.products USING btree (brand_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_featured ON public.products USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_products_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_active ON public.products USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name ON public.products USING gin (to_tsvector('english'::regconfig, name));


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_source_external; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_products_source_external ON public.products USING btree (source, external_id) WHERE ((source IS NOT NULL) AND (external_id IS NOT NULL));


--
-- Name: idx_products_stock_quantity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_stock_quantity ON public.products USING btree (stock_quantity);


--
-- Name: idx_reviews_approved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_approved ON public.product_reviews USING btree (is_approved) WHERE (is_approved = true);


--
-- Name: idx_reviews_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_product ON public.product_reviews USING btree (product_id);


--
-- Name: idx_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user ON public.product_reviews USING btree (user_id);


--
-- Name: product_images_one_primary_per_product; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_images_one_primary_per_product ON public.product_images USING btree (product_id) WHERE (is_primary = true);


--
-- Name: product_images enforce_single_primary; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_single_primary BEFORE INSERT OR UPDATE OF is_primary, product_id ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.product_images_enforce_single_primary();


--
-- Name: orders trg_orders_apply_inventory_on_fulfilled; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_orders_apply_inventory_on_fulfilled AFTER UPDATE OF fulfillment_status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_on_order_fulfilled();


--
-- Name: orders trg_orders_release_inventory_before_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_orders_release_inventory_before_delete BEFORE DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.release_inventory_for_deleted_order();


--
-- Name: brands update_brands_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_items update_cart_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory update_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_reviews update_product_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory update_product_stock_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_stock_trigger AFTER INSERT OR DELETE OR UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_quantity();


--
-- Name: product_variants update_product_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_addresses update_user_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: chat_metrics chat_metrics_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_metrics
    ADD CONSTRAINT chat_metrics_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: courier_tracking_events courier_tracking_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_tracking_events
    ADD CONSTRAINT courier_tracking_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: import_rows import_rows_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_rows
    ADD CONSTRAINT import_rows_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.import_jobs(id) ON DELETE CASCADE;


--
-- Name: import_rows import_rows_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_rows
    ADD CONSTRAINT import_rows_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: inventory_movements inventory_movements_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id);


--
-- Name: inventory_movements inventory_movements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: inventory_movements inventory_movements_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: meta_capi_sent meta_capi_sent_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_capi_sent
    ADD CONSTRAINT meta_capi_sent_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: product_reviews product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_addresses user_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: wishlist_items wishlist_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: wishlist_items wishlist_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: wishlist_items wishlist_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: user_addresses Admins can manage all addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all addresses" ON public.user_addresses TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: cart_items Admins can manage all cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all cart items" ON public.cart_items TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: order_items Admins can manage all order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all order items" ON public.order_items TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: orders Admins can manage all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all orders" ON public.orders TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: payments Admins can manage all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all payments" ON public.payments TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: profiles Admins can manage all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all profiles" ON public.profiles TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: product_reviews Admins can manage all reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all reviews" ON public.product_reviews TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: wishlist_items Admins can manage all wishlist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all wishlist items" ON public.wishlist_items TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: brands Admins can manage brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage brands" ON public.brands TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON public.categories TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: inventory Admins can manage inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage inventory" ON public.inventory TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: inventory_movements Admins can manage inventory movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage inventory movements" ON public.inventory_movements TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: product_images Admins can manage product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product images" ON public.product_images TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: product_variants Admins can manage product variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product variants" ON public.product_variants TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: products Admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage products" ON public.products TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: profiles Allow profile creation for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow profile creation for authenticated users" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: brands Anyone can view active brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active brands" ON public.brands FOR SELECT USING ((is_active = true));


--
-- Name: categories Anyone can view active categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING ((is_active = true));


--
-- Name: product_variants Anyone can view active product variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active product variants" ON public.product_variants FOR SELECT USING ((is_active = true));


--
-- Name: products Anyone can view active products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING ((is_active = true));


--
-- Name: product_reviews Anyone can view approved reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews FOR SELECT USING ((is_approved = true));


--
-- Name: inventory Anyone can view inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view inventory" ON public.inventory FOR SELECT USING (true);


--
-- Name: product_images Anyone can view product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);


--
-- Name: brands Authenticated users can view all brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all brands" ON public.brands FOR SELECT TO authenticated USING (true);


--
-- Name: categories Authenticated users can view all categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all categories" ON public.categories FOR SELECT TO authenticated USING (true);


--
-- Name: product_variants Authenticated users can view all product variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all product variants" ON public.product_variants FOR SELECT TO authenticated USING (true);


--
-- Name: products Authenticated users can view all products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all products" ON public.products FOR SELECT TO authenticated USING (true);


--
-- Name: cart_items Guests can manage cart with session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Guests can manage cart with session" ON public.cart_items USING ((((auth.uid() IS NULL) AND (session_id IS NOT NULL)) OR (auth.uid() = user_id)));


--
-- Name: user_addresses Users can delete own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own addresses" ON public.user_addresses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: cart_items Users can delete own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own cart items" ON public.cart_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: product_reviews Users can delete own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own reviews" ON public.product_reviews FOR DELETE USING (((auth.uid() = user_id) AND (is_approved = false)));


--
-- Name: wishlist_items Users can delete own wishlist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own wishlist items" ON public.wishlist_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_addresses Users can insert own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own addresses" ON public.user_addresses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: cart_items Users can insert own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own cart items" ON public.cart_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: product_reviews Users can insert own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own reviews" ON public.product_reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wishlist_items Users can insert own wishlist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own wishlist items" ON public.wishlist_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_addresses Users can update own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own addresses" ON public.user_addresses FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: cart_items Users can update own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own cart items" ON public.cart_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: product_reviews Users can update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reviews" ON public.product_reviews FOR UPDATE USING (((auth.uid() = user_id) AND (is_approved = false))) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_addresses Users can view own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own addresses" ON public.user_addresses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: cart_items Users can view own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own cart items" ON public.cart_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: order_items Users can view own order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid())))));


--
-- Name: orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: payments Users can view own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = payments.order_id) AND (orders.user_id = auth.uid())))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: product_reviews Users can view own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own reviews" ON public.product_reviews FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wishlist_items Users can view own wishlist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own wishlist items" ON public.wishlist_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: courier_tracking_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courier_tracking_events ENABLE ROW LEVEL SECURITY;

--
-- Name: guest_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: import_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: import_rows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_chunks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: meta_capi_sent; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meta_capi_sent ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: product_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

--
-- Name: product_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict ITiaHuDadsrRzbR7oSnSiUOaGGF2Gk8DJSNf7WvPiq8wFmtjFMImdxQzgeFAlJW

