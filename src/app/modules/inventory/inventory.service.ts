import { and, eq, lt, count, desc, SQL } from "drizzle-orm";
import { db } from "../../../db";
import { inventory, inventoryMovements, productVariants } from "../../../db/schema";
import { NotFoundError, BusinessRuleError } from "../../errors/AppError";
import type { GetInventoryInput, UpsertInventoryInput, AdjustInventoryInput, GetMovementsInput } from "./inventory.schema";

export async function getInventory(filters: GetInventoryInput) {
  const conditions: SQL[] = [];

  if (filters.variantId) conditions.push(eq(inventory.variantId, filters.variantId));
  if (filters.location) conditions.push(eq(inventory.location, filters.location));
  if (filters.lowStock === "true") {
    // availableQuantity <= reorderPoint
    conditions.push(lt(inventory.availableQuantity, inventory.reorderPoint));
  }

  const offset = (filters.page - 1) * filters.limit;
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(inventory).where(whereClause).orderBy(desc(inventory.updatedAt)).limit(filters.limit).offset(offset),
    db.select({ total: count() }).from(inventory).where(whereClause),
  ]);

  return {
    data: rows,
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

export async function getLowStockAlerts() {
  return db
    .select()
    .from(inventory)
    .where(lt(inventory.availableQuantity, inventory.reorderPoint))
    .orderBy(inventory.availableQuantity);
}

export async function getMovements(filters: GetMovementsInput) {
  const conditions: SQL[] = [];
  if (filters.variantId) conditions.push(eq(inventoryMovements.variantId, filters.variantId));
  if (filters.movementType) conditions.push(eq(inventoryMovements.movementType, filters.movementType));

  const offset = (filters.page - 1) * filters.limit;
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(inventoryMovements).where(whereClause).orderBy(desc(inventoryMovements.createdAt)).limit(filters.limit).offset(offset),
    db.select({ total: count() }).from(inventoryMovements).where(whereClause),
  ]);

  return {
    data: rows,
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
