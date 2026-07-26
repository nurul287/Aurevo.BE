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
 *
 * retryStrategy caps the reconnect backoff at 30s instead of ioredis's
 * default 2s max, and the error handler only logs once per 30s window —
 * Redis is optional infra for the import feature only, so a dev machine (or
 * a transient prod outage) without it running must not spam the log every
 * 1-2s indefinitely. Still retries forever, so it self-heals the moment
 * Redis comes back; it's just far quieter while it's down.
 */
/** Throttled logger factory — at most one log line per 30s per caller, regardless of how often the underlying event fires. */
export function throttledErrorLogger(label: string): (err: unknown) => void {
  let lastLoggedAt = 0;
  return (err: unknown) => {
    const now = Date.now();
    if (now - lastLoggedAt > 30000) {
      logger.error({ err }, label);
      lastLoggedAt = now;
    }
  };
}

export function createQueueConnection(): IORedis {
  const connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 1000, 30000),
  });
  connection.on("error", throttledErrorLogger("Redis connection error (product-import queue)"));
  return connection;
}

export const importQueue = new Queue(IMPORT_QUEUE_NAME, { connection: createQueueConnection() });

// BullMQ's Queue/Worker/QueueEvents classes re-emit connection errors on
// THEMSELVES (a separate EventEmitter from the underlying ioredis
// connection above) -- per Node's EventEmitter semantics, an 'error' event
// with zero listeners throws instead of just logging. Missing this exact
// listener is what produced raw, unformatted ECONNREFUSED stack traces
// even after the ioredis connection's own error handler (above) was
// already throttled -- BullMQ's docs call this out explicitly as a
// required listener, not an optional one.
importQueue.on("error", throttledErrorLogger("Redis connection error (product-import queue, BullMQ Queue)"));

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
