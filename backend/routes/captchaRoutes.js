const express = require('express');
const router = express.Router();
const { generateCaptcha } = require('../utils/captchaHelper');
const { authRateLimiter } = require('../middleware/rateLimiter');

/**
 * @route   GET /api/captcha/generate
 * @desc    Generate a fresh visual alphanumeric captcha SVG & signed verification token
 * @access  Public (Rate-limited to prevent abuse)
 */
router.get('/generate', authRateLimiter, (req, res) => {
  try {
    const { svg, token } = generateCaptcha();
    return res.json({
      success: true,
      svg,
      token,
    });
  } catch (err) {
    console.error('[Captcha Generation Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate captcha. Please try again.',
    });
  }
});

module.exports = router;
