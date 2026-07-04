import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../app/config";
import * as schema from "./schema";

const isProduction = config.NODE_ENV === "production";
const client = postgres(config.DATABASE_URL, {
  max: 10,
  ssl: isProduction ? "require" : false,
  // Supabase pooler (transaction mode) doesn't support prepared statements
  prepare: !isProduction,
});

export const db = drizzle(client, { schema });

export type DB = typeof db;
