const express = require('express');
const router = express.Router();
const multer = require('multer');
const { UTApi, UTFile } = require('uploadthing/server');
const { requireApprovedHod } = require('../middleware/auth');

// Allowed extensions and MIME types for document uploads
const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'csv', 'zip'];
const forbiddenExtensions = ['exe', 'bat', 'sh', 'php', 'js', 'html', 'htm', 'cmd', 'vbs', 'jar', 'msi', 'scr', 'ps1', 'dll'];

// Multer file filter to block malicious file uploads
const fileFilter = (req, file, cb) => {
  const ext = (file.originalname || '').split('.').pop().toLowerCase();
  
  if (forbiddenExtensions.includes(ext)) {
    return cb(new Error(`Security Restriction: Executable files (.${ext}) are not permitted.`), false);
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`Invalid File Type: Only documents (PDF, DOCX, XLSX, PPTX, TXT) and images are allowed.`), false);
  }

  cb(null, true);
};

// Configure multer with memory storage, strict file filter, and 16 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16 MB max
  fileFilter,
});

// Initialize UploadThing server API
const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN,
});

/**
 * @route   POST /api/upload
 * @desc    Upload a file to UploadThing and return the URL
 * @access  Protected (Approved HOD)
 */
router.post('/', requireApprovedHod, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File size exceeds maximum limit of 16MB.' });
      }
      return res.status(400).json({ success: false, error: 'Upload Error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided.',
      });
    }

    if (!process.env.UPLOADTHING_TOKEN) {
      console.warn('[Upload] UPLOADTHING_TOKEN not set — returning mock URL.');
      return res.json({
        success: true,
        mock: true,
        url: `https://utfs.io/f/mock_${Date.now()}_${req.file.originalname}`,
      });
    }

    // Create an UploadThing-compatible file from the multer buffer
    const utFile = new UTFile(
      [req.file.buffer],
      req.file.originalname,
      { type: req.file.mimetype }
    );

    // Upload to UploadThing
    const response = await utapi.uploadFiles([utFile]);

    if (!response || !response[0] || response[0].error) {
      const errMsg = response?.[0]?.error?.message || 'UploadThing upload failed.';
      console.error('[Upload Error]:', errMsg);
      return res.status(500).json({
        success: false,
        error: errMsg,
      });
    }

    const { ufsUrl, name, size } = response[0].data;

    res.json({
      success: true,
      url: ufsUrl,
      filename: name,
      size,
    });
  } catch (error) {
    console.error('[POST /api/upload Error]:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file.',
    });
  }
});

module.exports = router;
