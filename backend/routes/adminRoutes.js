const express = require('express');
const router = express.Router();
const { clerkClient } = require('@clerk/express');
const { authRateLimiter } = require('../middleware/rateLimiter');

const crypto = require('crypto');

const { body, param, validationResult } = require('express-validator');
const { verifyCaptcha } = require('../utils/captchaHelper');

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
 * @route   POST /api/admin/verify-login
 * @desc    Validate Super-Admin Secret along with Captcha challenge
 * @access  Protected by authRateLimiter
 */
router.post(
  '/verify-login',
  authRateLimiter,
  [
    body('adminSecret').isString().notEmpty().withMessage('Admin Secret is required.'),
    body('captchaText').isString().notEmpty().withMessage('Captcha response is required.'),
    body('captchaToken').isString().notEmpty().withMessage('Captcha token is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const { adminSecret, captchaText, captchaToken } = req.body;

    // 1. First verify Captcha
    const captchaResult = verifyCaptcha(captchaText, captchaToken);
    if (!captchaResult.valid) {
      return res.status(400).json({
        success: false,
        error: captchaResult.error || 'Invalid or expired captcha. Please refresh and try again.',
      });
    }

    // 2. Then verify Admin Secret
    const expectedSecret = process.env.ADMIN_SECRET || (process.env.NODE_ENV === 'production' ? null : 'super_secret_admin_approval_key_123');
    if (!expectedSecret) {
      return res.status(500).json({
        success: false,
        error: 'Server Misconfiguration: ADMIN_SECRET environment variable is not set.',
      });
    }

    const inputBuf = Buffer.from(adminSecret);
    const expectedBuf = Buffer.from(expectedSecret);

    if (inputBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(inputBuf, expectedBuf)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid Admin Secret key.',
      });
    }

    return res.json({
      success: true,
      message: 'Super-Admin authentication successful.',
    });
  }
);

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

/**
 * @route   DELETE /api/admin/announcements/:id
 * @desc    Super-admin route to permanently delete any misleading or policy-violating notice
 * @access  Protected by ADMIN_SECRET header
 */
