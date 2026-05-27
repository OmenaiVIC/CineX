import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pool = null;
let _initialized = false;

class PgClient {
  constructor(client) { this.client = client; }

  async get(sql, params = []) {
    const { rows } = await this.client.query(sql, params);
    return rows[0] || null;
  }

  async all(sql, params = []) {
    const { rows } = await this.client.query(sql, params);
    return rows;
  }

  async run(sql, params = []) {
    const isInsert = /^\s*INSERT\s/i.test(sql);
    const hasReturning = /\bRETURNING\b/i.test(sql);
    if (isInsert && !hasReturning) {
      sql = sql.replace(/;\s*$/, '') + ' RETURNING *';
    }
    const result = await this.client.query(sql, params);
    return {
      lastInsertRowid: result.rows?.[0]?.id ?? null,
      changes: result.rowCount,
      rows: result.rows,
    };
  }

  release() { this.client.release(); }
}

export async function initDb() {
  if (_initialized) return;
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (err) => console.error('[pg] Pool error:', err.message));
  await runMigrations();
  _initialized = true;
  console.log('✅ PostgreSQL connected');
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    const dir = join(__dirname, 'migrations');
    const files = ['001_initial.sql', '002_campaigns.sql', '003_milestone_votes.sql', '004_auth.sql', '005_contact.sql'];
    for (const file of files) {
      const fp = join(dir, file);
      if (!existsSync(fp)) { console.warn(`  Migration ${file} not found`); continue; }
      await client.query(readFileSync(fp, 'utf-8'));
      console.log(`  ✓ Migration ${file} applied`);
    }
    // Post-migration: add columns that may have been added in later schema updates
    for (const alter of [
      "ALTER TABLE ratings ADD COLUMN IF NOT EXISTS category TEXT",
    ]) {
      try { await client.query(alter); } catch { /* column may already exist */ }
    }
    console.log('✅ All migrations complete');
  } finally { client.release(); }
}

export async function getDb() {
  if (!pool) throw new Error('Database not initialized');
  const client = await pool.connect();
  return new PgClient(client);
}

export async function closeDb() {
  if (pool) { await pool.end(); pool = null; _initialized = false; }
}
