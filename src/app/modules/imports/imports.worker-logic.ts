import sharp from "sharp";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { importJobs, importRows, inventory, products, productVariants } from "../../../db/schema";
import { logger } from "../../../lib/logger";
import { uploadFile } from "../../../lib/storage";
import { insertProduct } from "../products/products.service";
import { createVariant } from "../variants/variants.service";
import { createImageRecord } from "../images/images.service";
import { createResolverCache, generateUniqueProductSlug } from "./resolvers";
import { batchUpsertProductChunks } from "../knowledge/knowledge.service";
import type { NormalizedImage, NormalizedProduct, NormalizedVariant } from "./imports.schema";

// Pure row/job processing logic for the bulk import worker, split out of
// workers/import.worker.ts so it can be unit tested without constructing a
// real BullMQ Worker (which connects to Redis and starts polling the moment
// it's instantiated — not something a test import should trigger).

export const ROW_BATCH_SIZE = 50;
export const ROW_CONCURRENCY = 5;
const IMAGE_BUCKET = "product-images";

/** Runs `fn` over `items` with at most `limit` in flight at once — the bottleneck here is outbound I/O (source image fetches, Storage uploads), not Postgres, so this bounds concurrent external requests rather than DB load. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function runNext(): Promise<void> {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await fn(items[current]!, current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
  return results;
}

/**
 * Creates a new variant, or — if `variant.sku` matches one already on this
 * product — updates its price/stock instead. Only SKU-matched variants are
 * sync-safe across re-imports; a sizeless/SKU-less variant has no stable key
 * to match against on a re-scrape, so those are only ever created once (by
 * the caller only invoking this for new products — see processRow).
 */
export async function syncVariant(productId: string, variant: NormalizedVariant): Promise<void> {
  if (variant.sku) {
    const [existing] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.sku, variant.sku)));

    if (existing) {
      await db
        .update(productVariants)
        .set({
          ...(variant.price !== undefined && { price: variant.price.toString() }),
          ...(variant.stock !== undefined && { stock: variant.stock }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(productVariants.id, existing.id));

      if (variant.stock !== undefined) {
        await db
          .update(inventory)
          .set({ quantity: variant.stock, updatedAt: new Date().toISOString() })
          .where(eq(inventory.variantId, existing.id));
      }
      return;
    }
  }

  await createVariant(productId, {
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    colorCode: variant.colorCode,
    price: variant.price,
    isActive: true,
    sortOrder: 0,
    stock: variant.stock ?? 0,
  });
}

/**
 * Fetches a source image, compresses to webp, and re-hosts it in Supabase
 * Storage. Returns null (never throws) on any failure — one dead image URL
 * must not fail the whole product row, it just means that one image gets
 * skipped.
 */
