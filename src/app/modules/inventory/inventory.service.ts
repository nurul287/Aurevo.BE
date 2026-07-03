import { and, eq, lt, count, desc, SQL, inArray, ilike, or } from "drizzle-orm";
import { db } from "../../../db";
import { inventory, inventoryMovements, productVariants, products } from "../../../db/schema";
import { NotFoundError, BusinessRuleError } from "../../errors/AppError";
import type { GetInventoryInput, UpsertInventoryInput, AdjustInventoryInput, GetMovementsInput, GetLowStockInput } from "./inventory.schema";

export async function getInventory(filters: GetInventoryInput) {
  const inventoryConditions: SQL[] = [];
  if (filters.variantId) inventoryConditions.push(eq(inventory.variantId, filters.variantId));
  if (filters.location) inventoryConditions.push(eq(inventory.location, filters.location));
  if (filters.lowStock === "true") {
    inventoryConditions.push(lt(inventory.availableQuantity, inventory.reorderPoint));
  }

  const offset = (filters.page - 1) * filters.limit;

  // When search is provided, join variant+product tables to filter by name/sku
  if (filters.search) {
    const term = `%${filters.search}%`;
    const searchCond = or(
      ilike(products.name, term),
      ilike(productVariants.name, term),
      ilike(productVariants.sku, term),
    )!;

    const joinConditions = inventoryConditions.length
      ? and(...inventoryConditions, searchCond)
      : searchCond;

    const baseQuery = db
      .select({ inv: inventory, pv: productVariants, p: products })
      .from(inventory)
      .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(joinConditions);

    const countQuery = db
      .select({ total: count() })
      .from(inventory)
      .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(joinConditions);

    const [joined, [{ total }]] = await Promise.all([
      baseQuery.orderBy(desc(inventory.updatedAt)).limit(filters.limit).offset(offset),
      countQuery,
    ]);

    const enrichedRows = joined.map(({ inv, pv, p }) => ({
      ...inv,
      productVariants: { ...pv, products: p },
    }));

    return {
      data: enrichedRows,
      meta: {
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / filters.limit),
          hasNext: offset + enrichedRows.length < Number(total),
          hasPrev: filters.page > 1,
        },
      },
    };
  }

  // No search — existing batch-join approach
  const whereClause = inventoryConditions.length ? and(...inventoryConditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(inventory).where(whereClause).orderBy(desc(inventory.updatedAt)).limit(filters.limit).offset(offset),
    db.select({ total: count() }).from(inventory).where(whereClause),
  ]);

  const variantIds = [...new Set(rows.map((r) => r.variantId).filter(Boolean))] as string[];
  const variants = variantIds.length
    ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
    : [];
  const productIds = [...new Set(variants.map((v) => v.productId).filter(Boolean))] as string[];
  const productRows = productIds.length
    ? await db.select({ id: products.id, name: products.name, slug: products.slug, lowStockThreshold: products.lowStockThreshold, basePrice: products.basePrice }).from(products).where(inArray(products.id, productIds))
    : [];

  const productMap = Object.fromEntries(productRows.map((p) => [p.id, p]));
  const variantMap = Object.fromEntries(
    variants.map((v) => [v.id, { ...v, products: productMap[v.productId!] ?? null }])
  );

  const enrichedRows = rows.map((r) => ({
    ...r,
    productVariants: r.variantId ? (variantMap[r.variantId] ?? null) : null,
  }));

  return {
    data: enrichedRows,
    meta: {
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / filters.limit),
        hasNext: offset + rows.length < Number(total),
        hasPrev: filters.page > 1,
      },
    },
  };
}

export async function getInventoryById(id: string) {
  const [row] = await db.select().from(inventory).where(eq(inventory.id, id));
  if (!row) throw new NotFoundError("Inventory record");
  return row;
}

export async function upsertInventory(input: UpsertInventoryInput) {
  const [variant] = await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.id, input.variantId));
  if (!variant) throw new NotFoundError("Variant");

  const [existing] = await db.select().from(inventory)
    .where(and(eq(inventory.variantId, input.variantId), eq(inventory.location, input.location)));

  if (existing) {
    const [updated] = await db.update(inventory)
      .set({
        quantity: input.quantity,
        reservedQuantity: existing.reservedQuantity ?? 0,
        reorderPoint: input.reorderPoint,
        reorderQuantity: input.reorderQuantity,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(inventory.id, existing.id))
      .returning();
    return updated!;
  }

  const [created] = await db.insert(inventory).values({
    variantId: input.variantId,
    location: input.location,
    quantity: input.quantity,
    reorderPoint: input.reorderPoint,
    reorderQuantity: input.reorderQuantity,
  }).returning();
  return created!;
}

