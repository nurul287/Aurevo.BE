import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { products, productImages, productVariants, profiles, wishlistItems } from "../../../db/schema";
import { BusinessRuleError, NotFoundError } from "../../errors/AppError";
import type { AddWishlistItemInput } from "./wishlist.schema";

const wishlistItemSelect = {
  id: wishlistItems.id,
  userId: wishlistItems.userId,
  productId: wishlistItems.productId,
  createdAt: wishlistItems.createdAt,
  product: {
    id: products.id,
    name: products.name,
    slug: products.slug,
    basePrice: products.basePrice,
    compareAtPrice: products.compareAtPrice,
    isActive: products.isActive,
  },
};

async function attachProductDetails<T extends { productId: string | null; product: { id: string | null } | null }>(
  rows: T[],
) {
  const productIds = [...new Set(rows.map((r) => r.productId).filter(Boolean))] as string[];
  if (productIds.length === 0) {
    return rows.map((row) => ({
      ...row,
      product: row.product?.id ? { ...row.product, images: [], variants: [] } : undefined,
    }));
  }

  const [images, variants] = await Promise.all([
    db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        isPrimary: productImages.isPrimary,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds)),
    db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        name: productVariants.name,
        size: productVariants.size,
        color: productVariants.color,
        price: productVariants.price,
        compareAtPrice: productVariants.compareAtPrice,
        stock: productVariants.stock,
        isActive: productVariants.isActive,
        sortOrder: productVariants.sortOrder,
      })
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true))),
  ]);

  const imagesByProduct = new Map<string, typeof images>();
  for (const img of images) {
    if (!img.productId) continue;
    const list = imagesByProduct.get(img.productId) ?? [];
    list.push(img);
    imagesByProduct.set(img.productId, list);
  }

  const variantsByProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    if (!variant.productId) continue;
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.productId, list);
  }

  return rows.map((row) => ({
    ...row,
    product: row.product?.id
      ? {
          ...row.product,
          images: imagesByProduct.get(row.productId!) ?? [],
          variants: variantsByProduct.get(row.productId!) ?? [],
        }
      : undefined,
  }));
}

async function getWishlistItemWithDetails(id: string) {
  const [row] = await db
    .select(wishlistItemSelect)
    .from(wishlistItems)
    .leftJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.id, id));
  if (!row) return undefined;
  const [withDetails] = await attachProductDetails([row]);
  return withDetails;
}

async function getActiveProductOrThrow(productId: string) {
  const [product] = await db
    .select({
      id: products.id,
      isActive: products.isActive,
    })
    .from(products)
    .where(eq(products.id, productId));
  if (!product) throw new NotFoundError("Product");
  if (!product.isActive) throw new BusinessRuleError("Product is not available");
  return product;
}

export async function getWishlist(userId: string) {
  const rows = await db
    .select(wishlistItemSelect)
    .from(wishlistItems)
    .leftJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.createdAt));

  const items = await attachProductDetails(rows);
  return { items, itemCount: items.length };
}

export async function addItem(userId: string, input: AddWishlistItemInput) {
  await getActiveProductOrThrow(input.productId);

  // wishlist_items.user_id references profiles.id — ensure a row exists for
  // users who haven't otherwise touched profile-scoped tables yet.
  await db.insert(profiles).values({ id: userId }).onConflictDoNothing();

  const [existing] = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, input.productId)));

  if (existing) {
    return (await getWishlistItemWithDetails(existing.id))!;
  }

  const [item] = await db
    .insert(wishlistItems)
    .values({ userId, productId: input.productId })
    .returning({ id: wishlistItems.id });

  return (await getWishlistItemWithDetails(item!.id))!;
}

export async function removeItem(userId: string, id: string) {
  const [item] = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(and(eq(wishlistItems.id, id), eq(wishlistItems.userId, userId)));
  if (!item) throw new NotFoundError("Wishlist item");
  await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
}

export async function removeByProductId(userId: string, productId: string) {
  const [item] = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
  if (!item) throw new NotFoundError("Wishlist item");
  await db.delete(wishlistItems).where(eq(wishlistItems.id, item.id));
}

export async function clearWishlist(userId: string) {
  await db.delete(wishlistItems).where(eq(wishlistItems.userId, userId));
}
