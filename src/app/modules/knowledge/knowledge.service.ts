import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "../../../db";
import { brands, categories, kbChunks, productImages, productVariants, products } from "../../../db/schema";
import { logger } from "../../../lib/logger";
import { embedDocuments, embedQuery, rerank } from "../../../lib/voyage";

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

/**
 * Batch equivalent of upsertProductChunk for the bulk import worker — loads
 * every product in one query (+ one query for variants), embeds all chunk
 * texts in chunks of 100 (Voyage calls, not per-product), then writes the
 * kb_chunks rows. Bypassing the one-embed-call-per-product hook is the whole
 * point of this path: 1000 products would otherwise mean 1000 sequential
 * Voyage requests instead of ~10.
 */
export async function batchUpsertProductChunks(productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;

  const rows = await db
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
    .where(inArray(products.id, productIds));

  const activeRows = rows.filter((r) => r.isActive);
  if (activeRows.length === 0) return;

  const [allImages, allVariants] = await Promise.all([
    db
      .select({ productId: productImages.productId, url: productImages.url, isPrimary: productImages.isPrimary, sortOrder: productImages.sortOrder })
      .from(productImages)
      .where(inArray(productImages.productId, activeRows.map((r) => r.id))),
    db
      .select({ productId: productVariants.productId, size: productVariants.size, color: productVariants.color })
      .from(productVariants)
      .where(and(inArray(productVariants.productId, activeRows.map((r) => r.id)), eq(productVariants.isActive, true))),
  ]);

  const primaryImageByProduct = new Map<string, string>();
  for (const img of allImages) {
    if (!img.productId) continue;
    const existing = primaryImageByProduct.has(img.productId);
    if (!existing || img.isPrimary) primaryImageByProduct.set(img.productId, img.url);
  }

  const variantsByProduct = new Map<string, { size: string | null; color: string | null }[]>();
  for (const v of allVariants) {
    if (!v.productId) continue;
    const list = variantsByProduct.get(v.productId) ?? [];
    list.push({ size: v.size, color: v.color });
    variantsByProduct.set(v.productId, list);
  }

  const chunkInputs = activeRows.map((row) => {
    const variants = variantsByProduct.get(row.id) ?? [];
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
    const variantSummary = [
      sizes.length ? `sizes ${sizes.join(", ")}` : null,
      colors.length ? `colors ${colors.join(", ")}` : null,
    ].filter(Boolean).join("; ");

    return {
      productId: row.id,
      slug: row.slug,
      name: row.name,
      basePrice: row.basePrice,
      image: primaryImageByProduct.get(row.id) ?? null,
      text: buildProductChunkText({ ...row, variantSummary }),
    };
  });

  const EMBED_BATCH_SIZE = 100;
  const embeddings: number[][] = [];
  for (let i = 0; i < chunkInputs.length; i += EMBED_BATCH_SIZE) {
    const batch = chunkInputs.slice(i, i + EMBED_BATCH_SIZE);
    const batchEmbeddings = await embedDocuments(batch.map((c) => c.text));
    embeddings.push(...batchEmbeddings);
  }

  for (let i = 0; i < chunkInputs.length; i++) {
    const chunk = chunkInputs[i]!;
    const embedding = embeddings[i]!;
    const metadata = { productId: chunk.productId, slug: chunk.slug, image: chunk.image, basePrice: chunk.basePrice };

    await db
      .insert(kbChunks)
      .values({
        sourceType: "product",
        sourceId: chunk.productId,
        title: chunk.name,
        content: chunk.text,
        embedding,
        metadata,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: kbChunks.sourceId,
        targetWhere: eq(kbChunks.sourceType, "product"),
        set: { content: chunk.text, embedding, title: chunk.name, metadata, updatedAt: new Date().toISOString() },
      });
  }
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
  // Reranker relevance score when mode includes reranking; absent otherwise.
  // Non-breaking for existing consumers (chat.service reads title/content).
  score?: number;
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

export type RetrieveMode = "vector" | "hybrid" | "hybrid+rerank";

export type RetrieveOpts = { mode?: RetrieveMode };

/**
 * Candidates fetched per search leg before fusion cuts to topK. Wider than
 * topK so a result ranked poorly by one leg can still win on the other.
 */
const CANDIDATE_POOL = 12;

type Candidate = RetrievedChunk & { id: string };

const candidateColumns = {
  id: kbChunks.id,
  title: kbChunks.title,
  content: kbChunks.content,
  sourceType: kbChunks.sourceType,
  sourceId: kbChunks.sourceId,
  metadata: kbChunks.metadata,
};

async function vectorSearch(
  queryEmbedding: number[],
  limit: number,
  sourceType?: KnowledgeSourceType,
): Promise<Candidate[]> {
  const distance = cosineDistance(kbChunks.embedding, queryEmbedding);
  return db
    .select(candidateColumns)
    .from(kbChunks)
    .where(sourceType ? eq(kbChunks.sourceType, sourceType) : undefined)
    .orderBy(distance)
    .limit(limit);
}

/**
 * Keyword leg — Postgres FTS over the generated `fts` column (migration 043;
 * intentionally unmapped in schema.ts, hence raw SQL). websearch_to_tsquery
 * never throws on arbitrary text, which matters since the chat model authors
 * the query. Its terms are ANDed, so a query with any non-matching word
 * returns nothing — fine: an empty keyword list just leaves fusion with the
 * vector order.
 */
async function keywordSearch(
  query: string,
  limit: number,
  sourceType?: KnowledgeSourceType,
): Promise<Candidate[]> {
  const tsquery = sql`websearch_to_tsquery('english', ${query})`;
  return db
    .select(candidateColumns)
    .from(kbChunks)
    .where(
      and(
        sql`${sql.raw('"kb_chunks"."fts"')} @@ ${tsquery}`,
        sourceType ? eq(kbChunks.sourceType, sourceType) : undefined,
      ),
    )
    .orderBy(sql`ts_rank(${sql.raw('"kb_chunks"."fts"')}, ${tsquery}) desc`)
    .limit(limit);
}

/**
 * Reciprocal Rank Fusion: score(id) = Σ over lists of 1/(k + rank). Ties
 * break by earlier-list rank (vector leg first), keeping the result stable
 * when the keyword leg is empty or fully agrees. Exported for unit tests.
 */
export function rrfFuse<T extends { id: string }>(lists: T[][], k = 60): T[] {
  const scores = new Map<string, { item: T; score: number; firstSeen: number }>();
  let seenCounter = 0;

  for (const list of lists) {
    for (let rank = 0; rank < list.length; rank++) {
      const item = list[rank]!;
      const existing = scores.get(item.id);
      const increment = 1 / (k + rank + 1);
      if (existing) {
        existing.score += increment;
      } else {
        scores.set(item.id, { item, score: increment, firstSeen: seenCounter++ });
      }
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.firstSeen - b.firstSeen)
    .map((entry) => entry.item);
}

/**
 * Cross-encoder rerank of the fused candidate pool, cut to topK, attaching
 * the reranker's relevance score. Reranking is best-effort: any failure
 * (timeout, free-tier 429, network) falls back to the fusion order rather
 * than failing the search — the reranker only reorders results vector +
 * keyword already found, so its absence degrades quality, never correctness.
 */
async function rerankCandidates(query: string, candidates: Candidate[], topK: number): Promise<Candidate[]> {
  if (candidates.length === 0) return [];
  try {
    const ranked = await rerank(
      query,
      candidates.map((c) => `${c.title ?? ""}\n${c.content}`),
      topK,
    );
    return ranked.map((r) => ({ ...candidates[r.index]!, score: r.relevanceScore }));
  } catch (err) {
    logger.warn({ err, query }, "knowledge.rerank failed — falling back to fusion order");
    return candidates.slice(0, topK);
  }
}

export async function retrieve(
  query: string,
  topK = 3,
  sourceType?: KnowledgeSourceType,
  opts: RetrieveOpts = {},
): Promise<RetrievedChunk[]> {
  // Default is "hybrid+rerank": the eval gate (docs/09-ai-chatbot-rag.md
  // "Retrieval Evaluation") showed it strictly beats vector — same
  // precision/recall/hit-rate, MRR 0.984 -> 1.000 (every query now returns
  // a relevant chunk at rank 1). The reranker both fixes the one ranking
  // vector got wrong ("what is your return policy") and demotes the fusion
  // pollution that made plain hybrid regress, so it dominates both. Rerank
  // is best-effort: any failure falls back to fusion order (see
  // rerankCandidates), so the worst case is hybrid, never a hard failure.
  const mode = opts.mode ?? "hybrid+rerank";
  const queryEmbedding = await embedQuery(query);

  let fused: Candidate[];
  if (mode === "vector") {
    fused = await vectorSearch(queryEmbedding, topK, sourceType);
  } else {
    const [vectorHits, keywordHits] = await Promise.all([
      vectorSearch(queryEmbedding, CANDIDATE_POOL, sourceType),
      keywordSearch(query, CANDIDATE_POOL, sourceType),
    ]);
    fused = rrfFuse([vectorHits, keywordHits]);
    if (mode === "hybrid+rerank") {
      fused = await rerankCandidates(query, fused, topK);
    }
  }

  const rows = fused.slice(0, topK).map(({ id: _id, ...chunk }) => chunk);
  logger.debug({ query, sourceType, mode, resultCount: rows.length }, "knowledge.retrieve");
  return rows;
}
