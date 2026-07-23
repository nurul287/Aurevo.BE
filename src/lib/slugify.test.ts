import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Nike Air Force 1")).toBe("nike-air-force-1");
  });

  it("strips punctuation and collapses runs into single hyphens", () => {
    expect(slugify("White / 41 --- Special!!")).toBe("white-41-special");
  });

  it("strips diacritics to their plain-letter form", () => {
    // Built via String.fromCharCode rather than typed literally -- accented
    // characters in this file have repeatedly been silently mangled by
    // tooling in this environment (see slugify.ts's own comment on why it
    // avoids \u escapes in a regex literal for the same reason).
    const eAcute = String.fromCharCode(0x00e9); // e-acute
    const input = `${eAcute}lan Caf${eAcute}`; // "Élan Café"
    expect(slugify(input)).toBe("elan-cafe");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  --Hello World--  ")).toBe("hello-world");
  });

  it("never produces uppercase or non [a-z0-9-] characters", () => {
    const emDash = String.fromCharCode(0x2014);
    const result = slugify(`Product #42 (New!) ${emDash} 100% Cotton`);
    expect(result).toMatch(/^[a-z0-9-]*$/);
  });

  it("truncates very long input well under the 255-char column limit", () => {
    const result = slugify("a".repeat(500));
    expect(result.length).toBeLessThanOrEqual(200);
  });
});
