import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../app/config";
import * as schema from "./schema";

const client = postgres(config.DATABASE_URL, { max: 10 });

export const db = drizzle(client, { schema });

export type DB = typeof db;
