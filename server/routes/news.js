const express = require('express');
const router = express.Router();

// In-memory cache
let cache = null;
let cacheTime = 0;
const CACHE_MS = 15 * 60 * 1000; // 15 minutes

function cdataOrText(xml, tag) {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(cdataRe) || xml.match(plainRe);
  return m ? m[1].trim() : '';
}

function parseItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const chunk = m[1];

    const title = cdataOrText(chunk, 'title');
    const link  = cdataOrText(chunk, 'link') ||
                  (chunk.match(/<link>([^<]+)<\/link>/) || [])[1] || '';
    const author     = cdataOrText(chunk, 'dc:creator');
    const pubDate    = cdataOrText(chunk, 'pubDate');
    const rawDesc    = cdataOrText(chunk, 'description');
    const content    = cdataOrText(chunk, 'content:encoded');

    // strip HTML & trailing "The post … first appeared on …" boilerplate
    const cleanDesc = rawDesc
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/The post .+?first appeared on .+?\./s, '')
      .trim()
      .slice(0, 280);

    // categories
    const cats = [];
    const catRe = /<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g;
    let c;
    while ((c = catRe.exec(chunk)) !== null) cats.push(c[1].trim());

    // first image from content:encoded
    const imgM = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    const image = imgM ? imgM[1] : null;

    if (title && link) {
      items.push({ title, link, author, pubDate, categories: cats, description: cleanDesc, image });
    }
  }
  return items;
}

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_MS) {
      return res.json({ articles: cache, cached: true, fetchedAt: new Date(cacheTime).toISOString() });
    }

    const response = await fetch('https://lionsroarnews.com/feed/', {
      headers: { 'User-Agent': 'ManeDishHub/1.0 RSS Reader' },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);

    const xml = await response.text();
    const articles = parseItems(xml);

    cache = articles;
    cacheTime = now;

    res.json({ articles, cached: false, fetchedAt: new Date(now).toISOString() });
  } catch (err) {
    console.error('[NEWS] Fetch error:', err.message);
    if (cache) {
      return res.json({ articles: cache, cached: true, fetchedAt: new Date(cacheTime).toISOString(), stale: true });
    }
    res.status(502).json({ error: 'Could not load news feed', articles: [] });
  }
});

module.exports = router;
