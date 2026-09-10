const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Subscription = require('../models/Subscription');

/**
 * @route   GET /api/notifications/vapid-public-key
 * @desc    Get VAPID public key for push subscriptions
 * @access  Public
 */
router.get('/vapid-public-key', (req, res) => {
  const vapidKeys = req.app.get('vapidKeys');
  if (!vapidKeys || !vapidKeys.publicKey) {
    return res.status(500).json({
      success: false,
      error: 'VAPID keys not configured on server.',
    });
  }
  res.json({
    success: true,
    publicKey: vapidKeys.publicKey,
  });
});

/**
 * @route   POST /api/notifications/subscribe
 * @desc    Create or update subscription with course and year tags
 * @access  Public
 */
router.post(
  '/subscribe',
  [
    body('subscription').notEmpty().withMessage('Subscription object is required.'),
    body('subscription.endpoint').notEmpty().withMessage('Subscription endpoint is required.'),
    body('subscription.keys.p256dh').notEmpty().withMessage('Subscription p256dh key is required.'),
    body('subscription.keys.auth').notEmpty().withMessage('Subscription auth key is required.'),
    body('courses').isArray().withMessage('courses must be an array.'),
    body('years').isArray().withMessage('years must be an array.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    try {
      const { subscription, courses, years } = req.body;
      const { endpoint, keys } = subscription;

      const formattedCourses = courses.map(c => String(c).trim().toUpperCase());
      const formattedYears = years.map(y => String(y).trim().toUpperCase());

      // Update if endpoint exists, otherwise insert
      const updatedSub = await Subscription.findOneAndUpdate(
        { endpoint },
        {
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
          courses: formattedCourses.length > 0 ? formattedCourses : ['ALL'],
          years: formattedYears.length > 0 ? formattedYears : ['ALL'],
        },
        { new: true, upsert: true }
      );

      res.status(200).json({
        success: true,
        message: 'Subscribed successfully for push notifications.',
        data: updatedSub,
      });
    } catch (error) {
      console.error('[Notification Subscribe Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server error while registering subscription.',
      });
    }
  }
);

/**
 * @route   POST /api/notifications/unsubscribe
 * @desc    Remove push notification subscription
 * @access  Public
 */
router.post(
  '/unsubscribe',
  [body('endpoint').notEmpty().withMessage('Subscription endpoint is required.')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    try {
      const { endpoint } = req.body;
      const deleted = await Subscription.findOneAndDelete({ endpoint });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found.',
        });
      }

      res.json({
        success: true,
        message: 'Unsubscribed successfully.',
      });
    } catch (error) {
      console.error('[Notification Unsubscribe Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server error while removing subscription.',
      });
    }
  }
);

module.exports = router;
