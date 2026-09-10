const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Rate limiter for auth / sensitive routes
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth/admin requests per windowMs
  message: {
    success: false,
    error: 'Too many login/signup attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    const adminSecretHeader = req.headers['x-admin-secret'];
    const expectedSecret = process.env.ADMIN_SECRET || (process.env.NODE_ENV === 'production' ? null : 'super_secret_admin_approval_key_123');
    
    if (adminSecretHeader && expectedSecret) {
      try {
        const headerBuf = Buffer.from(String(adminSecretHeader));
        const expectedBuf = Buffer.from(String(expectedSecret));
        if (headerBuf.length === expectedBuf.length && crypto.timingSafeEqual(headerBuf, expectedBuf)) {
          return true; // Bypass rate limit for valid super admin
        }
      } catch (err) {
        return false;
      }
    }
    return false;
  }
});

// General API rate limiter
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authRateLimiter,
  apiRateLimiter,
};
