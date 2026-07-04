-- Fix inventory table constraints and update functions
-- This migration adds the missing unique constraint and fixes the restock function

-- Add unique constraint to inventory table if it doesn't exist
-- This ensures one inventory record per variant per location
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'inventory_variant_location_unique'
    ) THEN
        ALTER TABLE inventory
        ADD CONSTRAINT inventory_variant_location_unique
        UNIQUE (variant_id, location);
    END IF;
END $$;

-- Update the restock_inventory function to handle the constraint properly
CREATE OR REPLACE FUNCTION restock_inventory(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_cost_per_unit DECIMAL(10,2) DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_location TEXT DEFAULT 'main'
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql;

-- Update decrease_stock function to handle the constraint properly
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

  -- Check if we have enough stock
  IF v_current_quantity < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient stock. Available: ' || v_current_quantity || ', Required: ' || p_quantity
    );
  END IF;

  -- Calculate new quantity
  v_new_quantity := v_current_quantity - p_quantity;

  -- Update inventory
  UPDATE inventory
  SET
    quantity = quantity - p_quantity,
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
    'sale',
    'order_fulfillment',
    -p_quantity, -- Negative quantity for decrease
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

-- Update reserve_stock function to handle the constraint properly
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

  -- Check if we have enough available stock
  IF (v_current_quantity - v_current_reserved) < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient available stock. Available: ' || (v_current_quantity - v_current_reserved) || ', Required: ' || p_quantity
    );
  END IF;

  -- Calculate new reserved quantity
  v_new_reserved := v_current_reserved + p_quantity;

  -- Update inventory
  UPDATE inventory
  SET
    reserved_quantity = reserved_quantity + p_quantity,
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
    'reserve',
    'checkout_process',
    p_quantity,
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

-- Update unreserve_stock function to handle the constraint properly
CREATE OR REPLACE FUNCTION unreserve_stock(
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
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON CONSTRAINT inventory_variant_location_unique ON inventory IS 'Ensures one inventory record per variant per location';
