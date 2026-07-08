import { and, eq, ne, asc, desc, ilike, or, count, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { productVariants, products, inventory, inventoryMovements, orderItems } from "../../../db/schema";
import { NotFoundError, ConflictError, BusinessRuleError } from "../../errors/AppError";
import type { CreateVariantInput, UpdateVariantInput, AdjustStockInput, BulkCreateVariantsInput, GetAllVariantsQuery } from "./variants.schema";

async function assertProductExists(productId: string) {
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
  if (!product) throw new NotFoundError("Product");
}

async function getVariantOrThrow(productId: string, id: string) {
  const [variant] = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.id, id), eq(productVariants.productId, productId)));
  if (!variant) throw new NotFoundError("Variant");
  return variant;
}

const variantSelectFields = {
  id: productVariants.id,
  productId: productVariants.productId,
  sku: productVariants.sku,
  name: productVariants.name,
  size: productVariants.size,
  color: productVariants.color,
  colorCode: productVariants.colorCode,
  price: productVariants.price,
  compareAtPrice: productVariants.compareAtPrice,
  stock: productVariants.stock,
  isActive: productVariants.isActive,
  sortOrder: productVariants.sortOrder,
  createdAt: productVariants.createdAt,
  updatedAt: productVariants.updatedAt,
  product: {
    id: products.id,
    name: products.name,
    slug: products.slug,
    basePrice: products.basePrice,
    isActive: products.isActive,
  },
};

export async function getAllVariants(filters: GetAllVariantsQuery) {
  const conditions = [];
  if (filters.search) {
    conditions.push(or(
      ilike(productVariants.sku, `%${filters.search}%`),
      ilike(productVariants.name, `%${filters.search}%`),
      ilike(productVariants.size, `%${filters.search}%`),
      ilike(productVariants.color, `%${filters.search}%`),
    ));
  }
  if (filters.isActive !== undefined) {
    conditions.push(eq(productVariants.isActive, filters.isActive === "true"));
  }
  if (filters.productId) {
    conditions.push(eq(productVariants.productId, filters.productId));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select(variantSelectFields)
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(where)
      .orderBy(asc(products.name), asc(productVariants.sortOrder), asc(productVariants.createdAt))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit),
    db.select({ total: count() })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(where),
  ]);

  const totalCount = Number(total);
  return {
    data: rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / filters.limit),
      hasNext: filters.page * filters.limit < totalCount,
      hasPrev: filters.page > 1,
    },
  };
}

export async function getVariants(productId: string) {
  await assertProductExists(productId);
  return db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));
}

export async function getVariantById(productId: string, id: string) {
  return getVariantOrThrow(productId, id);
}

export async function createVariant(productId: string, input: CreateVariantInput) {
  await assertProductExists(productId);

  if (input.sku) {
    const [conflict] = await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.sku, input.sku));
    if (conflict) throw new ConflictError(`SKU "${input.sku}" is already taken`);
  }

  return db.transaction(async (tx) => {
    const [variant] = await tx
      .insert(productVariants)
      .values({
        productId,
        sku: input.sku,
        name: input.name,
        size: input.size,
        color: input.color,
        colorCode: input.colorCode,
        material: input.material,
        weight: input.weight?.toString(),
        price: input.price?.toString(),
        compareAtPrice: input.compareAtPrice?.toString(),
        barcode: input.barcode,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
        stock: input.stock,
      })
      .returning();

    // The Inventory admin page joins from `inventory`, not product_variants —
    // without a matching row here, new variants never show up there.
    await tx.insert(inventory).values({
      variantId: variant!.id,
      location: "main",
      quantity: input.stock,
    });

    return variant!;
  });
}

