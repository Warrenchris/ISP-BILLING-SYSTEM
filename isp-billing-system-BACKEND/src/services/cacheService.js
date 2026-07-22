const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

const DEFAULT_TTL_SECONDS = 3600; // 1 hour default TTL for dashboard analytics

/**
 * Helper to get cached data or compute and cache result.
 * Gracefully degrades to computing live if Redis is unreachable.
 * Bypasses caching in test environments.
 *
 * @param {string} key Cache key
 * @param {Function} computeFn Async function computing the fresh data
 * @param {number} ttlSeconds Time-to-live in seconds (default 3600)
 * @returns {Promise<any>}
 */
async function getOrCompute(key, computeFn, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (process.env.NODE_ENV === 'test') {
    return await computeFn();
  }

  const client = getRedisClient();
  try {
    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn('Cache lookup skipped (fallback to DB)', { key, error: err.message });
  }

  const result = await computeFn();

  try {
    await client.set(key, JSON.stringify(result), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn('Cache store skipped', { key, error: err.message });
  }

  return result;
}

/**
 * Invalidate a specific cache key.
 * @param {string} key
 */
async function invalidateKey(key) {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (err) {
    logger.warn('Cache invalidation skipped', { key, error: err.message });
  }
}

module.exports = {
  getOrCompute,
  invalidateKey,
};
