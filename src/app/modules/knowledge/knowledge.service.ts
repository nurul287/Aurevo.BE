import { and, asc, eq, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "../../../db";
import { brands, categories, kbChunks, productImages, productVariants, products } from "../../../db/schema";
import { logger } from "../../../lib/logger";
import { embedDocuments, embedQuery } from "../../../lib/voyage";

const POLICY_DOCS_DIR = path.resolve(process.cwd(), "content/policies");

// ─── Product chunking ──────────────────────────────────────────────────────

function buildProductChunkText(product: {
  name: string;
  description: string | null;
  shortDescription: string | null;
  basePrice: string;
  gender: string | null;
  tags: string[] | null;
  categoryName: string | null;
  brandName: string | null;
  variantSummary: string;
}): string {
  const parts = [
    `Product: ${product.name}`,
    product.brandName ? `Brand: ${product.brandName}` : null,
    product.categoryName ? `Category: ${product.categoryName}` : null,
    product.gender ? `Gender: ${product.gender}` : null,
    `Price: BDT ${product.basePrice}`,
    product.shortDescription ?? product.description ?? null,
    product.tags?.length ? `Tags: ${product.tags.join(", ")}` : null,
    product.variantSummary ? `Available options: ${product.variantSummary}` : null,
  ];
  return parts.filter(Boolean).join("\n");
}

async function loadProductForEmbedding(productId: string) {
  const [row] = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      shortDescription: products.shortDescription,
      basePrice: products.basePrice,
      gender: products.gender,
      tags: products.tags,
      isActive: products.isActive,
      categoryName: categories.name,
      brandName: brands.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(eq(products.id, productId));

  if (!row) return null;

  const [image] = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(sql`${productImages.isPrimary} desc`, asc(productImages.sortOrder))
    .limit(1);

  return { ...row, image: image?.url ?? null };
}

async function buildVariantSummary(productId: string): Promise<string> {
  const variants = await db
    .select({ size: productVariants.size, color: productVariants.color })
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)));

  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const bits = [
    sizes.length ? `sizes ${sizes.join(", ")}` : null,
    colors.length ? `colors ${colors.join(", ")}` : null,
  ].filter(Boolean);
  return bits.join("; ");
}

/** Re-embeds and upserts a single product's chunk. Fire-and-forget from products.service.ts on create/update. */
export async function upsertProductChunk(productId: string): Promise<void> {
  const product = await loadProductForEmbedding(productId);
  if (!product || !product.isActive) {
    await deleteProductChunk(productId);
    return;
  }

  const variantSummary = await buildVariantSummary(productId);
  const text = buildProductChunkText({ ...product, variantSummary });
  const [embedding] = await embedDocuments([text]);

  // Card metadata so the FE can render a clickable product card without a
  // second round-trip — kept alongside the embedding text, not derived from it.
  const metadata = {
    productId: product.id,
    slug: product.slug,
    image: product.image,
    basePrice: product.basePrice,
  };

  await db
    .insert(kbChunks)
    .values({
      sourceType: "product",
      sourceId: product.id,
      title: product.name,
      content: text,
      embedding: embedding!,
      metadata,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: kbChunks.sourceId,
      targetWhere: eq(kbChunks.sourceType, "product"),
      set: { content: text, embedding: embedding!, title: product.name, metadata, updatedAt: new Date().toISOString() },
    });
}

/** Removes a product's chunk — called when a product is deleted or deactivated. Fire-and-forget. */
export async function deleteProductChunk(productId: string): Promise<void> {
  await db
    .delete(kbChunks)
    .where(and(eq(kbChunks.sourceType, "product"), eq(kbChunks.sourceId, productId)));
}

/** Full backfill of every active product — for `pnpm ingest:knowledge` and initial setup. */
export async function ingestProducts(): Promise<number> {
  const active = await db.select({ id: products.id }).from(products).where(eq(products.isActive, true));
  for (const { id } of active) {
    await upsertProductChunk(id);
  }
  return active.length;
}

// ─── Policy/FAQ doc chunking ────────────────────────────────────────────────

/** Chunks and (re-)embeds every markdown file in content/policies/. Full replace per file, keyed by filename. */
export async function ingestPolicyDocs(): Promise<number> {
  const files = await fs.readdir(POLICY_DOCS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  let count = 0;
  for (const file of mdFiles) {
    const raw = await fs.readFile(path.join(POLICY_DOCS_DIR, file), "utf-8");
    const sourceId = file.replace(/\.md$/, "");
    const sourceType = sourceId === "faq" ? "faq" : "policy";

    // Split on markdown headings — one chunk per section keeps retrieval focused.
    // Drop heading-only sections (e.g. a lone "# Title" before the first "## "):
    // their embedding ranks high on title alone but carries no real content,
    // crowding out substantive chunks in topK.
    const sections = raw
      .split(/\n(?=## )/)
      .map((s) => s.trim())
      .filter((s) => s.replace(/^#{1,2}\s*.+/, "").trim().length > 0);

    await db.delete(kbChunks).where(and(eq(kbChunks.sourceType, sourceType), sql`metadata->>'file' = ${file}`));

    const embeddings = await embedDocuments(sections);
    for (let i = 0; i < sections.length; i++) {
      const title = sections[i]!.match(/^##?\s*(.+)/)?.[1]?.trim() ?? sourceId;
      await db.insert(kbChunks).values({
        sourceType,
        sourceId: `${sourceId}-${i}`,
        title,
        content: sections[i]!.trim(),
        embedding: embeddings[i]!,
        metadata: { file },
      });
      count++;
    }
  }
  return count;
}

// ─── Retrieval ──────────────────────────────────────────────────────────────

export type KnowledgeSourceType = "product" | "policy" | "faq";

export type ProductCardMetadata = {
  productId: string;
  slug: string;
  image: string | null;
  basePrice: string;
};

export type RetrievedChunk = {
  title: string | null;
  content: string;
  sourceType: KnowledgeSourceType;
  sourceId: string | null;
  metadata: unknown;
};

/**
 * All product chunks' title + card metadata, no embedding call. Used to
 * match products mentioned in an assistant reply that came from earlier
 * conversation context rather than a tool call made this turn — cheap at
 * this catalog's size, and decouples "which cards to show" from "was
 * search_knowledge/get_product_details actually called just now."
 */
export async function getAllProductTitles(): Promise<{ title: string | null; metadata: unknown }[]> {
  return db
    .select({ title: kbChunks.title, metadata: kbChunks.metadata })
    .from(kbChunks)
    .where(eq(kbChunks.sourceType, "product"));
}

export async function retrieve(
  query: string,
  topK = 3,
  sourceType?: KnowledgeSourceType,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedQuery(query);
  const distance = cosineDistance(kbChunks.embedding, queryEmbedding);

  const rows = await db
    .select({
      title: kbChunks.title,
      content: kbChunks.content,
      sourceType: kbChunks.sourceType,
      sourceId: kbChunks.sourceId,
      metadata: kbChunks.metadata,
    })
    .from(kbChunks)
    .where(sourceType ? eq(kbChunks.sourceType, sourceType) : undefined)
    .orderBy(distance)
    .limit(topK);

  logger.debug({ query, sourceType, resultCount: rows.length }, "knowledge.retrieve");
  return rows;
}
