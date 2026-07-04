-- Inventory Management System
-- Migration: 009_inventory_management.sql

-- Create inventory movement types
CREATE TYPE movement_type AS ENUM (
  'restock',           -- Increase stock (restock)
  'sale',              -- Decrease stock (sale)
  'reserve',           -- Reserve stock (checkout)
  'unreserve',         -- Unreserve stock (payment failed)
  'cancel',            -- Cancel order (restore stock)
  'return',            -- Return item
  'adjustment',        -- Manual adjustment
  'damage',            -- Damaged goods
  'theft',             -- Theft/loss
  'transfer'           -- Transfer between locations
);

CREATE TYPE movement_reason AS ENUM (
  'purchase_order',    -- Restock from supplier
  'customer_order',    -- Sale to customer
  'checkout_reserve',  -- Reserve during checkout
  'payment_failed',    -- Unreserve due to payment failure
  'order_cancelled',   -- Order cancelled by customer/admin
  'customer_return',   -- Customer returned item
  'damaged_goods',     -- Item damaged
  'inventory_count',   -- Physical count adjustment
  'theft_loss',        -- Theft or loss
  'location_transfer', -- Transfer between warehouses
  'manual_adjustment'  -- Manual admin adjustment
);

-- Inventory movements table for tracking all stock changes
CREATE TABLE inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  movement_type movement_type NOT NULL,
  reason movement_reason NOT NULL,
  quantity INTEGER NOT NULL, -- Positive for increases, negative for decreases
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reserved_quantity INTEGER DEFAULT 0,
  location TEXT DEFAULT 'main',

  -- Reference information
  order_id UUID REFERENCES orders(id),
  order_item_id UUID REFERENCES order_items(id),
  user_id UUID REFERENCES profiles(id), -- Admin who made the change
  reference_number TEXT, -- PO number, invoice number, etc.

  -- Additional details
  notes TEXT,
  cost_per_unit DECIMAL(10,2),
  total_cost DECIMAL(10,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add stock_quantity to products table for easier querying
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- Add indexes for performance
CREATE INDEX idx_inventory_movements_variant ON inventory_movements(variant_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_order ON inventory_movements(order_id);
CREATE INDEX idx_inventory_movements_created ON inventory_movements(created_at);
CREATE INDEX idx_products_stock_quantity ON products(stock_quantity);

-- Create function to update product stock quantity
CREATE OR REPLACE FUNCTION update_product_stock_quantity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to update product stock when inventory changes
CREATE TRIGGER update_product_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_quantity();

-- Create function to log inventory movements
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
  v_total_cost DECIMAL(10,2);
BEGIN
  -- Get current quantity
  SELECT COALESCE(quantity, 0) INTO v_previous_quantity
  FROM inventory
  WHERE variant_id = p_variant_id AND location = p_location;

  -- Calculate new quantity
  v_new_quantity := v_previous_quantity + p_quantity;

  -- Calculate total cost
  v_total_cost := p_quantity * COALESCE(p_cost_per_unit, 0);

  -- Insert movement record
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

-- Create function to check low stock
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  variant_id UUID,
  variant_name TEXT,
  current_stock INTEGER,
  low_stock_threshold INTEGER,
  reorder_point INTEGER,
  reorder_quantity INTEGER
) AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON TABLE inventory_movements IS 'Tracks all inventory movements for audit and reporting';
COMMENT ON FUNCTION log_inventory_movement IS 'Logs inventory movements with full audit trail';
COMMENT ON FUNCTION check_low_stock IS 'Returns products that are below low stock threshold';
