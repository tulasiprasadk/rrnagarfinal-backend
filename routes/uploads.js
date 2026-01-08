const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
// S3 imports removed: using Supabase Storage by default
const path = require('path');

const storage = require('../services/storage');
const ensureUploadsDir = storage.ensureUploadsDir;
const supabase = storage.supabase;
const SUPABASE_BUCKET = storage.SUPABASE_BUCKET;
// S3 bucket not used when Supabase is configured

// Ensure local uploads dir
ensureUploadsDir(path.join(__dirname, '..', 'uploads'));

// Presign endpoint for frontend to upload directly to Supabase (preferred)
router.get('/presign', async (req, res) => {
  const filename = req.query.filename;
  if (!filename) return res.status(400).json({ error: 'filename required' });

  if (supabase && SUPABASE_BUCKET) {
    try {
      const bucketClient = supabase.storage.from(SUPABASE_BUCKET);
      if (typeof bucketClient.createSignedUploadUrl === 'function') {
        const key = `uploads/${Date.now()}-${filename}`;
        const expires = parseInt(req.query.expires || '3600', 10);
        const { data, error } = await bucketClient.createSignedUploadUrl(key, expires);
        if (error) throw error;
        return res.json({ url: data.signedUploadUrl, key });
      }

      return res.status(400).json({ error: 'Supabase signed uploads not supported by server SDK; use client-side upload or POST /api/uploads/server' });
    } catch (err) {
      console.error('Supabase presign error:', err);
      return res.status(500).json({ error: 'Failed to create supabase signed upload' });
    }
  }

  return res.status(400).json({ error: 'No storage backend configured; use POST /api/uploads/server to upload via backend' });
});

// Admin-only: list uploaded objects (S3)
router.get('/list', async (req, res) => {
  if (supabase && SUPABASE_BUCKET) {
    try {
      const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list('uploads', { limit: 1000, offset: 0 });
      if (error) throw error;
      return res.json({ contents: data || [] });
    } catch (err) {
      console.error('Supabase list error:', err);
      return res.status(500).json({ error: 'Failed to list uploads' });
    }
  }

  return res.status(400).json({ error: 'No storage backend configured' });
});


// Server-side upload endpoint (accepts multipart/form-data)
const upload = multer({ dest: path.join(__dirname, '..', 'uploads', 'tmp') });
router.post('/server', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file missing' });
    const localPath = req.file.path;
    const key = `uploads/${Date.now()}-${req.file.originalname}`;
      try {
      const url = await require('../services/storage').uploadFile(localPath, key);
      // remove tmp file
      try { fs.unlinkSync(localPath); } catch (e) { /* ignore unlink errors */ }
      return res.json({ ok: true, key, url });
    } catch (e) {
      console.error('Upload failed:', e);
      try { fs.unlinkSync(localPath); } catch (ee) { /* ignore unlink errors */ }
      return res.status(500).json({ error: 'Upload failed' });
    }
  } catch (err) {
    console.error('Server upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
