import XLSX from "xlsx";
import { normalizedProductSchema, type NormalizedProduct } from "./imports.schema";

export type ParsedSpreadsheetRow = { rowNumber: number; product: NormalizedProduct };
export type SpreadsheetRowError = { rowNumber: number; error: string };
export type ParseSpreadsheetResult = { rows: ParsedSpreadsheetRow[]; errors: SpreadsheetRowError[] };

// Column order in the downloadable template — also doubles as the
// documentation of every recognized column. Headers are matched
// case-insensitively with whitespace normalized to underscores, so "Base
// Price" and "base_price" both resolve to the same field.
const TEMPLATE_HEADERS = [
  "external_id",
  "title",
  "description",
  "short_description",
  "brand",
  "category",
  "gender",
  "base_price",
  "compare_at_price",
  "color",
  "color_code",
  "sizes",
  "stock",
  "sku_prefix",
  "tags",
  "image_urls",
] as const;

function normalizeHeaderKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function cellToString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cellToNumber(value: unknown): number | undefined {
  const str = cellToString(value);
  if (!str) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
}

function splitList(value: unknown, delimiter: string): string[] {
  return cellToString(value)
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * A stable-enough fallback external_id when the sheet leaves the column
 * blank. Not perfectly stable across row-reordering (row number is part of
 * it), but that matches the documented behavior — users who need reliable
 * re-import idempotency should fill in external_id themselves.
 */
function deriveExternalId(title: string, rowNumber: number): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `row-${rowNumber}-${slug || "untitled"}`;
}

/**
 * One spreadsheet row -> one NormalizedProduct. A row is one colorway (the
 * `color`/`color_code` columns) with its own sizes -- matches the existing
 * catalog's per-colorway product model. `sizes` is pipe-delimited and
 * fans out into one variant per size; a blank `sizes` column produces a
 * single sizeless variant (caps, watches, and other one-size items).
 */
function rowToCandidate(raw: Record<string, unknown>, rowNumber: number, source: string): unknown {
  const title = cellToString(raw.title);
  const externalId = cellToString(raw.external_id) || deriveExternalId(title, rowNumber);
  const color = cellToString(raw.color) || undefined;
  const colorCode = cellToString(raw.color_code) || undefined;
  const skuPrefix = cellToString(raw.sku_prefix) || undefined;
  const stock = cellToNumber(raw.stock);
  const sizes = splitList(raw.sizes, "|");

  const variants =
    sizes.length > 0
      ? sizes.map((size) => ({
          size,
          color,
          colorCode,
          sku: skuPrefix ? `${skuPrefix}-${size}` : undefined,
          stock,
        }))
      : [{ color, colorCode, sku: skuPrefix, stock }];

  const imageUrls = splitList(raw.image_urls, ",");
  const images = imageUrls.map((url, i) => ({ url, isPrimary: i === 0, sortOrder: i }));

  return {
    source,
    externalId,
    title,
    description: cellToString(raw.description) || undefined,
    shortDescription: cellToString(raw.short_description) || undefined,
    brand: cellToString(raw.brand) || undefined,
    category: cellToString(raw.category),
    gender: cellToString(raw.gender).toLowerCase() || undefined,
    basePrice: cellToNumber(raw.base_price),
    compareAtPrice: cellToNumber(raw.compare_at_price),
    tags: splitList(raw.tags, ","),
    variants,
    images,
  };
}

/**
 * Parses a .xlsx or .csv buffer into NormalizedProducts. XLSX.read()
 * auto-detects the format from the buffer content, so no branching on file
 * extension is needed here -- the caller (imports.controller) only uses the
 * extension to reject unsupported file types before this is called.
 * Per-row failures don't abort the parse -- they're collected as `errors`
 * so a bad row can be reported without discarding the good ones.
 */
export function parseSpreadsheet(buffer: Buffer, source: string): ParseSpreadsheetResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { rows: [], errors: [] };

  const sheet = workbook.Sheets[firstSheetName]!;
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: ParsedSpreadsheetRow[] = [];
  const errors: SpreadsheetRowError[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2; // +1 to 1-index, +1 for the header row

    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      normalized[normalizeHeaderKey(key)] = value;
    }

    // Skip fully blank rows -- a common trailing artifact from spreadsheet
    // tools (Excel/Sheets sometimes pads a "used range" with empty rows).
    const hasAnyValue = Object.values(normalized).some((v) => cellToString(v) !== "");
    if (!hasAnyValue) return;

    const candidate = rowToCandidate(normalized, rowNumber, source);
    const parsed = normalizedProductSchema.safeParse(candidate);
    if (parsed.success) {
      rows.push({ rowNumber, product: parsed.data });
    } else {
      const message = parsed.error.issues.map((i) => `${i.path.join(".") || "(row)"}: ${i.message}`).join("; ");
      errors.push({ rowNumber, error: message });
    }
  });

  return { rows, errors };
}

/** Generates the downloadable blank .xlsx template with one example row. */
export function generateImportTemplate(): Buffer {
  const exampleRow = [
    "example-001",
    "Classic Oxford Shirt",
    "A crisp cotton oxford shirt for everyday wear.",
    "Cotton oxford shirt",
    "Aurevo",
    "shirt",
    "men",
    "1490",
    "1990",
    "White",
    "#ffffff",
    "S|M|L|XL",
    "20",
    "SHIRT-OXFORD",
    "cotton,formal",
    "https://example.com/image1.jpg,https://example.com/image2.jpg",
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], exampleRow]);
  worksheet["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
