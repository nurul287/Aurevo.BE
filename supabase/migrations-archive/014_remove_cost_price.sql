-- Remove cost_price columns from products and product_variants tables
-- Migration: 014_remove_cost_price.sql

-- Drop cost_price column from products table
ALTER TABLE products DROP COLUMN IF EXISTS cost_price;

-- Drop cost_price column from product_variants table
ALTER TABLE product_variants DROP COLUMN IF EXISTS cost_price;

-- Drop all overloaded versions of add_product and update_product functions
-- Using DO block to drop all versions safely
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all versions of add_product
  FOR r IN
    SELECT oid::regprocedure
    FROM pg_proc
    WHERE proname = 'add_product'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure;
  END LOOP;

  -- Drop all versions of update_product
  FOR r IN
    SELECT oid::regprocedure
    FROM pg_proc
    WHERE proname = 'update_product'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure;
  END LOOP;
END $$;

-- Create add_product function without cost_price parameter
CREATE FUNCTION add_product(
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
$$ LANGUAGE plpgsql;

-- Create update_product function without cost_price parameter
CREATE FUNCTION update_product(
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_product IS 'Adds a new product with variants and initial inventory (cost_price removed)';
COMMENT ON FUNCTION update_product IS 'Updates product details with dynamic field updates (cost_price removed)';
