import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;
let _initialized = false;

function cvt(sql) {
  const params = [];
  return {
    sql: sql.replace(/\$(\d+)/g, (_, n) => { params.push(Number(n)); return '?'; }),
    map: params,
  };
}

function expandParams(sql, origParams) {
  const { sql: converted, map } = cvt(sql);
  return { sql: converted, params: map.map(i => origParams[i - 1]) };
}

class SqliteCompat {
  constructor(database) { this.db = database; }

  async get(sql, params = []) {
    const { sql: s, params: p } = expandParams(sql, params);
    return this.db.prepare(s).get(...p) || null;
  }

  async all(sql, params = []) {
    const { sql: s, params: p } = expandParams(sql, params);
    return this.db.prepare(s).all(...p);
  }

  async run(sql, params = []) {
    const isInsert = /^\s*INSERT\s/i.test(sql);
    const { sql: s, params: p } = expandParams(sql, params);
    const stmt = this.db.prepare(s);
    const result = stmt.run(...p);
    let row = null;
    if (isInsert && result.lastInsertRowid) {
      const id = Number(result.lastInsertRowid);
      const table = extractTable(sql);
      try {
        row = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) || null;
      } catch { /* table may not have id column */ }
    }
    return {
      lastInsertRowid: row?.id ?? null,
      changes: result.changes,
      rows: row ? [row] : [],
    };
  }

  release() { /* no-op for SQLite */ }
}

function extractTable(sql) {
  const m = sql.match(/INSERT\s+(?:INTO\s+)?(\w+)/i);
  return m ? m[1] : '(SELECT 1)';
}

