-- Inventory Management Stored Procedures
-- Migration: 010_inventory_procedures.sql

-- =============================================
-- PRODUCT MANAGEMENT PROCEDURES
-- =============================================

-- Add new product with variants and initial inventory
CREATE OR REPLACE FUNCTION add_product(
  p_name TEXT,
  p_slug TEXT,
  p_base_price DECIMAL(10,2),
  p_description TEXT DEFAULT NULL,
  p_short_description TEXT DEFAULT NULL,
  p_sku TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL,
  p_gender product_gender DEFAULT 'unisex',
  p_material TEXT DEFAULT NULL,
  p_care_instructions TEXT DEFAULT NULL,
  p_weight DECIMAL DEFAULT NULL,
  p_dimensions JSONB DEFAULT NULL,
  p_compare_at_price DECIMAL(10,2) DEFAULT NULL,
  p_cost_price DECIMAL(10,2) DEFAULT NULL,
  p_is_featured BOOLEAN DEFAULT FALSE,
  p_requires_shipping BOOLEAN DEFAULT TRUE,
  p_track_inventory BOOLEAN DEFAULT TRUE,
  p_allow_backorder BOOLEAN DEFAULT FALSE,
  p_min_order_quantity INTEGER DEFAULT 1,
  p_max_order_quantity INTEGER DEFAULT NULL,
  p_meta_title TEXT DEFAULT NULL,
  p_meta_description TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_low_stock_threshold INTEGER DEFAULT 10,
  p_variants JSONB DEFAULT '[]'::jsonb,
  p_initial_stock INTEGER DEFAULT 0,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
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
    compare_at_price, cost_price, is_featured, requires_shipping,
    track_inventory, allow_backorder, min_order_quantity, max_order_quantity,
    meta_title, meta_description, tags, low_stock_threshold
  ) VALUES (
    p_name, p_slug, p_base_price, p_description, p_short_description, p_sku, p_category_id, p_brand_id,
    p_gender, p_material, p_care_instructions, p_weight, p_dimensions,
    p_compare_at_price, p_cost_price, p_is_featured, p_requires_shipping,
    p_track_inventory, p_allow_backorder, p_min_order_quantity, p_max_order_quantity,
    p_meta_title, p_meta_description, p_tags, p_low_stock_threshold
  ) RETURNING id INTO v_product_id;

  -- Insert variants
  FOR v_variant IN SELECT * FROM jsonb_array_elements(p_variants)
  LOOP
    INSERT INTO product_variants (
      product_id, sku, name, size, color, color_code, material, weight,
      price, compare_at_price, cost_price, barcode, sort_order
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
      (v_variant->>'cost_price')::DECIMAL,
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
        p_cost_price,
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
$$ LANGUAGE plpgsql;

-- Update product details
CREATE OR REPLACE FUNCTION update_product(
  p_product_id UUID,
  p_name TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_short_description TEXT DEFAULT NULL,
  p_sku TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL,
  p_gender product_gender DEFAULT NULL,
  p_material TEXT DEFAULT NULL,
  p_care_instructions TEXT DEFAULT NULL,
  p_weight DECIMAL DEFAULT NULL,
  p_dimensions JSONB DEFAULT NULL,
  p_base_price DECIMAL(10,2) DEFAULT NULL,
  p_compare_at_price DECIMAL(10,2) DEFAULT NULL,
  p_cost_price DECIMAL(10,2) DEFAULT NULL,
  p_is_featured BOOLEAN DEFAULT NULL,
  p_requires_shipping BOOLEAN DEFAULT NULL,
  p_track_inventory BOOLEAN DEFAULT NULL,
  p_allow_backorder BOOLEAN DEFAULT NULL,
  p_min_order_quantity INTEGER DEFAULT NULL,
  p_max_order_quantity INTEGER DEFAULT NULL,
  p_meta_title TEXT DEFAULT NULL,
  p_meta_description TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_low_stock_threshold INTEGER DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
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
  IF p_cost_price IS NOT NULL THEN
    v_update_fields := v_update_fields || 'cost_price = $16, ';
  END IF;
  IF p_is_featured IS NOT NULL THEN
    v_update_fields := v_update_fields || 'is_featured = $17, ';
  END IF;
  IF p_requires_shipping IS NOT NULL THEN
    v_update_fields := v_update_fields || 'requires_shipping = $18, ';
  END IF;
  IF p_track_inventory IS NOT NULL THEN
    v_update_fields := v_update_fields || 'track_inventory = $19, ';
  END IF;
  IF p_allow_backorder IS NOT NULL THEN
    v_update_fields := v_update_fields || 'allow_backorder = $20, ';
  END IF;
  IF p_min_order_quantity IS NOT NULL THEN
    v_update_fields := v_update_fields || 'min_order_quantity = $21, ';
  END IF;
  IF p_max_order_quantity IS NOT NULL THEN
    v_update_fields := v_update_fields || 'max_order_quantity = $22, ';
  END IF;
  IF p_meta_title IS NOT NULL THEN
    v_update_fields := v_update_fields || 'meta_title = $23, ';
  END IF;
  IF p_meta_description IS NOT NULL THEN
    v_update_fields := v_update_fields || 'meta_description = $24, ';
  END IF;
  IF p_tags IS NOT NULL THEN
    v_update_fields := v_update_fields || 'tags = $25, ';
  END IF;
  IF p_low_stock_threshold IS NOT NULL THEN
    v_update_fields := v_update_fields || 'low_stock_threshold = $26, ';
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
        p_weight, p_dimensions, p_base_price, p_compare_at_price, p_cost_price,
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
$$ LANGUAGE plpgsql;

-- =============================================
-- INVENTORY MANAGEMENT PROCEDURES
-- =============================================

-- Restock inventory (increase stock)
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

  -- Update inventory
  INSERT INTO inventory (variant_id, quantity, location)
  VALUES (p_variant_id, p_quantity, p_location)
  ON CONFLICT (variant_id, location)
  DO UPDATE SET quantity = inventory.quantity + p_quantity;

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
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  v_result := jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'variant_id', p_variant_id,
    'quantity_added', p_quantity,
    'new_quantity', v_current_quantity,
    'message', 'Stock increased successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to restock inventory'
    );
END;
$$ LANGUAGE plpgsql;

-- Decrease stock (sale)
CREATE OR REPLACE FUNCTION decrease_stock(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_order_item_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_location TEXT DEFAULT 'main'
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_movement_id UUID;
  v_current_quantity INTEGER;
  v_available_quantity INTEGER;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  -- Get current quantities
  SELECT COALESCE(quantity, 0), COALESCE(available_quantity, 0)
  INTO v_current_quantity, v_available_quantity
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Check if enough stock available
  IF v_available_quantity < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient stock available',
      'available_quantity', v_available_quantity,
      'requested_quantity', p_quantity
    );
  END IF;

  -- Update inventory
  UPDATE inventory
  SET quantity = quantity - p_quantity
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Log movement
  v_movement_id := log_inventory_movement(
    p_variant_id,
    'sale',
    'customer_order',
    -p_quantity, -- Negative for decrease
    p_order_id,
    p_order_item_id,
    p_user_id,
    NULL, -- reference_number
    'Stock decreased for sale',
    NULL, -- cost_per_unit
    p_location
  );

  -- Get updated quantity
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  v_result := jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'variant_id', p_variant_id,
    'quantity_decreased', p_quantity,
    'new_quantity', v_current_quantity,
    'message', 'Stock decreased successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to decrease stock'
    );
