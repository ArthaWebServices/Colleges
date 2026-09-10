const express = require('express');
const cors = require('cors');
require('dotenv').config();
const helmet = require('helmet');
const { clerkMiddleware } = require('@clerk/express');
const connectDB = require('./config/db');
const { apiRateLimiter } = require('./middleware/rateLimiter');

const courseRoutes = require('./routes/courseRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Load or auto-generate VAPID keys for push notifications
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const { generateVapidKeys } = require('./utils/webPushHelper');

let VAPID_KEYS = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

if (!VAPID_KEYS.publicKey || !VAPID_KEYS.privateKey) {
  const keysPath = path.join(__dirname, 'vapid-keys.json');
  if (fs.existsSync(keysPath)) {
    try {
      VAPID_KEYS = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    } catch (err) {
      console.error('[VAPID] Error reading persisted keys:', err.message);
    }
  }

  if (!VAPID_KEYS.publicKey || !VAPID_KEYS.privateKey) {
    console.log('[VAPID] Generating new VAPID keys...');
    VAPID_KEYS = generateVapidKeys();
    try {
      fs.writeFileSync(keysPath, JSON.stringify(VAPID_KEYS, null, 2), 'utf8');
      console.log('[VAPID] VAPID keys persisted to vapid-keys.json');
    } catch (err) {
      console.error('[VAPID] Error persisting keys:', err.message);
    }
  }
}

// Configure web-push globally with VAPID credentials
webpush.setVapidDetails(
  'mailto:admin@gsc.edu',
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);
console.log('[VAPID] Web Push configured with VAPID public key:', VAPID_KEYS.publicKey.substring(0, 20) + '...');

app.set('vapidKeys', VAPID_KEYS);

// Disable X-Powered-By header for security obfuscation
app.disable('x-powered-by');

// Enable Helmet HTTP Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for API server so static assets/cross-origin calls function smoothly
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : true;

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Express Body Parsers with DoS-prevention payload size limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Attach Clerk authentication context middleware
app.use(clerkMiddleware());

// Apply global rate limiting to API routes (DDoS protection)
app.use('/api', apiRateLimiter);

// Routes
app.use('/api/courses', courseRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Ghanshyamdas Saraf College Announcement Portal API is running cleanly.',
    timestamp: new Date(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'API Endpoint not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Express Error Handler]:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Start Server if called directly
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  connectDB().then(async () => {
    const { ensureCoursesExist } = require('./utils/ensureCourses');
    await ensureCoursesExist();

    app.listen(PORT, () => {
      console.log(`[Server Running]: http://localhost:${PORT}`);

      // ──────────────────────────────────────────────────────────────
      // Keep-alive self-ping (prevents Render free tier spin-down)
      // Pings /api/health every 5 minutes
      // ──────────────────────────────────────────────────────────────
      const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://announcement-portal-backend.onrender.com';
      const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

      const keepAlive = () => {
        const url = new URL('/api/health', RENDER_URL);
        const client = url.protocol === 'https:' ? require('https') : require('http');
        client.get(url.toString(), (res) => {
          console.log(`[Keep-Alive] ✅ Self-ping successful: ${res.statusCode}`);
        }).on('error', (err) => {
          console.error(`[Keep-Alive] ❌ Self-ping failed: ${err.message}`);
        });
      };

      // Trigger immediate initial ping on server startup
      keepAlive();
      setInterval(keepAlive, PING_INTERVAL_MS);
      console.log(`[Keep-Alive] 🔁 Self-ping started → ${RENDER_URL}/api/health (every 5 min)`);
    });
  });
}

module.exports = app;
