const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');

// Admin auth middleware
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Login
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'manedish2024';
  if (password === adminPassword) {
    req.session.isAdmin = true;
    // Set admin display name — change ADMIN_DISPLAY_NAME in .env to your name
    req.session.username = process.env.ADMIN_DISPLAY_NAME || 'Mane Dish Admin';
    res.json({ success: true, username: req.session.username });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true });
});

// Check auth
router.get('/me', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin, username: req.session.username });
});

// Stats
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const stats = {
      totalFeedback: db.prepare('SELECT COUNT(*) as c FROM feedback').get().c,
      totalPhotos: db.prepare('SELECT COUNT(*) as c FROM photos').get().c,
      totalMessages: db.prepare('SELECT COUNT(*) as c FROM chat_messages').get().c,
      todayVotes: db.prepare('SELECT COUNT(*) as c FROM votes WHERE date = ?').get(today).c,
      pendingVerifications: db.prepare('SELECT COUNT(*) as c FROM users WHERE pending_verification = 1').get().c,
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pending SLU verification requests
router.get('/pending', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const pending = db.prepare('SELECT * FROM users WHERE pending_verification = 1 ORDER BY created_at DESC').all();
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve verification (grant ✓ badge)
router.post('/verify/:userId', requireAdmin, (req, res) => {
  try {
    getDb().prepare('UPDATE users SET verified = 1, pending_verification = 0 WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject verification
router.post('/reject/:userId', requireAdmin, (req, res) => {
  try {
    getDb().prepare('UPDATE users SET slu_card_filename = NULL, pending_verification = 0 WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All reviews
router.get('/reviews', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const reviews = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 200').all();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete review
router.delete('/review/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM feedback WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All photos
router.get('/photos', requireAdmin, (req, res) => {
  try {
    const { resolveUrl } = require('./photos');
    const db = getDb();
    const photos = db.prepare('SELECT * FROM photos ORDER BY created_at DESC LIMIT 200').all();
    res.json(photos.map(p => ({ ...p, url: resolveUrl(p.filename) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete photo
router.delete('/photo/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
    if (photo) {
      // Delete from Cloudinary if it's a Cloudinary public_id
      if (process.env.CLOUDINARY_CLOUD_NAME && photo.filename &&
          !photo.filename.startsWith('/') && !photo.filename.startsWith('http')) {
        try {
          const cloudinary = require('cloudinary').v2;
          await cloudinary.uploader.destroy(photo.filename);
        } catch (e) { console.error('[ADMIN] Cloudinary delete failed:', e.message); }
      } else if (photo.filename && photo.filename.startsWith('/uploads/')) {
        // Local file fallback
        const filePath = path.join(__dirname, '../..', photo.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All chat messages
router.get('/messages', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const messages = db.prepare('SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 200').all();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete message
router.delete('/message/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM chat_messages WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve SLU card image (admin only)
router.get('/slu-card/:filename', requireAdmin, (req, res) => {
  const filePath = path.join(__dirname, '../../uploads/slu-cards', path.basename(req.params.filename));
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Delete user (remove profile)
router.delete('/user/:sessionId', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM user_profiles WHERE session_id = ?').run(req.params.sessionId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
router.get('/users', requireAdmin, (req, res) => {
  try {
    const users = getDb().prepare('SELECT id, display_name, email, verified, pending_verification, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/user/:userId', requireAdmin, (req, res) => {
  try {
    getDb().prepare('DELETE FROM users WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve SLU card image (admin only) — already defined above but keeping for users table
router.get('/slu-card-user/:filename', requireAdmin, (req, res) => {
  const fs = require('fs');
  const filePath = require('path').join(__dirname, '../../uploads/slu-cards', require('path').basename(req.params.filename));
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).json({ error: 'File not found' });
});

module.exports = router;
