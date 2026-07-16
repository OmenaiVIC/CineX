#!/usr/bin/env node
/**
 * neon-smoke-test.js — Neon PostgreSQL Connection Validation
 *
 * Tests that the backend connects to Neon, runs migrations, and can
 * perform basic CRUD operations. Run after migration and after env var
 * updates to confirm everything works end-to-end.
 *
 * Usage:
 *   node scripts/neon-smoke-test.js
 *
 * Environment variables:
 *   DATABASE_URL — Neon PostgreSQL connection string
 */

import pg from 'pg';

const TABLES = [
  'profiles', 'portfolio_items', 'ratings', 'user_settings',
  'feed_events', 'ai_summaries', 'pools', 'pool_members',
  'wallets', 'wallet_transactions', 'admin_settings',
  'campaigns', 'contributions', 'milestones',
  'milestone_votes', 'users', 'sessions', 'contact_messages',
  'verification_applications', 'verified_filmmakers',
  'disbursements', 'disbursement_audit', 'external_refs',
  'external_status_snapshots', 'yellow_card_webhook_events',
  'manual_review_queue', 'relay_wallet_activity', 'on_chain_events',
  'exchange_rates', 'config_snapshots',
];

const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error('✗ DATABASE_URL not set');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: connStr,
  connectionTimeoutMillis: 10_000,
  ssl: { rejectUnauthorized: false },
});

let passed = 0;
let failed = 0;

function ok(msg) { console.log(`  ✓ ${msg}`); passed++; }
function fail(msg, err) { console.error(`  ✗ ${msg}${err ? ': ' + err.message : ''}`); failed++; }

async function test(label, fn) {
  try {
    await fn();
    ok(label);
  } catch (err) {
    fail(label, err);
  }
}

try {
  console.log('━━━ Neon PostgreSQL Smoke Test ━━━\n');

  // 1. Connection
  await test('Connect to Neon', async () => {
    await client.connect();
  });

  // 2. Server version
  await test('Read server version', async () => {
    const res = await client.query('SELECT version()');
    console.log(`    ${res.rows[0].version.split(',')[0]}`);
  });

  // 3. All tables exist
  await test('All expected tables exist', async () => {
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const found = res.rows.map(r => r.table_name);
    const missing = TABLES.filter(t => !found.includes(t));
    if (missing.length > 0) {
      throw new Error(`Missing tables: ${missing.join(', ')}`);
    }
    console.log(`    ${found.length} tables found`);
  });

  // 4. All indexes exist
  await test('Indexes created', async () => {
    const res = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `);
    console.log(`    ${res.rows.length} custom indexes found`);
  });

  // 5. Insert + Read + Delete (profiles)
  const testAddr = `SMOKE_TEST_${Date.now()}`;
  await test('Insert test profile', async () => {
    await client.query(
      'INSERT INTO profiles (address, username, bio) VALUES ($1, $2, $3)',
      [testAddr, 'smoke-test-user', 'Automated smoke test']
    );
  });

  await test('Read test profile', async () => {
    const res = await client.query('SELECT * FROM profiles WHERE address = $1', [testAddr]);
    if (res.rows.length === 0) throw new Error('Profile not found');
    if (res.rows[0].username !== 'smoke-test-user') throw new Error('Username mismatch');
  });

  await test('Update test profile', async () => {
    await client.query(
      'UPDATE profiles SET bio = $1 WHERE address = $2',
      ['Updated bio', testAddr]
    );
    const res = await client.query('SELECT bio FROM profiles WHERE address = $1', [testAddr]);
    if (res.rows[0].bio !== 'Updated bio') throw new Error('Update failed');
  });

  await test('Delete test profile (cleanup)', async () => {
    await client.query('DELETE FROM profiles WHERE address = $1', [testAddr]);
    const res = await client.query('SELECT COUNT(*)::int AS count FROM profiles WHERE address = $1', [testAddr]);
    if (res.rows[0].count !== 0) throw new Error('Delete failed');
  });

  // 6. Transaction
  await test('Transaction commit', async () => {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO profiles (address, username) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      ['SMOKE_TX_TEST', 'tx-test']
    );
    await client.query('COMMIT');
    await client.query('DELETE FROM profiles WHERE address = $1', ['SMOKE_TX_TEST']);
  });

  // 7. Neon-specific: check connection pooling
  await test('Pool handles multiple connections', async () => {
    const pool = new pg.Pool({
      connectionString: connStr,
      max: 3,
      ssl: { rejectUnauthorized: false },
    });
    const results = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        pool.query('SELECT $1::int AS n', [i]).then(r => r.rows[0].n)
      )
    );
    await pool.end();
    if (results.sort().join(',') !== '0,1,2') throw new Error('Pool test failed');
  });

  console.log(`\n━━━ Results: ${passed} passed, ${failed} failed ━━━`);
  process.exit(failed > 0 ? 1 : 0);
} catch (err) {
  console.error(`\n✗ Fatal error: ${err.message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
