const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "..", "supabase", "manual", "prod-data-snapshot.sql");
const outPath = path.join(__dirname, "..", "supabase", "seed.sql");

const content = fs.readFileSync(srcPath, "utf-8");
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
  return `'${unescaped.replace(/'/g, "''")}'`;
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
  const bodyStart = headerLineEnd + 1;
  const endMarker = "\n\\.\n";
  const endIdx = content.indexOf(endMarker, bodyStart);
  const body = content.slice(bodyStart, endIdx);

  const rows = body.split("\n").filter((line) => line.length > 0);
  if (rows.length === 0) continue;

  out += `INSERT INTO public.${t} (${columns}) VALUES\n`;
  const valueTuples = rows.map((row) => {
    const fields = row.split("\t");
    return `  (${fields.map(sqlLiteral).join(", ")})`;
  });
  out += valueTuples.join(",\n") + ";\n\n";
}

out += "COMMIT;\n";
fs.writeFileSync(outPath, out);
console.log("wrote", out.length, "bytes to", outPath);
