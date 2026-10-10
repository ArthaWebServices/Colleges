const crypto = require('crypto');

// In-memory replay prevention: store consumed tokens until their expiration
const consumedTokens = new Set();

// Clean up expired consumed tokens periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const token of consumedTokens) {
    try {
      const [payloadB64] = token.split('.');
      if (!payloadB64) {
        consumedTokens.delete(token);
        continue;
      }
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (now > payload.exp) {
        consumedTokens.delete(token);
      }
    } catch {
      consumedTokens.delete(token);
    }
  }
}, 5 * 60 * 1000).unref();

const getSigningSecret = () => {
  return process.env.ADMIN_SECRET || (process.env.NODE_ENV === 'production' ? null : 'super_secret_admin_approval_key_123');
};

/**
 * Generates a random alphanumeric string excluding confusing characters
 */
const generateRandomText = (length = 5) => {
  // Exclude 0, O, o, 1, I, l to ensure good user experience
  const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
};

/**
 * Generates an SVG string representation of the captcha
 */
const createCaptchaSvg = (text, width = 160, height = 50) => {
  // Generate random curved noise paths
  const noiseLines = [];
  const lineColors = ['#94a3b8', '#64748b', '#cbd5e1', '#a1a1aa'];
  for (let i = 0; i < 3; i++) {
    const x1 = Math.floor(Math.random() * 20);
    const y1 = Math.floor(Math.random() * height);
    const qx = Math.floor(width / 2 + (Math.random() * 40 - 20));
    const qy = Math.floor(Math.random() * height);
    const x2 = Math.floor(width - Math.random() * 20);
    const y2 = Math.floor(Math.random() * height);
    const color = lineColors[Math.floor(Math.random() * lineColors.length)];
    noiseLines.push(
      `<path d="M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}" stroke="${color}" stroke-width="${1.5 + Math.random()}" fill="none" opacity="0.6"/>`
    );
  }

  // Generate random dots
  const noiseDots = [];
  for (let i = 0; i < 24; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const r = (Math.random() * 1.5 + 0.8).toFixed(1);
    const opacity = (Math.random() * 0.4 + 0.2).toFixed(2);
    noiseDots.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#64748b" opacity="${opacity}"/>`);
  }

  // Render each character with individual styling, slight rotation & position
  const charElements = [];
  const charColors = ['#1e293b', '#0f172a', '#1e3a8a', '#1e40af', '#334155', '#0f766e'];
  const startX = 18;
  const charSpacing = (width - 36) / text.length;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = startX + i * charSpacing + (Math.random() * 4 - 2);
    const y = height / 2 + 8 + (Math.random() * 4 - 2);
    const rot = Math.floor(Math.random() * 28 - 14); // -14 deg to +14 deg
    const fontSize = Math.floor(Math.random() * 4 + 26); // 26px to 30px
    const color = charColors[Math.floor(Math.random() * charColors.length)];

    charElements.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}" fill="${color}" transform="rotate(${rot}, ${x.toFixed(1)}, ${y.toFixed(1)})">${char}</text>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #f1f5f9; border-radius: 8px; user-select: none;">
    <rect width="${width}" height="${height}" rx="8" fill="#f1f5f9"/>
    ${noiseLines.join('')}
    ${noiseDots.join('')}
    ${charElements.join('')}
  </svg>`;
};

/**
 * Creates a signed cryptographic token for captcha verification
 */
const createCaptchaToken = (text, secret) => {
  const payload = {
    text: text.toLowerCase(),
    exp: Date.now() + 3 * 60 * 1000, // 3 minutes validity
    nonce: crypto.randomBytes(8).toString('hex')
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadB64);
  const signature = hmac.digest('base64url');

  return `${payloadB64}.${signature}`;
};

/**
 * Generate a new captcha SVG and cryptographic token
 */
const generateCaptcha = () => {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error('Server Misconfiguration: Secret key is not set for Captcha signing.');
  }

  const text = generateRandomText(5);
  const svg = createCaptchaSvg(text);
  const token = createCaptchaToken(text, secret);

  return { svg, token };
};

/**
 * Verify a user's captcha response against the cryptographic token
 */
const verifyCaptcha = (userInput, token) => {
  if (!userInput || typeof userInput !== 'string') {
    return { valid: false, error: 'Please enter the captcha characters.' };
  }

  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing captcha verification token.' };
  }

  const secret = getSigningSecret();
  if (!secret) {
    return { valid: false, error: 'Server Misconfiguration: Secret key not available.' };
  }

  // Prevent replay attacks
  if (consumedTokens.has(token)) {
    return { valid: false, error: 'Captcha has already been used. Please refresh.' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed captcha token.' };
  }

  const [payloadB64, signature] = parts;

  // Validate HMAC signature using timingSafeEqual
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadB64);
  const expectedSignature = hmac.digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedSigBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
    return { valid: false, error: 'Invalid captcha token signature.' };
  }

  // Parse and validate payload
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, error: 'Invalid captcha payload.' };
  }

  // Check expiration
  if (Date.now() > payload.exp) {
    return { valid: false, error: 'Captcha expired. Please click refresh for a new one.' };
  }

  // Mark token as consumed
  consumedTokens.add(token);

  // Compare case-insensitively using timingSafeEqual
  const normalizedUser = userInput.trim().toLowerCase();
  const normalizedExpected = payload.text;

  const userBuf = Buffer.from(normalizedUser);
  const expectedBuf = Buffer.from(normalizedExpected);

  if (userBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(userBuf, expectedBuf)) {
    return { valid: false, error: 'Incorrect captcha. Please try again.' };
  }

  return { valid: true };
};

module.exports = {
  generateCaptcha,
  verifyCaptcha,
};
