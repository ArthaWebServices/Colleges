const Course = require('../models/Course');

const defaultCourses = [
  { code: 'BCOM', name: 'Bachelor of Commerce', stream: 'Commerce' },
  { code: 'BAF', name: 'BCom Accounting & Finance', stream: 'Commerce' },
  { code: 'BBI', name: 'BCom Banking & Insurance', stream: 'Commerce' },
  { code: 'BFM', name: 'BCom Financial Markets', stream: 'Commerce' },
  { code: 'BMS', name: 'Bachelor of Management Studies', stream: 'Management' },
  { code: 'BSCIT', name: 'BSc Information Technology', stream: 'Information Technology' },
  { code: 'BMM', name: 'Bachelor of Mass Media', stream: 'Media & Mass Comm' },
  { code: 'BSCCS', name: 'BSc Cyber Security', stream: 'Cyber Security' },
  { code: 'MCOM', name: 'Master of Commerce', stream: 'Commerce' },
  { code: 'MSCFM', name: 'MSc Finance & Management', stream: 'Management' },
];

/**
 * Ensures default courses exist in the MongoDB database.
 * Upserts all standard college courses so any missing courses are added automatically.
 */
const ensureCoursesExist = async () => {
  try {
    for (const course of defaultCourses) {
      await Course.updateOne(
        { code: course.code },
        { $setOnInsert: course },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('[Ensure Courses Error]:', err.message);
  }
};

module.exports = {
  defaultCourses,
  ensureCoursesExist,
};
