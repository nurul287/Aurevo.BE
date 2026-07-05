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
    } finally {
      await sql.end();
    }
  };
}
