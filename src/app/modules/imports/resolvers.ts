import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { brands, categories, products } from "../../../db/schema";
import { slugify } from "../../../lib/slugify";

/**
 * Race-safe find-or-create: SELECT by slug, and if absent, INSERT with
 * ON CONFLICT DO NOTHING. If the insert loses the race (another concurrent
 * row created the same brand/category first), re-SELECT to get the winner's
 * id. Needed because the import worker processes rows concurrently — two
 * rows referencing the same new brand name would otherwise both pass the
 * initial SELECT and one would hit a unique-constraint error on INSERT.
 */
async function resolveOrCreate(
  table: typeof brands | typeof categories,
  name: string,
): Promise<string> {
  const slug = slugify(name) || "unnamed";

  const [existing] = await db.select({ id: table.id }).from(table).where(eq(table.slug, slug));
  if (existing) return existing.id;

  const [created] = await db
    .insert(table)
    .values({ name, slug, isActive: true })
    .onConflictDoNothing({ target: table.slug })
    .returning({ id: table.id });
  if (created) return created.id;

  const [winner] = await db.select({ id: table.id }).from(table).where(eq(table.slug, slug));
  if (!winner) throw new Error(`Failed to resolve or create "${name}" (slug "${slug}")`);
  return winner.id;
}

export const resolveOrCreateBrand = (name: string) => resolveOrCreate(brands, name);
export const resolveOrCreateCategory = (name: string) => resolveOrCreate(categories, name);

/**
 * Per-import-job cache for resolveOrCreateBrand/Category — many rows in the
 * same spreadsheet typically repeat the same handful of brand/category
 * names. Caches the in-flight PROMISE (not just the resolved id), so
 * concurrent rows resolving the same name for the first time within one
 * worker process share a single DB round-trip instead of racing each other
 * (the DB-level ON CONFLICT DO NOTHING in resolveOrCreate is the second,
 * cross-process line of defense — this cache is purely a perf/race optimization).
 */
export function createResolverCache() {
  const brandCache = new Map<string, Promise<string>>();
  const categoryCache = new Map<string, Promise<string>>();

  function cached(cache: Map<string, Promise<string>>, resolve: (name: string) => Promise<string>, name: string) {
    const key = slugify(name) || "unnamed";
    let pending = cache.get(key);
    if (!pending) {
      pending = resolve(name);
      cache.set(key, pending);
    }
    return pending;
  }

  return {
    resolveBrand: (name: string) => cached(brandCache, resolveOrCreateBrand, name),
    resolveCategory: (name: string) => cached(categoryCache, resolveOrCreateCategory, name),
  };
}

/**
 * A unique product slug from `base` (a title, optionally with colorway
 * appended by the caller for readability/collision-avoidance) — tries the
 * bare slug, then `-2`, `-3`, ... A check-then-insert race is possible when
 * two rows in the same batch share an identical base slug and resolve
 * concurrently; the DB's unique constraint on products.slug is the final
 * backstop (that row fails and can be retried via POST /imports/:id/retry,
 * by which point the winning row's slug is visible to the SELECT below).
 */
export async function generateUniqueProductSlug(base: string): Promise<string> {
  const baseSlug = slugify(base) || "product";

  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? baseSlug : `${baseSlug}-${n + 1}`;
    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.slug, candidate));
    if (!existing) return candidate;
  }

  // 50 identical base titles in one catalog is implausible; fall back to a
  // collision-proof suffix rather than looping forever.
  return `${baseSlug}-${Date.now().toString(36)}`;
}
