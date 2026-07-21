/**
 * Pure scoring helpers for the answer-quality eval (pnpm eval:answers).
 * No DB, no API — the runner script owns the Anthropic judge call and the
 * streamChat drive; this module is the deterministic, unit-tested core.
 */

export type JudgeScores = { correctness: number; relevance: number; reasoning: string };

export type AnswerCaseResult = {
  question: string;
  correctness: number;
  relevance: number;
  keyFactCoverage: number;
  cardOk: boolean;
  answer: string;
};

/** Fraction of `facts` present in `answer` (case-insensitive substring). Empty facts → 1. */
export function keyFactCoverage(answer: string, facts: string[]): number {
  if (facts.length === 0) return 1;
  const haystack = answer.toLowerCase();
  const hits = facts.filter((f) => haystack.includes(f.toLowerCase())).length;
  return hits / facts.length;
}

/** The judge instruction. The judge scores the answer against ground-truth reference facts. */
export function buildJudgePrompt(question: string, answer: string, reference: string): string {
  return `You are grading a customer-service chatbot for an online fashion store in Bangladesh.

Given the customer QUESTION, the chatbot's ANSWER, and the ground-truth REFERENCE (what the store's policies/catalog actually say), score the answer.

QUESTION:
${question}

REFERENCE (ground truth):
${reference}

ANSWER (from the chatbot):
${answer}

Score two dimensions from 1 to 5:
- "correctness": 5 = every factual claim agrees with the REFERENCE and nothing is invented; 3 = mostly right but vague or missing key facts; 1 = contradicts the REFERENCE or invents facts not supported by it.
- "relevance": 5 = directly and fully answers the QUESTION; 3 = partially answers or is padded with irrelevant content; 1 = does not answer the question.

Respond with ONLY a JSON object, no prose before or after:
{"correctness": <1-5>, "relevance": <1-5>, "reasoning": "<one short sentence>"}`;
}

const clampScore = (n: number): number => Math.min(5, Math.max(1, Math.round(n)));

/**
 * Parse the judge's reply. Extracts the first {...} block so stray prose or
 * code fences around the JSON don't break it; clamps scores to [1,5]. Throws
 * if no usable JSON with numeric scores is found — the runner treats that as
 * a failed case rather than silently scoring 0.
 */
export function parseJudgeScores(raw: string): JudgeScores {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Judge returned no JSON object: ${raw.slice(0, 120)}`);
  const parsed = JSON.parse(match[0]) as Record<string, unknown>;
  const correctness = Number(parsed.correctness);
  const relevance = Number(parsed.relevance);
  if (!Number.isFinite(correctness) || !Number.isFinite(relevance)) {
    throw new Error(`Judge JSON missing numeric scores: ${match[0].slice(0, 120)}`);
  }
  return {
    correctness: clampScore(correctness),
    relevance: clampScore(relevance),
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
  };
}

export type AnswerEvalSummary = {
  cases: number;
  avgCorrectness: number;
  avgRelevance: number;
  avgKeyFactCoverage: number;
  cardAccuracy: number;
  // Share of cases scoring >= 4 on both correctness and relevance.
  passRate: number;
};

const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const round3 = (n: number): number => Number(n.toFixed(3));

export function aggregate(results: AnswerCaseResult[]): AnswerEvalSummary {
  const n = results.length;
  return {
    cases: n,
    avgCorrectness: round3(mean(results.map((r) => r.correctness))),
    avgRelevance: round3(mean(results.map((r) => r.relevance))),
    avgKeyFactCoverage: round3(mean(results.map((r) => r.keyFactCoverage))),
    cardAccuracy: round3(mean(results.map((r) => (r.cardOk ? 1 : 0)))),
    passRate: round3(mean(results.map((r) => (r.correctness >= 4 && r.relevance >= 4 ? 1 : 0)))),
  };
}
