-- Creates the RLS policies production actually has. Pair of 0006, which drops
-- the ones archived migration 002 created; see that file for why they differ.
--
-- Each CREATE is preceded by a DROP IF EXISTS so the file is idempotent.
-- Production was baselined at migration 0005, so this runs there on the next
-- merge — and on production all five of these already exist. A bare CREATE
-- POLICY would fail with "policy already exists", roll back the whole migration
-- transaction, and stop the deploy. Dropping first also guarantees the
-- definition matches this file rather than whatever happened to be there, so a
-- drifted database converges instead of silently keeping its own version.

DROP POLICY IF EXISTS "Admins can select brands" ON "brands";
--> statement-breakpoint
CREATE POLICY "Admins can select brands" ON "brands" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_admin());
--> statement-breakpoint
DROP POLICY IF EXISTS "Admins can insert brands" ON "brands";
--> statement-breakpoint
CREATE POLICY "Admins can insert brands" ON "brands" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (is_admin());
--> statement-breakpoint
DROP POLICY IF EXISTS "Admins can update brands" ON "brands";
--> statement-breakpoint
CREATE POLICY "Admins can update brands" ON "brands" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());
--> statement-breakpoint
DROP POLICY IF EXISTS "Admins can delete brands" ON "brands";
--> statement-breakpoint
CREATE POLICY "Admins can delete brands" ON "brands" AS PERMISSIVE FOR DELETE TO "authenticated" USING (is_admin());
--> statement-breakpoint
DROP POLICY IF EXISTS "Allow profile creation for existing users" ON "profiles";
--> statement-breakpoint
CREATE POLICY "Allow profile creation for existing users" ON "profiles" AS PERMISSIVE FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM auth.users WHERE users.id = profiles.id));
