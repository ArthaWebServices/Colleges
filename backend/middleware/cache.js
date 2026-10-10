const { isCacheReady, getRedisClient } = require('../config/redis');

// Middleware to check cache before processing request
const cacheAnnouncements = async (req, res, next) => {
  if (!isCacheReady()) return next(); // Skip cache if Redis isn't connected

  const cacheKey = `announcements:${req.originalUrl}`;
  
  try {
    const client = getRedisClient();
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      // If we have cached data, return it immediately
      return res.status(200).json(JSON.parse(cachedData));
    }
    
    // Otherwise, we intercept the res.json to cache the output before sending
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Cache for 5 minutes (300 seconds)
      if (body.success) {
        client.setEx(cacheKey, 300, JSON.stringify(body)).catch(console.error);
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error('[Redis Cache Error]:', err.message);
    next(); // Fallback to DB if cache fails
  }
};

// Utility to clear cache when a new announcement is posted/deleted
const clearAnnouncementCache = async () => {
  if (!isCacheReady()) return;
  try {
    const client = getRedisClient();
    const keys = await client.keys('announcements:*');
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (err) {
    console.error('[Redis Cache Clear Error]:', err.message);
  }
};

module.exports = {
  cacheAnnouncements,
  clearAnnouncementCache,
};
