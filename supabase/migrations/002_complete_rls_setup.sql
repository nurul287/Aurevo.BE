-- Complete RLS Setup for Footwear E-commerce
-- Migration: 006_complete_rls_setup.sql

-- =============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================

-- Enable RLS on user-related tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Enable RLS on public/catalog tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- =============================================
-- DROP EXISTING POLICIES (CLEAN SLATE)
-- =============================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON user_addresses;

DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
DROP POLICY IF EXISTS "Guests can manage cart with session" ON cart_items;

DROP POLICY IF EXISTS "Users can view own wishlist items" ON wishlist_items;
DROP POLICY IF EXISTS "Users can insert own wishlist items" ON wishlist_items;
DROP POLICY IF EXISTS "Users can delete own wishlist items" ON wishlist_items;

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

DROP POLICY IF EXISTS "Users can view own order items" ON order_items;

DROP POLICY IF EXISTS "Users can view own payments" ON payments;

DROP POLICY IF EXISTS "Anyone can view approved reviews" ON product_reviews;
DROP POLICY IF EXISTS "Users can view own reviews" ON product_reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON product_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON product_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON product_reviews;

-- Drop existing admin and public policies
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins can manage product variants" ON product_variants;
DROP POLICY IF EXISTS "Admins can manage product images" ON product_images;
DROP POLICY IF EXISTS "Admins can manage inventory" ON inventory;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage brands" ON brands;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;
DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON product_reviews;

DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Anyone can view active product variants" ON product_variants;
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
DROP POLICY IF EXISTS "Anyone can view active brands" ON brands;
DROP POLICY IF EXISTS "Anyone can view inventory" ON inventory;

-- =============================================
-- CREATE ADMIN ROLE FUNCTION
-- =============================================

-- Create admin role function (if it doesn't exist)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has admin role in their profile
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (preferences->>'role' = 'admin' OR preferences->>'role' = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- USER-RELATED POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow profile creation for any authenticated user (simpler approach)
CREATE POLICY "Allow profile creation for authenticated users" ON profiles
  FOR INSERT WITH CHECK (
    -- Allow if user is authenticated (any authenticated user can create profiles)
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- User addresses policies
CREATE POLICY "Users can view own addresses" ON user_addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses" ON user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses" ON user_addresses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses" ON user_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Cart items policies
CREATE POLICY "Users can view own cart items" ON cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items" ON cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items" ON cart_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items" ON cart_items
  FOR DELETE USING (auth.uid() = user_id);

-- Guest cart policy
CREATE POLICY "Guests can manage cart with session" ON cart_items
  FOR ALL USING (
    (auth.uid() IS NULL AND session_id IS NOT NULL) OR
    (auth.uid() = user_id)
  );

-- Wishlist items policies
CREATE POLICY "Users can view own wishlist items" ON wishlist_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist items" ON wishlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items" ON wishlist_items
  FOR DELETE USING (auth.uid() = user_id);

-- Orders policies
-- NOTE: RLS policies for orders and order_items are temporarily disabled
-- They will be added back with proper guest token support in a future migration

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Product reviews policies
CREATE POLICY "Anyone can view approved reviews" ON product_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view own reviews" ON product_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reviews" ON product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON product_reviews
  FOR UPDATE USING (auth.uid() = user_id AND is_approved = false)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON product_reviews
  FOR DELETE USING (auth.uid() = user_id AND is_approved = false);

-- =============================================
-- ADMIN POLICIES (FOR ALL TABLES)
-- =============================================

-- Admin policies for catalog tables
CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage brands" ON brands
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage products" ON products
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage product variants" ON product_variants
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage product images" ON product_images
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage inventory" ON inventory
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin policies for user-related tables
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all addresses" ON user_addresses
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all cart items" ON cart_items
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all wishlist items" ON wishlist_items
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- NOTE: Admin policies for orders and order_items are temporarily disabled
-- They will be added back with proper guest token support in a future migration

CREATE POLICY "Admins can manage all payments" ON payments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all reviews" ON product_reviews
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================
-- PUBLIC ACCESS POLICIES
-- =============================================

-- Public access to catalog data
CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT TO PUBLIC
  USING (is_active = true);

CREATE POLICY "Anyone can view active brands" ON brands
  FOR SELECT TO PUBLIC
  USING (is_active = true);

CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT TO PUBLIC
  USING (is_active = true);

CREATE POLICY "Anyone can view active product variants" ON product_variants
  FOR SELECT TO PUBLIC
  USING (is_active = true);

CREATE POLICY "Anyone can view product images" ON product_images
  FOR SELECT TO PUBLIC
  USING (true);

CREATE POLICY "Anyone can view inventory" ON inventory
  FOR SELECT TO PUBLIC
  USING (true);

-- =============================================
-- AUTHENTICATED USER POLICIES
-- =============================================

-- Authenticated users can see more data than public users
CREATE POLICY "Authenticated users can view all categories" ON categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all brands" ON brands
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all products" ON products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all product variants" ON product_variants
  FOR SELECT TO authenticated
  USING (true);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Create indexes for better RLS performance
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_variants_is_active ON product_variants(is_active) WHERE is_active = true;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON FUNCTION is_admin() IS 'Check if current user has admin privileges';
COMMENT ON TABLE profiles IS 'RLS enabled - users can manage own profile, admins can manage all';
COMMENT ON TABLE categories IS 'RLS enabled - public access to active categories, admin access to all';
COMMENT ON TABLE brands IS 'RLS enabled - public access to active brands, admin access to all';
COMMENT ON TABLE products IS 'RLS enabled - public access to active products, admin access to all';
COMMENT ON TABLE product_variants IS 'RLS enabled - public access to active variants, admin access to all';
COMMENT ON TABLE product_images IS 'RLS enabled - public access to all images, admin access to all';
COMMENT ON TABLE inventory IS 'RLS enabled - public access to inventory data, admin access to all';
COMMENT ON TABLE cart_items IS 'RLS enabled - users manage own cart, guests use session_id';
COMMENT ON TABLE orders IS 'RLS temporarily disabled - will be re-enabled with guest token support';
COMMENT ON TABLE product_reviews IS 'RLS enabled - public sees approved reviews, users manage own reviews';
