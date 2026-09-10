const express = require('express');
const router = express.Router();
const { clerkClient } = require('@clerk/express');
const { authRateLimiter } = require('../middleware/rateLimiter');

const crypto = require('crypto');

const { body, param, validationResult } = require('express-validator');

/**
 * Helper to verify Admin Secret header (Timing-attack resistant)
 */
const verifyAdminSecret = (req, res) => {
  const adminSecretHeader = req.headers['x-admin-secret'];
  const expectedSecret = process.env.ADMIN_SECRET || (process.env.NODE_ENV === 'production' ? null : 'super_secret_admin_approval_key_123');

  if (!expectedSecret) {
    res.status(500).json({
      success: false,
      error: 'Server Misconfiguration: ADMIN_SECRET environment variable is not set.',
    });
    return false;
  }

  if (!adminSecretHeader || typeof adminSecretHeader !== 'string') {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid Admin Secret key.',
    });
    return false;
  }

  const headerBuf = Buffer.from(adminSecretHeader);
  const expectedBuf = Buffer.from(expectedSecret);

  if (headerBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(headerBuf, expectedBuf)) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid Admin Secret key.',
    });
    return false;
  }

  return true;
};

/**
 * @route   GET /api/admin/hods
 * @desc    Fetch all registered HOD accounts from Clerk for Super-Admin review
 * @access  Protected by ADMIN_SECRET header
 */
router.get('/hods', authRateLimiter, async (req, res) => {
  try {
    if (!verifyAdminSecret(req, res)) return;

    if (!clerkClient) {
      return res.status(500).json({
        success: false,
        error: 'Clerk client not initialized.',
      });
    }

    const userListResponse = await clerkClient.users.getUserList();
    const usersList = userListResponse.data || userListResponse;

    const hods = usersList.map((u) => {
      const primaryEmailObj = u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId) || u.emailAddresses?.[0];
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || primaryEmailObj?.emailAddress || 'N/A';

      return {
        id: u.id,
        fullName,
        email: primaryEmailObj?.emailAddress || 'N/A',
        imageUrl: u.imageUrl,
        isApproved: Boolean(u.publicMetadata?.isApproved === true),
        allowedCourses: Array.isArray(u.publicMetadata?.allowedCourses) ? u.publicMetadata.allowedCourses : ['*'],
        createdAt: u.createdAt,
        lastSignInAt: u.lastSignInAt,
      };
    });

    res.json({
      success: true,
      count: hods.length,
      data: hods,
    });
  } catch (error) {
    console.error('[GET /api/admin/hods Error]:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch HOD list: ' + error.message,
    });
  }
});

/**
 * @route   GET /api/admin/announcements
 * @desc    Fetch all notices posted across the college for Super-Admin Audit
 * @access  Protected by ADMIN_SECRET header
 */
router.get('/announcements', authRateLimiter, async (req, res) => {
  try {
    if (!verifyAdminSecret(req, res)) return;

    const Announcement = require('../models/Announcement');
    const announcements = await Announcement.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    console.error('[GET /api/admin/announcements Error]:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch announcements audit list: ' + error.message,
    });
  }
});

/**
 * @route   POST /api/admin/approve-hod
 * @desc    Manual super-admin route to approve or reject an HOD Clerk account
 * @access  Protected by ADMIN_SECRET header
 */
router.post(
  '/approve-hod',
  authRateLimiter,
  [
    body('userId').trim().notEmpty().withMessage('userId is required.'),
    body('isApproved').optional().isBoolean().withMessage('isApproved must be a boolean.'),
  ],
  async (req, res) => {
    // Validate request input BEFORE touching database/Clerk
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    try {
      if (!verifyAdminSecret(req, res)) return;

      const { userId, isApproved = true } = req.body;

      if (!clerkClient) {
        return res.status(500).json({
          success: false,
          error: 'Clerk client not initialized.',
        });
      }

      // Update Clerk user public metadata
      const user = await clerkClient.users.getUser(userId);
      const existingMetadata = user.publicMetadata || {};

      const updatedUser = await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...existingMetadata,
          isApproved: Boolean(isApproved),
        },
      });

      res.json({
        success: true,
        message: `HOD User ${userId} status updated to isApproved: ${Boolean(isApproved)}`,
        user: {
          id: updatedUser.id,
          email: updatedUser.emailAddresses?.[0]?.emailAddress,
          publicMetadata: updatedUser.publicMetadata,
        },
      });
    } catch (error) {
      console.error('[POST /api/admin/approve-hod Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error approving HOD account: ' + error.message,
      });
    }
  }
);

