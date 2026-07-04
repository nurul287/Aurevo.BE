-- Fix previous_quantity / new_quantity on inventory_movements.
-- Callers (restock_inventory, decrease_stock, cancel_order, return_item, etc.) update
-- inventory.quantity first, then call log_inventory_movement. The logger used to read
-- the post-update row as "previous" and then add p_quantity again for "new", which
-- doubled the movement in the audit trail (e.g. restock +20 from 1 showed prev 21, new 41).

CREATE OR REPLACE FUNCTION log_inventory_movement(
  p_variant_id UUID,
  p_movement_type movement_type,
  p_reason movement_reason,
  p_quantity INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_order_item_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_cost_per_unit DECIMAL DEFAULT NULL,
  p_location TEXT DEFAULT 'main'
)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_inventory_movement IS
  'Logs inventory movements. previous_quantity/new_quantity reflect on-hand quantity; for reserve/unreserve and sale+customer_order (reserved-only change), both match current on-hand.';
