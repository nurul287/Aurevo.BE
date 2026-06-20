import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/db",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Only introspect the public schema — auth schema is managed by Supabase
  schemaFilter: ["public"],
});
