import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../db";
import { chatMetrics, conversations } from "../../../db/schema";
import { deleteOldChatMetrics, getAiMetrics, recordChatMetric } from "./chat.metrics";

const HAIKU = "claude-haiku-4-5-20251001";
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

async function seedConversation(): Promise<string> {
  const [row] = await db
    .insert(conversations)
    .values({ sessionId: randomUUID() })
    .returning({ id: conversations.id });
  return row!.id;
}

describe("chat.metrics", () => {
  beforeEach(async () => {
    await db.delete(chatMetrics);
  });

  describe("getAiMetrics", () => {
    it("aggregates totals, cost estimate, tool usage, and retrieval stats", async () => {
      const conversationId = await seedConversation();
      await recordChatMetric({
        conversationId,
        model: HAIKU,
        latencyMs: 1000,
        retrievalLatencyMs: 200,
        inputTokens: 1_000_000,
        outputTokens: 200_000,
        toolCalls: { search_knowledge: 2, get_product_details: 1 },
        retrievalResultCount: 3,
        retrievalTopScore: 0.9,
      });
      await recordChatMetric({
        conversationId,
        model: HAIKU,
        latencyMs: 3000,
        retrievalLatencyMs: null,
        inputTokens: 500_000,
        outputTokens: 100_000,
        toolCalls: { search_knowledge: 1 },
        retrievalResultCount: null,
        retrievalTopScore: null,
      });

      const m = await getAiMetrics(7);

      expect(m.totals.requests).toBe(2);
      expect(m.totals.conversations).toBe(1);
      expect(m.totals.inputTokens).toBe(1_500_000);
      expect(m.totals.outputTokens).toBe(300_000);
      // Haiku 4.5: $1/MTok in, $5/MTok out → 1.5*1 + 0.3*5 = 3.0
      expect(m.totals.estimatedCostUsd).toBeCloseTo(3.0, 4);
      expect(m.totals.avgLatencyMs).toBe(2000);
      // search_knowledge appears in both rows (2 + 1), get_product_details once.
      expect(m.toolUsage.find((t) => t.tool === "search_knowledge")?.count).toBe(3);
      expect(m.toolUsage.find((t) => t.tool === "get_product_details")?.count).toBe(1);
      // Only the first row had retrieval — averages over present values only.
      expect(m.totals.avgRetrievalResultCount).toBe(3);
      expect(m.totals.avgRetrievalTopScore).toBeCloseTo(0.9, 4);
    });

    it("excludes rows outside the requested window", async () => {
      const conversationId = await seedConversation();
      await recordChatMetric({
        conversationId,
        model: HAIKU,
        latencyMs: 500,
        retrievalLatencyMs: null,
        inputTokens: 100,
        outputTokens: 50,
        toolCalls: {},
        retrievalResultCount: null,
        retrievalTopScore: null,
      });
      // Backdate one row beyond the 7-day window.
      await db.insert(chatMetrics).values({
        conversationId,
        model: HAIKU,
        latencyMs: 999,
        inputTokens: 999,
        outputTokens: 999,
        toolCalls: {},
        createdAt: daysAgo(30),
      });

      const m = await getAiMetrics(7);
      expect(m.totals.requests).toBe(1);
      expect(m.totals.inputTokens).toBe(100);
    });

    it("returns zeroed totals when there are no metrics in range", async () => {
      const m = await getAiMetrics(7);
      expect(m.totals.requests).toBe(0);
      expect(m.totals.estimatedCostUsd).toBe(0);
      expect(m.totals.avgLatencyMs).toBe(0);
      expect(m.perDay).toEqual([]);
      expect(m.toolUsage).toEqual([]);
    });
  });

  describe("deleteOldChatMetrics", () => {
    it("deletes rows older than the retention window and keeps recent ones", async () => {
      const conversationId = await seedConversation();
      await db.insert(chatMetrics).values([
        { conversationId, model: HAIKU, latencyMs: 1, inputTokens: 0, outputTokens: 0, toolCalls: {}, createdAt: daysAgo(100) },
        { conversationId, model: HAIKU, latencyMs: 1, inputTokens: 0, outputTokens: 0, toolCalls: {}, createdAt: daysAgo(10) },
      ]);

      const deleted = await deleteOldChatMetrics(90);
      expect(deleted).toBe(1);

      const remaining = await db.select().from(chatMetrics);
      expect(remaining).toHaveLength(1);
    });
  });
});
