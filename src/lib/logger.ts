import pino from "pino";
import { config } from "../app/config";

/**
 * Structured application logger. JSON lines in production (Railway parses
 * them), pretty-printed locally. Import this instead of using console.*.
 */
export const logger = pino({
  level: config.NODE_ENV === "test" ? "silent" : "info",
  ...(config.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        },
      }
    : {}),
});
