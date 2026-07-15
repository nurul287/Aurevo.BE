/**
 * Full/backfill ingestion for the RAG knowledge base — embeds every active
 * product plus the policy/FAQ docs in content/policies/. Run after seeding
 * or bulk-editing the catalog, or after adding/editing a policy doc.
 * Day-to-day single-product changes are handled automatically by the
 * fire-and-forget hooks in products.service.ts — this script is for backfill.
 */
import { ingestPolicyDocs, ingestProducts } from "../app/modules/knowledge/knowledge.service";
import { logger } from "../lib/logger";

async function main() {
  logger.info("Ingesting products...");
  const productCount = await ingestProducts();
  logger.info({ productCount }, "Products ingested");

  logger.info("Ingesting policy/FAQ docs...");
  const docChunkCount = await ingestPolicyDocs();
  logger.info({ docChunkCount }, "Policy/FAQ docs ingested");

  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Knowledge ingestion failed");
  process.exit(1);
});
