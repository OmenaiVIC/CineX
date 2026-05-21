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

    CREATE TABLE IF NOT EXISTS pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      creator TEXT NOT NULL,
      target_amount TEXT NOT NULL,
      current_amount TEXT DEFAULT '0',
      min_commitment TEXT DEFAULT '0',
      max_members INTEGER DEFAULT 10,
      deadline INTEGER DEFAULT 0,
      category TEXT DEFAULT 'short-film',
      status TEXT DEFAULT 'open' CHECK(status IN ('open','active','funded','closed')),
      return_rate TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS pool_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_id INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      committed TEXT NOT NULL DEFAULT '0',
      role TEXT DEFAULT 'member' CHECK(role IN ('creator','member')),
      joined_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(pool_id, address)
    );

    CREATE INDEX IF NOT EXISTS idx_pools_status ON pools(status);
    CREATE INDEX IF NOT EXISTS idx_pools_category ON pools(category);
    CREATE INDEX IF NOT EXISTS idx_pool_members_pool ON pool_members(pool_id);

    CREATE INDEX IF NOT EXISTS idx_ratings_target ON ratings(target_address);
    CREATE INDEX IF NOT EXISTS idx_portfolio_address ON portfolio_items(address);

    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      email TEXT,
      phone TEXT,
      pillar_wallet_address TEXT,
      bns_name TEXT,
      stx_address TEXT,
      btc_address TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','suspended')),
      naira_balance INTEGER DEFAULT 0,
      sbtc_balance TEXT DEFAULT '0',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('deposit','withdrawal','send','receive','fee','swap')),
      amount_naira INTEGER DEFAULT 0,
      amount_sbtc TEXT DEFAULT '0',
      asset TEXT DEFAULT 'STX',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','failed','cancelled')),
      reference TEXT,
      tx_id TEXT,
      counterparty TEXT,
      description TEXT,
      metadata TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch()),
      confirmed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_wallets_pillar ON wallets(pillar_wallet_address);
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_status ON wallet_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at DESC);

    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch())
    );
  `);

  migrateSchema();
}

function migrateSchema() {
  const cols = db.prepare("PRAGMA table_info('wallets')").all().map(r => r.name);
  if (!cols.includes('usd_balance')) {
    db.exec("ALTER TABLE wallets ADD COLUMN usd_balance INTEGER DEFAULT 0");
  }
  if (!cols.includes('preferred_currency')) {
    db.exec("ALTER TABLE wallets ADD COLUMN preferred_currency TEXT DEFAULT 'NGN' CHECK(preferred_currency IN ('NGN', 'USD'))");
  }
  const txCols = db.prepare("PRAGMA table_info('wallet_transactions')").all().map(r => r.name);
  if (!txCols.includes('amount_usd')) {
    db.exec("ALTER TABLE wallet_transactions ADD COLUMN amount_usd INTEGER DEFAULT 0");
  }
  if (!txCols.includes('conversion_rate_ngn_usd')) {
    db.exec("ALTER TABLE wallet_transactions ADD COLUMN conversion_rate_ngn_usd TEXT");
  }
}
