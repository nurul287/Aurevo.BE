import { sql } from "drizzle-orm";
import { initSentry } from "./lib/sentry";
// Sentry must initialize before the app (and its routes) are loaded
initSentry();

import app from "./app";
import { config } from "./app/config";
import { client, db } from "./db";
import { logger } from "./lib/logger";

const PORT = parseInt(config.PORT, 10);

async function start() {
  // Fail fast: a server that cannot reach its database should not report
  // itself as started — Railway will restart it and keep the old deploy live.
  try {
    await db.execute(sql`SELECT 1`);
    logger.info("[DB] connection OK");
  } catch (err) {
    logger.fatal({ err }, "[DB] connection FAILED — exiting");
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    logger.info(
      `Aurevo Backend (${config.NODE_ENV}) listening on http://localhost:${PORT} — docs at /api/docs`,
    );
  });

  // Graceful shutdown: stop accepting connections, let in-flight requests
  // finish, then close the DB pool. Force-exit if that takes too long.
  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down`);

    const forceExit = setTimeout(() => {
      logger.error("Shutdown timed out — forcing exit");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      try {
        await client.end({ timeout: 5 });
        logger.info("Shutdown complete");
        process.exit(0);
      } catch (err) {
        logger.error({ err }, "Error closing DB pool");
        process.exit(1);
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

void start();
