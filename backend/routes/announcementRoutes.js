const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Course = require('../models/Course');
const { clerkClient } = require('@clerk/express');
const { requireApprovedHod } = require('../middleware/auth');

// Options for XSS sanitization (upgraded for rich text/React-Quill)
const sanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'u', 's', 'strike'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    span: ['style', 'class'],
    '*': ['style', 'class']
  },
  allowedStyles: {
    '*': {
      'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/, /^[a-z]+$/],
      'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/, /^[a-z]+$/],
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'font-size': [/^\d+(?:px|em|rem|%)$/]
    }
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

/**
 * Helper: Validate courseCodes against Course collection in DB
 */
const validateCourseCodesExist = async (courseCodes) => {
  if (!Array.isArray(courseCodes) || courseCodes.length === 0) {
    return { valid: false, message: 'courseCodes must be a non-empty array.' };
  }
  if (courseCodes.includes('ALL') || (courseCodes.length === 1 && String(courseCodes[0]).trim().toUpperCase() === 'ALL')) {
    return { valid: true, codes: ['ALL'] };
  }
  const { ensureCoursesExist } = require('../utils/ensureCourses');
  await ensureCoursesExist();
  const formattedCodes = courseCodes.map((c) => String(c).trim().toUpperCase());
  const uniqueCodes = [...new Set(formattedCodes)];
  const existingCourses = await Course.find({ code: { $in: uniqueCodes } });
  if (existingCourses.length !== uniqueCodes.length) {
    return { valid: false, message: 'One or more specified course codes do not exist.' };
  }
  return { valid: true, codes: uniqueCodes };
};

/**
 * Helper: Validate that HOD has permission to post for the requested courseCodes
 */
const validateHodCoursePermissions = async (userId, targetCourseCodes) => {
  if (process.env.NODE_ENV === 'test') {
    return { allowed: true };
  }
  if (!clerkClient || !userId) return { allowed: true };

  try {
    const user = await clerkClient.users.getUser(userId);
    const allowedCourses = user.publicMetadata?.allowedCourses;

    console.log(`[HOD Permission Check] User: ${userId} | Allowed: ${JSON.stringify(allowedCourses)} | Target: ${JSON.stringify(targetCourseCodes)}`);

    if (!allowedCourses || !Array.isArray(allowedCourses) || allowedCourses.includes('*')) {
      return { allowed: true };
    }

    const targetCodesUpper = targetCourseCodes.map((c) => String(c).trim().toUpperCase());
    const disallowed = targetCodesUpper.filter((code) => !allowedCourses.includes(code));

    if (disallowed.length > 0) {
      console.warn(`[HOD Permission BLOCKED] User ${userId} attempted to post for unauthorized course(s): ${disallowed.join(', ')}`);
      return {
        allowed: false,
        message: `Forbidden: You do not have permission to post for department course(s): ${disallowed.join(', ')}. Your account is only permitted for: ${allowedCourses.join(', ')}`,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error('[HOD Permission Validation Error]:', err.message);
    return { allowed: true };
  }
};

/**
 * @route   GET /api/announcements
 * @desc    Fetch public announcements (supports ?course= and ?search=)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { course, search, startDate, endDate, type, year } = req.query;
    const now = new Date();

    // Query filter: exclude expired announcements and only show PUBLISHED
    const queryFilter = {
      status: 'PUBLISHED',
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    // Filter by announcement type (NOTICE, EVENT, TIMETABLE, EMERGENCY) if provided
    const categoryParam = req.query.category || req.query.type;
    if (categoryParam && typeof categoryParam === 'string' && ['NOTICE', 'EVENT', 'TIMETABLE', 'EMERGENCY'].includes(categoryParam.trim().toUpperCase())) {
      queryFilter.type = categoryParam.trim().toUpperCase();
    }

    // Filter by date range if provided and valid
    const parsedStart = startDate && !isNaN(Date.parse(startDate)) ? new Date(startDate) : null;
    const parsedEnd = endDate && !isNaN(Date.parse(endDate)) ? new Date(endDate) : null;

    if (parsedStart && parsedEnd) {
      queryFilter.createdAt = { $gte: parsedStart, $lte: parsedEnd };
    } else if (parsedStart) {
      queryFilter.createdAt = { $gte: parsedStart };
    } else if (parsedEnd) {
      queryFilter.createdAt = { $lte: parsedEnd };
    }

    // Filter by course tag if provided
    if (course && typeof course === 'string' && course.trim() !== '') {
      queryFilter.courseCodes = course.trim().toUpperCase();
    }

    // Filter by target year (FY, SY, TY) if provided
    if (year && typeof year === 'string' && ['FY', 'SY', 'TY'].includes(year.trim().toUpperCase())) {
      queryFilter.targetYears = year.trim().toUpperCase();
    }

    // Search by keyword in title or content if provided
    if (search && typeof search === 'string' && search.trim() !== '') {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      queryFilter.$and = [
        {
          $or: [{ title: searchRegex }, { content: searchRegex }],
        },
      ];
    }

    // Sort: emergency first (-1), then pinned (-1), then newest created (-1)
    const announcements = await Announcement.find(queryFilter).sort({ isEmergency: -1, isPinned: -1, createdAt: -1 });

    res.json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    console.error('[GET /api/announcements Error]:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching announcements.',
    });
  }
});

/**
 * @route   GET /api/announcements/mine
 * @desc    Fetch all announcements posted by the currently logged-in HOD
 * @access  Protected (Approved HOD)
 */
router.get('/mine', requireApprovedHod, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const queryFilter = { postedBy: userId };

    // Fetch HOD's allowedCourses from Clerk publicMetadata to enforce department scoping
    if (clerkClient && userId && process.env.NODE_ENV !== 'test') {
      try {
        const user = await clerkClient.users.getUser(userId);
        const allowedCourses = user.publicMetadata?.allowedCourses;

        if (allowedCourses && Array.isArray(allowedCourses) && !allowedCourses.includes('*')) {
          const formattedAllowed = allowedCourses.map((c) => String(c).trim().toUpperCase());
          queryFilter.$or = [
            { courseCodes: { $in: formattedAllowed } },
            { type: { $in: ['EVENT', 'EMERGENCY'] } },
            { isEmergency: true },
          ];
        }
      } catch (cErr) {
        console.warn('[Clerk User Fetch Notice in /mine]:', cErr.message);
      }
    }

    const announcements = await Announcement.find(queryFilter).sort({ isEmergency: -1, isPinned: -1, createdAt: -1 });

    res.json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    console.error('[GET /api/announcements/mine Error]:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching your announcements.',
    });
  }
});

