#!/usr/bin/env node
/**
 * neon-discrepancy-check.js — Neon Migration Parallel-Run Comparison
 *
 * During the 7-day parallel run, run this daily to detect drift between
 * Render PostgreSQL and Neon PostgreSQL. Compares row counts, checksums,
 * and schema diffs to ensure both databases stay in sync.
 *
 * Usage:
 *   node scripts/neon-discrepancy-check.js                  # one-shot check
 *   node scripts/neon-discrepancy-check.js --continuous 60  # every 60 min
 *   node scripts/neon-discrepancy-check.js --json           # JSON output
 *   node scripts/neon-discrepancy-check.js --baseline       # save baseline
 *   node scripts/neon-discrepancy-check.js --diff           # compare to baseline
 *
 * Environment variables:
 *   RENDER_DATABASE_URL  — Render PostgreSQL (legacy)
 *   NEON_DATABASE_URL    — Neon PostgreSQL (target)
 */

import pg from 'pg';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'backend', 'data');
const BASELINE_FILE = join(DATA_DIR, 'neon-baseline.json');
const DISCREPANCY_LOG = join(DATA_DIR, 'neon-discrepancies.log');

const TABLES = [
  'profiles', 'portfolio_items', 'ratings', 'user_settings',
  'feed_events', 'ai_summaries', 'pools', 'pool_members',
  'wallets', 'wallet_transactions', 'admin_settings',
  'campaigns', 'contributions', 'milestones',
  'milestone_votes', 'users', 'sessions', 'contact_messages',
  'verification_applications', 'verified_filmmakers',
];

const SCHEMA_TABLES = [
  'profiles', 'portfolio_items', 'ratings', 'user_settings',
  'wallets', 'wallet_transactions', 'admin_settings',
  'campaigns', 'contributions', 'milestones',
  'milestone_votes', 'users', 'sessions', 'contact_messages',
];

function env(name) {
  const v = process.env[name];
  if (!v) { console.error(`✗ Missing env: ${name}`); process.exit(1); }
  return v;
}

async function createClient(url) {
  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

async function getRowCounts(client) {
  const counts = {};
  for (const table of TABLES) {
    try {
      const res = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      counts[table] = res.rows[0].count;
    } catch {
      counts[table] = -1; // table doesn't exist
    }
  }
  return counts;
}

async function getChecksums(client) {
  const checksums = {};
  for (const table of TABLES) {
    try {
      const res = await client.query(`
        SELECT MD5(STRING_AGG(t::text, ',' ORDER BY t))
        FROM (
          SELECT ROW(t.*)::text AS t
          FROM ${table} t
          LIMIT 1000
        ) sub
      `);
      checksums[table] = res.rows[0]?.md5 || 'empty';
    } catch {
      checksums[table] = 'error';
    }
  }
  return checksums;
}

async function getSchemaDiff(renderClient, neonClient) {
  const diffs = [];
  for (const table of SCHEMA_TABLES) {
    try {
      const rRes = await renderClient.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      const nRes = await neonClient.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      const rCols = new Map(rRes.rows.map(c => [c.column_name, c]));
      const nCols = new Map(nRes.rows.map(c => [c.column_name, c]));

      // Check for columns in Render but not Neon
      for (const [name, col] of rCols) {
        if (!nCols.has(name)) {
          diffs.push({ table, column: name, issue: 'missing_in_neon', type: col.data_type });
        }
      }
      // Check for columns in Neon but not Render
      for (const [name, col] of nCols) {
        if (!rCols.has(name)) {
          diffs.push({ table, column: name, issue: 'extra_in_neon', type: col.data_type });
        }
      }
      // Check for type mismatches
      for (const [name, rCol] of rCols) {
        if (nCols.has(name)) {
          const nCol = nCols.get(name);
          if (rCol.data_type !== nCol.data_type) {
            diffs.push({ table, column: name, issue: 'type_mismatch', render: rCol.data_type, neon: nCol.data_type });
          }
        }
      }
    } catch {
      diffs.push({ table, issue: 'schema_check_error' });
    }
  }
  return diffs;
}

function logDiscrepancy(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  process.stdout.write(line);
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DISCREPANCY_LOG, line, { flag: 'a' });
}

function printReport(result) {
  const { timestamp, counts, checksums, schemaDiffs, mismatches, errors } = result;

  console.log(`\n━━━ Neon Discrepancy Check — ${timestamp} ━━━\n`);

  // Row counts
  console.log('  Table                    Render      Neon       Status');
  console.log('  ' + '─'.repeat(55));
  for (const table of TABLES) {
    const rc = counts.render[table];
    const nc = counts.neon[table];
    const match = rc === nc;
    const status = match ? '✓' : '✗ MISMATCH';
    console.log(`  ${table.padEnd(26)}${String(rc).padStart(7)}   ${String(nc).padStart(7)}   ${status}`);
  }

  // Checksums
  console.log('\n  Checksum Comparison:');
  let checksumMismatches = 0;
  for (const table of TABLES) {
    const rc = checksums.render[table];
    const nc = checksums.neon[table];
    const match = rc === nc;
    if (!match) {
      checksumMismatches++;
      console.log(`  ${table.padEnd(26)} Render: ${rc?.substring(0, 12) || 'n/a'}  Neon: ${nc?.substring(0, 12) || 'n/a'}  ✗`);
    }
  }
  if (checksumMismatches === 0) console.log('  All checksums match ✓');

  // Schema diffs
  if (schemaDiffs.length > 0) {
    console.log(`\n  Schema Differences (${schemaDiffs.length}):`);
    for (const d of schemaDiffs) {
      console.log(`  ${d.table}.${d.column || '?'}: ${d.issue}${d.render ? ` (${d.render} → ${d.neon})` : ''}`);
    }
  } else {
    console.log('\n  Schema: identical ✓');
  }

  // Summary
  const totalMismatches = mismatches + checksumMismatches + schemaDiffs.length + errors;
  console.log(`\n━━━ Summary: ${totalMismatches === 0 ? '✓ PASS — No discrepancies' : `✗ FAIL — ${totalMismatches} issue(s)`} ━━━`);

  return totalMismatches;
}

