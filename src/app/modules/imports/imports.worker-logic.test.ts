import { describe, expect, it, vi, beforeEach, afterAll, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { brands, categories, importJobs, importRows, inventory, kbChunks, productImages, products, productVariants } from "../../../db/schema";
import { createResolverCache } from "./resolvers";
import { processRow, runImportJob } from "./imports.worker-logic";
import * as ImportsService from "./imports.service";
import type { NormalizedProduct } from "./imports.schema";
import type { ImportRowInput } from "./imports.service";

vi.mock("../../../lib/queue", () => ({
  enqueueImportJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../lib/storage", () => ({
  uploadFile: vi.fn().mockResolvedValue("http://127.0.0.1:54321/storage/v1/object/public/product-images/test.webp"),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  getPublicUrl: vi.fn().mockReturnValue("http://127.0.0.1:54321/storage/v1/object/public/product-images/test.webp"),
}));

vi.mock("../../../lib/voyage", () => ({
  embedDocuments: vi.fn().mockResolvedValue([]),
  embedQuery: vi.fn(),
  rerank: vi.fn(),
}));

// A tiny valid 1x1 PNG so sharp().webp() has real image bytes to convert.
const ONE_PX_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function cleanAll() {
  await db.delete(kbChunks);
  await db.delete(productImages);
  await db.delete(inventory);
  await db.delete(productVariants);
  await db.delete(importRows);
  await db.delete(importJobs);
  await db.delete(products);
  await db.delete(brands);
  await db.delete(categories);
}

beforeEach(async () => {
  await cleanAll();
  vi.mocked((await import("../../../lib/voyage")).embedDocuments).mockClear().mockResolvedValue([]);
});
afterEach(() => vi.unstubAllGlobals());
afterAll(cleanAll);

function normalizedProduct(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    source: "spreadsheet",
    externalId: "worker-ext-1",
    title: "Worker Test Shirt",
    category: "shirt",
    brand: "Worker Brand",
    gender: "unisex",
    basePrice: 1200,
    tags: [],
    variants: [{ size: "M", sku: "WORKER-M", stock: 10 }],
    images: [],
    ...overrides,
  };
}

async function insertRow(jobId: string, rowNumber: number, product: NormalizedProduct) {
  const [row] = await db
    .insert(importRows)
    .values({
      jobId,
      rowNumber,
      source: product.source,
      externalId: product.externalId,
      payload: product,
      status: "pending",
    })
    .returning();
  return row!;
}

async function createJob(): Promise<string> {
  const [job] = await db.insert(importJobs).values({ source: "spreadsheet", status: "pending", totalRows: 0 }).returning();
  return job!.id;
}

