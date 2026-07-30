-- Storage-layer objects, ported verbatim from supabase/migrations-archive/016 and 017.
--
-- These live in the `storage` schema, which is outside
-- `schemaFilter: ["public"]`, so drizzle-kit neither generates nor diffs them.
-- They will therefore never appear in a generated migration and must stay
-- hand-maintained here.
--
-- Bucket CREATION is not here — it lives in 0005_storage_buckets.sql, which
-- runs after this file. On a fresh database the UPDATE at the bottom of this
-- file therefore matches zero rows (not an error) and 0005 inserts the bucket
-- with those same limits already set. On production the bucket already exists,
-- so this UPDATE does the work and 0005 is a no-op.
--
-- NOT REPRODUCED ANYWHERE (deliberately — see
-- docs/db-flip/unversioned-prod-objects.md):
--   * the `meta-conversions-purchase` webhook trigger on public.orders, whose
--     definition embeds a service_role JWT and must not be committed.

-- Public read access for product image URLs.
DROP POLICY IF EXISTS "product-images: public read" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "product-images: public read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');
--> statement-breakpoint
-- Authenticated users (admin staff signed into the dashboard) can upload.
DROP POLICY IF EXISTS "product-images: authenticated upload" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "product-images: authenticated upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');
--> statement-breakpoint
-- Authenticated users can update file metadata (rename, reorder, etc.).
DROP POLICY IF EXISTS "product-images: authenticated update" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "product-images: authenticated update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');
--> statement-breakpoint
-- Authenticated users can delete their files.
DROP POLICY IF EXISTS "product-images: authenticated delete" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "product-images: authenticated delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');
--> statement-breakpoint
-- Defense-in-depth bucket limits (migration 017). No-op when the bucket has
-- not been created yet, e.g. on a fresh local stack.
UPDATE storage.buckets
SET
  file_size_limit = 5242880, -- 5 MB in bytes
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
WHERE id = 'product-images';
