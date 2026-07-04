-- ============================================================
-- 017_product_images_bucket_limits.sql
-- ============================================================
-- Purpose : Harden the `product-images` bucket with server-side
--           limits so a buggy or malicious client cannot bypass
--           the in-app validation.
--
-- - file_size_limit   = 5 MB per file
-- - allowed_mime_types = common web image formats only
--
-- This is a defense-in-depth backstop. Client-side validation in
-- the bulk upload dialog stays in place for nice UX.
-- ============================================================

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
