const mongoose = require('mongoose');
const dns = require('dns');

// Force DNS resolution via Google Public DNS to prevent querySrv ECONNREFUSED on Windows ISP/router networks
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('[DNS Config Warning]: Unable to set custom DNS servers:', e.message);
}

let connectionPromise = null;

const connectDB = async (uri) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/gsc_announcements';
      
      // Enable Zstd compression for high-speed, low-bandwidth DB communication
      const conn = await mongoose.connect(mongoUri, {
        compressors: ['zstd', 'zlib'], // zstd is fastest; zlib is fallback
        serverSelectionTimeoutMS: 15000,
      });
      
      console.log(`[MongoDB Connected]: ${conn.connection.host} (Compression Active)`);
      const { ensureCoursesExist } = require('../utils/ensureCourses');
      await ensureCoursesExist();
      return conn;
    } catch (error) {
      connectionPromise = null;
      console.error(`[MongoDB Connection Error]: ${error.message}`);
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
      throw error;
    }
  })();

  return connectionPromise;
};

module.exports = connectDB;

