const { createClient } = require('redis');

let redisClient = null;
let isRedisConnected = false;

const initRedis = async () => {
  if (process.env.REDIS_URL) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (err) => console.error('[Redis Error]:', err.message));
    redisClient.on('connect', () => console.log('[Redis Connected]: Cache enabled'));

    try {
      await redisClient.connect();
      isRedisConnected = true;
    } catch (err) {
      console.warn('[Redis] Failed to connect. Running without cache.');
    }
  } else {
    console.log('[Redis] No REDIS_URL provided in .env. Skipping Redis cache.');
  }
};

const getRedisClient = () => redisClient;
const isCacheReady = () => isRedisConnected && redisClient;

module.exports = {
  initRedis,
  getRedisClient,
  isCacheReady,
};
