# Archived Supabase CLI migrations (historical only)

These 41 files (`001`–`045`, with `004`, `005`, `006` and `015` never committed)
were the schema source of truth until 2026-07-30, applied to production by
`supabase db push`. **They are no longer applied to anything.**

Schema ownership now belongs to Drizzle Kit:

- `src/db/schema.ts` — hand-authored tables, enums, indexes, sequences and RLS
  policies
- `drizzle/` — generated + hand-written migrations, applied by `drizzle-kit migrate`

`[db.migrations] enabled = false` in `supabase/config.toml` stops
`supabase db reset` from replaying this directory. Do not re-enable it: replaying
these files against a Drizzle-managed database would conflict with
`drizzle/0001_baseline.sql`, which creates the same objects.

## Why they are kept

1. They are the historical record of *why* the schema looks the way it does.
   Several carry incident write-ups worth preserving — `039_rag_chat_knowledge_base.sql`
   documents the CI `paths-filter` race that silently skipped it in production for
   two merges, and `034`/`035` explain the inventory double-decrement fixes.
2. They are the ground truth for the RLS predicates that were re-authored by hand
   in `schema.ts`. `drizzle-kit introspect` had emitted 34 of the 49 policies with
   no `USING` clause at all, so `002_complete_rls_setup.sql`, `025` and `026` — not
   the introspected output — are what the current policy definitions were
   transcribed from.
3. Production's `supabase_migrations.schema_migrations` still lists all 41 as
   applied. That table is now inert but is not cleaned up, so the names here still
   correspond to what prod recorded.

## Equivalence was verified, not assumed

Before the switch, a database built purely from `drizzle/` was diffed against one
built purely from these files:

- `pg_dump --schema-only -n public` — identical (ignoring pg_dump's random
  per-run `\restrict` session tokens)
- every row of `pg_policies` including `qual` and `with_check` — byte-identical,
  49/49
- the full test suite — 386 tests across 25 files, passing

The reference dumps are committed at `docs/db-flip/reference-public.sql` and
`docs/db-flip/reference-policies.csv`.

## What these files never described

Production also contains functions and triggers that no file here ever created —
see [`docs/db-flip/unversioned-prod-objects.md`](../../docs/db-flip/unversioned-prod-objects.md).
`supabase migration list` looked complete because it only accounts for
migrations, not for objects created through the dashboard or by hand.
