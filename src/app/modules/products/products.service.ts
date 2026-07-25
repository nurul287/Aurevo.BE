import { eq, ne, ilike, and, or, asc, desc, count, gte, lte, inArray, SQL } from "drizzle-orm";
import { db } from "../../../db";
import { products, productVariants, productImages, categories, brands } from "../../../db/schema";
import { NotFoundError, ConflictError } from "../../errors";
import { logger } from "../../../lib/logger";
import { deleteProductChunk, upsertProductChunk } from "../knowledge/knowledge.service";
import type { CreateProductInput, UpdateProductInput, GetProductsInput, BulkStatusInput, BulkDeleteInput } from "./products.schema";

// Fire-and-forget — a slow/failed embed must never block the product write.
// Keeps kb_chunks fresh without full CDC infra at this catalog's current scale.
function reembedProduct(productId: string) {
  void upsertProductChunk(productId).catch((err) =>
    logger.error({ err, productId }, "kb_chunks re-embed failed"),
  );
}

export async function getProducts(filters: GetProductsInput, isAdmin = false) {
  const conditions: SQL[] = [];

  // Admins may filter freely (or see everything); the public only ever sees
  // active products regardless of what query params they send.
  if (!isAdmin) {
    conditions.push(eq(products.isActive, true));
  } else if (filters.isActive !== undefined) {
    conditions.push(eq(products.isActive, filters.isActive === "true"));
  }
  if (filters.isFeatured !== undefined) {
    conditions.push(eq(products.isFeatured, filters.isFeatured === "true"));
  }
  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.brandId) conditions.push(eq(products.brandId, filters.brandId));
  if (filters.gender) conditions.push(eq(products.gender, filters.gender));
  if (filters.minPrice) conditions.push(gte(products.basePrice, filters.minPrice.toString()));
  if (filters.maxPrice) conditions.push(lte(products.basePrice, filters.maxPrice.toString()));
  if (filters.search) {
    conditions.push(
      or(
        ilike(products.name, `%${filters.search}%`),
        ilike(products.description, `%${filters.search}%`)
      )!
    );
  }

  const sortColMap = {
    name: products.name,
    basePrice: products.basePrice,
    createdAt: products.createdAt,
    isFeatured: products.isFeatured,
  };
  const sortCol = sortColMap[filters.sortBy];
  const sortDir = filters.sortOrder === "asc" ? asc(sortCol) : desc(sortCol);
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      shortDescription: products.shortDescription,
      basePrice: products.basePrice,
      compareAtPrice: products.compareAtPrice,
      gender: products.gender,
      isActive: products.isActive,
      isFeatured: products.isFeatured,
      categoryId: products.categoryId,
      brandId: products.brandId,
      tags: products.tags,
      createdAt: products.createdAt,
    })
      .from(products)
      .where(where)
      .orderBy(sortDir)
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit),
    db.select({ total: count() }).from(products).where(where),
  ]);

  // Embed images and variants for each product in one batch query each
  const productIds = rows.map((r) => r.id);
  const [allImages, allVariants] = productIds.length
    ? await Promise.all([
        db.select().from(productImages).where(inArray(productImages.productId, productIds)),
        db.select().from(productVariants).where(inArray(productVariants.productId, productIds)),
      ])
    : [[], []];

  const imagesByProduct = allImages.reduce<Record<string, typeof allImages>>((acc, img) => {
    const productId = img.productId;
    if (!productId) return acc;
    (acc[productId] ??= []).push(img);
    return acc;
  }, {});
  const variantsByProduct = allVariants.reduce<Record<string, typeof allVariants>>((acc, v) => {
    const productId = v.productId;
    if (!productId) return acc;
    (acc[productId] ??= []).push(v);
    return acc;
  }, {});

  const enrichedRows = rows.map((r) => ({
    ...r,
    images: imagesByProduct[r.id] ?? [],
    variants: variantsByProduct[r.id] ?? [],
  }));

  const totalCount = Number(total);
  return {
    data: enrichedRows,
    meta: {
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / filters.limit),
        hasNext: filters.page * filters.limit < totalCount,
        hasPrev: filters.page > 1,
      },
    },
  };
}

export async function getProductById(id: string, isAdmin = false) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) throw new NotFoundError("Product");
  if (!isAdmin && !product.isActive) throw new NotFoundError("Product");

  const [variants, images] = await Promise.all([
    db.select().from(productVariants)
      .where(and(eq(productVariants.productId, id), eq(productVariants.isActive, true))),
    db.select().from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.sortOrder)),
  ]);

  return { ...product, variants, images };
}

export async function getProductBySlug(slug: string, isAdmin = false) {
  const [product] = await db.select().from(products).where(eq(products.slug, slug));
  if (!product) throw new NotFoundError("Product");
  if (!isAdmin && !product.isActive) throw new NotFoundError("Product");

  const [variants, images] = await Promise.all([
    db.select().from(productVariants)
      .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true))),
    db.select().from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sortOrder)),
  ]);

  return { ...product, variants, images };
}

