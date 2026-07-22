-- Relay Sponsorship & Fee Abstraction Schema
-- PRD Reviewer Addendum: "fee sponsorship / relayer policy for first-use transactions"
-- 3 tables: relay_transfers, relay_quotas, relay_config

-- ─────────────────────────────────────────────────────────────
-- 1. relay_transfers — Every passkey relay attempt (success or fail)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_transfers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address              TEXT NOT NULL,
  vault_address             TEXT NOT NULL,
  recipient                 TEXT NOT NULL,
  amount_microstx           BIGINT NOT NULL,
  auth_id                   BIGINT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'pending',
    -- pending | sponsored | rejected | broadcast | confirmed | failed
  rejection_reason          TEXT,
    -- null | 'quota_exceeded' | 'balance_low' | 'action_not_sponsored' |
    -- 'rate_limited' | 'circuit_breaker' | 'amount_too_high' |
    -- 'auth_required' | 'idempotency_collision'
  tx_hash                   TEXT,
  gas_cost_stx              NUMERIC(10,6),
  sponsorship_decision      TEXT NOT NULL DEFAULT 'pending',
    -- pending | sponsored | rejected
  idempotency_key           TEXT UNIQUE,
  request_ip                TEXT,
  user_agent                TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  completed_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_relay_transfers_user_date
  ON relay_transfers (user_address, created_at);
CREATE INDEX IF NOT EXISTS idx_relay_transfers_status
  ON relay_transfers (status) WHERE status IN ('pending', 'broadcast');
CREATE INDEX IF NOT EXISTS idx_relay_transfers_idempotency
  ON relay_transfers (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. relay_quotas — Per-user daily spending tracking
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_quotas (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address              TEXT NOT NULL,
  transfer_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  transfer_count            INTEGER DEFAULT 0,
  total_gas_stx             NUMERIC(10,6) DEFAULT 0,
  total_amount_stx          BIGINT DEFAULT 0,
  UNIQUE(user_address, transfer_date)
);

CREATE INDEX IF NOT EXISTS idx_relay_quotas_user_date
  ON relay_quotas (user_address, transfer_date);

-- ─────────────────────────────────────────────────────────────
-- 3. relay_config — Operational configuration (key-value)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_config (
  key                       TEXT PRIMARY KEY,
  value                     TEXT NOT NULL,
  description               TEXT,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config
INSERT INTO relay_config (key, value, description) VALUES
  ('daily_cap', '20', 'Max sponsored transfers per user per day'),
  ('hourly_rate_limit', '10', 'Max transfer requests per user per hour'),
  ('min_balance_stx', '50', 'Relay wallet minimum balance before pausing sponsorship'),
  ('critical_balance_stx', '10', 'Relay wallet critical balance — halt all operations'),
  ('max_single_transfer_stx', '10', 'Max STX per single sponsored transfer'),
  ('circuit_breaker', 'false', 'Global kill switch — when true, reject all sponsored transfers'),
  ('sponsorable_actions', 'stx-transfer,onboard,recovery', 'Comma-separated list of sponsorable action types')
ON CONFLICT (key) DO NOTHING;