export async function fetchAndRehostImage(productId: string, image: NormalizedImage, index: number): Promise<string | null> {
  try {
    const res = await fetch(image.url);
    if (!res.ok) throw new Error(`fetch failed with status ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const webp = await sharp(Buffer.from(arrayBuffer)).webp({ quality: 82 }).toBuffer();
    const path = `${productId}/import-${Date.now()}-${index}.webp`;
    return await uploadFile(IMAGE_BUCKET, path, webp, "image/webp");
  } catch (err) {
    logger.warn({ err, url: image.url, productId }, "Import: skipping one image that failed to fetch/convert");
    return null;
  }
}

/**
 * Processes one import row end to end: resolve brand/category, find-or-create
 * the product (matched by source+externalId for idempotent re-import), sync
 * variants, and (new products only) fetch+rehost images. Returns the
 * resulting productId on success, or an error message on failure — never
 * throws, since one bad row must not abort the batch it's in.
 */
export async function processRow(
  row: typeof importRows.$inferSelect,
  cache: ReturnType<typeof createResolverCache>,
): Promise<{ productId: string | null; error: string | null }> {
  const product = row.payload as NormalizedProduct;

  try {
    const [existingProduct] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.source, product.source), eq(products.externalId, product.externalId)));

    const [brandId, categoryId] = await Promise.all([
      product.brand ? cache.resolveBrand(product.brand) : Promise.resolve(null),
      cache.resolveCategory(product.category),
    ]);

    let productId: string;

    if (existingProduct) {
      productId = existingProduct.id;

      await db
        .update(products)
        .set({
          name: product.title,
          description: product.description ?? null,
          shortDescription: product.shortDescription ?? null,
          categoryId,
          brandId,
          gender: product.gender,
          basePrice: product.basePrice.toString(),
          compareAtPrice: product.compareAtPrice?.toString() ?? null,
          tags: product.tags,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.id, productId));

      for (const variant of product.variants) {
        if (variant.sku) await syncVariant(productId, variant);
      }
    } else {
      const slug = await generateUniqueProductSlug(product.title);
      const created = await insertProduct({
        name: product.title,
        slug,
        description: product.description ?? null,
        shortDescription: product.shortDescription ?? null,
        categoryId,
        brandId,
        gender: product.gender,
        basePrice: product.basePrice,
        compareAtPrice: product.compareAtPrice ?? null,
        isActive: true,
        isFeatured: false,
        trackInventory: true,
        allowBackorder: false,
        minOrderQuantity: 1,
        tags: product.tags,
        externalId: product.externalId,
        source: product.source,
      });
      productId = created.id;

      for (const variant of product.variants) {
        await syncVariant(productId, variant);
      }

      const uploadedUrls = await mapWithConcurrency(product.images, ROW_CONCURRENCY, (image, index) =>
        fetchAndRehostImage(productId, image, index),
      );
      for (let i = 0; i < product.images.length; i++) {
        const url = uploadedUrls[i];
        if (!url) continue;
        const image = product.images[i]!;
        await createImageRecord(productId, {
          url,
          altText: image.alt,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
        });
      }
    }

    return { productId, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { productId: null, error: message };
  }
}

/**
 * Drains every `pending` row for a job in batches, then batch-embeds every
 * product touched by this run in one pass, then rolls the job up to
 * completed/partial/failed. Row state is committed per-row throughout, so if
 * the worker process crashes mid-job, BullMQ redelivers the job and this
 * function simply resumes — it only ever queries for rows still `pending`.
 */
export async function runImportJob(jobId: string): Promise<void> {
  const [job] = await db.select().from(importJobs).where(eq(importJobs.id, jobId));
  if (!job) {
    logger.error({ jobId }, "Import worker: job not found, skipping");
    return;
  }

  if (job.status === "pending") {
    await db
      .update(importJobs)
      .set({ status: "running", startedAt: job.startedAt ?? new Date().toISOString() })
      .where(eq(importJobs.id, jobId));
  }

  const cache = createResolverCache();
  const touchedProductIds = new Set<string>();

  while (true) {
    const batch = await db
      .select()
      .from(importRows)
      .where(and(eq(importRows.jobId, jobId), eq(importRows.status, "pending")))
      .orderBy(asc(importRows.rowNumber))
      .limit(ROW_BATCH_SIZE);

    if (batch.length === 0) break;

    // Claim the batch up front so a crash mid-batch leaves rows `processing`
    // (visibly stuck, not silently re-queued as if untouched) rather than
    // pretending they were never attempted.
    await db
      .update(importRows)
      .set({ status: "processing", updatedAt: new Date().toISOString() })
      .where(inArray(importRows.id, batch.map((r) => r.id)));

    await mapWithConcurrency(batch, ROW_CONCURRENCY, async (row) => {
      const { productId, error } = await processRow(row, cache);
      if (productId) {
        touchedProductIds.add(productId);
        await db
          .update(importRows)
          .set({ status: "done", productId, error: null, updatedAt: new Date().toISOString() })
          .where(eq(importRows.id, row.id));
      } else {
        await db
          .update(importRows)
          .set({ status: "failed", error, attempts: row.attempts + 1, updatedAt: new Date().toISOString() })
          .where(eq(importRows.id, row.id));
      }
    });
  }

  if (touchedProductIds.size > 0) {
    await batchUpsertProductChunks([...touchedProductIds]).catch((err) =>
      logger.error({ err, jobId }, "Import: batch embed failed for this job's products (products were still created/updated)"),
    );
  }

  const [[{ doneCount }], [{ failedCount }]] = await Promise.all([
    db.select({ doneCount: count() }).from(importRows).where(and(eq(importRows.jobId, jobId), eq(importRows.status, "done"))),
    db.select({ failedCount: count() }).from(importRows).where(and(eq(importRows.jobId, jobId), eq(importRows.status, "failed"))),
  ]);
  const succeeded = Number(doneCount);
  const failed = Number(failedCount);
  const status = failed === 0 ? "completed" : succeeded > 0 ? "partial" : "failed";

  await db
    .update(importJobs)
    .set({ status, processedRows: succeeded + failed, succeeded, failed, finishedAt: new Date().toISOString() })
    .where(eq(importJobs.id, jobId));
}
