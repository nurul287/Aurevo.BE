-- Order Management Stored Procedures
-- Migration: 011_order_management_procedures.sql

-- Cancel order and restore stock
CREATE OR REPLACE FUNCTION cancel_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql;

-- Return item and adjust stock
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
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  -- Get order item details
  SELECT oi.*, o.status as order_status
  INTO v_order_item
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE oi.id = p_order_item_id AND oi.order_id = p_order_id;

  -- Check if order item exists
  IF v_order_item.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Order item not found'
    );
  END IF;

  -- Check if return quantity is valid
  IF p_quantity > v_order_item.quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Return quantity cannot exceed ordered quantity',
      'ordered_quantity', v_order_item.quantity,
      'return_quantity', p_quantity
    );
  END IF;

  -- Check if order is in a returnable status
  IF v_order_item.order_status NOT IN ('delivered', 'shipped') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Order must be delivered or shipped to process return'
    );
  END IF;

  -- If item is resellable, restore stock
  IF p_is_resellable THEN
    -- Get current quantity
    SELECT COALESCE(quantity, 0) INTO v_current_quantity
    FROM inventory
    WHERE variant_id = v_order_item.variant_id;

    -- Update inventory
    UPDATE inventory
    SET quantity = quantity + p_quantity
    WHERE variant_id = v_order_item.variant_id;

    -- Log movement
    v_movement_id := log_inventory_movement(
      v_order_item.variant_id,
      'return',
      'customer_return',
      p_quantity,
      p_order_id,
      p_order_item_id,
      p_user_id,
      NULL, -- reference_number
      'Stock restored from customer return' ||
      CASE WHEN p_reason IS NOT NULL THEN ': ' || p_reason ELSE '' END,
      NULL, -- cost_per_unit
      'main'
    );
  END IF;

  -- Update order status to returned if all items are returned
  UPDATE orders
  SET
    status = CASE
      WHEN (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = p_order_id) =
           (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
            WHERE oi.order_id = p_order_id AND oi.id = p_order_item_id)
      THEN 'refunded'
      ELSE 'processing'
    END,
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
    'new_order_status', CASE
      WHEN (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = p_order_id) =
           (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
            WHERE oi.order_id = p_order_id AND oi.id = p_order_item_id)
      THEN 'refunded'
      ELSE 'processing'
    END,
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

-- Process order completion (convert reserved stock to sold)
CREATE OR REPLACE FUNCTION process_order_completion(
  p_order_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql;

-- Get inventory summary for a product
CREATE OR REPLACE FUNCTION get_inventory_summary(p_product_id UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_order IS 'Cancels an order and restores stock to inventory';
COMMENT ON FUNCTION return_item IS 'Processes item returns and optionally restores stock';
COMMENT ON FUNCTION process_order_completion IS 'Converts reserved stock to sold stock';
COMMENT ON FUNCTION get_inventory_summary IS 'Returns comprehensive inventory summary for a product';
