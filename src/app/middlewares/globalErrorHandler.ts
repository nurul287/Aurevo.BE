import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors";
import { config } from "../config";
import { logger } from "../../lib/logger";
import { Sentry, sentryEnabled } from "../../lib/sentry";
import { zodFieldErrors } from "./validateRequest";

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(
    { err, cause: (err as NodeJS.ErrnoException).cause, method: req.method, path: req.path },
    err.message,
  );

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: zodFieldErrors(err),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Postgres unique violation — the check-then-insert uniqueness guards
  // (slug, SKU) are racy; when two requests slip through simultaneously the
  // DB constraint fires. Surface it as a conflict, not a 500.
  const pgCode =
    (err as { code?: string }).code ??
    ((err as { cause?: { code?: string } }).cause?.code);
  if (pgCode === "23505") {
    res.status(409).json({
      success: false,
      error: {
        code: "CONFLICT",
        message: "A record with this value already exists",
      },
    });
    return;
  }

  // Only unexpected errors reach this point — expected business/validation
  // errors returned above must not pollute the error tracker.
  if (sentryEnabled()) {
    Sentry.captureException(err, {
      extra: { method: req.method, path: req.path },
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: config.NODE_ENV === "development" ? err.message : "Internal server error",
    },
  });
};
