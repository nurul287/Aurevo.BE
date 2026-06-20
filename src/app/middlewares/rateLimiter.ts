import rateLimit from "express-rate-limit";

const rateLimitResponse = (code: string, message: string) => ({
  success: false,
  error: { code, message },
});

export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse("RATE_LIMIT", "Too many requests, please try again later"),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse("RATE_LIMIT", "Too many auth requests, please try again later"),
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse("RATE_LIMIT", "Too many chat requests, please slow down"),
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse("RATE_LIMIT", "Too many upload requests"),
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse("RATE_LIMIT", "Rate limit exceeded"),
});