/**
 * @route   GET /api/announcements/:id
 * @desc    Fetch a single announcement by ID
 * @access  Public
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid Announcement ID format.')],
  async (req, res) => {
    // Validate request parameter BEFORE touching database
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    try {
      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          error: 'Announcement not found.',
        });
      }

      res.json({
        success: true,
        data: announcement,
      });
    } catch (error) {
      console.error('[GET /api/announcements/:id Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching announcement.',
      });
    }
  }
);

/**
 * @route   POST /api/announcements
 * @desc    Create a new announcement
 * @access  Protected (Approved HOD)
 */
router.post(
  '/',
  requireApprovedHod,
  [
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('content').custom((value, { req }) => {
      if (req.body.type !== 'TIMETABLE' && (!value || !value.trim())) {
        throw new Error('Content is required.');
      }
      return true;
    }),
    body('courseCodes').isArray({ min: 1 }).withMessage('At least one course code is required.'),
  ],
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
      const { title, content, courseCodes, isPinned, isEmergency, eventDate, attachmentUrl, expiresAt, status, type, timetableEntries, targetYears } = req.body;
      
      const targetType = type && ['NOTICE', 'EVENT', 'TIMETABLE', 'EMERGENCY'].includes(String(type).toUpperCase()) ? String(type).toUpperCase() : 'NOTICE';

      if (targetType === 'TIMETABLE') {
        if (!Array.isArray(timetableEntries) || timetableEntries.length === 0) {
          return res.status(400).json({ success: false, error: 'timetableEntries is required and must not be empty for TIMETABLE category.' });
        }
        for (const entry of timetableEntries) {
          if (!entry.subject || !entry.subject.trim()) return res.status(400).json({ success: false, error: 'Subject/Paper is required for every timetable entry.' });
          if (!entry.date || isNaN(Date.parse(entry.date))) return res.status(400).json({ success: false, error: 'A valid Date is required for every timetable entry.' });
          if (!entry.time || !entry.time.trim()) return res.status(400).json({ success: false, error: 'Time is required for every timetable entry.' });
        }
      } else if (timetableEntries) {
        return res.status(400).json({ success: false, error: 'timetableEntries is not allowed unless type is TIMETABLE.' });
      }

      // For EVENT type, courseCodes holds committee names — skip Course DB validation
      let resolvedCourseCodes;
      if (targetType === 'EVENT') {
        if (!Array.isArray(courseCodes) || courseCodes.length === 0) {
          return res.status(400).json({ success: false, error: 'Please select at least one organising committee.' });
        }
        const VALID_COMMITTEES = ['Placement', 'Cultural', 'Student Council', 'Sports', 'NCC', 'NSS', 'DLLE', 'Rotaract', 'Literary Committee', 'OBC/SC Cell'];
        const invalid = courseCodes.filter((c) => !VALID_COMMITTEES.includes(c));
        if (invalid.length > 0) {
          return res.status(400).json({ success: false, error: `Invalid committee name(s): ${invalid.join(', ')}.` });
        }
        resolvedCourseCodes = courseCodes;
      } else {
        // Validate courseCodes against Course collection for NOTICE / TIMETABLE
        const courseValidation = await validateCourseCodesExist(courseCodes);
        if (!courseValidation.valid) {
          return res.status(400).json({
            success: false,
            error: courseValidation.message,
          });
        }
        // Check if HOD has permissions for all specified target course codes
        const hodPermission = await validateHodCoursePermissions(req.auth.userId, courseValidation.codes);
        if (!hodPermission.allowed) {
          return res.status(403).json({
            success: false,
            error: hodPermission.message,
          });
        }
        resolvedCourseCodes = courseValidation.codes;
      }

      // Validate targetYears if provided
      const validYears = ['FY', 'SY', 'TY'];
      let resolvedYears = validYears; // default to all
      if (targetYears !== undefined) {
        if (!Array.isArray(targetYears) || targetYears.length === 0) {
          return res.status(400).json({ success: false, error: 'targetYears must be a non-empty array of FY, SY, TY.' });
        }
        const normalized = targetYears.map((y) => String(y).trim().toUpperCase());
        const invalid = normalized.filter((y) => !validYears.includes(y));
        if (invalid.length > 0) {
          return res.status(400).json({ success: false, error: `Invalid target year(s): ${invalid.join(', ')}. Allowed: FY, SY, TY.` });
        }
        resolvedYears = [...new Set(normalized)];
      }

      // Sanitize content against stored XSS
      const cleanContent = sanitizeHtml(content, sanitizeOptions);

      // Fetch HOD user name & email from Clerk for author tracking
      let postedByName = 'HOD';
      let postedByEmail = '';
      if (clerkClient && req.auth?.userId) {
        try {
          const user = await clerkClient.users.getUser(req.auth.userId);
          const primaryEmail = user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId) || user.emailAddresses?.[0];
          postedByName = [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail?.emailAddress || 'HOD';
          postedByEmail = primaryEmail?.emailAddress || '';
        } catch (cErr) {
          console.warn('[Clerk Fetch Warning]: Failed to fetch HOD details for announcement author tag', cErr.message);
        }
      }

      const newAnnouncement = new Announcement({
        title,
        content: cleanContent,
        courseCodes: resolvedCourseCodes,
        postedBy: req.auth.userId,
        postedByName,
        postedByEmail,
        isPinned: Boolean(isPinned),
        isEmergency: targetType === 'EMERGENCY',
        eventDate: eventDate && !isNaN(Date.parse(eventDate)) ? new Date(eventDate) : null,
        attachmentUrl: attachmentUrl || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: status && ['DRAFT', 'PUBLISHED'].includes(status) ? status : 'PUBLISHED',
        type: targetType,
        timetableEntries: targetType === 'TIMETABLE' ? timetableEntries : undefined,
        targetYears: resolvedYears,
      });

      await newAnnouncement.save();

      // Trigger push notifications for published announcements
      if (newAnnouncement.status === 'PUBLISHED') {
        const { triggerPushNotifications } = require('../utils/notificationDispatcher');
        triggerPushNotifications(newAnnouncement, req.app.get('vapidKeys')).catch((err) => {
          console.error('[Push Notification Dispatch Error]:', err.message);
        });
      }

      res.status(201).json({
        success: true,
        message: 'Announcement created successfully.',
        data: newAnnouncement,
      });
    } catch (error) {
      console.error('[POST /api/announcements Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server error while creating announcement: ' + error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/announcements/:id
 * @desc    Update an existing announcement (Ownership check: postedBy === req.auth.userId)
 * @access  Protected (Approved HOD)
 */
router.put(
  '/:id',
  requireApprovedHod,
  [
    param('id').isMongoId().withMessage('Invalid Announcement ID format.'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.'),
    body('content').optional().custom((value, { req }) => {
      if (req.body.type !== 'TIMETABLE' && (value !== undefined && !String(value).trim())) {
        throw new Error('Content cannot be empty.');
      }
      return true;
    }),
    body('courseCodes').optional().isArray({ min: 1 }).withMessage('courseCodes must be a non-empty array.'),
  ],
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
      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          error: 'Announcement not found.',
        });
      }

      // Strict server-side ownership check: postedBy === current logged in user ID
      if (announcement.postedBy !== req.auth.userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only edit announcements that you created.',
        });
      }

      const { title, content, courseCodes, isPinned, isEmergency, eventDate, attachmentUrl, expiresAt, status, type, timetableEntries, targetYears } = req.body;

      const targetType = type && ['NOTICE', 'EVENT', 'TIMETABLE', 'EMERGENCY'].includes(String(type).toUpperCase()) ? String(type).toUpperCase() : announcement.type;

      if (targetType === 'TIMETABLE' && timetableEntries !== undefined) {
        if (!Array.isArray(timetableEntries) || timetableEntries.length === 0) {
          return res.status(400).json({ success: false, error: 'timetableEntries is required and must not be empty for TIMETABLE category.' });
        }
        for (const entry of timetableEntries) {
          if (!entry.subject || !entry.subject.trim()) return res.status(400).json({ success: false, error: 'Subject/Paper is required for every timetable entry.' });
          if (!entry.date || isNaN(Date.parse(entry.date))) return res.status(400).json({ success: false, error: 'A valid Date is required for every timetable entry.' });
          if (!entry.time || !entry.time.trim()) return res.status(400).json({ success: false, error: 'Time is required for every timetable entry.' });
        }
      } else if (targetType !== 'TIMETABLE' && timetableEntries) {
        return res.status(400).json({ success: false, error: 'timetableEntries is not allowed unless type is TIMETABLE.' });
      }

      if (courseCodes) {
        if (targetType === 'EVENT') {
          // For EVENT type, courseCodes holds committee names — skip Course DB validation
          const VALID_COMMITTEES = ['Placement', 'Cultural', 'Student Council', 'Sports', 'NCC', 'NSS', 'DLLE', 'Rotaract', 'Literary Committee', 'OBC/SC Cell'];
          const invalid = courseCodes.filter((c) => !VALID_COMMITTEES.includes(c));
          if (invalid.length > 0) {
            return res.status(400).json({ success: false, error: `Invalid committee name(s): ${invalid.join(', ')}.` });
          }
          announcement.courseCodes = courseCodes;
        } else {
          const courseValidation = await validateCourseCodesExist(courseCodes);
          if (!courseValidation.valid) {
            return res.status(400).json({
              success: false,
              error: courseValidation.message,
            });
          }
          const hodPermission = await validateHodCoursePermissions(req.auth.userId, courseValidation.codes);
          if (!hodPermission.allowed) {
            return res.status(403).json({
              success: false,
              error: hodPermission.message,
            });
          }
          announcement.courseCodes = courseValidation.codes;
        }
      }

      if (title !== undefined) announcement.title = title;
      if (content !== undefined) announcement.content = sanitizeHtml(content, sanitizeOptions);
      if (isPinned !== undefined) announcement.isPinned = Boolean(isPinned);
      announcement.isEmergency = (targetType === 'EMERGENCY');
      if (eventDate !== undefined) announcement.eventDate = eventDate && !isNaN(Date.parse(eventDate)) ? new Date(eventDate) : null;
      if (attachmentUrl !== undefined) announcement.attachmentUrl = attachmentUrl || null;
      if (expiresAt !== undefined) announcement.expiresAt = expiresAt ? new Date(expiresAt) : null;
      if (status !== undefined && ['DRAFT', 'PUBLISHED'].includes(status)) announcement.status = status;
      if (type !== undefined && ['NOTICE', 'EVENT', 'TIMETABLE', 'EMERGENCY'].includes(String(type).toUpperCase())) {
        announcement.type = String(type).toUpperCase();
      }

      if (targetType === 'TIMETABLE' && timetableEntries !== undefined) {
        announcement.timetableEntries = timetableEntries;
      } else if (targetType !== 'TIMETABLE') {
        announcement.timetableEntries = undefined;
      }

      // Update targetYears if provided
      if (targetYears !== undefined) {
        const validYears = ['FY', 'SY', 'TY'];
        if (!Array.isArray(targetYears) || targetYears.length === 0) {
          return res.status(400).json({ success: false, error: 'targetYears must be a non-empty array of FY, SY, TY.' });
        }
        const normalized = targetYears.map((y) => String(y).trim().toUpperCase());
        const invalid = normalized.filter((y) => !validYears.includes(y));
        if (invalid.length > 0) {
          return res.status(400).json({ success: false, error: `Invalid target year(s): ${invalid.join(', ')}. Allowed: FY, SY, TY.` });
        }
        announcement.targetYears = [...new Set(normalized)];
      }

      const previousStatus = announcement.status;
      await announcement.save();

      // Trigger push notifications if it became PUBLISHED, or was updated while PUBLISHED
      if (announcement.status === 'PUBLISHED' && (previousStatus === 'DRAFT' || req.body.status === 'PUBLISHED' || status === 'PUBLISHED')) {
        const { triggerPushNotifications } = require('../utils/notificationDispatcher');
        triggerPushNotifications(announcement, req.app.get('vapidKeys')).catch((err) => {
          console.error('[Push Notification Dispatch Error]:', err.message);
        });
      }

      res.json({
        success: true,
        message: 'Announcement updated successfully.',
        data: announcement,
      });
    } catch (error) {
      console.error('[PUT /api/announcements/:id Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server error while updating announcement.',
      });
    }
  }
);

/**
 * @route   DELETE /api/announcements/:id
 * @desc    Delete an announcement (Ownership check: postedBy === req.auth.userId)
 * @access  Protected (Approved HOD)
 */
router.delete(
  '/:id',
  requireApprovedHod,
  [param('id').isMongoId().withMessage('Invalid Announcement ID format.')],
  async (req, res) => {
    // Validate request input BEFORE touching database
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    try {
      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          error: 'Announcement not found.',
        });
      }

      // Strict server-side ownership check: postedBy === current logged in user ID
      if (announcement.postedBy !== req.auth.userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only delete announcements that you created.',
        });
      }

      await announcement.deleteOne();

      res.json({
        success: true,
        message: 'Announcement deleted successfully.',
      });
    } catch (error) {
      console.error('[DELETE /api/announcements/:id Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server error while deleting announcement.',
      });
    }
  }
);

module.exports = router;
