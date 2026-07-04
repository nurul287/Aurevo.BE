// Force IPv4 DNS resolution — Railway doesn't support IPv6
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import app from "./app";
import { config } from "./app/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

const PORT = parseInt(config.PORT, 10);

app.listen(PORT, async () => {
  console.log(`
Aurevo Backend — ${config.NODE_ENV}
Server   : http://localhost:${PORT}
API Docs : http://localhost:${PORT}/api/docs
Health   : http://localhost:${PORT}/health
  `);

  try {
    await db.execute(sql`SELECT 1`);
    console.log("[DB] Connection OK");
  } catch (err) {
    console.error("[DB] Connection FAILED:", err);
  }
});