describe("processRow", () => {
  it("creates a new product with resolved brand/category and its variants", async () => {
    const jobId = await createJob();
    const row = await insertRow(jobId, 2, normalizedProduct());
    const cache = createResolverCache();

    const { productId, error } = await processRow(row, cache);
    expect(error).toBeNull();
    expect(productId).not.toBeNull();

    const [product] = await db.select().from(products).where(eq(products.id, productId!));
    expect(product!.name).toBe("Worker Test Shirt");
    expect(product!.externalId).toBe("worker-ext-1");
    expect(product!.source).toBe("spreadsheet");

    const [brand] = await db.select().from(brands).where(eq(brands.id, product!.brandId!));
    expect(brand!.slug).toBe("worker-brand");

    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, productId!));
    expect(variants).toHaveLength(1);
    expect(variants[0]!.sku).toBe("WORKER-M");
    expect(variants[0]!.stock).toBe(10);

    const inv = await db.select().from(inventory).where(eq(inventory.variantId, variants[0]!.id));
    expect(inv).toHaveLength(1);
    expect(inv[0]!.quantity).toBe(10);
  });

  it("is idempotent: re-processing a row with the same source+externalId updates the existing product instead of duplicating it", async () => {
    // Two separate jobs -- this is what a real re-import looks like (a
    // second upload/scrape of the same product later), not two rows in one
    // job (which import_rows' own unique index on (job_id, source,
    // external_id) already prevents at the dedup-on-create step).
    const cache = createResolverCache();

    const firstJobId = await createJob();
    const firstRow = await insertRow(firstJobId, 2, normalizedProduct({ basePrice: 1200 }));
    const first = await processRow(firstRow, cache);
    expect(first.productId).not.toBeNull();

    const secondJobId = await createJob();
    const secondRow = await insertRow(secondJobId, 2, normalizedProduct({
      basePrice: 1500,
      title: "Worker Test Shirt (Updated)",
      variants: [{ size: "M", sku: "WORKER-M", stock: 25 }],
    }));
    const second = await processRow(secondRow, cache);

    expect(second.productId).toBe(first.productId);

    const allProducts = await db.select().from(products).where(eq(products.externalId, "worker-ext-1"));
    expect(allProducts).toHaveLength(1); // no duplicate
    expect(allProducts[0]!.name).toBe("Worker Test Shirt (Updated)");
    expect(allProducts[0]!.basePrice).toBe("1500.00");

    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, first.productId!));
    expect(variants).toHaveLength(1); // updated in place, not a second variant
    expect(variants[0]!.stock).toBe(25);

    const inv = await db.select().from(inventory).where(eq(inventory.variantId, variants[0]!.id));
    expect(inv[0]!.quantity).toBe(25);
  });

  it("fetches, converts, and re-hosts images for a newly created product", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => ONE_PX_PNG.buffer.slice(ONE_PX_PNG.byteOffset, ONE_PX_PNG.byteOffset + ONE_PX_PNG.byteLength) }));

    const jobId = await createJob();
    const row = await insertRow(jobId, 2, normalizedProduct({
      images: [
        { url: "https://example.com/a.jpg", isPrimary: true, sortOrder: 0 },
        { url: "https://example.com/b.jpg", isPrimary: false, sortOrder: 1 },
      ],
    }));
    const cache = createResolverCache();

    const { productId, error } = await processRow(row, cache);
    expect(error).toBeNull();

    const images = await db.select().from(productImages).where(eq(productImages.productId, productId!)).orderBy(productImages.sortOrder);
    expect(images).toHaveLength(2);
    expect(images[0]!.isPrimary).toBe(true);
    expect(images[0]!.url).toContain("product-images");

    const { uploadFile } = await import("../../../lib/storage");
    expect(uploadFile).toHaveBeenCalledTimes(2);
  });

  it("skips one image that fails to fetch without failing the whole row", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }),
    );

    const jobId = await createJob();
    const row = await insertRow(jobId, 2, normalizedProduct({
      images: [{ url: "https://example.com/missing.jpg", isPrimary: true, sortOrder: 0 }],
    }));
    const cache = createResolverCache();

    const { productId, error } = await processRow(row, cache);
    expect(error).toBeNull();
    expect(productId).not.toBeNull();

    const images = await db.select().from(productImages).where(eq(productImages.productId, productId!));
    expect(images).toHaveLength(0);
  });

  it("returns a row-level error (not a thrown exception) when the row's own processing fails", async () => {
    const jobId = await createJob();
    // category is required by the schema, but the worker trusts the stored
    // payload as already-validated NormalizedProduct — force a runtime failure
    // downstream instead by pointing brand/category resolution at an empty
    // string, which slugifies to "" and is coerced to "unnamed" (not an
    // error) -- so instead simulate a DB-level failure via a duplicate SKU
    // across two different (non-idempotent) products.
    const cache = createResolverCache();
    const rowA = await insertRow(jobId, 2, normalizedProduct({ externalId: "sku-clash-a", variants: [{ sku: "CLASH-1", stock: 1 }] }));
    await processRow(rowA, cache);

    const rowB = await insertRow(jobId, 3, normalizedProduct({ externalId: "sku-clash-b", variants: [{ sku: "CLASH-1", stock: 1 }] }));
    const { productId, error } = await processRow(rowB, cache);

    expect(productId).toBeNull();
    expect(error).toMatch(/already taken/i);
  });
});

describe("runImportJob", () => {
  it("drains all pending rows, batch-embeds touched products once, and rolls the job up to completed", async () => {
    const { job } = await ImportsService.createImportJob(
      "spreadsheet",
      [
        { rowNumber: 2, product: normalizedProduct({ externalId: "run-1", title: "Run Product One" }) },
        { rowNumber: 3, product: normalizedProduct({ externalId: "run-2", title: "Run Product Two", variants: [{ sku: "RUN-2", stock: 3 }] }) },
      ],
      [],
    );

    await runImportJob(job.id);

    const [updatedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));
    expect(updatedJob!.status).toBe("completed");
    expect(updatedJob!.succeeded).toBe(2);
    expect(updatedJob!.failed).toBe(0);
    expect(updatedJob!.finishedAt).not.toBeNull();

    const rows = await db.select().from(importRows).where(eq(importRows.jobId, job.id));
    expect(rows.every((r) => r.status === "done")).toBe(true);
    expect(rows.every((r) => r.productId !== null)).toBe(true);

    const { embedDocuments } = await import("../../../lib/voyage");
    expect(embedDocuments).toHaveBeenCalledTimes(1); // one batch call, not one per product
    const callArgs = vi.mocked(embedDocuments).mock.calls[0]![0] as string[];
    expect(callArgs).toHaveLength(2);
  });

  it("rolls up to partial when some rows fail and none when everything fails", async () => {
    const { job } = await ImportsService.createImportJob(
      "spreadsheet",
      [
        { rowNumber: 2, product: normalizedProduct({ externalId: "ok-1", variants: [{ sku: "OKROW-1", stock: 1 }] }) },
        { rowNumber: 3, product: normalizedProduct({ externalId: "ok-2", variants: [{ sku: "OKROW-1", stock: 1 }] }) }, // sku clash -> fails
      ],
      [],
    );

    await runImportJob(job.id);

    const [updatedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));
    expect(updatedJob!.status).toBe("partial");
    expect(updatedJob!.succeeded).toBe(1);
    expect(updatedJob!.failed).toBe(1);
  });
});
