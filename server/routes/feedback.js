const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/:itemId', (req, res) => {
  try {
    const db = getDb();
    const feedback = db.prepare(`
      SELECT * FROM feedback WHERE item_id = ? ORDER BY created_at DESC
    `).all(req.params.itemId);
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { itemId, comment, rating } = req.body;

    if (!itemId || !comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Item ID and comment are required' });
    }
    if (comment.length > 280) {
      return res.status(400).json({ error: 'Comment must be 280 characters or less' });
    }
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO feedback (item_id, username, comment, rating) VALUES (?, ?, ?, ?)
    `).run(itemId, req.session.username, comment.trim(), rating || null);

    const newFeedback = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(result.lastInsertRowid);
    res.json(newFeedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
