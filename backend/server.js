const express = require('express');
const cors = require('cors');
require('dotenv').config();
const helmet = require('helmet');
const { clerkMiddleware } = require('@clerk/express');
const connectDB = require('./config/db');
const { initRedis } = require('./config/redis');
const { apiRateLimiter } = require('./middleware/rateLimiter');
const compression = require('compression');
const zlib = require('zlib');

// Initialize database & cache
connectDB();
initRedis();

const courseRoutes = require('./routes/courseRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const captchaRoutes = require('./routes/captchaRoutes');
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

// ─── Compression Middleware (Brotli preferred, gzip fallback) ────────────────
// Skips already-compressed binary formats to avoid wasting CPU.
const SKIP_COMPRESSION_MIME = /^(image|video|audio)\//i;
const SKIP_COMPRESSION_EXT  = /\.(pdf|zip|gz|br|zst|mp4|webm|png|jpg|jpeg|gif|webp|avif|woff2?)$/i;

app.use(
  compression({
    // Only compress responses >= 1 KB
    threshold: 1024,
    // Skip binary/already-compressed content types
    filter: (req, res) => {
      const contentType = res.getHeader('Content-Type') || '';
      const url = req.url || '';
      if (SKIP_COMPRESSION_MIME.test(contentType)) return false;
      if (SKIP_COMPRESSION_EXT.test(url)) return false;
      return compression.filter(req, res);
    },
    // Use Brotli when client advertises it, else gzip
    brotli: {
      enabled: true,
      zlib: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // 0–11 (4 = fast + good ratio)
        },
      },
    },
    level: 6, // gzip level (1=fast, 9=best; 6 is the Node default sweet-spot)
  })
);
// ─────────────────────────────────────────────────────────────────────────────

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''))
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
app.use('/api/captcha', captchaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/documents', require('./routes/documentRoutes'));

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
      // ──────────────────────────────────────────────────────────────
      const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://gsc-announcement-backend.onrender.com';
      const PING_INTERVAL_MS = 5 * 60 * 1000;

      const keepAlive = () => {
        const url = new URL('/api/health', RENDER_URL);
        const client = url.protocol === 'https:' ? require('https') : require('http');
        client.get(url.toString(), (res) => {
          console.log(`[Keep-Alive] ✅ Self-ping successful: ${res.statusCode}`);
        }).on('error', (err) => {
          console.error(`[Keep-Alive] ❌ Self-ping failed: ${err.message}`);
        });
      };

      keepAlive();
      setInterval(keepAlive, PING_INTERVAL_MS);
      console.log(`[Keep-Alive] 🔁 Self-ping started → ${RENDER_URL}/api/health (every 5 min)`);

      // ──────────────────────────────────────────────────────────────
      // Scheduled Publishing Cron — runs every minute
      // Finds DRAFT announcements with publishAt <= now and publishes them
      // ──────────────────────────────────────────────────────────────
      const cron = require('node-cron');
      const Announcement = require('./models/Announcement');
      const { triggerPushNotifications } = require('./utils/notificationDispatcher');

      cron.schedule('* * * * *', async () => {
        try {
          const now = new Date();
          const scheduled = await Announcement.find({
            status: 'DRAFT',
            publishAt: { $lte: now, $ne: null },
          });

          if (scheduled.length === 0) return;

          console.log(`[Scheduler] 📅 Publishing ${scheduled.length} scheduled announcement(s)...`);

          for (const ann of scheduled) {
            ann.status = 'PUBLISHED';
            ann.publishAt = null; // clear the field after publishing
            await ann.save();
            triggerPushNotifications(ann, app.get('vapidKeys')).catch((err) =>
              console.error(`[Scheduler Push Error] ${ann._id}:`, err.message)
            );
            console.log(`[Scheduler] ✅ Published: "${ann.title}" (${ann._id})`);
          }
        } catch (err) {
          console.error('[Scheduler] ❌ Error during scheduled publish check:', err.message);
        }
      });

      console.log('[Scheduler] ⏰ Scheduled publishing cron started (every minute).');
    });
  });
}

module.exports = app;
