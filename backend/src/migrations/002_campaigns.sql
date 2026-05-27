CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  creator TEXT NOT NULL REFERENCES profiles(address) ON DELETE CASCADE,
  target_amount TEXT NOT NULL,
  current_amount TEXT DEFAULT '0',
  deadline INTEGER DEFAULT 0,
  category TEXT CHECK(category IN ('short-film','feature','documentary','music-video','web-series')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active','funded','failed','completed')),
  media_urls TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  created_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::integer),
  updated_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::integer)
);

CREATE TABLE IF NOT EXISTS contributions (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contributor TEXT NOT NULL,
  amount TEXT NOT NULL,
  tx_id TEXT,
  message TEXT,
  created_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::integer)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_contributions_campaign ON contributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contributions_contributor ON contributions(contributor);

CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  funding_required TEXT NOT NULL,
  deadline INTEGER,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','completed','failed')),
  deliverables TEXT DEFAULT '[]',
  completed_at INTEGER,
  created_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::integer),
  updated_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::integer)
);

CREATE INDEX IF NOT EXISTS idx_milestones_campaign ON milestones(campaign_id);

CREATE TABLE IF NOT EXISTS verification_applications (
  id SERIAL PRIMARY KEY,
  applicant TEXT NOT NULL REFERENCES profiles(address) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  portfolio_url TEXT,
  previous_works TEXT DEFAULT '[]',
  social_media TEXT DEFAULT '{}',
  bond_amount TEXT DEFAULT '0',
  documents TEXT DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','under-review','approved','rejected')),
  submitted_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::integer),
  reviewed_at INTEGER,
  reviewer TEXT,
  rejection_reason TEXT,
  updated_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::integer)
);

CREATE INDEX IF NOT EXISTS idx_vapp_applicant ON verification_applications(applicant);
CREATE INDEX IF NOT EXISTS idx_vapp_status ON verification_applications(status);

CREATE TABLE IF NOT EXISTS verified_filmmakers (
  address TEXT PRIMARY KEY REFERENCES profiles(address) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  portfolio_url TEXT,
  previous_works TEXT DEFAULT '[]',
  social_media TEXT DEFAULT '{}',
  verified_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::integer),
  credibility_score INTEGER DEFAULT 0,
  completed_campaigns INTEGER DEFAULT 0,
  total_funded_amount TEXT DEFAULT '0'
);
