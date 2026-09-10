const webpush = require('web-push');

/**
 * Generate VAPID Key Pair using the web-push library
 */
function generateVapidKeys() {
  const keys = webpush.generateVAPIDKeys();
  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };
}

/**
 * Send Web Push Notification to a subscription endpoint
 * Uses the battle-tested web-push library for RFC 8291 compliance.
 */
async function sendNotification(subscription, payload, vapidKeys) {
  if (
    !subscription ||
    !subscription.endpoint ||
    !subscription.keys ||
    !subscription.keys.p256dh ||
    !subscription.keys.auth
  ) {
    throw new Error('Invalid subscription object');
  }

  // Configure VAPID details for this request
  webpush.setVapidDetails(
    'mailto:admin@gsc.edu',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  const payloadString =
    typeof payload === 'string' ? payload : JSON.stringify(payload);

  // Format subscription in the shape web-push expects
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  try {
    const result = await webpush.sendNotification(pushSubscription, payloadString, {
      TTL: 2419200, // 4 weeks
    });
    return { success: true, statusCode: result.statusCode };
  } catch (err) {
    // web-push throws WebPushError with statusCode for push service rejections
    if (err.statusCode) {
      return {
        success: false,
        statusCode: err.statusCode,
        error: `Push service rejected notification: ${err.body || err.message}`,
      };
    }
    throw err;
  }
}

module.exports = {
  generateVapidKeys,
  sendNotification,
};
