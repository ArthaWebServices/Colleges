require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
console.log('[Test] Attempting to connect to:', uri?.replace(/:\/\/.*@/, '://***@'));

mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
    .then(() => {
        console.log('[Test] ✅ MongoDB connection SUCCESS!');
        console.log('[Test] Connected to host:', mongoose.connection.host);
        mongoose.connection.close();
    })
    .catch((err) => {
        console.error('[Test] ❌ MongoDB connection FAILED');
        console.error('[Test] Error name   :', err.name);
        console.error('[Test] Error message:', err.message);
        console.error('[Test] Error code   :', err.code);
        process.exit(1);
    });