export type InsertProductData = {
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  sku?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  gender: "men" | "women" | "unisex";
  material?: string | null;
  careInstructions?: string | null;
  basePrice: number;
  compareAtPrice?: number | null;
  isActive: boolean;
  isFeatured: boolean;
  trackInventory: boolean;
  allowBackorder: boolean;
  minOrderQuantity: number;
  maxOrderQuantity?: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  tags: string[];
  /** Provenance for bulk-imported products (migration 045) — omit for manual creation. */
  externalId?: string | null;
  source?: string | null;
};

/**
 * Raw product insert with NO side effects (no re-embed) — the shared core
 * behind createProduct (below, which re-embeds once per call) and the bulk
 * import worker (which batch-embeds every product once at the end of a job
 * instead of firing one Voyage call per row). Callers are responsible for
 * their own slug/SKU uniqueness checks — createProduct does the normal
 * check-then-insert; the import worker uses a race-safe slug generator
 * since many rows are inserted concurrently (see imports/resolvers.ts).
 */
export async function insertProduct(data: InsertProductData) {
  const [created] = await db.insert(products).values({
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    shortDescription: data.shortDescription ?? null,
    sku: data.sku ?? null,
    categoryId: data.categoryId ?? null,
    brandId: data.brandId ?? null,
    gender: data.gender,
    material: data.material ?? null,
    careInstructions: data.careInstructions ?? null,
    basePrice: data.basePrice.toString(),
    compareAtPrice: data.compareAtPrice?.toString() ?? null,
    isActive: data.isActive,
    isFeatured: data.isFeatured,
    trackInventory: data.trackInventory,
    allowBackorder: data.allowBackorder,
    minOrderQuantity: data.minOrderQuantity,
    maxOrderQuantity: data.maxOrderQuantity ?? null,
    metaTitle: data.metaTitle ?? null,
    metaDescription: data.metaDescription ?? null,
    tags: data.tags,
    externalId: data.externalId ?? null,
    source: data.source ?? null,
  }).returning();
  return created!;
}

export async function createProduct(input: CreateProductInput) {
  const [existing] = await db.select({ id: products.id })
    .from(products)
    .where(eq(products.slug, input.slug));
  if (existing) throw new ConflictError(`Slug "${input.slug}" is already taken`);

  if (input.sku) {
    const [skuConflict] = await db.select({ id: products.id })
      .from(products)
      .where(eq(products.sku, input.sku));
    if (skuConflict) throw new ConflictError(`SKU "${input.sku}" is already taken`);
  }

  const created = await insertProduct(input);
  reembedProduct(created.id);
  return created;
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  await getProductById(id);

  if (input.slug) {
    const [conflict] = await db.select({ id: products.id })
      .from(products)
      .where(and(eq(products.slug, input.slug), ne(products.id, id)));
    if (conflict) throw new ConflictError(`Slug "${input.slug}" is already taken`);
  }

  if (input.sku) {
    const [skuConflict] = await db.select({ id: products.id })
      .from(products)
      .where(and(eq(products.sku, input.sku), ne(products.id, id)));
    if (skuConflict) throw new ConflictError(`SKU "${input.sku}" is already taken`);
  }

  const updateData: Record<string, unknown> = { ...input, updatedAt: new Date().toISOString() };
  if (input.basePrice !== undefined) updateData.basePrice = input.basePrice.toString();
  if (input.compareAtPrice !== undefined) updateData.compareAtPrice = input.compareAtPrice?.toString() ?? null;

  const [updated] = await db.update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .returning();

  reembedProduct(id);
  return updated!;
}

export async function deleteProduct(id: string) {
  await getProductById(id);
  // Variants + images cascade-delete via FK constraints
  await db.delete(products).where(eq(products.id, id));
  void deleteProductChunk(id).catch((err) =>
    logger.error({ err, productId: id }, "kb_chunks delete failed"),
  );
}

export async function bulkUpdateStatus(input: BulkStatusInput) {
  const updated = await db.update(products)
    .set({ isActive: input.isActive, updatedAt: new Date().toISOString() })
    .where(inArray(products.id, input.ids))
    .returning({ id: products.id });
  updated.forEach((p) => reembedProduct(p.id));
  return updated;
}

export async function bulkDelete(input: BulkDeleteInput) {
  await db.delete(products).where(inArray(products.id, input.ids));
  input.ids.forEach((id) =>
    deleteProductChunk(id).catch((err) => logger.error({ err, productId: id }, "kb_chunks delete failed")),
  );
}

export async function getFeaturedProducts(limit = 8) {
  return db.select().from(products)
    .where(and(eq(products.isFeatured, true), eq(products.isActive, true)))
    .orderBy(desc(products.createdAt))
    .limit(limit);
}
