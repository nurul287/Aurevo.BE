import { describe, expect, it } from "vitest";
import { aggregate, keyFactCoverage, parseJudgeScores, type AnswerCaseResult } from "./answer-eval";

describe("keyFactCoverage", () => {
  it("is 1 when there are no required facts", () => {
    expect(keyFactCoverage("anything", [])).toBe(1);
  });

  it("matches facts case-insensitively as substrings", () => {
    expect(keyFactCoverage("Returns are accepted within 7 days.", ["7 days"])).toBe(1);
    expect(keyFactCoverage("We accept CASH ON DELIVERY.", ["cash on delivery"])).toBe(1);
  });

  it("returns the fraction of facts present", () => {
    expect(keyFactCoverage("ships across Bangladesh", ["Bangladesh", "7 days"])).toBe(0.5);
    expect(keyFactCoverage("no matches here", ["Bangladesh", "7 days"])).toBe(0);
  });
});

describe("parseJudgeScores", () => {
  it("parses a clean JSON object", () => {
    const s = parseJudgeScores('{"correctness": 5, "relevance": 4, "reasoning": "accurate"}');
    expect(s).toEqual({ correctness: 5, relevance: 4, reasoning: "accurate" });
  });

  it("extracts JSON embedded in surrounding prose or code fences", () => {
    const s = parseJudgeScores('Here is my grade:\n```json\n{"correctness": 3, "relevance": 5}\n```\nDone.');
    expect(s.correctness).toBe(3);
    expect(s.relevance).toBe(5);
  });

  it("clamps out-of-range scores into [1,5]", () => {
    const s = parseJudgeScores('{"correctness": 9, "relevance": 0, "reasoning": "x"}');
    expect(s.correctness).toBe(5);
    expect(s.relevance).toBe(1);
  });

  it("throws when no JSON object is present", () => {
    expect(() => parseJudgeScores("I cannot grade this.")).toThrow();
  });

  it("throws when scores are non-numeric", () => {
    expect(() => parseJudgeScores('{"reasoning": "no scores"}')).toThrow();
  });
});

describe("aggregate", () => {
  const cases: AnswerCaseResult[] = [
    { question: "a", correctness: 5, relevance: 5, keyFactCoverage: 1, cardOk: true, answer: "" },
    { question: "b", correctness: 3, relevance: 4, keyFactCoverage: 0.5, cardOk: false, answer: "" },
  ];

  it("averages each metric and computes pass rate (both dims >= 4)", () => {
    const s = aggregate(cases);
    expect(s.cases).toBe(2);
    expect(s.avgCorrectness).toBe(4);
    expect(s.avgRelevance).toBe(4.5);
    expect(s.avgKeyFactCoverage).toBe(0.75);
    expect(s.cardAccuracy).toBe(0.5);
    // Only case "a" passes both >= 4.
    expect(s.passRate).toBe(0.5);
  });

  it("returns zeros for an empty result set", () => {
    const s = aggregate([]);
    expect(s.cases).toBe(0);
    expect(s.avgCorrectness).toBe(0);
    expect(s.passRate).toBe(0);
  });
});
