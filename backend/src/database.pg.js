import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pool = null;
let _initialized = false;
let driverName = 'pg';

async function createPool() {
  const connStr = process.env.DATABASE_URL;

  // Prefer @neondatabase/serverless when explicitly requested or on Vercel
  const useNeon = process.env.NEON_DRIVER === 'serverless'
    || (typeof process.env.VERCEL === 'string'); // Vercel sets VERCEL=1

  if (useNeon) {
    try {
      const neon = await import('@neondatabase/serverless');
      // Enable WebSocket connections for Vercel edge runtime
      try {
        const ws = await import('ws');
        neon.neonConfig.webSocketConstructor = ws.default || ws;
      } catch { /* ws optional in some runtimes */ }
      driverName = 'neon-serverless';
      const p = new neon.Pool({ connectionString: connStr, max: 5 });
      p.on?.('error', (err) => console.error('[neon] Pool error:', err.message));
      return p;
    } catch (err) {
      console.warn(`[pg] Neon driver unavailable (${err.message}), falling back to pg`);
    }
  }

  // Standard pg driver (local dev, non-Vercel deployments)
  const pg = (await import('pg')).default;
  driverName = 'pg';
  const p = new pg.Pool({
    connectionString: connStr,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  p.on('error', (err) => console.error('[pg] Pool error:', err.message));
  return p;
}

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

  release() {
    // Neon serverless Pool doesn't have .release() on connection objects
    // the same way pg does; the Pool handles cleanup automatically
    if (typeof this.client.release === 'function') {
      this.client.release();
    }
  }
}

export async function initDb() {
  if (_initialized) return;
  pool = await createPool();
  await runMigrations();
  _initialized = true;
  console.log(`✅ PostgreSQL connected (${driverName} driver)`);
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    const dir = join(__dirname, 'migrations');
    const files = ['001_initial.sql', '002_campaigns.sql', '003_milestone_votes.sql', '004_auth.sql', '005_contact.sql', '006_bos_schema.sql', '007_bos_monitoring.sql', '008_relay_sponsorship.sql'];
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
  } finally {
    if (typeof client.release === 'function') client.release();
  }
}

export async function getDb() {
  if (!pool) throw new Error('Database not initialized');
  const client = await pool.connect();
  return new PgClient(client);
}

export async function closeDb() {
  if (pool) { await pool.end(); pool = null; _initialized = false; }
}
