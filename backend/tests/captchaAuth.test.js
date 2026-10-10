import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { generateCaptcha, verifyCaptcha } from '../utils/captchaHelper.js';

describe('Captcha Generation & Super-Admin Captcha Gate Tests', () => {
  const validSecret = process.env.ADMIN_SECRET || 'super_secret_admin_approval_key_123';

  describe('Unit: captchaHelper', () => {
    it('should generate valid svg and signed cryptographic token', () => {
      const { svg, token } = generateCaptcha();
      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(token).toBeDefined();
      expect(token).toContain('.');
    });

    it('should verify correct captcha answer', () => {
      const { token } = generateCaptcha();
      const [payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      
      const result = verifyCaptcha(payload.text, token);
      expect(result.valid).toBe(true);
    });

    it('should reject incorrect captcha answer', () => {
      const { token } = generateCaptcha();
      const result = verifyCaptcha('WRONG_TEXT', token);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Incorrect captcha');
    });

    it('should prevent replay attacks using the same token twice', () => {
      const { token } = generateCaptcha();
      const [payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      const firstAttempt = verifyCaptcha(payload.text, token);
      expect(firstAttempt.valid).toBe(true);

      const replayAttempt = verifyCaptcha(payload.text, token);
      expect(replayAttempt.valid).toBe(false);
      expect(replayAttempt.error).toContain('already been used');
    });
  });

  describe('Integration: API Endpoints', () => {
    it('GET /api/captcha/generate should return 200 with svg and token', async () => {
      const res = await request(app).get('/api/captcha/generate');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.svg).toContain('<svg');
      expect(res.body.token).toBeDefined();
    });

    it('POST /api/admin/verify-login should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/admin/verify-login')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/admin/verify-login should reject wrong captcha', async () => {
      const captchaRes = await request(app).get('/api/captcha/generate');
      const token = captchaRes.body.token;

      const res = await request(app)
        .post('/api/admin/verify-login')
        .send({
          adminSecret: validSecret,
          captchaText: 'INVALID123',
          captchaToken: token,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Incorrect captcha');
    });

    it('POST /api/admin/verify-login should reject invalid admin secret even if captcha is correct', async () => {
      const { token } = generateCaptcha();
      const [payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      const res = await request(app)
        .post('/api/admin/verify-login')
        .send({
          adminSecret: 'wrong_admin_secret_key',
          captchaText: payload.text,
          captchaToken: token,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('POST /api/admin/verify-login should succeed when both captcha and admin secret are valid', async () => {
      const { token } = generateCaptcha();
      const [payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      const res = await request(app)
        .post('/api/admin/verify-login')
        .send({
          adminSecret: validSecret,
          captchaText: payload.text,
          captchaToken: token,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Super-Admin authentication successful');
    });
  });
});
