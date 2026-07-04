import rateLimit from "express-rate-limit";

const rateLimitResponse = (code: string, message: string) => ({
  success: false,
  error: { code, message },
});

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
} as const;

export const publicLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: rateLimitResponse("RATE_LIMIT", "Too many requests, please try again later"),
});

export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: rateLimitResponse("RATE_LIMIT", "Too many auth requests, please try again later"),
});

export const chatLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  max: 10,
  message: rateLimitResponse("RATE_LIMIT", "Too many chat requests, please slow down"),
});

export const uploadLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  max: 20,
  message: rateLimitResponse("RATE_LIMIT", "Too many upload requests"),
});

export const strictLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  max: 5,
  message: rateLimitResponse("RATE_LIMIT", "Rate limit exceeded"),
});
