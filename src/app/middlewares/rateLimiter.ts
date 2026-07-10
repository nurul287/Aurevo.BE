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

// Cart writes (add/update/remove) are routine shopper actions, not brute-force
// targets like login/register — authLimiter's 20-per-15-min was throttling
// normal browsing (e.g. adding several items back-to-back).
export const cartLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  max: 60,
  message: rateLimitResponse("RATE_LIMIT", "Too many cart requests, please slow down"),
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
