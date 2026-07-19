import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../../db";
import { kbChunks } from "../../../db/schema";
import { retrieve, rrfFuse } from "./knowledge.service";
import { embedQuery } from "../../../lib/voyage";

// Deterministic embeddings — no real Voyage calls. Basis-style 1024-dim
// vectors give exact, hand-computable cosine distances: identical vectors
// are distance 0, orthogonal ones distance 1, mixtures in between.
vi.mock("../../../lib/voyage", () => ({
  embedQuery: vi.fn(),
  embedDocuments: vi.fn(),
}));

function basisVector(index: number, weight = 1): number[] {
  const v = new Array<number>(1024).fill(0);
  v[index] = weight;
  return v;
}

/** weight on axis 0 controls similarity to a query embedded as basisVector(0). */
function mixedVector(axis0Weight: number, otherAxis: number): number[] {
  const v = new Array<number>(1024).fill(0);
  v[0] = axis0Weight;
  v[otherAxis] = Math.sqrt(1 - axis0Weight * axis0Weight);
  return v;
}

const QUERY_EMBEDDING = basisVector(0);

async function seedChunks() {
  await db.insert(kbChunks).values([
    {
      sourceType: "product",
      sourceId: "product-exact",
      title: "Exact match product",
      content: "Closest to the query",
      embedding: basisVector(0), // distance 0
    },
    {
      sourceType: "policy",
      sourceId: "policy-near",
      title: "Near policy",
      content: "Second closest",
      embedding: mixedVector(0.8, 1), // distance 0.2
    },
    {
      sourceType: "faq",
      sourceId: "faq-far",
      title: "Far FAQ",
      content: "Third closest",
      embedding: mixedVector(0.3, 2), // distance 0.7
    },
    {
      sourceType: "policy",
      sourceId: "policy-orthogonal",
      title: "Unrelated policy",
      content: "Orthogonal to the query",
      embedding: basisVector(3), // distance 1
    },
  ]);
}

describe("knowledge.retrieve", () => {
  // Ranking assertions need exact control of the whole table, so each test
  // wipes kb_chunks — but the local dev KB (pnpm ingest:knowledge, real
  // Voyage embeddings that can't be regenerated without API calls) lives in
  // the same table. Snapshot it and restore after the suite so a test run
  // doesn't silently empty the chatbot's knowledge base.
  let snapshot: (typeof kbChunks.$inferSelect)[] = [];

  beforeAll(async () => {
    snapshot = await db.select().from(kbChunks);
  });

  afterAll(async () => {
    await db.delete(kbChunks);
    if (snapshot.length > 0) await db.insert(kbChunks).values(snapshot);
  });

  beforeEach(async () => {
    await db.delete(kbChunks);
    vi.mocked(embedQuery).mockResolvedValue(QUERY_EMBEDDING);
    await seedChunks();
  });

  it("returns chunks ordered by cosine distance, closest first", async () => {
    const results = await retrieve("anything", 4);
    expect(results.map((r) => r.sourceId)).toEqual([
      "product-exact",
      "policy-near",
      "faq-far",
      "policy-orthogonal",
    ]);
  });

  it("cuts the result list at topK", async () => {
    const results = await retrieve("anything", 2);
    expect(results.map((r) => r.sourceId)).toEqual(["product-exact", "policy-near"]);
  });

  it("defaults topK to 3", async () => {
    const results = await retrieve("anything");
    expect(results).toHaveLength(3);
  });

  it("filters by sourceType without disturbing ranking", async () => {
    const results = await retrieve("anything", 4, "policy");
    expect(results.map((r) => r.sourceId)).toEqual(["policy-near", "policy-orthogonal"]);
    expect(results.every((r) => r.sourceType === "policy")).toBe(true);
  });

  it("passes the raw query text to the embedding call", async () => {
    await retrieve("do you deliver outside Dhaka?", 1);
    expect(embedQuery).toHaveBeenCalledWith("do you deliver outside Dhaka?");
  });

  it("returns the fields the chat tool consumes", async () => {
    const [top] = await retrieve("anything", 1);
    expect(top).toMatchObject({
      sourceId: "product-exact",
      sourceType: "product",
      title: "Exact match product",
      content: "Closest to the query",
    });
    expect(top).toHaveProperty("metadata");
  });

  it("hybrid mode surfaces a lexical match whose embedding is far from the query", async () => {
    // Embedding-wise this chunk is orthogonal to the query (distance 1, dead
    // last in vector order) — only the FTS leg can rescue it. This is the
    // messy-exact-title scenario hybrid search exists for.
    await db.insert(kbChunks).values({
      sourceType: "product",
      sourceId: "product-lexical",
      title: "Vomero Shoes1.1 special edition",
      content: "Product: Vomero Shoes1.1 special edition",
      embedding: basisVector(9),
    });

    const results = await retrieve("Vomero Shoes1.1 special edition", 3);
    expect(results.map((r) => r.sourceId)).toContain("product-lexical");
  });

  it("vector mode ignores lexical matches (pre-hybrid behavior preserved)", async () => {
    await db.insert(kbChunks).values({
      sourceType: "product",
      sourceId: "product-lexical",
      title: "Vomero Shoes1.1 special edition",
      content: "Product: Vomero Shoes1.1 special edition",
      embedding: basisVector(9),
    });

    const results = await retrieve("Vomero Shoes1.1 special edition", 3, undefined, { mode: "vector" });
    expect(results.map((r) => r.sourceId)).not.toContain("product-lexical");
  });
});

describe("rrfFuse", () => {
  const item = (id: string) => ({ id });

  it("ranks an id appearing in both lists above single-list ids", () => {
    const fused = rrfFuse([
      [item("a"), item("b"), item("c")],
      [item("c"), item("d")],
    ]);
    expect(fused[0]!.id).toBe("c"); // 1/63 + 1/61 beats a's 1/61
  });

  it("degenerates to first-list order when the second list is empty", () => {
    const fused = rrfFuse([[item("a"), item("b"), item("c")], []]);
    expect(fused.map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks score ties by earlier-list rank", () => {
    // a and b: identical scores by symmetry — a was seen first (vector leg).
    const fused = rrfFuse([
      [item("a"), item("b")],
      [item("b"), item("a")],
    ]);
    expect(fused.map((f) => f.id)).toEqual(["a", "b"]);
  });

  it("merges disjoint lists in interleaved score order", () => {
    const fused = rrfFuse([
      [item("a"), item("b")],
      [item("x"), item("y")],
    ]);
    // Same ranks in different lists score equally; first-seen breaks ties.
    expect(fused.map((f) => f.id)).toEqual(["a", "x", "b", "y"]);
  });
});
