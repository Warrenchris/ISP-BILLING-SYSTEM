const IORedis = require('ioredis');
const logger = require('./logger');

let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    redisClient = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis cache connection notice', { error: err.message });
    });
  }
  return redisClient;
}

module.exports = { getRedisClient };
