import rateLimit from "express-rate-limit";

/**
 * Global rate limiter — applies to all routes.
 * 100 requests per 15-minute window per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: "draft-8", // RateLimit-* headers (IETF draft)
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    status: 429,
    error: "Too many requests, please try again later.",
  },
});

/**
 * Strict rate limiter — for sensitive/auth-related endpoints.
 * 10 requests per 15-minute window per IP.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too many attempts, please try again after 15 minutes.",
  },
});
