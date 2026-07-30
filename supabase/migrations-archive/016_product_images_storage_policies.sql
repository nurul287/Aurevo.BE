-- ============================================================
-- 016_product_images_storage_policies.sql
-- ============================================================
-- Purpose : Allow authenticated users to upload, update, and delete
--           files in the `product-images` storage bucket while keeping
--           the bucket publicly readable (so saved URLs are accessible
--           from any client without auth).
--
-- The bucket itself was created via the Supabase dashboard with
-- `public = true`, so SELECT works for the anon role even without an
-- explicit policy. We still add an explicit SELECT policy for clarity
-- and so future tightening (private bucket) is a one-line change.
-- ============================================================

-- Public read access for product image URLs.
DROP POLICY IF EXISTS "product-images: public read"
  ON storage.objects;

CREATE POLICY "product-images: public read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Authenticated users (admin staff signed into the dashboard) can upload.
DROP POLICY IF EXISTS "product-images: authenticated upload"
  ON storage.objects;

CREATE POLICY "product-images: authenticated upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Authenticated users can update file metadata (rename, reorder, etc.).
DROP POLICY IF EXISTS "product-images: authenticated update"
  ON storage.objects;

CREATE POLICY "product-images: authenticated update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

-- Authenticated users can delete their files.
DROP POLICY IF EXISTS "product-images: authenticated delete"
  ON storage.objects;

CREATE POLICY "product-images: authenticated delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');
