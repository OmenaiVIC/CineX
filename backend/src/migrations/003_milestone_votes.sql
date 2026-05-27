CREATE TABLE IF NOT EXISTS milestone_votes (
  id SERIAL PRIMARY KEY,
  milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  voter_address TEXT NOT NULL,
  contribution_weight INTEGER NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())),
  UNIQUE(milestone_id, voter_address)
);
CREATE INDEX IF NOT EXISTS idx_milestone_votes_milestone ON milestone_votes(milestone_id);
