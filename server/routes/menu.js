const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { scrapeMenu } = require('../scraper');

const STALE_MINUTES = parseInt(process.env.SCRAPE_INTERVAL_MINUTES || '30');
let scrapeInProgress = false;

function isStale(lastScraped) {
  if (!lastScraped) return true;
  const age = (Date.now() - new Date(lastScraped).getTime()) / 60000; // minutes
  return age > STALE_MINUTES;
}

function triggerBackgroundScrape(io) {
  if (scrapeInProgress) return;
  scrapeInProgress = true;
  console.log('[MENU] Triggering background scrape (user visit)...');
  scrapeMenu()
    .then(() => {
      console.log('[MENU] Background scrape complete');
      // Notify all connected clients so their menu auto-refreshes
      if (io) io.emit('menu:updated');
    })
    .catch(err => console.error('[MENU] Background scrape failed:', err.message))
    .finally(() => { scrapeInProgress = false; });
}

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const items = db.prepare(`
      SELECT * FROM menu_items WHERE date = ? ORDER BY category, name
    `).all(today);

    const meta = db.prepare(`SELECT * FROM scrape_meta WHERE id = 1`).get();

    // Group by category
    const grouped = {};
    items.forEach(item => {
      const cat = item.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        ...item,
        dietary_tags: item.dietary_tags ? item.dietary_tags.split(',').filter(Boolean) : []
      });
    });

    // If stale, kick off a background scrape — user gets cached data immediately
    if (isStale(meta?.last_scraped) && meta?.status !== 'scraping') {
      triggerBackgroundScrape(req.io);
    }

    res.json({
      menu: grouped,
      lastUpdated: meta?.last_scraped,
      status: meta?.status,
      scraping: scrapeInProgress,
      error: meta?.error,
      totalItems: items.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    await scrapeMenu();
    res.json({ success: true, message: 'Menu refreshed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'Scrape failed, serving cached menu' });
  }
});

module.exports = router;
