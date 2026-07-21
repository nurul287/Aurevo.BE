import { config } from "../app/config";

/**
 * Thin wrapper around Voyage AI's REST embeddings API. No SDK dependency —
 * it's a single JSON endpoint, same "plain fetch" approach as other small
 * external calls in this codebase.
 */
const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_RERANK_URL = "https://api.voyageai.com/v1/rerank";

type VoyageInputType = "query" | "document";

type VoyageEmbeddingsResponse = {
  data: { embedding: number[]; index: number }[];
};

// A free-tier Voyage key is limited to 3 requests/minute, so waiting out a
// 429 needs a full 60s/3 window plus a little slack.
const RATE_LIMIT_BACKOFF_MS = 21_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function embed(input: string[], inputType: VoyageInputType, retriesOn429 = 0): Promise<number[][]> {
  const res = await fetch(VOYAGE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input,
      model: config.VOYAGE_EMBEDDING_MODEL,
      input_type: inputType,
    }),
  });

  if (res.status === 429 && retriesOn429 > 0) {
    await sleep(RATE_LIMIT_BACKOFF_MS);
    return embed(input, inputType, retriesOn429 - 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Voyage embeddings request failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as VoyageEmbeddingsResponse;
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/**
 * Embeds chunks going INTO the knowledge base (products, policy docs).
 * Retries through 429s: every caller is offline (ingestion script) or
 * fire-and-forget (auto-embed on product changes), so waiting out a
 * free-tier rate-limit window beats failing the embed. embedQuery stays
 * fail-fast — a chat search must not stall for 21s.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  return embed(texts, "document", 5);
}

/** Embeds a user's search query. Voyage recommends a distinct input_type per side for best retrieval quality. */
export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embed([text], "query");
  return embedding!;
}

// ─── Reranking ───────────────────────────────────────────────────────────

type VoyageRerankResponse = {
  data: { index: number; relevance_score: number }[];
};

export type RerankResult = { index: number; relevanceScore: number };

/**
 * Cross-encoder rerank of `documents` against `query`, returning the top
 * `topK` as { original index, relevance score } sorted best-first. Bounded by
 * a hard timeout: this sits inline in a live chat search, so a slow rerank
 * must fail fast and let the caller fall back to the pre-rerank order rather
 * than stall the response. No 429 retry for the same reason — a free-tier
 * rate-limit is a fast fallback, not something to wait out mid-request.
 */
export async function rerank(query: string, documents: string[], topK: number): Promise<RerankResult[]> {
  if (documents.length === 0) return [];

  const res = await fetch(VOYAGE_RERANK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      documents,
      model: config.VOYAGE_RERANK_MODEL,
      top_k: Math.min(topK, documents.length),
    }),
    signal: AbortSignal.timeout(2500),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Voyage rerank request failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as VoyageRerankResponse;
  return json.data
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .map((d) => ({ index: d.index, relevanceScore: d.relevance_score }));
}
