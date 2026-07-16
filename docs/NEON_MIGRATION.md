# Neon PostgreSQL Migration Runbook

## Overview

Migrate CineX backend from **Render PostgreSQL** to **Neon PostgreSQL** with zero data loss, no schema drift, and no application-layer behavior change.

**Target**: PRD §3.1, §3.2, §3.3 — Neon over Render + Supabase; never-expiring free tier; scale-to-zero; Vercel-native; standard PostgreSQL.

---

## Prerequisites

| Requirement | Status | Notes |
|---|---|---|
| Neon account created | ☐ | https://console.neon.tech |
| Neon project + database | ☐ | Free tier, region closest to Vercel |
| DATABASE_URL (Neon) | ☐ | Connection string from Neon dashboard |
| pg_dump / pg_restore | ☐ | `brew install postgresql` (macOS) or `apt install postgresql-client` |
| Render DATABASE_URL | ☐ | From Render dashboard → Settings → Database |
| Supabase connection | ☐ | For secondary data verification (PRD §3) |

---

## Pre-Migration Checklist

### 1. Schema Reconciliation

**Known discrepancies** between SQLite and PG migrations that must be resolved before pg_dump:

| Issue | SQLite Has | PG Migration Missing | Action |
|---|---|---|---|
| `pool_proposals` table | ✓ | ✗ | Add to PG migration or confirm unused |
| `proposal_votes` table | ✓ | ✗ | Add to PG migration or confirm unused |
| `portfolio_items.thumbnail_url` | ✓ | ✗ | Add to `001_initial.sql` |
| `wallets.activated_at` | ✓ | ✗ | Add to `001_initial.sql` |
| `wallet_transactions.currency` | ✓ | ✗ | Add to `001_initial.sql` |

**Run this query** on Render to confirm which tables/columns actually exist:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wallets';
```

### 2. Schema Update (if needed)

Add missing columns/tables to `backend/src/migrations/001_initial.sql` **before** running pg_dump:

```sql
-- Add to 001_initial.sql if confirmed needed:
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS activated_at INTEGER;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'STX';
```

### 3. Data Backup

```bash
# Full backup to local file (safety net)
pg_dump "$RENDER_DATABASE_URL" > backend/data/render-backup-$(date +%Y%m%d).sql
```

---

## Migration Steps

### Step 1: pg_dump from Render

```bash
# Export Render connection string
export RENDER_DATABASE_URL="postgresql://user:pass@hostname:5432/cinex"

# Run dump
node scripts/neon-migrate.js --dump
```

Output: `backend/data/neon-migration-dump.sql` (schema-only by default)

### Step 2: Create Neon Database

1. Go to https://console.neon.tech
2. Create new project → select region (us-east-1 or closest to Vercel)
3. Copy connection string → set as `NEON_DATABASE_URL`
4. Run migrations first (clean schema):

```bash
export NEON_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/cinex?sslmode=require"
node scripts/neon-smoke-test.js
```

### Step 3: Restore to Neon

```bash
node scripts/neon-migrate.js --restore
```

### Step 4: Verify Migration

```bash
node scripts/neon-migrate.js --verify
```

Expected output: All table row counts match between Render and Neon.

### Step 5: Smoke Test

```bash
export DATABASE_URL="$NEON_DATABASE_URL"
node scripts/neon-smoke-test.js
```

Expected: All 7 tests pass (connection, version, tables, indexes, CRUD, transactions, pool).

---

## Parallel Run (7 Days)

### Day 0: Migration Complete

```bash
# Save baseline snapshot
node scripts/neon-discrepancy-check.js --baseline

# Start continuous monitoring (optional, every 60 min)
node scripts/neon-discrepancy-check.js --continuous 60
```

### Days 1-7: Daily Checks

```bash
# One-shot check
node scripts/neon-discrepancy-check.js

# Compare to baseline (weekly)
node scripts/neon-discrepancy-check.js --diff

# JSON output for logging
node scripts/neon-discrepancy-check.js --json > backend/data/neon-check-$(date +%Y%m%d).json
```

### Discrepancy Response

| Severity | Action |
|---|---|
| Row count mismatch | Investigate immediately; check write paths; pause migration if >1% drift |
| Checksum mismatch | Data corruption possible; run full verification; consider re-migration |
| Schema diff | Re-run migrations on Neon; check for missing ALTER TABLE |
| Connection failure | Check Neon sleep settings; verify connection string; check Vercel env vars |

---

## Vercel Environment Update

### Step 1: Update Neon Driver

`database.pg.js` now supports both drivers:
- **Neon serverless** (when `NEON_DRIVER=serverless` or `VERCEL` env is set) — uses WebSocket
- **Standard pg** (local dev) — uses TCP connections

### Step 2: Set Vercel Environment Variables

```bash
# Via Vercel CLI
vercel env add DATABASE_URL production
# Paste Neon connection string

vercel env add NEON_DRIVER production
# Value: serverless

