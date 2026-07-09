import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../app/config";
import * as schema from "./schema";

const isProduction = config.NODE_ENV === "production";

/** Raw postgres client — exported so the server can close it on shutdown. */
export const client = postgres(config.DATABASE_URL, {
  max: 10,
  ssl: isProduction ? "require" : false,
});

export const db = drizzle(client, { schema });

export type DB = typeof db;
