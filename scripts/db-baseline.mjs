#!/usr/bin/env node
/**
 * Baselines an EXISTING database against drizzle/ — marks every current
 * migration as already applied without running any of its SQL.
 *
 * Why this is needed: production was built by the archived Supabase CLI
 * migrations and has never seen Drizzle. `drizzle-kit migrate` would therefore
 * consider 0000-0004 unapplied and try to create everything from scratch —
 * 0001 fails on `CREATE TYPE "public"."address_type"` (already exists) and,
 * because Drizzle runs all migrations in a single transaction, the whole thing
 * rolls back. No data loss, but the deploy pipeline breaks. Run this ONCE
 * against production before the first `pnpm db:migrate`.
 *
 * How Drizzle decides what to apply (drizzle-orm/pg-core/dialect.js):
 *
 *     select id, hash, created_at from drizzle.__drizzle_migrations
 *       order by created_at desc limit 1
 *     -> apply each migration whose journal `when` > that created_at
 *
 * It reads only the newest row and compares timestamps. There is no
 * per-migration hash check, so strictly only the maximum created_at matters —
 * but a row per migration is written anyway so the table is a truthful record.
 * Hashes are computed exactly as drizzle-orm/migrator.js does
 * (sha256 of the raw file text) so they line up with what a real apply writes.
 *
 * Usage:
 *   node scripts/db-baseline.mjs <DATABASE_URL>            # dry run (default)
 *   node scripts/db-baseline.mjs <DATABASE_URL> --apply    # actually write
 */
import crypto from "node:crypto";
import fs from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const MIGRATIONS_DIR = join(process.cwd(), "drizzle");

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const url = args.find((a) => !a.startsWith("--")) ?? process.env.DATABASE_URL;

  if (!url) {
    console.error("Usage: node scripts/db-baseline.mjs <DATABASE_URL> [--apply]");
    process.exit(1);
  }

  const journalPath = join(MIGRATIONS_DIR, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const entries = journal.entries.map((e) => {
    const sqlPath = join(MIGRATIONS_DIR, `${e.tag}.sql`);
    const text = fs.readFileSync(sqlPath).toString();
    return {
      tag: e.tag,
      when: e.when,
      hash: crypto.createHash("sha256").update(text).digest("hex"),
    };
  });

  if (entries.length === 0) {
    console.error("No migrations found in drizzle/meta/_journal.json");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    // Safety 1: refuse to baseline an empty database. Baselining means "these
    // migrations already ran"; on an empty DB that is false and would leave a
    // permanently broken state where migrate reports nothing pending against
    // no schema.
    const [{ count: tableCount }] = await sql`
      SELECT count(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    if (tableCount === 0) {
      console.error(
        "Refusing to baseline: public schema has no tables. This database is " +
          "empty — run `pnpm db:migrate` instead, which applies the SQL for real.",
      );
      process.exit(1);
    }

    // Safety 2: never touch an already-tracked database.
    const [{ count: trackedCount }] = await sql`
      SELECT count(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
    `;
    if (trackedCount > 0) {
      const existing = await sql`
        SELECT count(*)::int AS n, max(created_at)::text AS newest
        FROM drizzle.__drizzle_migrations
      `;
      if (existing[0].n > 0) {
        console.error(
          `Refusing to baseline: drizzle.__drizzle_migrations already has ` +
            `${existing[0].n} row(s) (newest created_at ${existing[0].newest}). ` +
            `This database is already tracked.`,
        );
        process.exit(1);
      }
    }

    console.log(`Target has ${tableCount} tables in public.`);
    console.log(`Would mark ${entries.length} migration(s) as applied:`);
    for (const e of entries) {
      console.log(`  ${e.tag}  when=${e.when}  sha256=${e.hash.slice(0, 16)}…`);
    }

    if (!apply) {
      console.log("\nDRY RUN — nothing written. Re-run with --apply to commit.");
      return;
    }

    await sql.begin(async (tx) => {
      await tx`CREATE SCHEMA IF NOT EXISTS drizzle`;
      // Same DDL drizzle-orm emits itself (pg-core/dialect.js).
      await tx`
        CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        )
      `;
      for (const e of entries) {
        await tx`
          INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
          VALUES (${e.hash}, ${e.when})
        `;
      }
    });

    const [{ n, newest }] = await sql`
      SELECT count(*)::int AS n, max(created_at)::text AS newest
      FROM drizzle.__drizzle_migrations
    `;
    console.log(
      `\nBaselined: ${n} row(s) written, newest created_at ${newest}.\n` +
        `Verify with \`pnpm db:migrate\` — it must report nothing to apply.`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
