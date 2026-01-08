const fs = require('fs');
const path = require('path');

let s3Client = null;
let S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || null;
let supabase = null;
let SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || process.env.S3_BUCKET || null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && S3_BUCKET) {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  module.exports._S3 = { S3Client, PutObjectCommand };
}

// Init Supabase storage client when configured (service_role key expected)
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY && SUPABASE_BUCKET) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });
  module.exports._supabase = supabase;
}

/**
 * Upload local file to S3 (if configured). Returns public URL or local path.
 * @param {string} localPath
 * @param {string} destKey
 */
async function uploadFile(localPath, destKey) {
  // Supabase upload (preferred when configured)
  if (supabase && SUPABASE_BUCKET) {
    const fileStream = fs.createReadStream(localPath);
    const opts = { contentType: mimeType(localPath) };
    // supabase-js upload requires a Buffer or ReadableStream
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(destKey, fileStream, opts);

      if (error) throw error;

      // Return public URL or signed URL depending on bucket policy
      const publicUrl = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(destKey);
      if (publicUrl && publicUrl.publicUrl) return publicUrl.publicUrl;
      return `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodeURIComponent(destKey)}`;
  }

  // Fallback to S3 if configured
  if (s3Client && S3_BUCKET) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const fileStream = fs.createReadStream(localPath);
    const params = {
      Bucket: S3_BUCKET,
      Key: destKey,
      Body: fileStream,
      ACL: process.env.AWS_S3_ACL || 'private',
      ContentType: mimeType(localPath),
    };

    await s3Client.send(new PutObjectCommand(params));

    const baseUrl = process.env.S3_BASE_URL || `https://${S3_BUCKET}.s3.amazonaws.com`;
    return `${baseUrl}/${encodeURIComponent(destKey)}`;
  }

  // fallback: return local relative path
  return localPath;
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

/**
 * Ensure uploads directory exists (local fallback)
 */
function ensureUploadsDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

module.exports = {
  uploadFile,
  ensureUploadsDir,
  // export internals so other modules can call list/presign when needed
  supabase,
  SUPABASE_BUCKET,
  s3Client,
  S3_BUCKET,
};
