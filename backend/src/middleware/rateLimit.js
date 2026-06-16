import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

export const loginRateLimiter = rateLimit({
  windowMs: config.security.loginRateLimitWindowMs,
  max: config.security.loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
