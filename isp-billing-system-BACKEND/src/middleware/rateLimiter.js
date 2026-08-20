/**
 * rateLimiter.js - Route-Specific Rate Limiters for Abuse Prevention
 */

const rateLimit = require('express-rate-limit');

// In test environment, use permissive limits to avoid breaking automated test suites
const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Strict rate limiter for login and registration to stop credential stuffing & brute-force
 * 10 requests per 15 minutes per IP in production
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 1000 : 15, // 15 attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login or registration attempts. Please try again in 15 minutes.'
  }
});

/**
 * Strict rate limiter for password reset requests
 * 5 requests per 15 minutes per IP in production
 */
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 1000 : 5, // 5 attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again in 15 minutes.'
  }
});

/**
 * Voucher redemption abuse limiter
 * 20 requests per 15 minutes per IP
 */
const voucherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many voucher redemption attempts. Please try again later.'
  }
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  voucherLimiter
};
