#!/usr/bin/env node
/**
 * Generates drizzle/0002_functions_triggers_comments.sql from a live database.
 *
 * Why a generator instead of hand-transcribing: several functions were
 * redefined repeatedly across supabase/migrations-archive (create_order in 007/008/020,
 * the stock RPCs in 010/013/014/031, the fulfilment triggers in 021/034/035),
 * so picking "the latest definition" by reading files is error-prone. Asking
 * Postgres via pg_get_functiondef/pg_get_triggerdef gives the settled state
 * directly.
 *
 * Usage:
 *   node scripts/db-gen-custom-migration.mjs "postgresql://..."
 *
 * Run it against a database that has all 41 supabase/migrations-archive files applied
 * (i.e. after `pnpm db:reset`).
 *
 * CAVEAT: seven functions and one event trigger exist in production but in NO
 * migration, so a local post-reset database does not have them and this script
 * cannot see them there:
 *   can_user_review_product, get_cart_total, get_product_availability,
 *   handle_new_user, rls_auto_enable, verify_guest_token
 *   (+ update_inventory_on_order, excluded on purpose)
 *   event trigger: ensure_rls -> rls_auto_enable()
 * Either run this against production (it issues SELECTs only) to capture the
 * complete settled state, or append those definitions by hand. See
 * docs/db-flip/unversioned-prod-objects.md.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const OUT = join(process.cwd(), "drizzle", "0002_functions_triggers_comments.sql");

// Excluded deliberately — see docs/db-flip/unversioned-prod-objects.md.
// update_inventory_on_order decrements reserved_quantity on confirm, which
// drives it negative and inflates availability (reserved_quantity is 0 by
// design since migration 037). Its trigger goes with it.
const EXCLUDED_FUNCTIONS = ["update_inventory_on_order"];
// on_order_confirmed  -> the buggy trigger above.
// meta-conversions-purchase -> its definition embeds a service_role JWT and is
//                              dashboard-managed; never commit it.
const EXCLUDED_TRIGGERS = ["on_order_confirmed", "meta-conversions-purchase"];

const BREAK = "\n--> statement-breakpoint\n";

async function main() {
  const url = process.argv[2] ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("Usage: node scripts/db-gen-custom-migration.mjs <DATABASE_URL>");
    process.exit(1);
  }
  const sql = postgres(url, { max: 1, onnotice: () => {} });

  try {
    // Functions in `public` that are NOT owned by an extension. The pg_depend
    // filter is what removes pg_trgm's ~30 helpers (gtrgm_*, similarity_*,
    // word_similarity_*, set_limit, show_trgm, gin_*) without naming them.
    const functions = await sql`
      SELECT p.proname,
             pg_get_function_identity_arguments(p.oid) AS args,
             pg_get_functiondef(p.oid) AS def,
             obj_description(p.oid, 'pg_proc') AS comment
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND NOT EXISTS (
          SELECT 1 FROM pg_depend d
          WHERE d.objid = p.oid AND d.deptype = 'e'
        )
      ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)
    `;

    // Row-level triggers on public tables.
    const triggers = await sql`
      SELECT t.tgname, c.relname, pg_get_triggerdef(t.oid) AS def
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
      ORDER BY c.relname, t.tgname
    `;

    // Custom event triggers only. An allowlist on the backing function's schema
    // is the reliable filter: Supabase's platform event triggers are backed by
    // functions in `graphql`/`extensions` (graphql_watch_ddl, pgrst_ddl_watch,
    // issue_pg_*_access, ...), while ours (`ensure_rls` -> rls_auto_enable) is
    // backed by a function in `public`. An explicit blocklist of platform names
    // silently lets new ones through — this does not.
    const eventTriggers = await sql`
      SELECT et.evtname,
             'CREATE EVENT TRIGGER ' || quote_ident(et.evtname)
               || ' ON ' || et.evtevent
               || ' EXECUTE FUNCTION ' || quote_ident(n.nspname) || '.'
               || quote_ident(p.proname) || '()' AS def
      FROM pg_event_trigger et
      JOIN pg_proc p ON p.oid = et.evtfoid
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      ORDER BY et.evtname
    `;

    // Table comments. Column comments are included too — pg_dump emits both and
    // the Phase 3 diff will fail on either.
    const tableComments = await sql`
      SELECT c.relname AS tbl, obj_description(c.oid, 'pg_class') AS comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND obj_description(c.oid, 'pg_class') IS NOT NULL
      ORDER BY c.relname
    `;
    // Enum/type comments. pg_dump emits these as COMMENT ON TYPE, and Drizzle
    // has no way to express them, so they must be captured here too.
    const typeComments = await sql`
      SELECT t.typname, obj_description(t.oid, 'pg_type') AS comment
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND obj_description(t.oid, 'pg_type') IS NOT NULL
      ORDER BY t.typname
    `;
    // Constraint comments (e.g. inventory_variant_location_unique).
    const constraintComments = await sql`
      SELECT con.conname, cl.relname AS tbl,
             obj_description(con.oid, 'pg_constraint') AS comment
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = cl.relnamespace
      WHERE n.nspname = 'public'
        AND obj_description(con.oid, 'pg_constraint') IS NOT NULL
      ORDER BY cl.relname, con.conname
    `;
    const columnComments = await sql`
      SELECT c.relname AS tbl, a.attname AS col,
             col_description(c.oid, a.attnum) AS comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND col_description(c.oid, a.attnum) IS NOT NULL
      ORDER BY c.relname, a.attnum
    `;

    const parts = [];
    parts.push(
      [
        "-- Functions, triggers, event triggers and comments.",
        "--",
        "-- GENERATED by scripts/db-gen-custom-migration.mjs from a database with all",
        "-- 41 archived supabase migrations applied. Drizzle Kit cannot express any of",
        "-- these, so",
        "-- they are owned here as hand-maintained SQL and must be edited by adding a",
        "-- NEW migration, never by changing this file (Drizzle does not verify",
        "-- migration hashes, so an edit to an applied file is silently ignored).",
        "--",
        "-- is_admin() is intentionally absent: 0000 defines it, because the RLS",
        "-- policies in 0001 reference it at CREATE POLICY time.",
        "--",
        "-- Excluded on purpose (see docs/db-flip/unversioned-prod-objects.md):",
        `--   functions: ${EXCLUDED_FUNCTIONS.join(", ")}`,
        `--   triggers:  ${EXCLUDED_TRIGGERS.join(", ")}`,
      ].join("\n"),
    );

    for (const f of functions) {
      if (f.proname === "is_admin") continue; // already created in 0000
      if (EXCLUDED_FUNCTIONS.includes(f.proname)) continue;
      parts.push(f.def.trimEnd() + ";");
      if (f.comment) {
        // COMMENT ON FUNCTION needs the full argument list to disambiguate —
        // `add_product()` does not resolve, it takes 27 parameters.
        parts.push(
          `COMMENT ON FUNCTION ${f.proname}(${f.args}) IS ${literal(f.comment)};`,
        );
      }
    }

    for (const t of triggers) {
      if (EXCLUDED_TRIGGERS.includes(t.tgname)) continue;
      parts.push(`DROP TRIGGER IF EXISTS ${quoteIdent(t.tgname)} ON public.${t.relname};`);
      parts.push(t.def.trimEnd() + ";");
    }

    for (const et of eventTriggers) {
      parts.push(`DROP EVENT TRIGGER IF EXISTS ${quoteIdent(et.evtname)};`);
      parts.push(et.def.trimEnd() + ";");
    }

    for (const c of typeComments) {
      parts.push(`COMMENT ON TYPE public.${c.typname} IS ${literal(c.comment)};`);
    }
    for (const c of constraintComments) {
      parts.push(
        `COMMENT ON CONSTRAINT ${c.conname} ON public.${c.tbl} IS ${literal(c.comment)};`,
      );
    }
    for (const c of tableComments) {
      parts.push(`COMMENT ON TABLE public.${c.tbl} IS ${literal(c.comment)};`);
    }
    for (const c of columnComments) {
      parts.push(
        `COMMENT ON COLUMN public.${c.tbl}.${c.col} IS ${literal(c.comment)};`,
      );
    }

    await writeFile(OUT, parts.join(BREAK) + "\n", "utf8");
    console.log(
      `Wrote ${OUT}\n  ${functions.length} functions, ${triggers.length} triggers, ` +
        `${eventTriggers.length} event triggers, ${typeComments.length} type comments, ` +
        `${constraintComments.length} constraint comments, ` +
        `${tableComments.length} table comments, ${columnComments.length} column comments`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function literal(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
function quoteIdent(s) {
  return /^[a-z_][a-z0-9_]*$/.test(s) ? s : `"${String(s).replace(/"/g, '""')}"`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
