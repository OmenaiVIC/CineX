-- BOS E2E Test Fixtures
-- Ported from backend/src/migrations/010_bos_e2e.sql

CREATE TABLE IF NOT EXISTS test_webhook_events (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
