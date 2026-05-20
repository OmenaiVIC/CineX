import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'data', 'cinex.db');

let db;

export function getDb() {
  if (!db) {
    const dataDir = join(__dirname, '..', 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode=WAL');
    db.exec('PRAGMA foreign_keys=ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      address TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      bio TEXT,
      avatar_url TEXT,
      portfolio_url TEXT,
      social_twitter TEXT,
      social_instagram TEXT,
      social_website TEXT,
      verification_level TEXT DEFAULT 'unverified' CHECK(verification_level IN ('unverified','1-tier','2-tier','3-tier')),
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS portfolio_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL REFERENCES profiles(address) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT CHECK(category IN ('short-film','feature','documentary','music-video','web-series')),
      role TEXT,
      year INTEGER,
      media_urls TEXT DEFAULT '[]',
      awards TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rater_address TEXT NOT NULL,
      target_address TEXT NOT NULL REFERENCES profiles(address) ON DELETE CASCADE,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
      comment TEXT,
      comment_hash TEXT,
      tx_id TEXT,
      project_id TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(rater_address, target_address, project_id)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      address TEXT PRIMARY KEY REFERENCES profiles(address) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('creative', 'backer')),
      onboarding_completed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS feed_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      event_data TEXT NOT NULL DEFAULT '{}',
      actor TEXT,
      pool_id INTEGER,
      campaign_id INTEGER,
      block_height INTEGER,
      tx_id TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_feed_pool ON feed_events(pool_id);
    CREATE INDEX IF NOT EXISTS idx_feed_actor ON feed_events(actor);
    CREATE INDEX IF NOT EXISTS idx_feed_created ON feed_events(created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_summaries (
      address TEXT PRIMARY KEY,
      summary TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'gpt-4',
      generated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_ratings_target ON ratings(target_address);
    CREATE INDEX IF NOT EXISTS idx_portfolio_address ON portfolio_items(address);
  `);
}
