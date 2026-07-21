/**
 * Answer-quality evaluation — measures the chatbot's full answers (the real
 * streamChat pipeline: retrieval + rerank + Claude + tool use), not just
 * retrieval ranking. For each golden question it drives streamChat, then has
 * an LLM judge score the answer against ground-truth reference facts.
 *
 *   pnpm eval:answers
 *   pnpm eval:answers -- --judge-model claude-sonnet-5   # stronger judge
 *   pnpm eval:answers -- --json
 *
 * Metrics (macro-averaged): correctness (judge 1-5), relevance (judge 1-5),
 * key-fact coverage (deterministic 0-1), product-card accuracy, and pass rate
 * (correctness >= 4 AND relevance >= 4).
 *
 * Like eval:retrieval, this makes real Anthropic + Voyage calls and needs a
 * seeded, ingested local DB — a manual script, never CI. It creates one
 * throwaway conversation per question and deletes them all afterwards.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { inArray } from "drizzle-orm";
import { db } from "../db";
import { conversations } from "../db/schema";
import { config } from "../app/config";
import { streamChat } from "../app/modules/chat/chat.service";
import {
  aggregate,
  buildJudgePrompt,
  keyFactCoverage,
  parseJudgeScores,
  type AnswerCaseResult,
} from "../app/modules/chat/answer-eval";

const GOLDEN_PATH = path.resolve(process.cwd(), "content/eval/answer-golden.json");

type GoldenCase = {
  question: string;
  reference: string;
  mustMention?: string[];
  expectsProductCard?: boolean;
};

function parseArgs(argv: string[]) {
  const args = { judgeModel: config.ANTHROPIC_MODEL, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--judge-model") args.judgeModel = argv[++i] ?? args.judgeModel;
    else if (argv[i] === "--json") args.json = true;
  }
  return args;
}

/** Drive the real chat pipeline once, collecting the full answer + product cards. */
async function askChatbot(question: string): Promise<{ conversationId: string; answer: string; cardCount: number }> {
  const sessionId = randomUUID();
  let conversationId = "";
  let answer = "";
  let cardCount = 0;
  for await (const ev of streamChat(question, sessionId, null)) {
    if (ev.type === "conversation") conversationId = ev.conversationId;
    else if (ev.type === "text") answer += ev.text;
    else if (ev.type === "products") cardCount += ev.products.length;
  }
  return { conversationId, answer, cardCount };
}

async function judge(anthropic: Anthropic, model: string, question: string, answer: string, reference: string) {
  const res = await anthropic.messages.create({
    model,
    max_tokens: 256,
    messages: [{ role: "user", content: buildJudgePrompt(question, answer, reference) }],
  });
  const text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
  return parseJudgeScores(text);
}

async function main() {
  if (!/127\.0\.0\.1|localhost/.test(config.DATABASE_URL)) {
    console.error("eval:answers only runs against a local DATABASE_URL (127.0.0.1/localhost). Refusing.");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf-8")) as { cases: GoldenCase[] };
  const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

  const results: AnswerCaseResult[] = [];
  const conversationIds: string[] = [];

  for (const c of golden.cases) {
    const { conversationId, answer, cardCount } = await askChatbot(c.question);
    if (conversationId) conversationIds.push(conversationId);

    let scores;
    try {
      scores = await judge(anthropic, args.judgeModel, c.question, answer, c.reference);
    } catch (err) {
      // A judge that won't return usable JSON is the worst score, flagged loudly.
      console.error(`  judge failed for "${c.question}":`, err instanceof Error ? err.message : err);
      scores = { correctness: 1, relevance: 1, reasoning: "judge failed" };
    }

    results.push({
      question: c.question,
      correctness: scores.correctness,
      relevance: scores.relevance,
      keyFactCoverage: keyFactCoverage(answer, c.mustMention ?? []),
      cardOk: c.expectsProductCard ? cardCount > 0 : true,
      answer,
    });
  }

  // Clean up the throwaway conversations (messages cascade).
  if (conversationIds.length > 0) {
    await db.delete(conversations).where(inArray(conversations.id, conversationIds));
  }

  const summary = aggregate(results);

  if (args.json) {
    console.log(JSON.stringify({ summary, judgeModel: args.judgeModel, results }, null, 2));
  } else {
    console.log(`\nAnswer-quality eval — judge=${args.judgeModel}, ${summary.cases} cases\n`);
    const fmt = (v: number) => v.toFixed(2);
    for (const r of results) {
      const flag = r.correctness >= 4 && r.relevance >= 4 ? " " : "✗";
      console.log(`${flag} correct=${r.correctness} rel=${r.relevance} facts=${fmt(r.keyFactCoverage)} card=${r.cardOk ? "ok" : "MISS"}  ${r.question}`);
    }
    console.log(`\n  avg correctness   ${fmt(summary.avgCorrectness)} / 5`);
    console.log(`  avg relevance     ${fmt(summary.avgRelevance)} / 5`);
    console.log(`  key-fact coverage ${fmt(summary.avgKeyFactCoverage)}`);
    console.log(`  card accuracy     ${fmt(summary.cardAccuracy)}`);
    console.log(`  pass rate         ${fmt(summary.passRate)}  (correctness & relevance both >= 4)\n`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("eval:answers failed:", err);
  process.exit(1);
});