export async function adjustInventory(id: string, input: AdjustInventoryInput, userId?: string) {
  const record = await getInventoryById(id);
  const previousQuantity = record.quantity;
  const newQuantity = previousQuantity + input.adjustment;

  if (newQuantity < 0) {
    throw new BusinessRuleError(`Adjustment would result in negative inventory (current: ${previousQuantity}, adjustment: ${input.adjustment})`);
  }

  await db.transaction(async (tx) => {
    await tx.update(inventory).set({ quantity: newQuantity, updatedAt: new Date().toISOString() }).where(eq(inventory.id, id));

    await tx.insert(inventoryMovements).values({
      variantId: record.variantId,
      movementType: input.movementType,
      reason: input.reason,
      quantity: Math.abs(input.adjustment),
      previousQuantity,
      newQuantity,
      reservedQuantity: record.reservedQuantity ?? 0,
      location: record.location ?? "main",
      userId: userId ?? null,
      notes: input.notes,
      costPerUnit: input.costPerUnit?.toString(),
      totalCost: input.costPerUnit ? (input.costPerUnit * Math.abs(input.adjustment)).toString() : undefined,
    });

    // Sync product_variants.stock
    if (record.variantId) {
      await tx.update(productVariants).set({ stock: newQuantity, updatedAt: new Date().toISOString() }).where(eq(productVariants.id, record.variantId));
    }
  });

  return getInventoryById(id);
}

export async function getLowStockAlerts(filters: GetLowStockInput) {
  const whereClause = lt(inventory.availableQuantity, inventory.reorderPoint);
  const offset = (filters.page - 1) * filters.limit;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(inventory).where(whereClause).orderBy(inventory.availableQuantity).limit(filters.limit).offset(offset),
    db.select({ total: count() }).from(inventory).where(whereClause),
  ]);

  const variantIds = [...new Set(rows.map((r) => r.variantId).filter(Boolean))] as string[];
  const variants = variantIds.length
    ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
    : [];
  const productIds = [...new Set(variants.map((v) => v.productId).filter(Boolean))] as string[];
  const productRows = productIds.length
    ? await db.select({ id: products.id, name: products.name, slug: products.slug, lowStockThreshold: products.lowStockThreshold }).from(products).where(inArray(products.id, productIds))
    : [];

  const productMap = Object.fromEntries(productRows.map((p) => [p.id, p]));
  const variantMap = Object.fromEntries(
    variants.map((v) => [v.id, { ...v, products: productMap[v.productId!] ?? null }])
  );

  const enrichedRows = rows.map((r) => ({
    ...r,
    productVariants: r.variantId ? (variantMap[r.variantId] ?? null) : null,
  }));

  return {
    data: enrichedRows,
    meta: {
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / filters.limit),
        hasNext: offset + rows.length < Number(total),
        hasPrev: filters.page > 1,
      },
    },
  };
}

/** Unpaginated — used by the export endpoint, which needs the full matching set. */
export async function getAllLowStockAlerts() {
  const rows = await db
    .select()
    .from(inventory)
    .where(lt(inventory.availableQuantity, inventory.reorderPoint))
    .orderBy(inventory.availableQuantity);

  const variantIds = [...new Set(rows.map((r) => r.variantId).filter(Boolean))] as string[];
  const variants = variantIds.length
    ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
    : [];
  const productIds = [...new Set(variants.map((v) => v.productId).filter(Boolean))] as string[];
  const productRows = productIds.length
    ? await db.select({ id: products.id, name: products.name, slug: products.slug, lowStockThreshold: products.lowStockThreshold }).from(products).where(inArray(products.id, productIds))
    : [];

  const productMap = Object.fromEntries(productRows.map((p) => [p.id, p]));
  const variantMap = Object.fromEntries(
    variants.map((v) => [v.id, { ...v, products: productMap[v.productId!] ?? null }])
  );

  return rows.map((r) => ({
    ...r,
    productVariants: r.variantId ? (variantMap[r.variantId] ?? null) : null,
  }));
}

