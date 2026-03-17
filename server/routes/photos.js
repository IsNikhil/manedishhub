const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');
const { getDb } = require('../db');

// Cloudinary setup (only if credentials are provided)
let cloudinary = null;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[PHOTOS] Cloudinary storage enabled');
} else {
  console.log('[PHOTOS] Cloudinary not configured — using local disk');
}

// Always receive file in memory; we decide where to store it after
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Images only (JPG, PNG, WebP, GIF)'));
  }
});

// Upload buffer to Cloudinary, return { url, publicId }
function uploadToCloudinary(buffer, mimetype) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'mane-dish-hub/photos', resource_type: 'image' },
      (err, result) => err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id })
    );
    Readable.from(buffer).pipe(stream);
  });
}

// Save to local disk as fallback
function saveLocally(buffer, originalname) {
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) +
    require('path').extname(originalname);
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return { url: `/uploads/${filename}`, publicId: null };
}

// Resolve URL for a DB row (handles both Cloudinary URLs and local filenames)
function resolveUrl(filename) {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `/uploads/${filename}`;
}

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const photos = db.prepare(
      'SELECT * FROM photos ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM photos').get().count;

    res.json({
      photos: photos.map(p => ({ ...p, url: resolveUrl(p.filename) })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    const caption = req.body.caption?.trim().slice(0, 200) || '';

    let url, publicId;
    if (cloudinary) {
      ({ url, publicId } = await uploadToCloudinary(req.file.buffer, req.file.mimetype));
    } else {
      ({ url, publicId } = saveLocally(req.file.buffer, req.file.originalname));
    }

    // Store the full URL (Cloudinary) or filename (local) in the filename column
    const storedRef = publicId || url; // Cloudinary: public_id; local: /uploads/xxx.jpg
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO photos (filename, caption, username) VALUES (?, ?, ?)'
    ).run(storedRef, caption, req.session.username);

    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(result.lastInsertRowid);
    res.json({ ...photo, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, resolveUrl };
