import { Worker, type Job } from "bullmq";
import { IMPORT_QUEUE_NAME, createQueueConnection, type ImportJobPayload } from "../lib/queue";
import { logger } from "../lib/logger";
import { runImportJob } from "../app/modules/imports/imports.worker-logic";

// Process entrypoint only — the actual row/job processing logic lives in
// imports.worker-logic.ts so it can be unit tested without constructing a
// real BullMQ Worker (instantiating one connects to Redis and starts polling
// immediately, which a test import must never trigger as a side effect).

export const importWorker = new Worker<ImportJobPayload>(
  IMPORT_QUEUE_NAME,
  async (job: Job<ImportJobPayload>) => {
    await runImportJob(job.data.jobId);
  },
  { connection: createQueueConnection(), concurrency: 2 },
);

importWorker.on("failed", (job, err) => {
  logger.error({ err, jobId: job?.data.jobId }, "Import worker: job failed at the BullMQ level (row-level errors are recorded per-row regardless)");
});

importWorker.on("error", (err) => {
  logger.error({ err }, "Import worker: connection error");
});

logger.info(`Import worker started, listening on queue "${IMPORT_QUEUE_NAME}"`);

async function shutdown(signal: string) {
  logger.info({ signal }, "Import worker: shutting down");
  await importWorker.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