export async function getMovements(filters: GetMovementsInput) {
  const offset = (filters.page - 1) * filters.limit;

  // Search requires filtering on joined product/variant columns, so the
  // count + page query both need the join when a search term is present.
  if (filters.search) {
    const term = `%${filters.search}%`;
    const conditions: SQL[] = [
      or(ilike(products.name, term), ilike(productVariants.name, term))!,
    ];
    if (filters.variantId) conditions.push(eq(inventoryMovements.variantId, filters.variantId));
    if (filters.movementType) conditions.push(eq(inventoryMovements.movementType, filters.movementType));
    const whereClause = and(...conditions);

    const baseQuery = db
      .select({ m: inventoryMovements, pv: productVariants, p: products })
      .from(inventoryMovements)
      .innerJoin(productVariants, eq(inventoryMovements.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(whereClause);

    const countQuery = db
      .select({ total: count() })
      .from(inventoryMovements)
      .innerJoin(productVariants, eq(inventoryMovements.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(whereClause);

    const [joined, [{ total }]] = await Promise.all([
      baseQuery.orderBy(desc(inventoryMovements.createdAt)).limit(filters.limit).offset(offset),
      countQuery,
    ]);

    const enrichedRows = joined.map(({ m, pv, p }) => ({ ...m, productVariants: { ...pv, products: p } }));

    return {
      data: enrichedRows,
      meta: {
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / filters.limit),
          hasNext: offset + enrichedRows.length < Number(total),
          hasPrev: filters.page > 1,
        },
      },
    };
  }

  const conditions: SQL[] = [];
  if (filters.variantId) conditions.push(eq(inventoryMovements.variantId, filters.variantId));
  if (filters.movementType) conditions.push(eq(inventoryMovements.movementType, filters.movementType));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(inventoryMovements).where(whereClause).orderBy(desc(inventoryMovements.createdAt)).limit(filters.limit).offset(offset),
    db.select({ total: count() }).from(inventoryMovements).where(whereClause),
  ]);

  // Embed productVariants + products
  const variantIds = [...new Set(rows.map((r) => r.variantId).filter(Boolean))] as string[];
  const variants = variantIds.length
    ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
    : [];
  const productIds = [...new Set(variants.map((v) => v.productId).filter(Boolean))] as string[];
  const productRows = productIds.length
    ? await db.select({ id: products.id, name: products.name, slug: products.slug }).from(products).where(inArray(products.id, productIds))
    : [];

  const productMap = Object.fromEntries(productRows.map((p) => [p.id, p]));
  const variantMap = Object.fromEntries(
    variants.map((v) => [v.id, { ...v, products: productMap[v.productId!] ?? null }])
  );

  const enrichedRows = rows.map((r) => ({
    ...r,
    productVariants: r.variantId ? (variantMap[r.variantId] ?? null) : null,
  }));

  return {
    data: enrichedRows,
    meta: {
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / filters.limit),
        hasNext: offset + rows.length < Number(total),
        hasPrev: filters.page > 1,
      },
    },
  };
}


/** Full (unpaginated) inventory levels for export — same filters as getInventory. */
export async function exportInventoryLevels(filters: { search?: string }) {
  const conditions: SQL[] = [];
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(productVariants.name, term),
        ilike(productVariants.sku, term),
      )!
    );
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({ inv: inventory, pv: productVariants, p: products })
    .from(inventory)
    .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(whereClause)
    .orderBy(desc(inventory.updatedAt));

  return rows.map(({ inv, pv, p }) => ({ ...inv, productVariants: { ...pv, products: p } }));
}

/** Full (unpaginated) stock movements for export — same filters as getMovements, plus search. */
export async function exportMovements(filters: { movementType?: string; search?: string }) {
  const conditions: SQL[] = [];
  if (filters.movementType) conditions.push(eq(inventoryMovements.movementType, filters.movementType as never));
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(inventoryMovements)
    .where(whereClause)
    .orderBy(desc(inventoryMovements.createdAt));

  const variantIds = [...new Set(rows.map((r) => r.variantId).filter(Boolean))] as string[];
  const variants = variantIds.length
    ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
    : [];
  const productIds = [...new Set(variants.map((v) => v.productId).filter(Boolean))] as string[];
  const productRows = productIds.length
    ? await db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, productIds))
    : [];

  const productMap = Object.fromEntries(productRows.map((p) => [p.id, p]));
  const variantMap = Object.fromEntries(
    variants.map((v) => [v.id, { ...v, products: productMap[v.productId!] ?? null }])
  );

  const enriched = rows.map((r) => ({
    ...r,
    productVariants: r.variantId ? (variantMap[r.variantId] ?? null) : null,
  }));

  if (!filters.search) return enriched;

  const term = filters.search.toLowerCase();
  return enriched.filter(
    (m) =>
      m.productVariants?.products?.name?.toLowerCase().includes(term) ||
      m.productVariants?.name?.toLowerCase().includes(term)
  );
}

export async function getVariantAvailability(variantIds: string[]): Promise<
  { variantId: string; quantity: number; reservedQuantity: number }[]
> {
  if (variantIds.length === 0) return [];
  // Source from product_variants.stock/reserved_stock — the fields order
  // creation/cancellation actually mutate — rather than the separate
  // `inventory` table, which isn't kept in sync for every variant.
  const rows = await db
    .select({ variantId: productVariants.id, stock: productVariants.stock, reservedStock: productVariants.reservedStock })
    .from(productVariants)
    .where(inArray(productVariants.id, variantIds));
  return rows.map((r) => ({
    variantId: r.variantId,
    quantity: r.stock ?? 0,
    reservedQuantity: r.reservedStock ?? 0,
  }));
}
