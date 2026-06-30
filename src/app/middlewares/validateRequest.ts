import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../errors";

/**
 * Converts a ZodError into a flat { fieldName: string[] } map.
 * Strips the top-level "body" / "query" / "params" segment so callers
 * see { "name": ["Required"] } instead of { "body": ["Required", "Required"] }.
 */
export function zodFieldErrors(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    // path = ["body", "name"] → strip first segment → "name"
    // path = ["body", "address", "zip"] → "address.zip"
    const field = issue.path.length > 1
      ? issue.path.slice(1).join(".")
      : issue.path.join(".") || "_root";
    if (!out[field]) out[field] = [];
    out[field].push(issue.message);
  }
  return out;
}

export const validate = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return next(new ValidationError("Validation failed", zodFieldErrors(result.error)));
    }

    // Replace with coerced/parsed values
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.query !== undefined) req.query = result.data.query;
    if (result.data.params !== undefined) req.params = result.data.params;

    next();
  };
};

// Alias for backwards compat
export const validateRequest = validate;