/**
 * @route   POST /api/admin/assign-courses
 * @desc    Super-admin route to assign permitted course codes to an HOD
 * @access  Protected by ADMIN_SECRET header
 */
router.post(
  '/assign-courses',
  authRateLimiter,
  [
    body('userId').trim().notEmpty().withMessage('userId is required.'),
    body('allowedCourses').isArray().withMessage('allowedCourses must be an array of course codes.'),
  ],
  async (req, res) => {
    // Validate request input BEFORE touching database/Clerk
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    try {
      if (!verifyAdminSecret(req, res)) return;

      const { userId, allowedCourses } = req.body;

      if (!clerkClient) {
        return res.status(500).json({
          success: false,
          error: 'Clerk client not initialized.',
        });
      }

      const formattedCourses = allowedCourses.map((c) => String(c).trim().toUpperCase());

      const user = await clerkClient.users.getUser(userId);
      const existingMetadata = user.publicMetadata || {};

      const updatedUser = await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...existingMetadata,
          allowedCourses: formattedCourses,
        },
      });

      res.json({
        success: true,
        message: `Updated course permissions for HOD ${userId}`,
        allowedCourses: updatedUser.publicMetadata.allowedCourses,
      });
    } catch (error) {
      console.error('[POST /api/admin/assign-courses Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error assigning course permissions: ' + error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/admin/hods/:userId
 * @desc    Super-admin route to permanently delete a fake or unauthorized HOD account
 * @access  Protected by ADMIN_SECRET header
 */
router.delete(
  '/hods/:userId',
  authRateLimiter,
  [
    param('userId').trim().notEmpty().withMessage('userId parameter is required.'),
    body('deleteNotices').optional().isBoolean().withMessage('deleteNotices must be a boolean.'),
  ],
  async (req, res) => {
    // Validate request input BEFORE touching database/Clerk
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    try {
      if (!verifyAdminSecret(req, res)) return;

      const { userId } = req.params;
      const deleteNotices = req.body?.deleteNotices !== false; // default true

      if (!clerkClient) {
        return res.status(500).json({
          success: false,
          error: 'Clerk client not initialized.',
        });
      }

      // Check if user exists in Clerk
      let targetUser = null;
      try {
        targetUser = await clerkClient.users.getUser(userId);
      } catch (fetchErr) {
        console.warn(`[DELETE /api/admin/hods/:userId] User ${userId} not found in Clerk:`, fetchErr.message);
      }

      // Delete from Clerk
      await clerkClient.users.deleteUser(userId);
      console.log(`[DELETE /api/admin/hods/:userId] Successfully deleted Clerk user: ${userId}`);

      // Delete notices created by this fake/unauthorized user from MongoDB if requested
      let deletedNoticesCount = 0;
      if (deleteNotices) {
        const Announcement = require('../models/Announcement');
        const delResult = await Announcement.deleteMany({ postedBy: userId });
        deletedNoticesCount = delResult.deletedCount || 0;
        console.log(`[DELETE /api/admin/hods/:userId] Cleaned up ${deletedNoticesCount} notice(s) for user: ${userId}`);
      }

      const userName = targetUser
        ? [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || targetUser.emailAddresses?.[0]?.emailAddress || userId
        : userId;

      res.json({
        success: true,
        message: `Account for "${userName}" (${userId}) has been permanently deleted from Clerk.`,
        deletedNoticesCount,
      });
    } catch (error) {
      console.error('[DELETE /api/admin/hods/:userId Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error deleting HOD account: ' + error.message,
      });
    }
  }
);

module.exports = router;
