import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../app/config";
import { logger } from "./logger";

export const IMPORT_QUEUE_NAME = "product-import";

/**
 * Shared connection factory for both the Queue side (here) and the Worker
 * side (workers/import.worker.ts — a separate process, needs its own
 * connection instance, never share one across Queue/Worker).
 *
 * lazyConnect: true means constructing this (and the Queue below) never
 * attempts a TCP connection — only the first real command does. That
 * matters because this module gets imported by the API server on every
 * boot (to enqueue jobs) and by the test suite; neither should block or
 * throw just because a local Redis isn't running.
 *
 * maxRetriesPerRequest: null is BullMQ's documented requirement — its
 * blocking commands (used internally by Workers) need unlimited retries,
 * not ioredis's default finite retry count.
 */
export function createQueueConnection(): IORedis {
  const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
  connection.on("error", (err) => logger.error({ err }, "Redis connection error (product-import queue)"));
  return connection;
}

export const importQueue = new Queue(IMPORT_QUEUE_NAME, { connection: createQueueConnection() });

export type ImportJobPayload = { jobId: string };

/**
 * Enqueues a job for the worker process to pick up. The payload is
 * deliberately just the id — all real state (rows, progress, errors) lives
 * in import_jobs/import_rows, not in the Redis job data, so a worker crash
 * or restart mid-import loses nothing (see workers/import.worker.ts).
 */
export async function enqueueImportJob(jobId: string): Promise<void> {
  await importQueue.add("process-import", { jobId } satisfies ImportJobPayload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  });
}
