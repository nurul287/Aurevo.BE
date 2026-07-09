import * as Sentry from "@sentry/node";
import { config } from "../app/config";

/**
 * Error tracking. No-op unless SENTRY_DSN is set (Railway prod) — local dev
 * and CI send nothing.
 */
export function initSentry() {
  if (!config.SENTRY_DSN) return;

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
  });
}

export const sentryEnabled = () => Boolean(config.SENTRY_DSN);

export { Sentry };
