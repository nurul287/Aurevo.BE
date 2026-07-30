# Production objects that exist in no migration

Discovered while moving schema ownership from the Supabase CLI to Drizzle Kit
(2026-07-30). `supabase migration list` reports all 41 archived migrations applied and
the table list matches `src/db/schema.ts`, so the migration history *looks*
complete — but it describes only tables. Production also carries functions and
triggers that no file under `supabase/migrations-archive/` ever created.

Verified read-only against project `bwcbcmeftplyljgcacvr`.

## Functions present in production, absent from every migration

| Function | Disposition |
|---|---|
| `can_user_review_product(uuid, uuid)` | carry forward |
| `get_cart_total(uuid)` | carry forward |
| `get_product_availability(uuid)` | carry forward |
| `handle_new_user()` | carry forward — likely wired to an `auth.users` trigger |
| `verify_guest_token(uuid, text)` | carry forward — guest order flow |
| `rls_auto_enable()` | carry forward — backs the `ensure_rls` event trigger |
| `update_inventory_on_order()` | **excluded**, see below |

## Storage buckets — now versioned

Production has two buckets, `product-images` (public, 5 MB, jpeg/png/webp/gif/avif)
and `Logo` (public, unrestricted). Both were created through the Supabase
dashboard and existed in **no** migration, so `supabase db reset` destroyed them
and every image upload then failed with:

```json
{ "code": "STORAGE_ERROR", "message": "Storage upload failed: Bucket not found" }
```

Archived migration 016 created RLS policies on `storage.objects` and 017 set the
size/MIME limits — but a policy on a bucket that does not exist is inert, so a
freshly built database was never actually usable for uploads.

`drizzle/0005_storage_buckets.sql` now creates both, `ON CONFLICT DO NOTHING` so
production is untouched. This is the one item in this document that has moved
from "unversioned" to "versioned".

### Bucket contents are still not versioned

Creating the bucket does not populate it. `supabase/seed.sql` stores absolute
storage URLs, 47 of which point at the production project — so a seeded local
catalog renders by loading images *from production*. `pnpm db:localize-images`
copies those files into the local bucket and repoints the database at them; it
is deliberately not part of `db:bootstrap`, because bootstrap runs in CI and CI
must never reach production. Re-run it after each bootstrap, since seeding
restores the production URLs.

Three category covers (`shirt`, `sunglasses`, `watch`) exist **only locally** —
`watch` shares a row id with production's `formal-shoe`, and `shirt`/`sunglasses`
have no production row at all. They were originally lost on every reset, because
`seed.sql` recorded them as `http://127.0.0.1:54321/...` URLs pointing at files
that no bucket outside that one machine ever had.

They are now committed under `supabase/seed-assets/<bucket>/<path>` and
re-uploaded by `pnpm db:seed-assets`, which runs as the last step of
`db:bootstrap`. `seed.sql` carries their real local paths (no `?v=`
cache-busters), so a reseed restores working URLs and the files are already
back in the bucket. `db:localize-images` reports them as "already local" and
correctly does not try to fetch them from production.

Add anything else that must survive a reset but is not in production the same
way: drop the file at `supabase/seed-assets/product-images/<path>` and the
script picks it up. Rows are repointed by the id in the path, not the filename,
so re-uploading in a different format (`cover.jpg` → `cover.png`) still matches.

## Triggers

| Trigger | Table | Disposition |
|---|---|---|
| `ensure_rls` (event trigger, `ddl_command_end`) | — | carry forward |
| `on_order_confirmed` → `update_inventory_on_order()` | `public.orders` | **excluded**, see below |
| `meta-conversions-purchase` | `public.orders` | **not versioned**, see below |

### `ensure_rls`

A custom DDL event trigger calling `rls_auto_enable()`, which runs
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on every new table created in
`public`. Consequence for the flip: it fires during `0001_baseline.sql` and
enables RLS on each table as it is created. Harmless — the baseline enables RLS
on all 24 tables explicitly anyway — but it means a database built without it
will drift from production the next time a table is added.

### `on_order_confirmed` / `update_inventory_on_order()` — excluded

Deliberately **not** carried into the Drizzle migrations. The function does:

```sql
IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
  UPDATE inventory SET reserved_quantity = reserved_quantity - (
    SELECT oi.quantity FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.variant_id = inventory.variant_id)
  WHERE variant_id IN (SELECT variant_id FROM order_items WHERE order_id = NEW.id);
END IF;
```

`reserved_quantity` is 0 by design since migration `037_zero_reserved_quantity`
(see the "Stock accounting" section of `CLAUDE.md`), and availability is
computed as `quantity - reserved_quantity`. So confirming an order drives
`reserved_quantity` negative and **inflates** available stock by the ordered
amount, which can allow overselling. The correlated subquery is also wrong for
multi-line orders — it can return more than one row.

Currently **latent, not causing damage**: `public.inventory` has 39 rows, all
`reserved_quantity = 0`, no negatives; production has one order, which never
took the `UPDATE`-to-`confirmed` path.

Tracked as separate work — it should be dropped from production with a proper
migration, not silently preserved in a new migration history.

### `meta-conversions-purchase` — intentionally not versioned

An `AFTER INSERT` trigger on `public.orders` created through the Supabase
dashboard (Database Webhooks). It calls
`supabase_functions.http_request(...)` against the `meta-conversions` edge
function.

**Its definition embeds a `service_role` JWT in plaintext.** It is therefore
never reproduced in a committed migration file. Two consequences:

1. It stays dashboard-managed. Recreate it by hand on any new project.
2. A locally built database will not fire Meta CAPI. That is already true today
   and is the right behaviour for local development.

Worth noting separately: because the token sits in the trigger definition, it is
readable by anything that can `SELECT` from `pg_trigger` — including
`pg_get_triggerdef`. If that key is ever rotated, this trigger must be
recreated, and the old value should be treated as having been broadly readable.

## Why this matters for the flip

`scripts/db-gen-custom-migration.mjs` generates
`drizzle/0002_functions_triggers_comments.sql` from a live database. Run against
a freshly reset **local** database it will miss every function in the first
table above, because a local reset only replays `supabase/migrations-archive/`. Run it
against production (it issues `SELECT`s only) to capture the settled state, or
append those definitions by hand.
