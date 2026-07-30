-- Pre-baseline. Everything here must exist BEFORE 0001_baseline.sql runs:
--   * `vector` — 0001 declares kb_chunks.embedding as vector(1024).
--   * `is_admin()` — 0001 creates ~15 RLS policies whose USING clause calls it.
--     CREATE POLICY resolves the function at creation time, so it must already
--     exist. The plpgsql body references `profiles`, which 0001 has not created
--     yet; that is fine, plpgsql bodies are not parsed until first execution.
--
-- Extensions mirror supabase/migrations-archive/001 and 039 exactly (including the
-- `extensions` target schema for vector) so a Drizzle-built database matches
-- production. uuid-ossp and pg_trgm are not used by the current schema —
-- gen_random_uuid() is built in and no trigram index survives — but both are
-- installed in production, so they are recreated here for parity.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;
--> statement-breakpoint
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
--> statement-breakpoint
COMMENT ON FUNCTION is_admin() IS 'Check if current user has admin privileges';