END;
$$ LANGUAGE plpgsql;

-- Reserve stock (checkout)
CREATE OR REPLACE FUNCTION reserve_stock(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_order_item_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_location TEXT DEFAULT 'main'
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_movement_id UUID;
  v_current_quantity INTEGER;
  v_available_quantity INTEGER;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  -- Get current quantities
  SELECT COALESCE(quantity, 0), COALESCE(available_quantity, 0)
  INTO v_current_quantity, v_available_quantity
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Check if enough stock available
  IF v_available_quantity < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient stock available for reservation',
      'available_quantity', v_available_quantity,
      'requested_quantity', p_quantity
    );
  END IF;

  -- Update inventory (increase reserved, decrease available)
  UPDATE inventory
  SET reserved_quantity = reserved_quantity + p_quantity
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Log movement
  v_movement_id := log_inventory_movement(
    p_variant_id,
    'reserve',
    'checkout_reserve',
    0, -- No change to total quantity
    p_order_id,
    p_order_item_id,
    p_user_id,
    NULL, -- reference_number
    'Stock reserved for checkout',
    NULL, -- cost_per_unit
    p_location
  );

  -- Update the movement record with reserved quantity
  UPDATE inventory_movements
  SET reserved_quantity = p_quantity
  WHERE id = v_movement_id;

  v_result := jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'variant_id', p_variant_id,
    'quantity_reserved', p_quantity,
    'message', 'Stock reserved successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to reserve stock'
    );
END;
$$ LANGUAGE plpgsql;

-- Unreserve stock (payment failed)
CREATE OR REPLACE FUNCTION unreserve_stock(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_location TEXT DEFAULT 'main'
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_movement_id UUID;
  v_current_reserved INTEGER;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  -- Get current reserved quantity
  SELECT COALESCE(reserved_quantity, 0) INTO v_current_reserved
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Check if enough reserved stock
  IF v_current_reserved < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient reserved stock',
      'reserved_quantity', v_current_reserved,
      'requested_quantity', p_quantity
    );
  END IF;

  -- Update inventory (decrease reserved, increase available)
  UPDATE inventory
  SET reserved_quantity = reserved_quantity - p_quantity
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Log movement
  v_movement_id := log_inventory_movement(
    p_variant_id,
    'unreserve',
    'payment_failed',
    0, -- No change to total quantity
    p_order_id,
    NULL, -- order_item_id
    p_user_id,
    NULL, -- reference_number
    'Stock unreserved due to payment failure',
    NULL, -- cost_per_unit
    p_location
  );

  v_result := jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'variant_id', p_variant_id,
    'quantity_unreserved', p_quantity,
    'message', 'Stock unreserved successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to unreserve stock'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_product IS 'Adds a new product with variants and initial inventory';
COMMENT ON FUNCTION update_product IS 'Updates product details with dynamic field updates';
COMMENT ON FUNCTION restock_inventory IS 'Increases stock quantity and logs movement';
COMMENT ON FUNCTION decrease_stock IS 'Decreases stock quantity for sales';
COMMENT ON FUNCTION reserve_stock IS 'Reserves stock during checkout process';
COMMENT ON FUNCTION unreserve_stock IS 'Unreserves stock when payment fails';
