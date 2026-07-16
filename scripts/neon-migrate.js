#!/usr/bin/env node
/**
 * neon-migrate.js — CineX Neon PostgreSQL Migration
 *
 * This script performs a pg_dump → pg_restore migration from Render PostgreSQL
 * to Neon PostgreSQL. It requires the `pg_dump` and `pg_restore` CLI tools
 * (part of the PostgreSQL client package).
 *
 * Usage:
 *   node scripts/neon-migrate.js --dump    # Step 1: pg_dump from Render
 *   node scripts/neon-migrate.js --restore # Step 2: pg_restore to Neon
 *   node scripts/neon-migrate.js --full    # Step 1 + 2 in sequence
 *   node scripts/neon-migrate.js --verify  # Step 3: row count comparison
 *
 * Environment variables (from .env or shell):
 *   RENDER_DATABASE_URL  — Render PostgreSQL connection string
 *   NEON_DATABASE_URL    — Neon PostgreSQL connection string
 *
 * The dump file is written to backend/data/neon-migration-dump.sql
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const DUMP_FILE = join(ROOT, 'backend', 'data', 'neon-migration-dump.sql');

function env(name) {
  const v = process.env[name];
  if (!v) { console.error(`✗ Missing env: ${name}`); process.exit(1); }
  return v;
}

function run(cmd) {
  console.log(`  $ ${cmd}`);
  try {
    const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', timeout: 300_000 });
    return out;
  } catch (err) {
    console.error(`✗ Command failed: ${err.stderr || err.message}`);
    process.exit(1);
  }
}

// ── Step 1: pg_dump ────────────────────────────────────────────────────────
async function dump() {
  const renderUrl = env('RENDER_DATABASE_URL');
  const dir = dirname(DUMP_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  console.log('━━━ Step 1: pg_dump from Render PostgreSQL ━━━');
  console.log(`  Source: ${renderUrl.replace(/:[^@]+@/, ':***@')}`);

  // pg_dump with --no-owner --no-privileges for clean restore to different role
  const cmd = `pg_dump --no-owner --no-privileges --no-comments --schema-only --file="${DUMP_FILE}" "${renderUrl}"`;
  run(cmd);

  const stat = readFileSync(DUMP_FILE, 'utf-8');
  const tableCount = (stat.match(/CREATE TABLE/g) || []).length;
  const indexCount = (stat.match(/CREATE INDEX/g) || []).length;
  console.log(`  ✓ Dump written: ${DUMP_FILE}`);
  console.log(`    Tables: ${tableCount}, Indexes: ${indexCount}`);
}

// ── Step 2: pg_restore ─────────────────────────────────────────────────────
async function restore() {
  const neonUrl = env('NEON_DATABASE_URL');

  if (!existsSync(DUMP_FILE)) {
    console.error(`✗ Dump file not found: ${DUMP_FILE}`);
    console.error('  Run with --dump first.');
    process.exit(1);
  }

  console.log('━━━ Step 2: pg_restore to Neon PostgreSQL ━━━');
  console.log(`  Target: ${neonUrl.replace(/:[^@]+@/, ':***@')}`);

  // Neon uses --no-restore-options since some flags aren't supported
  const sql = readFileSync(DUMP_FILE, 'utf-8');

  const client = new createClient({ connectionString: neonUrl });
  await client.connect();

  try {
    // Split on semicolons outside of quoted strings (basic split)
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let applied = 0;
    for (const stmt of statements) {
      try {
        await client.query(stmt + ';');
        applied++;
      } catch (err) {
        // Most "already exists" errors are fine for idempotent migration
        if (err.code === '42710' || err.code === '42P07' || err.code === '23505') {
          // DuplicateObject, DuplicateTable, UniqueViolation — skip
        } else {
          console.error(`  ⚠ Statement failed (${err.code}): ${stmt.substring(0, 80)}...`);
          console.error(`    ${err.message}`);
        }
      }
    }
    console.log(`  ✓ Applied ${applied}/${statements.length} statements`);
    console.log('  ✓ Restore complete');
  } finally {
    await client.end();
  }
}

// ── Step 3: Verify row counts ──────────────────────────────────────────────
async function verify() {
  const renderUrl = env('RENDER_DATABASE_URL');
  const neonUrl = env('NEON_DATABASE_URL');

  console.log('━━━ Step 3: Verify row counts (Render vs Neon) ━━━');

  const TABLES = [
    'profiles', 'portfolio_items', 'ratings', 'user_settings',
    'feed_events', 'ai_summaries', 'pools', 'pool_members',
    'wallets', 'wallet_transactions', 'admin_settings',
    'campaigns', 'contributions', 'milestones',
    'milestone_votes', 'users', 'sessions', 'contact_messages',
    'verification_applications', 'verified_filmmakers',
  ];

  const renderClient = new createClient({ connectionString: renderUrl });
  const neonClient = new createClient({ connectionString: neonUrl });
  await renderClient.connect();
  await neonClient.connect();

  let mismatches = 0;

  try {
    for (const table of TABLES) {
      const rRow = await renderClient.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      const nRow = await neonClient.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      const rc = rRow.rows[0].count;
      const nc = nRow.rows[0].count;
      const match = rc === nc ? '✓' : '✗ MISMATCH';
      if (rc !== nc) mismatches++;
      console.log(`  ${table.padEnd(30)} Render: ${String(rc).padStart(6)}  Neon: ${String(nc).padStart(6)}  ${match}`);
    }

    console.log('');
    if (mismatches === 0) {
      console.log('  ✓ All table row counts match — migration verified');
    } else {
      console.error(`  ✗ ${mismatches} table(s) have mismatched row counts`);
      process.exit(1);
    }
  } finally {
    await renderClient.end();
    await neonClient.end();
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
const arg = process.argv[2];

switch (arg) {
  case '--dump':
    await dump();
    break;
  case '--restore':
    await restore();
    break;
  case '--full':
    await dump();
    await restore();
    await verify();
    break;
  case '--verify':
    await verify();
    break;
  default:
    console.log(`
CineX Neon Migration Script

Usage:
  node scripts/neon-migrate.js --dump      Step 1: pg_dump from Render
  node scripts/neon-migrate.js --restore   Step 2: pg_restore to Neon
  node scripts/neon-migrate.js --full      Steps 1+2+3 (full migration)
  node scripts/neon-migrate.js --verify    Step 3: row count comparison

Environment variables:
  RENDER_DATABASE_URL   Render PostgreSQL connection string
  NEON_DATABASE_URL     Neon PostgreSQL connection string

Requires: pg_dump, pg_restore (PostgreSQL client package)
`);
}
