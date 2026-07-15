import { config } from "../app/config";

/**
 * Thin wrapper around Voyage AI's REST embeddings API. No SDK dependency —
 * it's a single JSON endpoint, same "plain fetch" approach as other small
 * external calls in this codebase.
 */
const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";

type VoyageInputType = "query" | "document";

type VoyageEmbeddingsResponse = {
  data: { embedding: number[]; index: number }[];
};

async function embed(input: string[], inputType: VoyageInputType): Promise<number[][]> {
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

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Voyage embeddings request failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as VoyageEmbeddingsResponse;
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Embeds chunks going INTO the knowledge base (products, policy docs). */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  return embed(texts, "document");
}

/** Embeds a user's search query. Voyage recommends a distinct input_type per side for best retrieval quality. */
export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embed([text], "query");
  return embedding!;
}
