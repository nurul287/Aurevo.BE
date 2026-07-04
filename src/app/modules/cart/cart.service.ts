import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../db";
import { cartItems, products, productVariants, productImages, guestSessions } from "../../../db/schema";
import { NotFoundError, ValidationError, BusinessRuleError } from "../../errors/AppError";
import { getVariantAvailability } from "../inventory/inventory.service";
import type { AddItemInput, UpdateItemInput, MigrateCartInput } from "./cart.schema";

type CartOwner = { userId: string } | { sessionId: string };

function ownerCondition(owner: CartOwner) {
  if ("userId" in owner) return eq(cartItems.userId, owner.userId);
  return eq(cartItems.sessionId, owner.sessionId);
}

async function getVariantOrThrow(variantId: string) {
  const [variant] = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      price: productVariants.price,
      stock: productVariants.stock,
      isActive: productVariants.isActive,
      basePrice: products.basePrice,
    })
    .from(productVariants)
    .leftJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, variantId));
  if (!variant) throw new NotFoundError("Variant");
  if (!variant.isActive) throw new BusinessRuleError("Variant is not available");
  return variant;
}

/** Variants don't always override price — fall back to the product's base price. */
function effectivePrice(variant: { price: string | null; basePrice: string | null }): string {
  return variant.price ?? variant.basePrice ?? "0";
}

export async function createGuestSession(): Promise<string> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const [session] = await db.insert(guestSessions).values({ expiresAt }).returning({ id: guestSessions.id });
  return session!.id;
}

const cartItemSelect = {
  id: cartItems.id,
  userId: cartItems.userId,
  sessionId: cartItems.sessionId,
  productId: cartItems.productId,
  variantId: cartItems.variantId,
  quantity: cartItems.quantity,
  price: cartItems.price,
  createdAt: cartItems.createdAt,
  updatedAt: cartItems.updatedAt,
  product: {
    id: products.id,
    name: products.name,
    slug: products.slug,
    basePrice: products.basePrice,
    compareAtPrice: products.compareAtPrice,
    trackInventory: products.trackInventory,
  },
  variant: {
    id: productVariants.id,
    name: productVariants.name,
    size: productVariants.size,
    color: productVariants.color,
    price: productVariants.price,
    compareAtPrice: productVariants.compareAtPrice,
    stock: productVariants.stock,
  },
};

async function attachImages<T extends { productId: string | null; product: { id: string | null } | null; variant: { id: string | null } | null }>(
  rows: T[]
) {
  const productIds = [...new Set(rows.map(r => r.productId).filter(Boolean))] as string[];
  const images = productIds.length
    ? await db
        .select({ productId: productImages.productId, url: productImages.url, isPrimary: productImages.isPrimary, sortOrder: productImages.sortOrder })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
    : [];

  const imagesByProduct = new Map<string, typeof images>();
  for (const img of images) {
    if (!img.productId) continue;
    const list = imagesByProduct.get(img.productId) ?? [];
    list.push(img);
    imagesByProduct.set(img.productId, list);
  }

  return rows.map((row) => ({
    ...row,
    product: row.product?.id
      ? { ...row.product, images: imagesByProduct.get(row.productId!) ?? [] }
      : undefined,
    variant: row.variant?.id ? row.variant : undefined,
  }));
}

async function getCartItemWithDetails(id: string) {
  const [row] = await db
    .select(cartItemSelect)
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(eq(cartItems.id, id));
  if (!row) return undefined;
  const [withImages] = await attachImages([row]);
  return withImages;
}

export async function getCart(owner: CartOwner) {
  const rows = await db
    .select(cartItemSelect)
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(ownerCondition(owner));

  const items = await attachImages(rows);

  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  return { items, total: total.toFixed(2), itemCount: items.length };
}

export async function addItem(owner: CartOwner, input: AddItemInput) {
  const variant = await getVariantOrThrow(input.variantId);
  const price = effectivePrice(variant);

  // Check stock from the inventory table (source of truth)
  const [availability] = await getVariantAvailability([input.variantId]);
  const availableStock = availability ? availability.quantity - availability.reservedQuantity : 0;

  if (availableStock < input.quantity) {
    throw new BusinessRuleError(`Only ${availableStock} units available`);
  }

  // Upsert: if same variant already in cart, increment quantity
  const existingCondition = "userId" in owner
    ? and(eq(cartItems.userId, owner.userId), eq(cartItems.variantId, input.variantId))
    : and(eq(cartItems.sessionId, owner.sessionId), eq(cartItems.variantId, input.variantId));

  const [existing] = await db.select({ id: cartItems.id, quantity: cartItems.quantity }).from(cartItems).where(existingCondition!);

  if (existing) {
    const newQty = existing.quantity + input.quantity;
    if (availableStock < newQty) throw new BusinessRuleError(`Only ${availableStock} units available`);

    await db
      .update(cartItems)
      .set({ quantity: newQty, price, updatedAt: new Date().toISOString() })
      .where(eq(cartItems.id, existing.id));
    return (await getCartItemWithDetails(existing.id))!;
  }

  const productId = input.productId ?? variant.productId;
  const values = "userId" in owner
    ? { userId: owner.userId, productId, variantId: input.variantId, quantity: input.quantity, price }
    : { sessionId: owner.sessionId, productId, variantId: input.variantId, quantity: input.quantity, price };

  const [item] = await db.insert(cartItems).values(values).returning();
  return (await getCartItemWithDetails(item!.id))!;
}

export async function updateItem(owner: CartOwner, id: string, input: UpdateItemInput) {
  const [item] = await db.select().from(cartItems).where(and(eq(cartItems.id, id), ownerCondition(owner)));
  if (!item) throw new NotFoundError("Cart item");

  const variant = await getVariantOrThrow(item.variantId!);
  const [availability] = await getVariantAvailability([item.variantId!]);
  const availableStock = availability ? availability.quantity - availability.reservedQuantity : 0;
  if (availableStock < input.quantity) throw new BusinessRuleError(`Only ${availableStock} units available`);

  await db
    .update(cartItems)
    .set({ quantity: input.quantity, price: effectivePrice(variant), updatedAt: new Date().toISOString() })
    .where(eq(cartItems.id, id));
  return (await getCartItemWithDetails(id))!;
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
      await db.insert(cartItems).values({ userId, productId: guestItem.productId, variantId: guestItem.variantId, quantity: guestItem.quantity, price: guestItem.price });
    }
    await db.delete(cartItems).where(eq(cartItems.id, guestItem.id));
    migrated++;
  }

  return { migrated };
}
