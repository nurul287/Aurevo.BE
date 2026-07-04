import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors";
import { config } from "../config";
import { zodFieldErrors } from "./validateRequest";

export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("[Error]", err.message, err.stack);

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

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: config.NODE_ENV === "development" ? err.message : "Internal server error",
    },
  });
};
