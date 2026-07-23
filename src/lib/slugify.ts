// Unicode combining diacritical marks block (U+0300-U+036F). Expressed as
// codepoints rather than a \uXXXX regex literal deliberately -- this file
// has repeatedly round-tripped through tooling that silently decodes \u
// escapes into the literal combining characters themselves, which then
// renders invisibly and is easy to miss in review.
const COMBINING_MARK_LOW = 0x0300;
const COMBINING_MARK_HIGH = 0x036f;

/**
 * Lowercase, hyphenated, alphanumeric-only slug -- matches the
 * ^[a-z0-9-]+$ constraint every slug column in this codebase validates
 * against (products/brands/categories). Strips diacritics first so an
 * accented letter normalizes to its plain form instead of being dropped
 * outright by the alphanumeric strip below.
 */
export function slugify(input: string): string {
  const withoutDiacritics = Array.from(input.normalize("NFKD"))
    .filter((ch) => {
      const code = ch.codePointAt(0)!;
      return code < COMBINING_MARK_LOW || code > COMBINING_MARK_HIGH;
    })
    .join("");

  return withoutDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200); // headroom under the 255-char column for a numeric suffix
}
