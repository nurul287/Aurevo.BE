-- Objects that exist in PRODUCTION but in no archived migration.
--
-- HAND-MAINTAINED. Do not regenerate: scripts/db-gen-custom-migration.mjs reads
-- a local database, and a local database built from supabase/migrations-archive/
-- has never contained any of these — they were created directly against
-- production at some point and were never captured in a migration file. That is
-- why they live here and not in 0002, which the script overwrites.
--
-- Full inventory and reasoning: docs/db-flip/unversioned-prod-objects.md
--
-- Deliberately NOT included:
--   * update_inventory_on_order() + its on_order_confirmed trigger — drives
--     inventory.reserved_quantity negative and inflates availability. Tracked
--     separately for removal from production.
--   * the meta-conversions-purchase webhook trigger — its definition embeds a
--     service_role JWT, so it stays dashboard-managed and is never committed.

CREATE OR REPLACE FUNCTION public.can_user_review_product(user_uuid uuid, product_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if user has purchased this product
  RETURN EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = user_uuid
    AND oi.product_id = product_uuid
    AND o.status IN ('delivered', 'shipped')
  );
END;
$function$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.get_cart_total(user_uuid uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  total DECIMAL(10,2) := 0;
BEGIN
  SELECT COALESCE(SUM(ci.quantity * ci.price), 0)
  INTO total
  FROM cart_items ci
  WHERE ci.user_id = user_uuid;

  RETURN total;
END;
$function$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.get_product_availability(variant_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  available INTEGER := 0;
BEGIN
  SELECT COALESCE(available_quantity, 0)
  INTO available
  FROM inventory
  WHERE variant_id = variant_uuid;

  RETURN available;
END;
$function$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.verify_guest_token(p_order_id uuid, p_token text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT (guest_token = p_token) FROM public.orders WHERE id = p_order_id LIMIT 1;
$function$;
--> statement-breakpoint
-- Creates the public.profiles row for every new auth user. This is
-- load-bearing: without it a new signup has no profile, and the first
-- cart/wishlist/address write fails on a profiles foreign key.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
  RETURN NEW;
END;
$function$;
--> statement-breakpoint
-- Backs the `ensure_rls` event trigger below.
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;
--> statement-breakpoint
-- Defence-in-depth: auto-enables RLS on any table later created in `public`.
DROP EVENT TRIGGER IF EXISTS ensure_rls;
--> statement-breakpoint
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end EXECUTE FUNCTION public.rls_auto_enable();
--> statement-breakpoint
-- Trigger on auth.users. auth is outside schemaFilter: ["public"], so
-- drizzle-kit will never generate or diff this — it must stay here by hand.
-- Requires ownership of auth.users; on Supabase the migration role has it.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
