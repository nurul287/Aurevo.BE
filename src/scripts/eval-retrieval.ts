/**
 * Retrieval evaluation harness — measures retrieve() quality against the
 * golden dataset in content/eval/retrieval-golden.json. Run manually via
 * `pnpm eval:retrieval` (never in CI/vitest: it makes real Voyage embedding
 * calls and needs a seeded + ingested local DB).
 *
 *   pnpm eval:retrieval                    # defaults: --mode vector --k 3
 *   pnpm eval:retrieval -- --k 5
 *   pnpm eval:retrieval -- --json          # machine-readable output
 *
 * --mode exists so later hybrid/rerank retrieval modes can be compared
 * against the same dataset; only "vector" is implemented today.
 *
 * Metrics (macro-averaged over all cases):
 *   precision@k  relevant results in top-k / k
 *   recall@k     relevant results in top-k / total relevant for the query
 *   hit-rate@k   fraction of queries with >=1 relevant result in top-k
 *   MRR          mean of 1/rank of the first relevant result (0 if none)
 */
import fs from "node:fs";
import path from "node:path";
import { inArray } from "drizzle-orm";
import { db } from "../db";
import { products } from "../db/schema";
import { retrieve } from "../app/modules/knowledge/knowledge.service";
import type { KnowledgeSourceType, RetrieveMode } from "../app/modules/knowledge/knowledge.service";
import { config } from "../app/config";

const GOLDEN_PATH = path.resolve(process.cwd(), "content/eval/retrieval-golden.json");

type GoldenRelevant = { kind: "chunk"; sourceId: string } | { kind: "product"; slug: string };
type GoldenCase = { query: string; sourceType?: KnowledgeSourceType; relevant: GoldenRelevant[] };

type CaseResult = {
  query: string;
  precision: number;
  recall: number;
  hit: boolean;
  reciprocalRank: number;
  retrieved: string[];
  expected: string[];
};

const MODES: RetrieveMode[] = ["vector", "hybrid", "hybrid+rerank"];

function parseArgs(argv: string[]) {
  // Default mirrors production's default retrieval mode.
  const args = { mode: "vector" as RetrieveMode, k: 3, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--mode") args.mode = (argv[++i] ?? args.mode) as RetrieveMode;
    else if (argv[i] === "--k") args.k = Number(argv[++i] ?? args.k);
    else if (argv[i] === "--json") args.json = true;
  }
  if (!MODES.includes(args.mode)) {
    // "hybrid+rerank" plumbs in with the reranking session.
    console.error(`Unknown --mode "${args.mode}" — expected one of: ${MODES.join(", ")}.`);
    process.exit(1);
  }
  if (!Number.isInteger(args.k) || args.k < 1) {
    console.error(`--k must be a positive integer, got "${args.k}"`);
    process.exit(1);
  }
  return args;
}

const RATE_LIMIT_WAIT_MS = 21_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * retrieve() uses fail-fast embedQuery, but a free-tier Voyage key (3 RPM)
 * will 429 partway through a 30+ query eval run — wait out the window and
 * retry rather than aborting with half the metrics computed.
 *
 * For hybrid+rerank there's a second, sneakier failure: retrieve() swallows
 * a rerank 429 and silently falls back to fusion order, which would pollute
 * the eval with un-reranked rows measured as if they were reranked. Detect
 * that (a reranked row always carries a `score`; its absence means fallback)
 * and retry so the measurement is honestly all-reranked.
 */
async function retrieveWithRetry(query: string, k: number, mode: RetrieveMode, sourceType?: KnowledgeSourceType, attempts = 5) {
  for (;;) {
    try {
      const results = await retrieve(query, k, sourceType, { mode });
      const rerankSilentlyFellBack =
        mode === "hybrid+rerank" && results.length > 0 && results.every((r) => r.score === undefined);
      if (rerankSilentlyFellBack && attempts-- > 0) {
        await sleep(RATE_LIMIT_WAIT_MS);
        continue;
      }
      return results;
    } catch (err) {
      if (attempts-- <= 0 || !(err instanceof Error) || !err.message.includes("(429)")) throw err;
      await sleep(RATE_LIMIT_WAIT_MS);
    }
  }
}

