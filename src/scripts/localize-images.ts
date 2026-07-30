/**
 * Copies catalog images out of production storage into the LOCAL Supabase
 * bucket and rewrites the local database's URLs to point at them.
 *
 * Why: supabase/seed.sql stores absolute storage URLs, and most of them point
 * at the production project. A freshly seeded local database therefore renders
 * its catalog by loading images from production — it works, but local dev then
 * depends on production being up and public, and nothing exercises the local
 * storage path.
 *
 * Deliberately NOT part of `pnpm db:bootstrap`: bootstrap runs in CI, and CI
 * must never reach out to the production project. Run this by hand after a
 * bootstrap when you want a self-contained local catalog:
 *
 *     pnpm db:localize-images
 *
 * Idempotent — URLs already pointing at the local stack are skipped, and
 * uploads use upsert, so re-running is safe.
 */
import { db, client } from "../db";
import { categories, productImages } from "../db/schema";
import { eq } from "drizzle-orm";
import { uploadFile } from "../lib/storage";
import config from "../app/config";

type Row = { table: "categories" | "product_images"; id: string; url: string };

function isLocal(url: string): boolean {
  return url.includes("127.0.0.1") || url.includes("localhost");
}

/**
 * `https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>?v=123`
 * -> { bucket, path }. The `?v=` cache-buster some uploads carry is dropped;
 * it is part of the URL, never part of the storage key.
 */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { bucket: m[1], path: m[2].split("?")[0] };
}

function contentTypeFor(path: string, headerType: string | null): string {
  if (headerType && headerType.startsWith("image/")) return headerType;
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif", avif: "image/avif",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

async function main() {
  if (!isLocal(config.DATABASE_URL)) {
    throw new Error(
      `Refusing to run against a non-local database: ${config.DATABASE_URL.replace(/:[^:@]+@/, ":***@")}\n` +
        `This script rewrites image URLs to http://127.0.0.1 and would corrupt a remote catalog.`,
    );
  }

  const cats = await db.select({ id: categories.id, url: categories.imageUrl }).from(categories);
  const imgs = await db.select({ id: productImages.id, url: productImages.url }).from(productImages);

  const rows: Row[] = [
    ...cats.filter((r) => r.url).map((r) => ({ table: "categories" as const, id: r.id, url: r.url! })),
    ...imgs.filter((r) => r.url).map((r) => ({ table: "product_images" as const, id: r.id, url: r.url })),
  ];

  const remote = rows.filter((r) => !isLocal(r.url));
  const alreadyLocal = rows.length - remote.length;

  console.log(`${rows.length} image URL(s) total — ${remote.length} remote, ${alreadyLocal} already local.`);
  if (remote.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // One download+upload per distinct source URL; several rows can share one.
  const byUrl = new Map<string, Row[]>();
  for (const r of remote) {
    const list = byUrl.get(r.url) ?? [];
    list.push(r);
    byUrl.set(r.url, list);
  }

  let copied = 0;
  const failures: { url: string; reason: string }[] = [];

  for (const [sourceUrl, group] of byUrl) {
    const parsed = parseStorageUrl(sourceUrl);
    if (!parsed) {
      failures.push({ url: sourceUrl, reason: "not a recognisable Supabase storage URL" });
      continue;
    }

    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) {
        failures.push({ url: sourceUrl, reason: `source returned HTTP ${res.status}` });
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const localUrl = await uploadFile(
        parsed.bucket,
        parsed.path,
        buf,
        contentTypeFor(parsed.path, res.headers.get("content-type")),
      );

      for (const row of group) {
        if (row.table === "categories") {
          await db.update(categories).set({ imageUrl: localUrl }).where(eq(categories.id, row.id));
        } else {
          await db.update(productImages).set({ url: localUrl }).where(eq(productImages.id, row.id));
        }
      }
      copied++;
      console.log(`  ok  ${parsed.path} (${buf.length} bytes, ${group.length} row(s))`);
    } catch (err) {
      failures.push({ url: sourceUrl, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log(`\nCopied ${copied}/${byUrl.size} file(s) into the local bucket.`);

  if (failures.length > 0) {
    console.log(`\n${failures.length} could NOT be copied — those rows keep their original URL:`);
    for (const f of failures) console.log(`  - ${f.url}\n      ${f.reason}`);
  }

  const stillLocalOnly = rows.filter((r) => isLocal(r.url));
  if (stillLocalOnly.length > 0) {
    console.log(
      `\nNote: ${stillLocalOnly.length} row(s) already referenced the local stack before this run.\n` +
        `If those images 404, their files were only ever uploaded locally and are not\n` +
        `recoverable from production — re-upload them through the admin UI.`,
    );
  }
}

// Close the pool rather than process.exit() — see the note in seed-assets.ts.
main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
