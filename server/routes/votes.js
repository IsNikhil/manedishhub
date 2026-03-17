const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const votes = db.prepare(`
      SELECT item_id, vote_type, COUNT(*) as count
      FROM votes
      WHERE date = ?
      GROUP BY item_id, vote_type
    `).all(today);

    const result = {};
    votes.forEach(row => {
      if (!result[row.item_id]) result[row.item_id] = { eat: 0, pass: 0 };
      result[row.item_id][row.vote_type] = row.count;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { itemId, voteType } = req.body;
    if (!itemId || !['eat', 'pass'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote data' });
    }

    const sessionKey = `vote_${itemId}`;
    if (req.session.votes[sessionKey]) {
      return res.status(409).json({ error: 'Already voted on this item today' });
    }

    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO votes (item_id, vote_type, date) VALUES (?, ?, ?)
    `).run(itemId, voteType, today);

    req.session.votes[sessionKey] = voteType;

    // Get updated counts
    const votes = db.prepare(`
      SELECT vote_type, COUNT(*) as count FROM votes WHERE item_id = ? AND date = ? GROUP BY vote_type
    `).all(itemId, today);

    const counts = { eat: 0, pass: 0 };
    votes.forEach(row => { counts[row.vote_type] = row.count; });

    // Broadcast to all clients
    req.io.emit('vote:update', { itemId, votes: counts });

    res.json({ success: true, votes: counts, userVote: voteType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
