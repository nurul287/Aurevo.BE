import pino, { LoggerOptions } from "pino";
import { config } from "../app/config";
import { getRequestLogContext } from "./request-context";

const SENSITIVE_LOG_FIELDS = [
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "guestToken",
  "apiKey",
  "secret",
  "authorization",
  "cookie",
] as const;

export const LOG_REDACTION_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["x-guest-session"]',
  'res.headers["set-cookie"]',
  ...SENSITIVE_LOG_FIELDS.flatMap((field) => [
    field,
    `*.${field}`,
    `*.*.${field}`,
    `*.*.*.${field}`,
  ]),
];

/**
 * Structured application logger. JSON lines in production (Railway parses
 * them), pretty-printed locally. Import this instead of using console.*.
 */
export const loggerOptions: LoggerOptions = {
  level: config.NODE_ENV === "test" ? "silent" : "info",
  redact: {
    paths: LOG_REDACTION_PATHS,
    censor: "[REDACTED]",
  },
  mixin() {
    return getRequestLogContext() ?? {};
  },
  ...(config.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        },
      }
    : {}),
};

export const logger = pino(loggerOptions);
