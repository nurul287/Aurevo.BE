import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { brands, categories, products } from "../../../db/schema";
import { resolveOrCreateBrand, resolveExistingCategory, createResolverCache, generateUniqueProductSlug } from "./resolvers";

async function cleanAll() {
  await db.delete(products);
  await db.delete(brands);
  await db.delete(categories);
}

beforeEach(cleanAll);
afterAll(cleanAll);

describe("resolveOrCreateBrand", () => {
  it("creates a brand on first resolution and reuses it on the next", async () => {
    const id1 = await resolveOrCreateBrand("Aurevo Originals");
    const id2 = await resolveOrCreateBrand("Aurevo Originals");
    expect(id2).toBe(id1);

    const rows = await db.select().from(brands).where(eq(brands.slug, "aurevo-originals"));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Aurevo Originals");
  });

  it("resolves concurrently-racing calls for the same new brand to one row (ON CONFLICT DO NOTHING + re-select)", async () => {
    const [a, b, c] = await Promise.all([
      resolveOrCreateBrand("Concurrent Brand"),
      resolveOrCreateBrand("Concurrent Brand"),
      resolveOrCreateBrand("Concurrent Brand"),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);

    const rows = await db.select().from(brands).where(eq(brands.slug, "concurrent-brand"));
    expect(rows).toHaveLength(1);
  });
});

describe("resolveExistingCategory", () => {
  it("resolves to an existing category by exact slug match", async () => {
    const [seeded] = await db.insert(categories).values({ name: "Panjabi", slug: "panjabi", isActive: true }).returning();
    const id = await resolveExistingCategory("Panjabi");
    expect(id).toBe(seeded!.id);
  });

  it("resolves via the known slug aliases (scraper spelling vs. this catalog's curated slugs)", async () => {
    const [tshart] = await db.insert(categories).values({ name: "T-SHART", slug: "t-shart", isActive: true }).returning();
    const [cap] = await db.insert(categories).values({ name: "CAP", slug: "mans", isActive: true }).returning();

    expect(await resolveExistingCategory("t-shirt")).toBe(tshart!.id);
    expect(await resolveExistingCategory("cap")).toBe(cap!.id);
  });

  it("throws instead of creating a new category when nothing matches", async () => {
    await expect(resolveExistingCategory("Jackets")).rejects.toThrow(
      /no existing category matches/i,
    );

    const rows = await db.select().from(categories).where(eq(categories.slug, "jackets"));
    expect(rows).toHaveLength(0);
  });
});

describe("createResolverCache", () => {
  it("shares one DB round-trip for repeated lookups of the same brand/category within a job", async () => {
    const cache = createResolverCache();
    const first = await cache.resolveBrand("Cache Test Brand");
    const second = await cache.resolveBrand("Cache Test Brand");
    expect(second).toBe(first);

    const rows = await db.select().from(brands).where(eq(brands.slug, "cache-test-brand"));
    expect(rows).toHaveLength(1);
  });

  it("keeps brand and category caches independent", async () => {
    await db.insert(categories).values({ name: "Shared Name", slug: "shared-name", isActive: true });

    const cache = createResolverCache();
    const brandId = await cache.resolveBrand("Shared Name");
    const categoryId = await cache.resolveCategory("Shared Name");
    expect(brandId).not.toBe(categoryId);
  });
});

describe("generateUniqueProductSlug", () => {
  it("returns the bare slug when nothing collides", async () => {
    const slug = await generateUniqueProductSlug("Brand New Product");
    expect(slug).toBe("brand-new-product");
  });

  it("appends -2, -3, ... on collision", async () => {
    await db.insert(products).values({ name: "x", slug: "collide-me", basePrice: "100", isActive: true });
    await db.insert(products).values({ name: "x", slug: "collide-me-2", basePrice: "100", isActive: true });

    const slug = await generateUniqueProductSlug("Collide Me");
    expect(slug).toBe("collide-me-3");
  });
});
