import { eq, ne, ilike, and, or, asc, desc, count, gte, lte, inArray, SQL } from "drizzle-orm";
import { db } from "../../../db";
import { products, productVariants, productImages, categories, brands } from "../../../db/schema";
import { NotFoundError, ConflictError } from "../../errors";
import type { CreateProductInput, UpdateProductInput, GetProductsInput, BulkStatusInput, BulkDeleteInput } from "./products.schema";

export async function getProducts(filters: GetProductsInput) {
  const conditions: SQL[] = [];

  // Admin can see all; public only sees active
  if (filters.isActive !== undefined) {
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

  const totalCount = Number(total);
  return {
    data: rows,
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

export async function getProductById(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) throw new NotFoundError("Product");

  const [variants, images] = await Promise.all([
    db.select().from(productVariants)
      .where(and(eq(productVariants.productId, id), eq(productVariants.isActive, true))),
    db.select().from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.sortOrder)),
  ]);

  return { ...product, variants, images };
}

export async function getProductBySlug(slug: string) {
  const [product] = await db.select().from(products).where(eq(products.slug, slug));
  if (!product) throw new NotFoundError("Product");

  const [variants, images] = await Promise.all([
    db.select().from(productVariants)
      .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true))),
    db.select().from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sortOrder)),
  ]);

  return { ...product, variants, images };
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

  const [created] = await db.insert(products).values({
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    shortDescription: input.shortDescription ?? null,
    sku: input.sku ?? null,
    categoryId: input.categoryId ?? null,
    brandId: input.brandId ?? null,
    gender: input.gender,
    material: input.material ?? null,
    careInstructions: input.careInstructions ?? null,
    basePrice: input.basePrice.toString(),
    compareAtPrice: input.compareAtPrice?.toString() ?? null,
    isActive: input.isActive,
    isFeatured: input.isFeatured,
    trackInventory: input.trackInventory,
    allowBackorder: input.allowBackorder,
    minOrderQuantity: input.minOrderQuantity,
    maxOrderQuantity: input.maxOrderQuantity ?? null,
    metaTitle: input.metaTitle ?? null,
    metaDescription: input.metaDescription ?? null,
    tags: input.tags,
  }).returning();

  return created!;
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

  return updated!;
}

export async function deleteProduct(id: string) {
  await getProductById(id);
  // Variants + images cascade-delete via FK constraints
  await db.delete(products).where(eq(products.id, id));
}

export async function bulkUpdateStatus(input: BulkStatusInput) {
  const updated = await db.update(products)
    .set({ isActive: input.isActive, updatedAt: new Date().toISOString() })
    .where(inArray(products.id, input.ids))
    .returning({ id: products.id });
  return updated;
}

export async function bulkDelete(input: BulkDeleteInput) {
  await db.delete(products).where(inArray(products.id, input.ids));
}

export async function getFeaturedProducts(limit = 8) {
  return db.select().from(products)
    .where(and(eq(products.isFeatured, true), eq(products.isActive, true)))
    .orderBy(desc(products.createdAt))
    .limit(limit);
}
