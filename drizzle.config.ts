declare const process: any;
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Same precedence as src/app/config/index.ts: .env.local wins, .env is the
// fallback. Without this, `pnpm db:migrate` fails with "url: undefined" unless
// the caller exports DATABASE_URL by hand.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

export default defineConfig({
  // schema.ts is now hand-authored and is the source of truth. Never run
  // `drizzle-kit introspect` against it — introspect drops RLS predicates
  // (see the policy notes in schema.ts) and would silently turn owner-scoped
  // policies into allow-all. Never run `drizzle-kit push` either: it bypasses
  // the migration files entirely.
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Only manage the public schema — auth/storage/realtime belong to Supabase.
  schemaFilter: ["public"],
  // Without this, drizzle-kit tries to CREATE/DROP the authenticated, anon and
  // service_role roles that Supabase owns.
  entities: { roles: { provider: "supabase" } },
});