/** Golden product slugs -> kb_chunks.source_id (= product id), resolved once. */
async function resolveSlugMap(cases: GoldenCase[]): Promise<Map<string, string>> {
  const slugs = [
    ...new Set(
      cases.flatMap((c) => c.relevant.filter((r): r is Extract<GoldenRelevant, { kind: "product" }> => r.kind === "product").map((r) => r.slug)),
    ),
  ];
  if (slugs.length === 0) return new Map();

  const rows = await db.select({ id: products.id, slug: products.slug }).from(products).where(inArray(products.slug, slugs));
  const map = new Map(rows.map((r) => [r.slug, r.id]));

  const missing = slugs.filter((s) => !map.has(s));
  if (missing.length > 0) {
    console.error(`Golden dataset references product slugs not in this DB (re-seed or fix the dataset):\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }
  return map;
}

async function main() {
  // Same guardrail as e2e/global-setup: this hits the DB and spends Voyage
  // quota — refuse anything that isn't obviously the local Docker stack.
  const dbUrl = config.DATABASE_URL;
  if (!/127\.0\.0\.1|localhost/.test(dbUrl)) {
    console.error("eval:retrieval only runs against a local DATABASE_URL (127.0.0.1/localhost). Refusing.");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf-8")) as { cases: GoldenCase[] };
  const slugToId = await resolveSlugMap(golden.cases);

  const results: CaseResult[] = [];
  for (const c of golden.cases) {
    const expected = new Set(
      c.relevant.map((r) => (r.kind === "product" ? `product:${slugToId.get(r.slug)!}` : `chunk:${r.sourceId}`)),
    );

    const retrieved = await retrieveWithRetry(c.query, args.k, args.mode, c.sourceType);
    const retrievedKeys = retrieved.map((r) => (r.sourceType === "product" ? `product:${r.sourceId}` : `chunk:${r.sourceId}`));

    const hits = retrievedKeys.filter((key) => expected.has(key));
    const firstHitRank = retrievedKeys.findIndex((key) => expected.has(key));

    results.push({
      query: c.query,
      precision: hits.length / args.k,
      recall: hits.length / expected.size,
      hit: hits.length > 0,
      reciprocalRank: firstHitRank === -1 ? 0 : 1 / (firstHitRank + 1),
      retrieved: retrievedKeys,
      expected: [...expected],
    });
  }

  const n = results.length;
  const summary = {
    mode: args.mode,
    k: args.k,
    cases: n,
    precisionAtK: results.reduce((s, r) => s + r.precision, 0) / n,
    recallAtK: results.reduce((s, r) => s + r.recall, 0) / n,
    hitRateAtK: results.filter((r) => r.hit).length / n,
    mrr: results.reduce((s, r) => s + r.reciprocalRank, 0) / n,
  };

  if (args.json) {
    console.log(JSON.stringify({ summary, results }, null, 2));
  } else {
    console.log(`\nRetrieval eval — mode=${args.mode}, k=${args.k}, ${n} cases\n`);
    const fmt = (v: number) => v.toFixed(3);
    for (const r of results) {
      const flag = r.hit ? " " : "✗";
      console.log(`${flag} P=${fmt(r.precision)} R=${fmt(r.recall)} RR=${fmt(r.reciprocalRank)}  ${r.query}`);
      if (!r.hit) console.log(`    expected ${r.expected.join(", ")}\n    got      ${r.retrieved.join(", ")}`);
    }
    console.log(`\n  precision@${args.k}  ${fmt(summary.precisionAtK)}`);
    console.log(`  recall@${args.k}     ${fmt(summary.recallAtK)}`);
    console.log(`  hit-rate@${args.k}   ${fmt(summary.hitRateAtK)}`);
    console.log(`  MRR          ${fmt(summary.mrr)}\n`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("eval:retrieval failed:", err);
  process.exit(1);
});
