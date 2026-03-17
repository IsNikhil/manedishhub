const { getDb } = require('./db');

async function scrapeMenu() {
  if (process.env.DISABLE_SCRAPER === 'true') {
    console.log('[SCRAPER] Scraping disabled via DISABLE_SCRAPER env var. Set menu manually via admin panel.');
    return;
  }

  const { chromium } = require('playwright');
  const db = getDb();
  let browser;

  db.prepare(`UPDATE scrape_meta SET status = 'scraping', error = NULL WHERE id = 1`).run();

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page = await context.newPage();

    await page.goto('https://southeastern.mydininghub.com/en/location/the-mane-dish', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for actual menu items to render (h4 inside li cards)
    await page.waitForSelector('li h4.text-start', { timeout: 30000 });
    // Extra settle time for all stations to render
    await page.waitForTimeout(3000);

    const menuData = await page.evaluate(() => {
      const items = [];

      // Find all UL grids that contain item cards
      const uls = [...document.querySelectorAll('ul')].filter(ul =>
        ul.querySelector('li h4.text-start') !== null
      );

      uls.forEach(ul => {
        // Find the station/category heading by scanning prev siblings up the tree
        let category = 'Today\'s Menu';
        let searchEl = ul.parentElement;
        outer: for (let depth = 0; depth < 5 && searchEl; depth++) {
          let sib = searchEl.previousElementSibling;
          while (sib) {
            const h = sib.matches('h2,h3') ? sib : sib.querySelector('h2,h3');
            if (h) { category = h.textContent.trim(); break outer; }
            sib = sib.previousElementSibling;
          }
          searchEl = searchEl.parentElement;
        }

        [...ul.querySelectorAll('li')].forEach(li => {
          const name = li.querySelector('h4.text-start')?.textContent?.trim();
          if (!name || name.length < 2) return;

          const desc = li.querySelector('p')?.textContent?.trim() || '';

          const tags = [];
          li.querySelectorAll('img[alt]').forEach(img => {
            const t = img.getAttribute('alt');
            if (t && t.length < 60 && !t.startsWith('http')) tags.push(t);
          });

          items.push({ name, description: desc, category, dietary_tags: tags.join(',') });
        });
      });

      return items;
    });

    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    if (menuData.length > 0) {
      // Clear today's items and re-insert
      db.prepare(`DELETE FROM menu_items WHERE date = ?`).run(today);

      const insert = db.prepare(`
        INSERT OR REPLACE INTO menu_items (external_id, name, description, category, dietary_tags, date, scraped_at, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      db.exec('BEGIN');
      try {
        menuData.forEach((item, idx) => {
          const extId = `${today}-${idx}-${item.name.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`;
          insert.run(extId, item.name, item.description, item.category, item.dietary_tags, today, now, now);
        });
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }
      db.prepare(`UPDATE scrape_meta SET last_scraped = ?, status = 'success', error = NULL WHERE id = 1`).run(now);
      console.log(`[SCRAPER] Scraped ${menuData.length} menu items`);
    } else {
      // Try to get fallback content from page title/any visible text
      const pageTitle = await page.title();
      console.log(`[SCRAPER] No structured menu found on page: ${pageTitle}`);

      // Insert placeholder items so the app doesn't look empty
      const placeholders = [
        { category: 'Notice', name: 'Menu Loading...', description: 'The menu is being updated. Please check back shortly or visit the dining hall directly.', dietary_tags: '' }
      ];

      db.prepare(`DELETE FROM menu_items WHERE date = ?`).run(today);
      const insert = db.prepare(`INSERT OR REPLACE INTO menu_items (external_id, name, description, category, dietary_tags, date, scraped_at, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      placeholders.forEach((item, idx) => {
        insert.run(`${today}-placeholder-${idx}`, item.name, item.description, item.category, item.dietary_tags, today, now, now);
      });

      db.prepare(`UPDATE scrape_meta SET last_scraped = ?, status = 'warning', error = 'No menu items found' WHERE id = 1`).run(now);
    }

  } catch (err) {
    console.error('[SCRAPER] Error:', err.message);
    db.prepare(`UPDATE scrape_meta SET status = 'error', error = ? WHERE id = 1`).run(err.message);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports.isDisabled = () => process.env.DISABLE_SCRAPER === 'true';

module.exports = { scrapeMenu };