export async function initDb() {
  if (_initialized) return;
  const dataDir = join(__dirname, '..', 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  db = new DatabaseSync(join(dataDir, 'cinex.db'));
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA foreign_keys=ON');
  execSchema();
  try { db.exec('ALTER TABLE portfolio_items ADD COLUMN thumbnail_url TEXT'); } catch (_) {}
  _initialized = true;
  console.log('✅ SQLite database ready (fallback)');
}

export async function getDb() {
  if (!db) throw new Error('Database not initialized');
  return new SqliteCompat(db);
}

export async function closeDb() {
  if (db) { db.close(); db = null; _initialized = false; }
}

function execSchema() {
  const sql = `
    CREATE TABLE IF NOT EXISTS profiles (
      address TEXT PRIMARY KEY, username TEXT UNIQUE, bio TEXT, avatar_url TEXT,
      portfolio_url TEXT, social_twitter TEXT, social_instagram TEXT, social_website TEXT,
      verification_level TEXT DEFAULT 'unverified' CHECK(verification_level IN ('unverified','1-tier','2-tier','3-tier')),
      created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS portfolio_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, address TEXT NOT NULL REFERENCES profiles(address) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, category TEXT, role TEXT, year INTEGER,
      media_urls TEXT DEFAULT '[]', awards TEXT DEFAULT '[]', thumbnail_url TEXT,
      created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, rater_address TEXT NOT NULL, target_address TEXT NOT NULL REFERENCES profiles(address) ON DELETE CASCADE,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5), comment TEXT, comment_hash TEXT, tx_id TEXT, project_id TEXT, category TEXT,
      created_at INTEGER DEFAULT (unixepoch()), UNIQUE(rater_address, target_address, project_id)
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      address TEXT PRIMARY KEY REFERENCES profiles(address) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('creative', 'backer')), onboarding_completed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS feed_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, event_data TEXT NOT NULL DEFAULT '{}',
      actor TEXT, pool_id INTEGER, campaign_id INTEGER, block_height INTEGER, tx_id TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_feed_pool ON feed_events(pool_id);
    CREATE INDEX IF NOT EXISTS idx_feed_actor ON feed_events(actor);
    CREATE INDEX IF NOT EXISTS idx_feed_created ON feed_events(created_at DESC);
    CREATE TABLE IF NOT EXISTS ai_summaries (
      address TEXT PRIMARY KEY, summary TEXT NOT NULL, model TEXT NOT NULL DEFAULT 'gpt-4',
      generated_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '',
      creator TEXT NOT NULL, target_amount TEXT NOT NULL, current_amount TEXT DEFAULT '0',
      min_commitment TEXT DEFAULT '0', max_members INTEGER DEFAULT 10, deadline INTEGER DEFAULT 0,
      category TEXT DEFAULT 'short-film',
      status TEXT DEFAULT 'open' CHECK(status IN ('open','active','funded','closed')),
      return_rate TEXT, created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS pool_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, pool_id INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      address TEXT NOT NULL, committed TEXT NOT NULL DEFAULT '0',
      role TEXT DEFAULT 'member' CHECK(role IN ('creator','member')),
      joined_at INTEGER DEFAULT (unixepoch()), UNIQUE(pool_id, address)
    );
    CREATE INDEX IF NOT EXISTS idx_pools_status ON pools(status);
    CREATE INDEX IF NOT EXISTS idx_pools_category ON pools(category);
    CREATE INDEX IF NOT EXISTS idx_pool_members_pool ON pool_members(pool_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_target ON ratings(target_address);
    CREATE INDEX IF NOT EXISTS idx_portfolio_address ON portfolio_items(address);
    -- wallets (migration-compatible)
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL UNIQUE, email TEXT, phone TEXT,
      pillar_wallet_address TEXT, bns_name TEXT, stx_address TEXT, btc_address TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','suspended')),
      naira_balance INTEGER DEFAULT 0, usd_balance INTEGER DEFAULT 0, sbtc_balance TEXT DEFAULT '0',
      preferred_currency TEXT DEFAULT 'NGN',
      created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch()), activated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('deposit','withdrawal','send','receive','fee','swap')),
      amount_naira INTEGER DEFAULT 0, amount_usd INTEGER DEFAULT 0, amount_sbtc TEXT DEFAULT '0',
      currency TEXT DEFAULT 'NGN', asset TEXT DEFAULT 'STX',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','failed','cancelled')),
      reference TEXT, tx_id TEXT, counterparty TEXT, conversion_rate_ngn_usd TEXT, description TEXT, metadata TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch()), confirmed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_wallets_pillar ON wallets(pillar_wallet_address);
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_status ON wallet_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at DESC);
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT,
      creator TEXT NOT NULL REFERENCES profiles(address) ON DELETE CASCADE,
      target_amount TEXT NOT NULL, current_amount TEXT DEFAULT '0', deadline INTEGER DEFAULT 0,
      category TEXT, status TEXT DEFAULT 'active',
      media_urls TEXT DEFAULT '[]', tags TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      contributor TEXT NOT NULL, amount TEXT NOT NULL, tx_id TEXT, message TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator);
    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_contributions_campaign ON contributions(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_contributor ON contributions(contributor);
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, funding_required TEXT NOT NULL, deadline INTEGER,
      status TEXT DEFAULT 'pending', deliverables TEXT DEFAULT '[]', completed_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_milestones_campaign ON milestones(campaign_id);
    CREATE TABLE IF NOT EXISTS verification_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, applicant TEXT NOT NULL REFERENCES profiles(address) ON DELETE CASCADE,
      name TEXT NOT NULL, bio TEXT, portfolio_url TEXT, previous_works TEXT DEFAULT '[]',
      social_media TEXT DEFAULT '{}', bond_amount TEXT DEFAULT '0', documents TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending', submitted_at INTEGER DEFAULT (unixepoch()),
      reviewed_at INTEGER, reviewer TEXT, rejection_reason TEXT, updated_at INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_vapp_applicant ON verification_applications(applicant);
    CREATE INDEX IF NOT EXISTS idx_vapp_status ON verification_applications(status);
    CREATE TABLE IF NOT EXISTS verified_filmmakers (
      address TEXT PRIMARY KEY REFERENCES profiles(address) ON DELETE CASCADE,
      name TEXT NOT NULL, bio TEXT, portfolio_url TEXT, previous_works TEXT DEFAULT '[]',
      social_media TEXT DEFAULT '{}', verified_at INTEGER DEFAULT (unixepoch()),
      credibility_score INTEGER DEFAULT 0, completed_campaigns INTEGER DEFAULT 0,
      total_funded_amount TEXT DEFAULT '0'
    );
    CREATE TABLE IF NOT EXISTS milestone_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      voter_address TEXT NOT NULL, contribution_weight INTEGER NOT NULL, approved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()), UNIQUE(milestone_id, voter_address)
    );
    CREATE INDEX IF NOT EXISTS idx_milestone_votes_milestone ON milestone_votes(milestone_id);
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, address TEXT UNIQUE, email TEXT UNIQUE, password_hash TEXT,
      display_name TEXT NOT NULL DEFAULT '', role TEXT DEFAULT 'creative',
      created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general', message TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER DEFAULT (unixepoch())
    );
  `;
  for (const stmt of sql.split(';').filter(s => s.trim())) {
    try { db.exec(stmt + ';'); } catch (e) { /* ignore if already exists */ }
  }
  migrateWallets();
}

function migrateWallets() {
  try {
    const cols = db.prepare("PRAGMA table_info('wallets')").all().map(r => r.name);
    if (!cols.includes('usd_balance')) db.exec("ALTER TABLE wallets ADD COLUMN usd_balance INTEGER DEFAULT 0");
    if (!cols.includes('preferred_currency')) db.exec("ALTER TABLE wallets ADD COLUMN preferred_currency TEXT DEFAULT 'NGN'");
    const txCols = db.prepare("PRAGMA table_info('wallet_transactions')").all().map(r => r.name);
    if (!txCols.includes('amount_usd')) db.exec("ALTER TABLE wallet_transactions ADD COLUMN amount_usd INTEGER DEFAULT 0");
    if (!txCols.includes('conversion_rate_ngn_usd')) db.exec("ALTER TABLE wallet_transactions ADD COLUMN conversion_rate_ngn_usd TEXT");
    const rCols = db.prepare("PRAGMA table_info('ratings')").all().map(r => r.name);
    if (!rCols.includes('category')) db.exec("ALTER TABLE ratings ADD COLUMN category TEXT");
  } catch (e) { /* migration may already be applied */ }
}
