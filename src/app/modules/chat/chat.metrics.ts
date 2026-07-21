import { sql } from "drizzle-orm";
import { db } from "../../../db";
import { chatMetrics } from "../../../db/schema";
import { logger } from "../../../lib/logger";

/**
 * Per-request telemetry for the RAG chatbot — one row per streamChat call.
 * Written fire-and-forget from chat.service (never awaited, never fails the
 * chat), read by the admin AI-metrics dashboard.
 */
export type ChatMetric = {
  conversationId: string;
  model: string;
  latencyMs: number;
  retrievalLatencyMs: number | null;
  inputTokens: number;
  outputTokens: number;
  toolCalls: Record<string, number>;
  retrievalResultCount: number | null;
  retrievalTopScore: number | null;
};

/**
 * Estimated USD cost per 1M tokens, by model. Used only for a labelled
 * "estimate" in the dashboard — verify against current Anthropic pricing
 * (platform.claude.com/docs/en/pricing) when adding models. Default is the
 * config default model, Claude Haiku 4.5 ($1 in / $5 out per MTok).
 */
const MODEL_PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-opus-4-5": { input: 5, output: 25 },
};
const DEFAULT_PRICING = MODEL_PRICING_PER_MTOK["claude-haiku-4-5"]!;

/** Model IDs carry a date suffix (claude-haiku-4-5-20251001) — match on prefix. */
function pricingFor(model: string): { input: number; output: number } {
  const key = Object.keys(MODEL_PRICING_PER_MTOK).find((k) => model.startsWith(k));
  return key ? MODEL_PRICING_PER_MTOK[key]! : DEFAULT_PRICING;
}

export async function recordChatMetric(metric: ChatMetric): Promise<void> {
  await db.insert(chatMetrics).values({
    conversationId: metric.conversationId,
    model: metric.model,
    latencyMs: metric.latencyMs,
    retrievalLatencyMs: metric.retrievalLatencyMs,
    inputTokens: metric.inputTokens,
    outputTokens: metric.outputTokens,
    toolCalls: metric.toolCalls,
    retrievalResultCount: metric.retrievalResultCount,
    retrievalTopScore: metric.retrievalTopScore === null ? null : String(metric.retrievalTopScore),
  });
}

/**
 * Deletes metrics older than `days`. Metrics keep their own retention window
 * (default 90d), independent of conversation cleanup — a purged conversation
 * leaves its metrics behind (FK is ON DELETE SET NULL) until they age out here.
 */
export async function deleteOldChatMetrics(days = 90): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const deleted = await db
    .delete(chatMetrics)
    .where(sql`${chatMetrics.createdAt} < ${cutoff}`)
    .returning({ id: chatMetrics.id });
  return deleted.length;
}

export type AiMetrics = {
  rangeDays: number;
  totals: {
    requests: number;
    conversations: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    avgRetrievalLatencyMs: number | null;
    avgRetrievalResultCount: number | null;
    avgRetrievalTopScore: number | null;
  };
  perDay: {
    day: string;
    requests: number;
    conversations: number;
    inputTokens: number;
    outputTokens: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
  }[];
  toolUsage: { tool: string; count: number }[];
};

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export async function getAiMetrics(days = 7): Promise<AiMetrics> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [totalsRows, perDayRows, toolRows, costRows] = await Promise.all([
    db.execute(sql`
      SELECT
        count(*) AS requests,
        count(DISTINCT conversation_id) AS conversations,
        coalesce(sum(input_tokens), 0) AS input_tokens,
        coalesce(sum(output_tokens), 0) AS output_tokens,
        coalesce(avg(latency_ms), 0) AS avg_latency_ms,
        coalesce(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms), 0) AS p95_latency_ms,
        avg(retrieval_latency_ms) AS avg_retrieval_latency_ms,
        avg(retrieval_result_count) AS avg_retrieval_result_count,
        avg(retrieval_top_score) AS avg_retrieval_top_score
      FROM chat_metrics
      WHERE created_at >= ${since}
    `),
    db.execute(sql`
      SELECT
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
        count(*) AS requests,
        count(DISTINCT conversation_id) AS conversations,
        coalesce(sum(input_tokens), 0) AS input_tokens,
        coalesce(sum(output_tokens), 0) AS output_tokens,
        coalesce(avg(latency_ms), 0) AS avg_latency_ms,
        coalesce(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms), 0) AS p95_latency_ms
      FROM chat_metrics
      WHERE created_at >= ${since}
      GROUP BY day
      ORDER BY day
    `),
    db.execute(sql`
      SELECT key AS tool, sum(value::int) AS count
      FROM chat_metrics, jsonb_each_text(tool_calls)
      WHERE created_at >= ${since}
      GROUP BY key
      ORDER BY count DESC
    `),
    db.execute(sql`
      SELECT model, coalesce(sum(input_tokens), 0) AS input_tokens, coalesce(sum(output_tokens), 0) AS output_tokens
      FROM chat_metrics
      WHERE created_at >= ${since}
      GROUP BY model
    `),
  ]);

  const t = (totalsRows as unknown as Record<string, unknown>[])[0] ?? {};

  // Cost is summed per-model so a window spanning models prices each correctly.
  const estimatedCostUsd = (costRows as unknown as Record<string, unknown>[]).reduce((acc, row) => {
    const price = pricingFor(String(row.model));
    return acc + (num(row.input_tokens) / 1_000_000) * price.input + (num(row.output_tokens) / 1_000_000) * price.output;
  }, 0);

  return {
    rangeDays: days,
    totals: {
      requests: num(t.requests),
      conversations: num(t.conversations),
      inputTokens: num(t.input_tokens),
      outputTokens: num(t.output_tokens),
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(4)),
      avgLatencyMs: Math.round(num(t.avg_latency_ms)),
      p95LatencyMs: Math.round(num(t.p95_latency_ms)),
      avgRetrievalLatencyMs: numOrNull(t.avg_retrieval_latency_ms),
      avgRetrievalResultCount: numOrNull(t.avg_retrieval_result_count),
      avgRetrievalTopScore: numOrNull(t.avg_retrieval_top_score),
    },
    perDay: (perDayRows as unknown as Record<string, unknown>[]).map((r) => ({
      day: String(r.day),
      requests: num(r.requests),
      conversations: num(r.conversations),
      inputTokens: num(r.input_tokens),
      outputTokens: num(r.output_tokens),
      avgLatencyMs: Math.round(num(r.avg_latency_ms)),
      p95LatencyMs: Math.round(num(r.p95_latency_ms)),
    })),
    toolUsage: (toolRows as unknown as Record<string, unknown>[]).map((r) => ({
      tool: String(r.tool),
      count: num(r.count),
    })),
  };
}

/** Fire-and-forget wrapper — records a metric, swallowing any failure. */
export function recordChatMetricSafe(metric: ChatMetric): void {
  recordChatMetric(metric).catch((err) => logger.error({ err }, "chat.metrics record failed"));
}
