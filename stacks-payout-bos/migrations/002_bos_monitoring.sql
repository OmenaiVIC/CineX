-- BOS Monitoring Tables
-- Ported from backend/src/migrations/007_bos_monitoring.sql

CREATE TABLE IF NOT EXISTS bos_alerts (
  id SERIAL PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warn',
  message TEXT,
  metadata JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bos_dashboard_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_data JSONB NOT NULL DEFAULT '{}',
  captured_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disbursement_evidence (
  id TEXT PRIMARY KEY,
  disbursement_id UUID NOT NULL REFERENCES disbursements(id),
  evidence_type TEXT NOT NULL,
  evidence_data JSONB DEFAULT '{}',
  recorded_by TEXT DEFAULT 'system',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bos_alerts_type ON bos_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_bos_alerts_severity ON bos_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_bos_alerts_ack ON bos_alerts(acknowledged, acknowledged_at);
CREATE INDEX IF NOT EXISTS idx_bos_dashboard_snapshots_time ON bos_dashboard_snapshots(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_disbursement_evidence_did ON disbursement_evidence(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_evidence_type ON disbursement_evidence(evidence_type);
