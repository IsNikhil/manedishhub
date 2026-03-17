const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getDb } = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/slu-cards')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|heic|webp/.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Image files only'));
  }
});

// Get or create profile
router.get('/', (req, res) => {
  try {
    const db = getDb();
    let profile = db.prepare('SELECT * FROM user_profiles WHERE session_id = ?').get(req.session.id);
    if (!profile) {
      db.prepare('INSERT OR IGNORE INTO user_profiles (session_id, current_username) VALUES (?, ?)').run(req.session.id, req.session.username);
      profile = db.prepare('SELECT * FROM user_profiles WHERE session_id = ?').get(req.session.id);
    }
    res.json({
      username: req.session.username,
      verified: !!profile?.verified,
      pendingRequest: !!(profile?.pending_review && profile?.requested_name),
      requestedName: profile?.requested_name || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit name change request
router.post('/request-name', upload.single('sluCard'), (req, res) => {
  try {
    const { requestedName } = req.body;
    if (!requestedName || requestedName.trim().length < 2 || requestedName.trim().length > 30) {
      return res.status(400).json({ error: 'Name must be 2-30 characters' });
    }
    if (!req.file) return res.status(400).json({ error: 'SLU card photo required' });

    const db = getDb();
    const existing = db.prepare('SELECT * FROM user_profiles WHERE session_id = ?').get(req.session.id);
    if (existing) {
      db.prepare('UPDATE user_profiles SET requested_name = ?, slu_card_filename = ?, pending_review = 1, verified = 0 WHERE session_id = ?')
        .run(requestedName.trim(), req.file.filename, req.session.id);
    } else {
      db.prepare('INSERT INTO user_profiles (session_id, current_username, requested_name, slu_card_filename, pending_review) VALUES (?, ?, ?, ?, 1)')
        .run(req.session.id, req.session.username, requestedName.trim(), req.file.filename);
    }
    res.json({ success: true, message: 'Request submitted! Awaiting admin verification.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
