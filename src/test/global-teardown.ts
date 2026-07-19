import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import postgres from "postgres";

/**
 * Vitest globalSetup — the returned function runs once after the entire test
 * run finishes (not per file). Test cleanup hooks do unscoped DELETEs against
 * the local Supabase DB's catalog tables (products, categories, orders, ...),
 * which shares storage with manual dev browsing. Re-applying seed.sql here
 * restores the real catalog automatically so `npx vitest run` never leaves
 * the storefront empty.
 */
export default async function () {
  return async () => {
    dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
    dotenv.config();

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return;

    const sql = postgres(databaseUrl, { max: 1 });
    try {
      const seedPath = path.resolve(process.cwd(), "supabase", "seed.sql");
      const seedSql = fs.readFileSync(seedPath, "utf-8");
      await sql.unsafe(seedSql);
      console.log("[global-teardown] Reseeded local catalog from supabase/seed.sql");
    } catch (err) {
      console.error("[global-teardown] Failed to reseed catalog:", err);
    }

    // `profiles` is also truncated between test files, wiping the local
    // dev-admin fixture used for manual browser testing. It can't live in
    // seed.sql because it must reference a real auth.users row created via
    // Supabase (see supabase/manual/grant-local-admin.sql). Re-grant it here
    // by email so a `pnpm test` run right before manual browser testing
    // doesn't leave the fixture 404ing on its next cart/order FK check. Safe
    // no-op if the account doesn't exist (CI, other devs' machines).
    try {
      const testAdminEmail = process.env.TEST_ADMIN_EMAIL || "aurevo-test-admin@example.com";
      const [user] = await sql`select id from auth.users where email = ${testAdminEmail} limit 1`;
      if (user) {
        await sql`
          insert into public.profiles (id, preferences)
          values (${user.id}, '{"role":"admin"}'::jsonb)
          on conflict (id) do update set
            preferences = coalesce(public.profiles.preferences, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
            updated_at = now()
        `;
        console.log(`[global-teardown] Re-granted admin profile for ${testAdminEmail}`);
      }
    } catch (err) {
      console.error("[global-teardown] Failed to re-grant test-admin profile:", err);
    } finally {
      await sql.end();
    }
  };
}
