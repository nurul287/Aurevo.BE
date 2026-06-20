import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import { cartItems, productVariants, guestSessions } from "../../../db/schema";
import { NotFoundError, ValidationError, BusinessRuleError } from "../../errors/AppError";
import type { AddItemInput, UpdateItemInput, MigrateCartInput } from "./cart.schema";

type CartOwner = { userId: string } | { sessionId: string };

function ownerCondition(owner: CartOwner) {
  if ("userId" in owner) return eq(cartItems.userId, owner.userId);
  return eq(cartItems.sessionId, owner.sessionId);
}

async function getVariantOrThrow(variantId: string) {
  const [variant] = await db
    .select({ id: productVariants.id, price: productVariants.price, stock: productVariants.stock, isActive: productVariants.isActive })
    .from(productVariants)
    .where(eq(productVariants.id, variantId));
  if (!variant) throw new NotFoundError("Variant");
  if (!variant.isActive) throw new BusinessRuleError("Variant is not available");
  return variant;
}

export async function createGuestSession(): Promise<string> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const [session] = await db.insert(guestSessions).values({ expiresAt }).returning({ id: guestSessions.id });
  return session!.id;
}

export async function getCart(owner: CartOwner) {
  const rows = await db
    .select({
      id: cartItems.id,
      variantId: cartItems.variantId,
      quantity: cartItems.quantity,
      price: cartItems.price,
      createdAt: cartItems.createdAt,
      updatedAt: cartItems.updatedAt,
    })
    .from(cartItems)
    .where(ownerCondition(owner));

  const total = rows.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  return { items: rows, total: total.toFixed(2), itemCount: rows.length };
}

export async function addItem(owner: CartOwner, input: AddItemInput) {
  const variant = await getVariantOrThrow(input.variantId);

  if (variant.stock < input.quantity) {
    throw new BusinessRuleError(`Only ${variant.stock} units available`);
  }

  const price = variant.price ?? "0";

  // Upsert: if same variant already in cart, increment quantity
  const existingCondition = "userId" in owner
    ? and(eq(cartItems.userId, owner.userId), eq(cartItems.variantId, input.variantId))
    : and(eq(cartItems.sessionId, owner.sessionId), eq(cartItems.variantId, input.variantId));

  const [existing] = await db.select({ id: cartItems.id, quantity: cartItems.quantity }).from(cartItems).where(existingCondition!);

  if (existing) {
    const newQty = existing.quantity + input.quantity;
    if (variant.stock < newQty) throw new BusinessRuleError(`Only ${variant.stock} units available`);

    const [updated] = await db
      .update(cartItems)
      .set({ quantity: newQty, updatedAt: new Date().toISOString() })
      .where(eq(cartItems.id, existing.id))
      .returning();
    return updated!;
  }

  const values = "userId" in owner
    ? { userId: owner.userId, variantId: input.variantId, quantity: input.quantity, price }
    : { sessionId: owner.sessionId, variantId: input.variantId, quantity: input.quantity, price };

  const [item] = await db.insert(cartItems).values(values).returning();
  return item!;
}

export async function updateItem(owner: CartOwner, id: string, input: UpdateItemInput) {
  const [item] = await db.select().from(cartItems).where(and(eq(cartItems.id, id), ownerCondition(owner)));
  if (!item) throw new NotFoundError("Cart item");

  const variant = await getVariantOrThrow(item.variantId!);
  if (variant.stock < input.quantity) throw new BusinessRuleError(`Only ${variant.stock} units available`);

  const [updated] = await db
    .update(cartItems)
    .set({ quantity: input.quantity, updatedAt: new Date().toISOString() })
    .where(eq(cartItems.id, id))
    .returning();
  return updated!;
}

export async function removeItem(owner: CartOwner, id: string) {
  const [item] = await db.select({ id: cartItems.id }).from(cartItems).where(and(eq(cartItems.id, id), ownerCondition(owner)));
  if (!item) throw new NotFoundError("Cart item");
  await db.delete(cartItems).where(eq(cartItems.id, id));
}

export async function clearCart(owner: CartOwner) {
  await db.delete(cartItems).where(ownerCondition(owner));
}

export async function migrateGuestCart(userId: string, input: MigrateCartInput) {
  const { guestSessionId } = input;

  const guestItems = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.sessionId, guestSessionId));

  if (guestItems.length === 0) return { migrated: 0 };

  let migrated = 0;
  for (const guestItem of guestItems) {
    const [existing] = await db
      .select({ id: cartItems.id, quantity: cartItems.quantity })
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.variantId, guestItem.variantId!)));

    if (existing) {
      await db.update(cartItems).set({ quantity: existing.quantity + guestItem.quantity, updatedAt: new Date().toISOString() }).where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({ userId, variantId: guestItem.variantId, quantity: guestItem.quantity, price: guestItem.price });
    }
    await db.delete(cartItems).where(eq(cartItems.id, guestItem.id));
    migrated++;
  }

  return { migrated };
}
