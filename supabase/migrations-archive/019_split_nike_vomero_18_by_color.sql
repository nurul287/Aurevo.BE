-- Split combined "Nike Vomero 18" (orange + white variants on one product) into two products.
-- Idempotent: only runs when slug is still nike-vomero-18.
-- Orange keeps existing product id (storage paths under products/<id>/ stay valid).
-- White is a new product with no images until bulk upload.

DO $$
DECLARE
  orange_id uuid;
  white_id uuid;
BEGIN
  SELECT id INTO orange_id
  FROM products
  WHERE slug = 'nike-vomero-18'
  LIMIT 1;

  IF orange_id IS NULL THEN
    RAISE NOTICE '019_split_nike_vomero_18_by_color: no product with slug nike-vomero-18; skipped';
    RETURN;
  END IF;

  INSERT INTO products (
    name,
    slug,
    description,
    short_description,
    sku,
    category_id,
    brand_id,
    gender,
    material,
    care_instructions,
    weight,
    dimensions,
    base_price,
    compare_at_price,
    is_active,
    is_featured,
    is_digital,
    requires_shipping,
    track_inventory,
    allow_backorder,
    min_order_quantity,
    max_order_quantity,
    meta_title,
    meta_description,
    tags,
    stock_quantity,
    low_stock_threshold
  )
  SELECT
    'Nike Vomero 18 — White',
    'nike-vomero-18-white',
    description,
    short_description,
    NULLIF(trim(sku), ''),
    category_id,
    brand_id,
    gender,
    material,
    care_instructions,
    weight,
    dimensions,
    base_price,
    compare_at_price,
    is_active,
    is_featured,
    is_digital,
    requires_shipping,
    track_inventory,
    allow_backorder,
    min_order_quantity,
    max_order_quantity,
    meta_title,
    meta_description,
    tags,
    0,
    low_stock_threshold
  FROM products
  WHERE id = orange_id
  RETURNING id INTO white_id;

  UPDATE products
  SET
    name = 'Nike Vomero 18 — Orange',
    slug = 'nike-vomero-18-orange',
    updated_at = now()
  WHERE id = orange_id;

  UPDATE product_variants
  SET
    product_id = white_id,
    updated_at = now()
  WHERE product_id = orange_id
    AND trim(lower(color)) = 'white';

  UPDATE order_items oi
  SET product_id = white_id
  FROM product_variants pv
  WHERE oi.variant_id = pv.id
    AND pv.product_id = white_id;

  UPDATE cart_items ci
  SET product_id = white_id
  FROM product_variants pv
  WHERE ci.variant_id = pv.id
    AND pv.product_id = white_id;

  UPDATE wishlist_items wi
  SET product_id = white_id
  FROM product_variants pv
  WHERE wi.variant_id = pv.id
    AND pv.product_id = white_id;

  UPDATE products p
  SET stock_quantity = sq.t
  FROM (
    SELECT pv.product_id AS pid, coalesce(sum(i.quantity), 0)::integer AS t
    FROM product_variants pv
    LEFT JOIN inventory i ON i.variant_id = pv.id
    WHERE pv.product_id IN (orange_id, white_id)
    GROUP BY pv.product_id
  ) sq
  WHERE p.id = sq.pid;
END;
$$;
