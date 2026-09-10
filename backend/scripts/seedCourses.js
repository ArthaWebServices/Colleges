const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('../models/Course');
const connectDB = require('../config/db');

const initialCourses = [
  {
    code: 'BCOM',
    name: 'Bachelor of Commerce',
    stream: 'Commerce',
  },
  {
    code: 'BAF',
    name: 'BCom Accounting & Finance',
    stream: 'Commerce',
  },
  {
    code: 'BBI',
    name: 'BCom Banking & Insurance',
    stream: 'Commerce',
  },
  {
    code: 'BFM',
    name: 'BCom Financial Markets',
    stream: 'Commerce',
  },
  {
    code: 'BMS',
    name: 'Bachelor of Management Studies',
    stream: 'Management',
  },
  {
    code: 'BSCIT',
    name: 'BSc Information Technology',
    stream: 'Information Technology',
  },
  {
    code: 'BMM',
    name: 'Bachelor of Mass Media',
    stream: 'Media & Mass Comm',
  },
  {
    code: 'BSCCS',
    name: 'BSc Computer Science',
    stream: 'Information Technology',
  },
  {
    code: 'MCOM',
    name: 'Master of Commerce',
    stream: 'Commerce',
  },
  {
    code: 'MSCFM',
    name: 'MSc Finance & Management',
    stream: 'Management',
  },
];

const seedCourses = async () => {
  try {
    await connectDB();
    console.log('[Seeding Courses] Cleaning existing courses...');
    await Course.deleteMany({});

    console.log('[Seeding Courses] Inserting default course tags...');
    const createdCourses = await Course.insertMany(initialCourses);

    console.log(`[Seeding Courses] Successfully seeded ${createdCourses.length} courses:`);
    createdCourses.forEach((c) => console.log(`  - [${c.code}] ${c.name} (${c.stream})`));

    process.exit(0);
  } catch (error) {
    console.error('[Seeding Error]:', error.message);
    process.exit(1);
  }
};

seedCourses();
