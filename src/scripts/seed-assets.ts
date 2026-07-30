/**
 * Restores committed image files into the LOCAL storage bucket and repoints the
 * database at them.
 *
 * Why this exists: `supabase/seed.sql` only restores database ROWS. Storage
 * objects live in the bucket, which `supabase db reset` recreates empty — so an
 * image that exists only locally is lost on every reset and has to be
 * re-uploaded by hand. Anything under `supabase/seed-assets/<bucket>/<path>` is
 * committed to the repo and re-uploaded by this script instead.
 *
 * This is only for images that are NOT recoverable from production. Production
 * catalog images are not committed here (they would be ~40 MB); use
 * `pnpm db:localize-images` for those, which copies them down from prod.
 *
 * Runs as part of `pnpm db:bootstrap`. Unlike db:localize-images it touches
 * nothing outside the local machine, so it is safe in CI.
 *
 *     pnpm db:seed-assets
 */
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { sql as raw } from "drizzle-orm";
import { db, client } from "../db";
import { uploadFile } from "../lib/storage";
import config from "../app/config";

const ASSETS_ROOT = join(process.cwd(), "supabase", "seed-assets");

const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", gif: "image/gif", avif: "image/avif",
};

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function main() {
  if (!/127\.0\.0\.1|localhost/.test(config.DATABASE_URL)) {
    throw new Error(
      "Refusing to run against a non-local database — this rewrites image URLs " +
        "to http://127.0.0.1 and would corrupt a remote catalog.",
    );
  }

  if (!existsSync(ASSETS_ROOT)) {
    console.log("No supabase/seed-assets directory — nothing to restore.");
    return;
  }

  const files = await walk(ASSETS_ROOT);
  if (files.length === 0) {
    console.log("supabase/seed-assets is empty — nothing to restore.");
    return;
  }

  let uploaded = 0;
  let repointed = 0;

  for (const file of files) {
    // <assets>/<bucket>/<path...>
    const rel = relative(ASSETS_ROOT, file).split(sep);
    const bucket = rel[0];
    const path = rel.slice(1).join("/");
    if (!bucket || rel.length < 2) continue;

    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const buf = await readFile(file);
    const url = await uploadFile(bucket, path, buf, MIME[ext] ?? "application/octet-stream");
    uploaded++;

    // Repoint by ID from the storage path rather than by filename: a re-upload
    // in a different format changes the extension (cover.jpg -> cover.png) but
    // never the owning row's id.
    const cat = path.match(/^categories\/([0-9a-f-]{36})\//i);
    const prod = path.match(/^products\/([0-9a-f-]{36})\/(.+)$/i);

    if (cat) {
      const res = await db.execute(
        raw`update categories set image_url = ${url} where id = ${cat[1]}::uuid`,
      );
      repointed += res.count ?? 0;
    } else if (prod) {
      const res = await db.execute(
        raw`update product_images set url = ${url} where url like ${"%products/" + prod[1] + "/" + prod[2] + "%"}`,
      );
      repointed += res.count ?? 0;
    }

    console.log(`  ok  ${bucket}/${path} (${Math.round(buf.length / 1024)} KB)`);
  }

  console.log(`\nUploaded ${uploaded} asset(s); repointed ${repointed} database row(s).`);
}

// Close the pool and let Node exit on its own. Calling process.exit() while
// postgres-js still holds open handles trips a libuv assertion on Windows
// (`!(handle->flags & UV_HANDLE_CLOSING)`) and the process dies with
// STATUS_STACK_BUFFER_OVERRUN — after the work has already succeeded, which
// would fail `pnpm db:bootstrap` (and CI) for no real reason.
main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
