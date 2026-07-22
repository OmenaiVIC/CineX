-- BOS (Bridge Orchestration Service) Schema
-- PRD §1.1 Ground Truth: "Settlement asset — escrow"
-- Settlement Ground Truth: Canonical burn → xReserve attestation → release → Yellow Card → NGN
-- 10 tables: disbursements, disbursement_audit, external_refs, external_status_snapshots,
--            yellow_card_webhook_events, manual_review_queue, relay_wallet_activity,
--            on_chain_events, exchange_rates, config_snapshots

-- ─────────────────────────────────────────────────────────────
-- 1. disbursements — Core disbursement record
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disbursements (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id               INTEGER NOT NULL,
  milestone_index           INTEGER NOT NULL,
  creator_address           TEXT NOT NULL,
  recipient_bank_account    TEXT NOT NULL,
  recipient_bank_code       TEXT NOT NULL,
  amount_usdcx              BIGINT NOT NULL,
  amount_ngn_expected       BIGINT NOT NULL,
  exchange_rate             NUMERIC(12,6) NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'disbursement_initiated',
  external_tx_id            TEXT,                     -- Stacks burn tx hash
  error_message             TEXT,
  last_error                TEXT,
  retry_count               INTEGER DEFAULT 0,
  max_retries               INTEGER DEFAULT 3,
  amount_usd                NUMERIC(12,6),
  creator_btc_address       TEXT,
  ngn_recipient             JSONB,
  metadata                  JSONB DEFAULT '{}',
  settled_at                TIMESTAMP,
  failed_at                 TIMESTAMP,
  cancelled_at              TIMESTAMP,
  manual_review_at          TIMESTAMP,
  idempotency_key           TEXT UNIQUE NOT NULL,
  initiated_by              TEXT NOT NULL DEFAULT 'system',
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW(),
  last_heartbeat_at         TIMESTAMP DEFAULT NOW(),
  burn_deadline_at          TIMESTAMP,
  attestation_deadline_at   TIMESTAMP,
  payout_deadline_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disbursements_status ON disbursements(status);
CREATE INDEX IF NOT EXISTS idx_disbursements_campaign ON disbursements(campaign_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_creator ON disbursements(creator_address);
CREATE INDEX IF NOT EXISTS idx_disbursements_stuck ON disbursements(status, last_heartbeat_at)
  WHERE status NOT IN ('settled', 'failed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_disbursements_idempotency ON disbursements(idempotency_key);

-- ─────────────────────────────────────────────────────────────
-- 2. disbursement_audit — Append-only event log
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disbursement_audit (
  id                SERIAL PRIMARY KEY,
  disbursement_id   UUID NOT NULL REFERENCES disbursements(id),
  event_type        TEXT NOT NULL,
  from_status       TEXT,
  to_status         TEXT NOT NULL,
  worker_id         TEXT NOT NULL,
  guard_result      TEXT NOT NULL,
  guard_reason      TEXT,
  metadata          JSONB,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_disbursement ON disbursement_audit(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON disbursement_audit(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 3. external_refs — Mutable external identifiers
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_refs (
  id                SERIAL PRIMARY KEY,
  disbursement_id   UUID NOT NULL REFERENCES disbursements(id),
  external_system   TEXT NOT NULL,          -- 'stacks' | 'xreserve' | 'yellowcard'
  identifier_type   TEXT NOT NULL,          -- 'tx_id' | 'attestation_id' | 'release_id' | 'payout_id'
  identifier_value  TEXT NOT NULL,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_extrefs_unique ON external_refs(disbursement_id, external_system, identifier_type);
CREATE INDEX IF NOT EXISTS idx_extrefs_disbursement ON external_refs(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_extrefs_system ON external_refs(external_system);
CREATE INDEX IF NOT EXISTS idx_extrefs_value ON external_refs(identifier_value);

-- ─────────────────────────────────────────────────────────────
-- 4. external_status_snapshots — Immutable point-in-time status
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_status_snapshots (
  id                SERIAL PRIMARY KEY,
  disbursement_id   UUID NOT NULL REFERENCES disbursements(id),
  source            TEXT NOT NULL,
  status            TEXT NOT NULL,
  raw_response      JSONB,
  captured_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extsnap_disbursement ON external_status_snapshots(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_extsnap_source ON external_status_snapshots(source);
CREATE INDEX IF NOT EXISTS idx_extsnap_captured ON external_status_snapshots(captured_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 5. yellow_card_webhook_events — Yellow Card webhook storage
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS yellow_card_webhook_events (
  id                SERIAL PRIMARY KEY,
  disbursement_id   UUID REFERENCES disbursements(id),
  payment_id        TEXT,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL,
  processed         BOOLEAN DEFAULT FALSE,
  processed_at      TIMESTAMP,
  error_message     TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ycwebhook_disbursement ON yellow_card_webhook_events(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_ycwebhook_payment ON yellow_card_webhook_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_ycwebhook_processed ON yellow_card_webhook_events(processed)
  WHERE processed = FALSE;

-- ─────────────────────────────────────────────────────────────
-- 6. manual_review_queue — Items requiring human intervention
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manual_review_queue (
  id                SERIAL PRIMARY KEY,
  disbursement_id   UUID NOT NULL REFERENCES disbursements(id),
  reason            TEXT NOT NULL,
  severity          TEXT NOT NULL DEFAULT 'normal',
  assigned_to       TEXT,
  resolved          BOOLEAN DEFAULT FALSE,
  resolved_by       TEXT,
  resolution        TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  resolved_at       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_disbursement ON manual_review_queue(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_review_unresolved ON manual_review_queue(resolved)
  WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_review_severity ON manual_review_queue(severity);

-- ─────────────────────────────────────────────────────────────
-- 7. relay_wallet_activity — Relay wallet balance/transaction tracking
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_wallet_activity (
  id                SERIAL PRIMARY KEY,
  wallet_address    TEXT NOT NULL,
  disbursement_id   UUID REFERENCES disbursements(id),
  activity_type     TEXT NOT NULL,
  amount_usdcx      BIGINT,
  balance_before    BIGINT,
  balance_after     BIGINT,
  tx_hash           TEXT,
  metadata          JSONB,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relay_wallet ON relay_wallet_activity(wallet_address);
CREATE INDEX IF NOT EXISTS idx_relay_disbursement ON relay_wallet_activity(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_relay_created ON relay_wallet_activity(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 8. on_chain_events — On-chain event tracking
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS on_chain_events (
  id                SERIAL PRIMARY KEY,
  disbursement_id   UUID REFERENCES disbursements(id),
  chain             TEXT NOT NULL DEFAULT 'stacks',
  event_type        TEXT NOT NULL,
  tx_hash           TEXT NOT NULL,
  block_height      INTEGER,
  status            TEXT NOT NULL,
  raw_event         JSONB,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chain_disbursement ON on_chain_events(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_chain_tx ON on_chain_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_chain_status ON on_chain_events(status);
CREATE INDEX IF NOT EXISTS idx_chain_block ON on_chain_events(block_height);

-- ─────────────────────────────────────────────────────────────
-- 9. exchange_rates — Rate snapshots at disbursement initiation
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_rates (
  id                SERIAL PRIMARY KEY,
  source            TEXT NOT NULL,
  pair              TEXT NOT NULL DEFAULT 'USDCx/NGN',
  rate              NUMERIC(12,6) NOT NULL,
  valid_until       TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_source ON exchange_rates(source);
CREATE INDEX IF NOT EXISTS idx_rate_pair ON exchange_rates(pair);
CREATE INDEX IF NOT EXISTS idx_rate_valid ON exchange_rates(valid_until)
  WHERE valid_until IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 10. config_snapshots — BOS config at time of disbursement
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config_snapshots (
  id                SERIAL PRIMARY KEY,
  disbursement_id   UUID REFERENCES disbursements(id),
  config_version    TEXT NOT NULL,
  adapter_name      TEXT NOT NULL,
  adapter_config    JSONB,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_disbursement ON config_snapshots(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_config_adapter ON config_snapshots(adapter_name);
