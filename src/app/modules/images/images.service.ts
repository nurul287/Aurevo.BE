import { and, eq, asc } from "drizzle-orm";
import { db } from "../../../db";
import { productImages, products, productVariants } from "../../../db/schema";
import { NotFoundError, ValidationError } from "../../errors/AppError";
import { uploadFile, deleteFile } from "../../../lib/storage";
import type { UpdateImageInput } from "./images.schema";

const BUCKET = "product-images";

async function assertProductExists(productId: string) {
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
  if (!product) throw new NotFoundError("Product");
}

async function getImageOrThrow(productId: string, id: string) {
  const [image] = await db
    .select()
    .from(productImages)
    .where(and(eq(productImages.id, id), eq(productImages.productId, productId)));
  if (!image) throw new NotFoundError("Image");
  return image;
}

export async function getImages(productId: string) {
  await assertProductExists(productId);
  return db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt));
}

export async function getImageById(productId: string, id: string) {
  return getImageOrThrow(productId, id);
}

export async function uploadImage(
  productId: string,
  file: Express.Multer.File,
  options: { altText?: string; variantId?: string; sortOrder?: number; isPrimary?: boolean }
) {
  await assertProductExists(productId);

  if (options.variantId) {
    const [variant] = await db.select({ id: productVariants.id }).from(productVariants)
      .where(and(eq(productVariants.id, options.variantId), eq(productVariants.productId, productId)));
    if (!variant) throw new NotFoundError("Variant");
  }

  const ext = file.originalname.split(".").pop() ?? "jpg";
  const storagePath = `${productId}/${Date.now()}.${ext}`;
  const url = await uploadFile(BUCKET, storagePath, file.buffer, file.mimetype);

  // If this is the first image or explicitly set as primary — set it
  const [existing] = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId));
  const shouldBePrimary = options.isPrimary || !existing;

  if (shouldBePrimary) {
    // Clear existing primary first
    await db.update(productImages).set({ isPrimary: false }).where(and(eq(productImages.productId, productId), eq(productImages.isPrimary, true)));
  }

  const [image] = await db.insert(productImages).values({
    productId,
    variantId: options.variantId ?? null,
    url,
    altText: options.altText,
    sortOrder: options.sortOrder ?? 0,
    isPrimary: shouldBePrimary,
  }).returning();

  return image!;
}

export async function updateImage(productId: string, id: string, input: UpdateImageInput) {
  await getImageOrThrow(productId, id);

  if (input.variantId) {
    const [variant] = await db.select({ id: productVariants.id }).from(productVariants)
      .where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, productId)));
    if (!variant) throw new NotFoundError("Variant");
  }

  const [updated] = await db
    .update(productImages)
    .set({
      ...(input.altText !== undefined && { altText: input.altText }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.variantId !== undefined && { variantId: input.variantId }),
    })
    .where(and(eq(productImages.id, id), eq(productImages.productId, productId)))
    .returning();

  return updated!;
}

export async function setPrimaryImage(productId: string, id: string) {
  await assertProductExists(productId);
  const image = await getImageOrThrow(productId, id);

  // Clear old primary, set new one — in a transaction
  await db.transaction(async (tx) => {
    await tx.update(productImages).set({ isPrimary: false }).where(and(eq(productImages.productId, productId), eq(productImages.isPrimary, true)));
    await tx.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, id));
  });

  const [updated] = await db.select().from(productImages).where(eq(productImages.id, id));
  return updated!;
}

export async function deleteImage(productId: string, id: string) {
  const image = await getImageOrThrow(productId, id);

  // Extract storage path from url and delete from bucket
  try {
    const url = new URL(image.url);
    // Supabase storage URL: .../storage/v1/object/public/{bucket}/{path}
    const parts = url.pathname.split(`/object/public/${BUCKET}/`);
    if (parts.length === 2) {
      await deleteFile(BUCKET, parts[1]!);
    }
  } catch {
    // URL parse failure — still delete the DB record
  }

  await db.delete(productImages).where(and(eq(productImages.id, id), eq(productImages.productId, productId)));
}
