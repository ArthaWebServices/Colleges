const express = require('express');
const router = express.Router();
const Course = require('../models/Course');

/**
 * @route   GET /api/courses
 * @desc    Fetch all available course tags
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { ensureCoursesExist } = require('../utils/ensureCourses');
    await ensureCoursesExist();
    const courses = await Course.find().sort({ code: 1 });
    res.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error('[GET /api/courses Error]:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching courses.',
    });
  }
});

module.exports = router;
