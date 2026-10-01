const express = require('express');
const router = express.Router();
const https = require('https');
const Announcement = require('../models/Announcement');

// GET /documents/:id
// Proxies the document from UploadThing so the raw URL is never exposed to the client
router.get('/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement || !announcement.attachmentUrl) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const fileUrl = announcement.attachmentUrl;

    // Use https to fetch the file and pipe it directly to the response
    https.get(fileUrl, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        return res.status(404).json({ success: false, error: 'Failed to fetch document from storage' });
      }

      const contentType = proxyRes.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');

      // Stream the bytes back to the browser
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error('[Document Proxy Error]:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Error proxying the document' });
      }
    });

  } catch (err) {
    console.error('[Document Route Error]:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
