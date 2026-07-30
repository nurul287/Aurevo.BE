-- Reconciles the repo with production's actual RLS on `brands` and `profiles`.
-- Paired with 0007, which creates the replacements.
--
-- Production drifted from archived migration 002 at some point — the changes
-- were made directly against the database and exist in no migration:
--
--   * brands: the single "Admins can manage brands" (FOR ALL) was replaced by
--     four per-command policies, the shape the Supabase dashboard's policy
--     editor produces. Functionally identical.
--   * profiles: "Users can insert own profile" (WITH CHECK auth.uid() = id) was
--     replaced by "Allow profile creation for existing users", which is weaker —
--     it permits inserting a profile row for any existing auth user. Recorded
--     as-is because production is the live truth; tightening it is tracked in
--     docs/backlog.md.
--
-- IF EXISTS is required, not defensive habit: production was baselined at
-- migration 0005, so this file WILL run there on the next merge — and on
-- production these two policies are already gone. Without IF EXISTS the whole
-- migration transaction fails and the deploy pipeline stops. On a freshly built
-- database, where 0001 did create them, the drops do real work.

DROP POLICY IF EXISTS "Admins can manage brands" ON "brands" CASCADE;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can insert own profile" ON "profiles" CASCADE;
