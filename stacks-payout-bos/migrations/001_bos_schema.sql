-- BOS Core Tables
-- Ported from backend/src/migrations/006_bos_schema.sql

CREATE TABLE IF NOT EXISTS disbursements (
  id UUID PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  amount_uusdx TEXT,
  amount_usd DOUBLE PRECISION,
  creator_btc_address TEXT,
  ngn_recipient TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'disbursement_initiated',
  external_tx_id TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 25,
  last_error TEXT,
  manual_review_at TIMESTAMP,
  settled_at TIMESTAMP,
  failed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disbursement_audit (
  id SERIAL PRIMARY KEY,
  disbursement_id UUID NOT NULL REFERENCES disbursements(id),
  from_state TEXT,
  to_state TEXT NOT NULL,
  guard_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_refs (
  id SERIAL PRIMARY KEY,
  disbursement_id UUID NOT NULL REFERENCES disbursements(id),
  external_system TEXT NOT NULL,
  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (disbursement_id, external_system, identifier_type)
);

CREATE TABLE IF NOT EXISTS external_status_snapshots (
  id SERIAL PRIMARY KEY,
  disbursement_id UUID NOT NULL REFERENCES disbursements(id),
  external_system TEXT NOT NULL,
  status TEXT NOT NULL,
  raw_response JSONB DEFAULT '{}',
  captured_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yellow_card_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT UNIQUE,
  event_type TEXT,
  disbursement_id UUID REFERENCES disbursements(id),
  raw_payload JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manual_review_queue (
  id SERIAL PRIMARY KEY,
  disbursement_id UUID UNIQUE NOT NULL REFERENCES disbursements(id),
  reason TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'pending',
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relay_wallet_activity (
  id SERIAL PRIMARY KEY,
  tx_id TEXT,
  activity_type TEXT,
  amount_ustx BIGINT,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS on_chain_events (
  id SERIAL PRIMARY KEY,
  tx_id TEXT,
  event_type TEXT,
  contract_id TEXT,
  raw_value JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  source_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config_snapshots (
  id SERIAL PRIMARY KEY,
  config_key TEXT NOT NULL,
  config_value JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
