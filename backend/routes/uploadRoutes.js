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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
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
        return res.status(400).json({ success: false, error: 'File size exceeds maximum limit of 50MB.' });
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

    let finalBuffer = req.file.buffer;
    let finalMimetype = req.file.mimetype;
    let finalFilename = req.file.originalname;

    // Apply image compression if the uploaded file is an image
    if (finalMimetype.startsWith('image/') && !finalMimetype.includes('svg')) {
      try {
        const sharp = require('sharp');
        // Compress and convert images to WebP for massive file size reduction
        finalBuffer = await sharp(req.file.buffer)
          .webp({ quality: 80, effort: 4 })
          .toBuffer();
        
        finalMimetype = 'image/webp';
        finalFilename = finalFilename.replace(/\.[^/.]+$/, "") + ".webp";
        console.log(`[Upload] Image compressed to WebP: ${finalFilename}`);
      } catch (imgErr) {
        console.warn('[Upload] Image compression failed, falling back to original:', imgErr.message);
      }
    }

    // Create an UploadThing-compatible file from the optimized buffer
    const utFile = new UTFile(
      [finalBuffer],
      finalFilename,
      { type: finalMimetype }
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
