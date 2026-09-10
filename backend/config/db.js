const mongoose = require('mongoose');
const dns = require('dns');

// Force DNS resolution via Google Public DNS to prevent querySrv ECONNREFUSED on Windows ISP/router networks
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('[DNS Config Warning]: Unable to set custom DNS servers:', e.message);
}

const connectDB = async (uri) => {
  try {
    const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/gsc_announcements';
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
    const { ensureCoursesExist } = require('../utils/ensureCourses');
    await ensureCoursesExist();
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
