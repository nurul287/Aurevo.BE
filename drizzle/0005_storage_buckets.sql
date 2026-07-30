-- Create the storage buckets the app uploads to.
--
-- These were previously created ONLY through the Supabase dashboard and lived
-- in no migration, which meant `supabase db reset` silently destroyed them and
-- every image upload then failed with:
--
--     { "code": "STORAGE_ERROR", "message": "Storage upload failed: Bucket not found" }
--
-- 0003 creates the RLS policies on storage.objects and sets the size/MIME
-- limits, but a policy on a bucket that does not exist is inert — hence this
-- file. Values mirror production exactly (verified read-only against project
-- bwcbcmeftplyljgcacvr).
--
-- `product-images` is the only bucket the backend writes to (see BUCKET in
-- src/lib/image-upload.ts); product photos, category images and user avatars
-- all live in it under different path prefixes. `Logo` exists in production
-- and is reproduced here for parity.
--
-- ON CONFLICT DO NOTHING: on production both buckets already exist and must be
-- left exactly as they are — this migration only has to make a freshly built
-- database match. Note that 0003's `UPDATE storage.buckets` runs BEFORE this
-- file and therefore matches zero rows on a fresh database; the limits are set
-- here in the INSERT instead, so the end state is the same either way.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB, matches 0003 and migration-archive/017
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('Logo', 'Logo', true, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
