const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "..", "supabase", "manual", "prod-data-snapshot.sql");
const outPath = path.join(__dirname, "..", "supabase", "seed.sql");

/**
 * Canonical storage host for seed data. Storage URLs are stored absolute in the
 * catalog, so whatever host the snapshot happened to contain gets frozen into a
 * committed file. A snapshot taken on a machine with locally uploaded images
 * once baked three `http://127.0.0.1:54321/...` category covers into seed.sql —
 * dead links on every other machine, and unrecoverable once that local bucket
 * was reset. Everything is normalised to this host instead; `pnpm
 * db:localize-images` is what rewrites them the other way for local use.
 */
const CANONICAL_STORAGE_HOST =
  process.env.SEED_STORAGE_HOST ?? "https://bwcbcmeftplyljgcacvr.supabase.co";

if (!fs.existsSync(srcPath)) {
  console.error(
    `Missing input snapshot: ${path.relative(process.cwd(), srcPath)}\n\n` +
      `This file is intentionally untracked (it is a large production dump).\n` +
      `Produce it first, e.g.:\n\n` +
      `  pg_dump --data-only --no-owner --no-privileges \\\n` +
      `    -t public.brands -t public.categories -t public.products \\\n` +
      `    -t public.product_variants -t public.inventory \\\n` +
      `    -t public.inventory_movements -t public.product_images \\\n` +
      `    -d "$PROD_DATABASE_URL" > supabase/manual/prod-data-snapshot.sql\n\n` +
      `It must be a COPY-format dump (the default), not INSERT format.`,
  );
  process.exit(1);
}

const content = fs.readFileSync(srcPath, "utf-8");

let rewrittenHosts = 0;
let strippedBusters = 0;

/**
 * Rewrites any local/dev Supabase storage host to the canonical one and drops
 * `?v=<timestamp>` cache-busters, which are per-upload artefacts that have no
 * business in a committed seed.
 */
function normaliseStorageUrls(field) {
  let out = field.replace(
    /https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(?::\d+)?(?=\/storage\/v1\/)/g,
    () => {
      rewrittenHosts++;
      return CANONICAL_STORAGE_HOST;
    },
  );
  out = out.replace(/(\/storage\/v1\/[^\s'"\t]*?)\?v=\d+/g, (_m, keep) => {
    strippedBusters++;
    return keep;
  });
  return out;
}
const tables = [
  "brands",
  "categories",
  "products",
  "product_variants",
  "inventory",
  "inventory_movements",
  "product_images",
];

/** Escapes a single COPY-format field for use as a SQL literal in an INSERT. */
function sqlLiteral(field) {
  if (field === "\\N") return "NULL";
  const unescaped = field
    .replace(/\\t/g, "\t")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
  return `'${normaliseStorageUrls(unescaped).replace(/'/g, "''")}'`;
}

let out =
  "-- Local development seed (runs only on `supabase db reset`, not on remote `db push`).\n" +
  "-- Replaces migration 003_sample_products.sql's generic sample catalog (Puma, Converse, etc.)\n" +
  "-- with a real snapshot of the production catalog, so local dev matches what's actually live.\n" +
  "-- Uses plain INSERT statements (not COPY ... FROM stdin) because the Supabase CLI's reset\n" +
  "-- pipeline executes this file directly, not through the psql binary that understands\n" +
  "-- inline COPY data blocks.\n" +
  "-- Regenerate with `node scripts/_build-catalog-restore.js` after refreshing\n" +
  "-- supabase/manual/prod-data-snapshot.sql from a fresh prod dump.\n\n";
out += "BEGIN;\n";
out +=
  "TRUNCATE TABLE public.product_images, public.inventory_movements, public.inventory, public.product_variants, public.products, public.categories, public.brands CASCADE;\n\n";

for (const t of tables) {
  const startMarker = `COPY public.${t} (`;
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) {
    console.error("NOT FOUND:", t);
    process.exit(1);
  }
  const headerLineEnd = content.indexOf("\n", startIdx);
  const headerLine = content.slice(startIdx, headerLineEnd);
  const columns = headerLine.match(/\(([^)]*)\)/)[1];
  // Scan line-by-line to the `\.` terminator rather than searching for
  // "\n\\.\n". That marker needs a preceding newline, so for an EMPTY table
  // (where `\.` sits immediately after the header) it skips past this block's
  // own terminator and swallows the following table's rows — silently emitting
  // them under the wrong table name.
  const bodyStart = headerLineEnd + 1;
  const restLines = content.slice(bodyStart).split("\n");
  const termIdx = restLines.findIndex((line) => line.replace(/\r$/, "") === "\\.");
  if (termIdx === -1) {
    console.error(`No \\. terminator found for COPY block: ${t}`);
    process.exit(1);
  }
  const rows = restLines
    .slice(0, termIdx)
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.length > 0);
  if (rows.length === 0) continue;

  out += `INSERT INTO public.${t} (${columns}) VALUES\n`;
  const valueTuples = rows.map((row) => {
    const fields = row.split("\t");
    return `  (${fields.map(sqlLiteral).join(", ")})`;
  });
  out += valueTuples.join(",\n") + ";\n\n";
}

out += "COMMIT;\n";

// Last line of defence: nothing machine-local may reach the committed seed.
const leaked = out.match(/https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0)[^\s'"]*/g);
if (leaked) {
  console.error(
    `Refusing to write ${path.relative(process.cwd(), outPath)}: ` +
      `${leaked.length} machine-local URL(s) survived normalisation, e.g.\n  ${leaked[0]}\n` +
      `Storage URLs are handled automatically — anything else must be fixed in the snapshot.`,
  );
  process.exit(1);
}

fs.writeFileSync(outPath, out);
console.log("wrote", out.length, "bytes to", outPath);
if (rewrittenHosts > 0) {
  console.log(
    `normalised ${rewrittenHosts} local storage host(s) -> ${CANONICAL_STORAGE_HOST}`,
  );
}
if (strippedBusters > 0) {
  console.log(`stripped ${strippedBusters} ?v= cache-buster(s)`);
}
