-- Footwear E-commerce Database Schema
-- Migration: 001_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_gender AS ENUM ('male', 'female', 'other');
CREATE TYPE address_type AS ENUM ('billing', 'shipping');
CREATE TYPE product_gender AS ENUM ('men', 'women', 'unisex');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE fulfillment_status AS ENUM ('unfulfilled', 'partial', 'fulfilled');
CREATE TYPE payment_method AS ENUM ('cash', 'online');

-- =============================================
-- USER MANAGEMENT TABLES
-- =============================================

-- Extended user profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender user_gender,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User addresses
CREATE TABLE user_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type address_type DEFAULT 'shipping',
  is_default BOOLEAN DEFAULT FALSE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PRODUCT CATALOG TABLES
-- =============================================

-- Product categories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brands
CREATE TABLE brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  sku TEXT UNIQUE,
  category_id UUID REFERENCES categories(id),
  brand_id UUID REFERENCES brands(id),
  gender product_gender DEFAULT 'unisex',
  material TEXT,
  care_instructions TEXT,
  weight DECIMAL(8,2), -- in grams
  dimensions JSONB, -- {length, width, height}
  base_price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_digital BOOLEAN DEFAULT FALSE,
  requires_shipping BOOLEAN DEFAULT TRUE,
  track_inventory BOOLEAN DEFAULT TRUE,
  allow_backorder BOOLEAN DEFAULT FALSE,
  min_order_quantity INTEGER DEFAULT 1,
  max_order_quantity INTEGER,
  meta_title TEXT,
  meta_description TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product variants (size, color combinations)
CREATE TABLE product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE,
  name TEXT, -- e.g., "Red - Size 10"
  size TEXT,
  color TEXT,
  color_code TEXT, -- hex color code
  material TEXT,
  weight DECIMAL(8,2),
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  barcode TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product images
CREATE TABLE product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory tracking
CREATE TABLE inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  location TEXT DEFAULT 'main', -- warehouse location
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  reorder_point INTEGER DEFAULT 0,
  reorder_quantity INTEGER DEFAULT 0,
  last_counted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SHOPPING & CART TABLES
-- =============================================

-- Shopping cart items
CREATE TABLE cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT, -- for guest users
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL, -- price at time of adding to cart
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, variant_id),
  UNIQUE(session_id, variant_id)
);

-- Wishlist items
CREATE TABLE wishlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, variant_id)
);

-- =============================================
-- ORDER MANAGEMENT TABLES
-- =============================================

-- Orders
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id),
  email TEXT NOT NULL,
  phone TEXT,

  -- Order totals
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,

  -- Order status
  status order_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  fulfillment_status fulfillment_status DEFAULT 'unfulfilled',

  -- Shipping
  shipping_method_id UUID,
  tracking_number TEXT,
  estimated_delivery_date DATE,

  -- Billing & Shipping addresses
  billing_address JSONB NOT NULL,
  shipping_address JSONB NOT NULL,

  -- Additional info
  notes TEXT,
  internal_notes TEXT,
  source TEXT DEFAULT 'web', -- web, mobile, admin

  -- Guest order support
  session_id TEXT,
  guest_token TEXT,
  guest_token_expires TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PAYMENT TABLES
-- =============================================

-- Payments
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  payment_method payment_method NOT NULL,
  payment_intent_id TEXT, -- Stripe payment intent ID
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'refunded')) DEFAULT 'pending',
  gateway_response JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- REVIEWS & RATINGS
-- =============================================

-- Product reviews
CREATE TABLE product_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  title TEXT,
  content TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id, order_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Product search indexes
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_slug ON products(slug);

-- Order indexes
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_guest_token ON orders(guest_token);
CREATE INDEX idx_orders_session ON orders(session_id);

-- Cart indexes
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_cart_items_session ON cart_items(session_id);

-- Inventory indexes
CREATE INDEX idx_inventory_variant ON inventory(variant_id);
CREATE INDEX idx_inventory_available ON inventory(available_quantity);

-- Review indexes
CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_user ON product_reviews(user_id);
CREATE INDEX idx_reviews_approved ON product_reviews(is_approved) WHERE is_approved = true;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON product_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
('Sneakers', 'sneakers', 'Casual and athletic sneakers'),
('Boots', 'boots', 'Ankle and knee-high boots'),
('Sandals', 'sandals', 'Open-toe footwear for warm weather'),
('Dress Shoes', 'dress-shoes', 'Formal and business footwear'),
('Casual', 'casual', 'Everyday casual footwear');

-- Insert sample brands
INSERT INTO brands (name, slug, description) VALUES
('Nike', 'nike', 'Just Do It'),
('Adidas', 'adidas', 'Impossible is Nothing'),
('Converse', 'converse', 'All Star'),
('Vans', 'vans', 'Off The Wall'),
('Timberland', 'timberland', 'Make It Better');

COMMENT ON TABLE profiles IS 'Extended user profiles that reference auth.users';
COMMENT ON TABLE products IS 'Main product catalog for footwear';
COMMENT ON TABLE product_variants IS 'Product variations (size, color, etc.)';
COMMENT ON TABLE inventory IS 'Stock levels for each product variant';
COMMENT ON TABLE orders IS 'Customer orders and order management';
COMMENT ON TABLE cart_items IS 'Shopping cart items for users and guests';
