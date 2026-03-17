const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(path.join(dbDir, 'mane-dish.db'));
  }
  return db;
}

function initDb() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      dietary_tags TEXT,
      date TEXT,
      scraped_at TEXT,
      last_updated TEXT
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      vote_type TEXT NOT NULL CHECK(vote_type IN ('eat', 'pass')),
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      username TEXT NOT NULL,
      comment TEXT NOT NULL,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      caption TEXT,
      username TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scrape_meta (
      id INTEGER PRIMARY KEY,
      last_scraped TEXT,
      status TEXT,
      error TEXT
    );

    INSERT OR IGNORE INTO scrape_meta (id, last_scraped, status) VALUES (1, NULL, 'pending');

    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      current_username TEXT NOT NULL,
      requested_name TEXT,
      slu_card_filename TEXT,
      verified INTEGER DEFAULT 0,
      pending_review INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Add is_admin column to existing chat_messages tables (safe to run multiple times)
  try { database.exec('ALTER TABLE chat_messages ADD COLUMN is_admin INTEGER DEFAULT 0'); } catch (_) {}

  const sluCardsDir = path.join(__dirname, '../uploads/slu-cards');
  if (!fs.existsSync(sluCardsDir)) fs.mkdirSync(sluCardsDir, { recursive: true });

  console.log('[DB] Database initialized');
}

module.exports = { getDb, initDb };