router.delete(
  '/announcements/:id',
  authRateLimiter,
  [param('id').isMongoId().withMessage('Invalid Announcement ID format.')],
  async (req, res) => {
    // Validate request input BEFORE touching database
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    try {
      if (!verifyAdminSecret(req, res)) return;

      const Announcement = require('../models/Announcement');
      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          error: 'Announcement not found.',
        });
      }

      await announcement.deleteOne();
      console.log(`[DELETE /api/admin/announcements/:id] Super-admin deleted notice: ${req.params.id} ("${announcement.title}")`);

      res.json({
        success: true,
        message: `Announcement "${announcement.title}" was permanently removed by Super-Admin.`,
        deletedId: req.params.id,
      });
    } catch (error) {
      console.error('[DELETE /api/admin/announcements/:id Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error deleting announcement: ' + error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/admin/announcements/:id
 * @desc    Super-admin: edit any announcement (content / title correction)
 * @access  Protected by ADMIN_SECRET header
 */
router.put(
  '/announcements/:id',
  authRateLimiter,
  [
    param('id').isMongoId().withMessage('Invalid Announcement ID format.'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.'),
    body('content').optional(),
    body('isPinned').optional().isBoolean(),
    body('status').optional().isIn(['DRAFT', 'PUBLISHED']).withMessage('status must be DRAFT or PUBLISHED.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array().map((e) => e.msg) });
    }
    try {
      if (!verifyAdminSecret(req, res)) return;
      const Announcement = require('../models/Announcement');
      const announcement = await Announcement.findById(req.params.id);
      if (!announcement) {
        return res.status(404).json({ success: false, error: 'Announcement not found.' });
      }
      const sanitizeHtml = require('sanitize-html');
      const { title, content, isPinned, status } = req.body;
      if (title !== undefined) announcement.title = title;
      if (content !== undefined) announcement.content = sanitizeHtml(String(content), {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'code', 'pre', 'h1', 'h2', 'h3', 'blockquote', 'u', 's'],
        allowedAttributes: { a: ['href', 'target', 'rel'], '*': ['style', 'class'] },
        allowedSchemes: ['http', 'https', 'mailto'],
      });
      if (isPinned !== undefined) announcement.isPinned = Boolean(isPinned);
      if (status !== undefined) announcement.status = status;
      await announcement.save();
      console.log(`[PUT /api/admin/announcements/:id] Super-admin edited: "${announcement.title}"`);
      res.json({ success: true, message: 'Announcement updated by Super-Admin.', data: announcement });
    } catch (error) {
      console.error('[PUT /api/admin/announcements/:id Error]:', error.message);
      res.status(500).json({ success: false, error: 'Error updating: ' + error.message });
    }
  }
);

/**
 * @route   POST /api/admin/courses
 * @desc    Super-admin: add a new course
 * @access  Protected by ADMIN_SECRET header
 */
router.post(
  '/courses',
  authRateLimiter,
  [
    body('code').trim().notEmpty().withMessage('Course code is required.'),
    body('name').trim().notEmpty().withMessage('Course name is required.'),
    body('stream').trim().notEmpty().withMessage('Stream is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array().map((e) => e.msg) });
    try {
      if (!verifyAdminSecret(req, res)) return;
      const Course = require('../models/Course');
      const { code, name, stream } = req.body;
      const existing = await Course.findOne({ code: code.trim().toUpperCase() });
      if (existing) return res.status(409).json({ success: false, error: `Course "${code.toUpperCase()}" already exists.` });
      const course = await Course.create({ code: code.trim().toUpperCase(), name: name.trim(), stream: stream.trim() });
      res.status(201).json({ success: true, message: 'Course added.', data: course });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error adding course: ' + error.message });
    }
  }
);

/**
 * @route   DELETE /api/admin/courses/:code
 * @desc    Super-admin: remove a course by code
 * @access  Protected by ADMIN_SECRET header
 */
router.delete(
  '/courses/:code',
  authRateLimiter,
  [param('code').trim().notEmpty().withMessage('Course code is required.')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array().map((e) => e.msg) });
    try {
      if (!verifyAdminSecret(req, res)) return;
      const Course = require('../models/Course');
      const deleted = await Course.findOneAndDelete({ code: req.params.code.toUpperCase() });
      if (!deleted) return res.status(404).json({ success: false, error: 'Course not found.' });
      res.json({ success: true, message: `Course "${deleted.code}" removed.` });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error removing course: ' + error.message });
    }
  }
);

/**
 * @route   POST /api/admin/broadcast-emergency
 * @desc    Super-admin broadcasts an emergency alert to all subscribers (bypasses HOD)
 * @access  Protected by ADMIN_SECRET header
 */
router.post(
  '/broadcast-emergency',
  authRateLimiter,
  [
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('content').trim().notEmpty().withMessage('Content is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array().map((e) => e.msg) });
    try {
      if (!verifyAdminSecret(req, res)) return;
      const sanitizeHtml = require('sanitize-html');
      const Announcement = require('../models/Announcement');
      const cleanContent = sanitizeHtml(String(req.body.content), {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'li'],
        allowedAttributes: {},
      });
      const emergency = await Announcement.create({
        title: req.body.title,
        content: cleanContent,
        courseCodes: ['ALL'],
        postedBy: 'super-admin',
        postedByName: 'Super Admin',
        postedByEmail: '',
        isPinned: true,
        isEmergency: true,
        type: 'EMERGENCY',
        status: 'PUBLISHED',
        targetYears: ['FY', 'SY', 'TY'],
      });
      const { triggerPushNotifications } = require('../utils/notificationDispatcher');
      triggerPushNotifications(emergency, req.app.get('vapidKeys')).catch((err) =>
        console.error('[Emergency Broadcast Push Error]:', err.message)
      );
      console.log(`[POST /api/admin/broadcast-emergency] Broadcast: "${req.body.title}"`);
      res.status(201).json({ success: true, message: 'Emergency alert broadcast successfully.', data: emergency });
    } catch (error) {
      console.error('[POST /api/admin/broadcast-emergency Error]:', error.message);
      res.status(500).json({ success: false, error: 'Error broadcasting emergency: ' + error.message });
    }
  }
);

module.exports = router;
