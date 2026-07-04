#!/usr/bin/env node
/**
 * Validates supabase/migrations layout (Phase 1 DB workflow).
 * Run via: pnpm db:validate
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATION_NAME = /^\d{3}_[a-z0-9_]+\.sql$/i;

const errors = [];

async function main() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);

  if (files.length === 0) {
    errors.push("No migration files found in supabase/migrations/");
  }

  const sqlMigrations = files.filter((f) => f.endsWith(".sql"));
  const invalid = files.filter((f) => !f.endsWith(".sql"));

  for (const name of invalid) {
    errors.push(
      `Non-SQL file in migrations/: ${name} — move to supabase/docs/ or supabase/manual/`,
    );
  }

  for (const name of sqlMigrations) {
    if (!MIGRATION_NAME.test(name)) {
      errors.push(
        `Invalid migration name: ${name} — use NNN_description.sql (e.g. 027_add_product_video.sql)`,
      );
    }
  }

  const numbers = sqlMigrations
    .map((name) => parseInt(name.slice(0, 3), 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] === numbers[i - 1]) {
      errors.push(`Duplicate migration number: ${String(numbers[i]).padStart(3, "0")}`);
    }
  }

  for (const name of sqlMigrations) {
    const content = await readFile(join(MIGRATIONS_DIR, name), "utf8");
    if (!content.trim()) {
      errors.push(`Empty migration file: ${name}`);
    }
  }

  if (errors.length > 0) {
    console.error("Database migration validation failed:\n");
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `OK: ${sqlMigrations.length} migration(s) in supabase/migrations/ (numbers ${numbers[0]}–${numbers[numbers.length - 1]})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