export async function updateVariant(productId: string, id: string, input: UpdateVariantInput) {
  await getVariantOrThrow(productId, id);

  if (input.sku) {
    const [conflict] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(and(eq(productVariants.sku, input.sku), ne(productVariants.id, id)));
    if (conflict) throw new ConflictError(`SKU "${input.sku}" is already taken`);
  }

  const [updated] = await db
    .update(productVariants)
    .set({
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.size !== undefined && { size: input.size }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.colorCode !== undefined && { colorCode: input.colorCode }),
      ...(input.material !== undefined && { material: input.material }),
      ...(input.weight !== undefined && { weight: input.weight.toString() }),
      ...(input.price !== undefined && { price: input.price.toString() }),
      ...(input.compareAtPrice !== undefined && { compareAtPrice: input.compareAtPrice.toString() }),
      ...(input.barcode !== undefined && { barcode: input.barcode }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(productVariants.id, id), eq(productVariants.productId, productId)))
    .returning();

  return updated!;
}

export async function deleteVariant(productId: string, id: string) {
  const variant = await getVariantOrThrow(productId, id);

  const [{ orderCount }] = await db
    .select({ orderCount: count() })
    .from(orderItems)
    .where(eq(orderItems.variantId, id));

  if (Number(orderCount) > 0) {
    throw new BusinessRuleError(
      `Cannot delete variant "${variant.sku ?? variant.name ?? id}" — it appears in ${orderCount} order(s). Deactivate it instead.`
    );
  }

  await db.delete(productVariants).where(and(eq(productVariants.id, id), eq(productVariants.productId, productId)));
}

export async function bulkCreateVariants(productId: string, input: BulkCreateVariantsInput) {
  await assertProductExists(productId);

  const skus = input.variants.map((v) => v.sku).filter(Boolean) as string[];
  if (skus.length > 0) {
    // Duplicates within the batch itself
    const seen = new Set<string>();
    for (const sku of skus) {
      if (seen.has(sku)) throw new ConflictError(`SKU "${sku}" appears more than once in the batch`);
      seen.add(sku);
    }

    // SKUs are unique across ALL products, not just this one — same rule as createVariant
    const conflicts = await db
      .select({ sku: productVariants.sku })
      .from(productVariants)
      .where(inArray(productVariants.sku, skus));
    if (conflicts.length > 0) {
      throw new ConflictError(`SKU "${conflicts[0]!.sku}" is already taken`);
    }
  }

  const rows = input.variants.map((v, i) => ({
    productId,
    sku: v.sku,
    name: v.name,
    size: v.size,
    color: v.color,
    colorCode: v.color_code,
    price: v.price?.toString(),
    compareAtPrice: v.compare_at_price?.toString(),
    sortOrder: v.sort_order ?? i,
    stock: v.initial_stock ?? 0,
    isActive: true,
  }));

  return db.transaction(async (tx) => {
    const created = await tx.insert(productVariants).values(rows).returning();

    // Same reasoning as createVariant: the Inventory admin page joins from
    // `inventory`, so every variant needs a matching row to be visible there.
    await tx.insert(inventory).values(
      created.map((v) => ({
        variantId: v.id,
        location: "main",
        quantity: v.stock,
      }))
    );

    return created;
  });
}

export async function adjustStock(productId: string, id: string, input: AdjustStockInput) {
  const variant = await getVariantOrThrow(productId, id);
  const newStock = variant.stock + input.adjustment;

  if (newStock < 0) {
    throw new BusinessRuleError(`Stock adjustment would result in negative stock (current: ${variant.stock}, adjustment: ${input.adjustment})`);
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(productVariants)
      .set({ stock: newStock, updatedAt: new Date().toISOString() })
      .where(and(eq(productVariants.id, id), eq(productVariants.productId, productId)))
      .returning();

    // Keep inventory table in sync — it is the source of truth for stock checks
    await tx
      .update(inventory)
      .set({ quantity: newStock, updatedAt: new Date().toISOString() })
      .where(eq(inventory.variantId, id));

    // Audit trail — inventory.adjustInventory logs a movement for every
    // adjustment; adjustments made through this endpoint must show up in the
    // same movements log.
    await tx.insert(inventoryMovements).values({
      variantId: id,
      movementType: "adjustment",
      reason: "manual_adjustment",
      quantity: Math.abs(input.adjustment),
      previousQuantity: variant.stock,
      newQuantity: newStock,
      location: "main",
      notes: input.reason,
    });

    return updated!;
  });
}