# Or via Vercel Dashboard → Settings → Environment Variables
```

### Step 3: Deploy & Verify

```bash
cd app && vercel --prod
# Verify: POST /api/health → {"database":"connected","driver":"neon-serverless"}
```

---

## Monitoring & Alerting

### Backend Health Check

The existing `GET /api/health` endpoint already reports database status. After migration, it should show:

```json
{
  "database": "connected",
  "driver": "neon-serverless",
  "tables": { ... }
}
```

### Key Metrics to Watch

1. **Connection count**: Neon free tier allows 100 concurrent; Vercel serverless uses ~5 per function
2. **Query latency**: Neon scale-to-zero adds ~200ms cold start; warm connections are instant
3. **Error rate**: Monitor `pg` / `neon` pool errors in Vercel logs
4. **Data drift**: Daily discrepancy check (automated or cron)

### Alert Thresholds

| Metric | Threshold | Action |
|---|---|---|
| Connection errors | >5/min | Check Neon status; verify connection string |
| Query latency | >2s p95 | Check Neon compute; consider upgrading plan |
| Row count drift | >0 between DBs | Investigate write paths; pause migration |
| Cold start latency | >500ms | Acceptable for free tier; upgrade if needed |

---

## Decommission Checklist

**After 7-day parallel run with zero discrepancies:**

### Render PostgreSQL

- [ ] Verify no active connections to Render DB
- [ ] Export final backup: `pg_dump "$RENDER_DATABASE_URL" > backend/data/render-final-backup.sql`
- [ ] Remove `DATABASE_URL` from Render environment variables
- [ ] Delete Render PostgreSQL database (Settings → Delete Database)
- [ ] Remove Render database addon from service

### Supabase PostgreSQL

- [ ] Verify no active connections to Supabase DB
- [ ] Export final backup via Supabase dashboard
- [ ] Remove Supabase project or disconnect from Vercel

### Environment Variables

- [ ] Remove `RENDER_DATABASE_URL` from all environments
- [ ] Remove `SUPABASE_URL` / `SUPABASE_ANON_KEY` from all environments
- [ ] Keep `DATABASE_URL` pointing to Neon (production + preview)
- [ ] Keep `NEON_DRIVER=serverless` in Vercel

### Code Cleanup

- [ ] Remove `database.sqlite.js` if SQLite fallback no longer needed
- [ ] Remove `backend/data/neon-migration-dump.sql` (dump file)
- [ ] Remove `backend/data/render-backup-*.sql` (after confirming Neon is stable)
- [ ] Update README.md with Neon connection instructions

---

## Rollback Plan

If Neon migration fails or causes issues:

### Option 1: Revert Environment Variable

```bash
# Vercel Dashboard → Settings → Environment Variables
# Set DATABASE_URL back to Render connection string
vercel --prod  # Redeploy
```

### Option 2: Full Rollback

```bash
# Restore from backup
pg_restore --clean --if-exists "$RENDER_DATABASE_URL" backend/data/render-backup-YYYYMMDD.sql
```

### Option 3: Code Rollback

```bash
# database.js router auto-detects; just change DATABASE_URL
git revert HEAD  # Revert database.pg.js changes
vercel --prod
```

---

## Troubleshooting

### "Connection refused" from Neon

- Check Neon project is not paused (free tier scale-to-zero)
- Verify connection string includes `?sslmode=require`
- Check if IP allowlist is configured (Neon dashboard → Settings)

### "SSL connection required"

Add to connection string: `?sslmode=require`

### Cold start latency

Neon free tier pauses after inactivity. First connection takes ~200ms.
Solution: Keep-alive ping or upgrade to paid tier.

### "Too many connections"

Neon free tier: 100 concurrent connections.
Vercel serverless: Each function instance opens a connection.
Solution: Use connection pooling (PgBouncer) or upgrade Neon plan.

### pg_dump fails

```bash
# Ensure pg_dump version matches Render's PostgreSQL version
pg_dump --version
# Render uses PostgreSQL 14+
```

---

## PRD Reference

- **§3.1**: Migration to Neon (never-expiring free tier, scale-to-zero, Vercel-native)
- **§3.2**: Branch strategy for main/epic environments
- **§3.3**: Migration report with counts per table before/after
- **§3.4**: Decommission Render + Supabase after successful migration
- **§1.1 Ground Truth #8**: Backend infrastructure = Neon PostgreSQL

---

## Files Created

| File | Purpose |
|---|---|
| `backend/.env.example` | Neon connection string template |
| `backend/src/database.pg.js` | Neon serverless driver support (drop-in replacement) |
| `scripts/neon-migrate.js` | pg_dump/restore migration script |
| `scripts/neon-smoke-test.js` | Connection validation + schema verification |
| `scripts/neon-discrepancy-check.js` | Row count + checksum comparison for parallel run |
| `docs/NEON_MIGRATION.md` | This runbook |
