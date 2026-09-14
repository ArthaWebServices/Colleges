import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Course from '../models/Course.js';
import Announcement from '../models/Announcement.js';

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/gsc_announcements_test';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGODB_URI);
  }
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await Course.deleteMany({});
    await Announcement.deleteMany({});
    await mongoose.connection.close();
  }
}, 30000);

beforeEach(async () => {
  await Course.deleteMany({});
  await Announcement.deleteMany({});

  // Seed sample course
  await Course.create([
    { code: 'BMS', name: 'Bachelor of Management Studies', stream: 'Management' },
    { code: 'BCOM', name: 'Bachelor of Commerce', stream: 'Commerce' },
  ]);
});

describe('Announcement API Ownership & Security Tests', () => {
  const HOD_USER_A = 'user_hod_alpha_123';
  const HOD_USER_B = 'user_hod_beta_456';

  it('GET /api/health should return 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('GET /api/courses should return seeded courses', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/admin/hods should reject requests missing or invalid x-admin-secret header', async () => {
    const res = await request(app).get('/api/admin/hods');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('POST /api/announcements should fail for invalid courseCodes', async () => {
    const res = await request(app)
      .post('/api/announcements')
      .set('x-test-user-id', HOD_USER_A)
      .set('x-test-is-approved', 'true')
      .send({
        title: 'Test Announcement',
        content: 'Test content body',
        courseCodes: ['INVALID_CODE'],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('do not exist');
  });

  it('PUT /api/announcements/:id should reject edit if user is NOT the owner (postedBy mismatch)', async () => {
    const announcement = await Announcement.create({
      title: 'HOD A Announcement',
      content: 'Important updates for BMS',
      courseCodes: ['BMS'],
      postedBy: HOD_USER_A,
      isPinned: false,
    });

    const res = await request(app)
      .put(`/api/announcements/${announcement._id}`)
      .set('x-test-user-id', HOD_USER_B)
      .set('x-test-is-approved', 'true')
      .send({
        title: 'HOD B Malicious Edit',
        content: 'HOD B altering content',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('You can only edit announcements that you created');

    const dbItem = await Announcement.findById(announcement._id);
    expect(dbItem.title).toBe('HOD A Announcement');
  });

  it('DELETE /api/announcements/:id should reject deletion if user is NOT the owner', async () => {
    const announcement = await Announcement.create({
      title: 'HOD A Announcement to protect',
      content: 'Critical notice',
      courseCodes: ['BCOM'],
      postedBy: HOD_USER_A,
    });

    const res = await request(app)
      .delete(`/api/announcements/${announcement._id}`)
      .set('x-test-user-id', HOD_USER_B)
      .set('x-test-is-approved', 'true');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('You can only delete announcements that you created');

    const dbItem = await Announcement.findById(announcement._id);
    expect(dbItem).not.toBeNull();
  });

  it('DELETE /api/admin/announcements/:id should reject request missing x-admin-secret', async () => {
    const announcement = await Announcement.create({
      title: 'Notice without auth',
      content: 'Content',
      courseCodes: ['BCOM'],
      postedBy: HOD_USER_A,
    });

    const res = await request(app).delete(`/api/admin/announcements/${announcement._id}`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('DELETE /api/admin/announcements/:id should validate ID parameter', async () => {
    const validSecret = process.env.ADMIN_SECRET || 'super_secret_admin_approval_key_123';
    const res = await request(app)
      .delete('/api/admin/announcements/invalid-id-format')
      .set('x-admin-secret', validSecret);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0]).toContain('Invalid Announcement ID format');
  });

  it('DELETE /api/admin/announcements/:id should return 404 for non-existent announcement', async () => {
    const validSecret = process.env.ADMIN_SECRET || 'super_secret_admin_approval_key_123';
    const nonExistentId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/admin/announcements/${nonExistentId}`)
      .set('x-admin-secret', validSecret);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Announcement not found.');
  });

  it('DELETE /api/admin/announcements/:id should allow super-admin to delete any misleading notice', async () => {
    const validSecret = process.env.ADMIN_SECRET || 'super_secret_admin_approval_key_123';
    const misleadingAnnouncement = await Announcement.create({
      title: 'Misleading Exam Post',
      content: 'Exams cancelled tomorrow (Fake News)',
      courseCodes: ['BCOM'],
      postedBy: HOD_USER_A,
    });

    const res = await request(app)
      .delete(`/api/admin/announcements/${misleadingAnnouncement._id}`)
      .set('x-admin-secret', validSecret);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('permanently removed by Super-Admin');

    const dbItem = await Announcement.findById(misleadingAnnouncement._id);
    expect(dbItem).toBeNull();
  });
});

