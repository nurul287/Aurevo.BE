-- Fix supabase db lint errors on linked DB (fail-on error in CI).
-- 013 used movement_reason labels that were never added to the enum.
-- return_item assigned text literals to orders.status (order_status).

CREATE OR REPLACE FUNCTION decrease_stock(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_order_item_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_location TEXT DEFAULT 'main'
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reserve_stock(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_order_item_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_location TEXT DEFAULT 'main'
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION return_item(
  p_order_id UUID,
  p_order_item_id UUID,
  p_quantity INTEGER,
  p_reason TEXT DEFAULT NULL,
  p_is_resellable BOOLEAN DEFAULT TRUE,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql;