async function runOnce(options = {}) {
  const renderUrl = env('RENDER_DATABASE_URL');
  const neonUrl = env('NEON_DATABASE_URL');
  const jsonMode = options.json || false;

  const renderClient = await createClient(renderUrl);
  const neonClient = await createClient(neonUrl);

  try {
    const [rCounts, nCounts, rChecksums, nChecksums, schemaDiffs] = await Promise.all([
      getRowCounts(renderClient),
      getRowCounts(neonClient),
      getChecksums(renderClient),
      getChecksums(neonClient),
      getSchemaDiff(renderClient, neonClient),
    ]);

    let mismatches = 0;
    for (const table of TABLES) {
      if (rCounts[table] !== nCounts[table]) {
        logDiscrepancy(`ROW_COUNT ${table}: Render=${rCounts[table]} Neon=${nCounts[table]}`);
        mismatches++;
      }
    }
    for (const table of TABLES) {
      if (rChecksums[table] !== nChecksums[table]) {
        logDiscrepancy(`CHECKSUM ${table}: Render=${rChecksums[table]?.substring(0,12)} Neon=${nChecksums[table]?.substring(0,12)}`);
        mismatches++;
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      counts: { render: rCounts, neon: nCounts },
      checksums: { render: rChecksums, neon: nChecksums },
      schemaDiffs,
      mismatches,
      errors: 0,
    };

    if (jsonMode) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printReport(result);
    }

    return result;
  } finally {
    await renderClient.end();
    await neonClient.end();
  }
}

async function saveBaseline() {
  console.log('━━━ Saving baseline snapshot ━━━');
  const renderUrl = env('RENDER_DATABASE_URL');
  const neonUrl = env('NEON_DATABASE_URL');
  const renderClient = await createClient(renderUrl);
  const neonClient = await createClient(neonUrl);

  try {
    const counts = await getRowCounts(neonClient);
    const checksums = await getChecksums(neonClient);
    const baseline = { timestamp: new Date().toISOString(), counts, checksums };
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
    console.log(`  ✓ Baseline saved: ${BASELINE_FILE}`);
    console.log(`    ${Object.keys(counts).length} tables, timestamp: ${baseline.timestamp}`);
  } finally {
    await renderClient.end();
    await neonClient.end();
  }
}

async function compareBaseline() {
  if (!existsSync(BASELINE_FILE)) {
    console.error('✗ No baseline file found. Run with --baseline first.');
    process.exit(1);
  }

  console.log('━━━ Comparing current state to baseline ━━━');
  const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));
  console.log(`  Baseline taken: ${baseline.timestamp}\n`);

  const neonUrl = env('NEON_DATABASE_URL');
  const neonClient = await createClient(neonUrl);

  try {
    const currentCounts = await getRowCounts(neonClient);
    let issues = 0;

    for (const table of TABLES) {
      const base = baseline.counts[table];
      const curr = currentCounts[table];
      if (base === undefined) continue;

      const delta = curr - base;
      const sign = delta >= 0 ? '+' : '';
      const status = delta === 0 ? '  ' : `${sign}${delta}`;
      const flag = delta < 0 ? ' ✗ DECREASED' : (delta > 0 ? ' ✓' : '');
      console.log(`  ${table.padEnd(26)} ${String(base).padStart(7)} → ${String(curr).padStart(7)}  (${status})${flag}`);
      if (delta < 0) { issues++; logDiscrepancy(`REGRESSION ${table}: baseline=${base} current=${curr}`); }
    }

    console.log(`\n━━━ ${issues === 0 ? '✓ No regressions detected' : `✗ ${issues} table(s) decreased`} ━━━`);
  } finally {
    await neonClient.end();
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
CineX Neon Discrepancy Check

Usage:
  node scripts/neon-discrepancy-check.js                  One-shot check
  node scripts/neon-discrepancy-check.js --json           JSON output
  node scripts/neon-discrepancy-check.js --baseline       Save Neon baseline
  node scripts/neon-discrepancy-check.js --diff           Compare to baseline
  node scripts/neon-discrepancy-check.js --continuous 60  Check every 60 min

Environment variables:
  RENDER_DATABASE_URL   Render PostgreSQL connection string
  NEON_DATABASE_URL     Neon PostgreSQL connection string

Parallel Run Strategy:
  1. Run migration with neon-migrate.js --full
  2. Save baseline: neon-discrepancy-check.js --baseline
  3. Daily: neon-discrepancy-check.js (check for drift)
  4. Weekly: neon-discrepancy-check.js --diff (compare to baseline)
  5. After 7 days clean: decommission Render (see NEON_MIGRATION.md)
`);
  process.exit(0);
}

if (args.includes('--baseline')) {
  await saveBaseline();
  process.exit(0);
}

if (args.includes('--diff')) {
  await compareBaseline();
  process.exit(0);
}

if (args.includes('--continuous')) {
  const idx = args.indexOf('--continuous');
  const interval = parseInt(args[idx + 1]) || 60;
  console.log(`Starting continuous monitoring (every ${interval} minutes)...\n`);

  const check = async () => {
    await runOnce({ json: args.includes('--json') });
    console.log(`\nNext check in ${interval} minutes...\n`);
  };

  await check();
  setInterval(check, interval * 60 * 1000);
} else {
  await runOnce({ json: args.includes('--json') });
}
