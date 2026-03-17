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

// Get profile (works for both logged-in Google users and anonymous sessions)
router.get('/', (req, res) => {
  try {
    if (req.user) {
      return res.json({
        loggedIn: true,
        username: req.user.display_name,
        email: req.user.email,
        verified: !!req.user.verified,
        pendingVerification: !!req.user.pending_verification,
      });
    }
    // Anonymous fallback
    res.json({
      loggedIn: false,
      username: req.session.username,
      verified: false,
      pendingVerification: false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update display name (Google users only — no admin approval needed)
router.patch('/display-name', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Sign in with Google to change your name' });
  const { displayName } = req.body;
  if (!displayName || displayName.trim().length < 2 || displayName.trim().length > 30) {
    return res.status(400).json({ error: 'Name must be 2-30 characters' });
  }
  try {
    getDb().prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName.trim(), req.user.id);
    res.json({ success: true, displayName: displayName.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit SLU card for verified badge (Google users only)
router.post('/verify', upload.single('sluCard'), (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Sign in with Google first' });
  if (!req.file) return res.status(400).json({ error: 'SLU card photo required' });
  try {
    getDb().prepare('UPDATE users SET slu_card_filename = ?, pending_verification = 1, verified = 0 WHERE id = ?')
      .run(req.file.filename, req.user.id);
    res.json({ success: true, message: 'Verification request submitted! Admin will review your SLU card.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy: keep old request-name endpoint redirecting to new flow
router.post('/request-name', (req, res) => {
  res.status(410).json({ error: 'Please sign in with Google and use the new verification flow.' });
});

module.exports = router;
