# §11.2 Rating System — Evidence

## Requirements (from Prompt Bible)

1. Self-rating prevention
2. Duplicate rating prevention
3. Eligibility verification
4. Feed event insertion
5. Score validation (1-5)

## Implementation

### File: `backend/src/routes/profiles.js`

**Rating endpoint:** `POST /api/profiles/:address/ratings`

**Validation rules implemented:**

1. **Self-rating prevention** (line ~280):
   ```javascript
   if (raterAddress === targetAddress) {
     return res.status(400).json({ error: 'Cannot rate yourself' });
   }
   ```

2. **Duplicate prevention** (line ~290):
   ```javascript
   const existing = db.get(
     'SELECT id FROM ratings WHERE rater_address = ? AND target_address = ? AND project_id = ?',
     [raterAddress, targetAddress, projectId]
   );
   if (existing) {
     return res.status(409).json({ error: 'Already rated this creator for this project' });
   }
   ```

3. **Eligibility verification** (line ~300):
   ```javascript
   const hasContribution = db.get(
     `SELECT c.id FROM campaigns c
      JOIN contributions co ON c.id = co.campaign_id
      WHERE c.creator_address = ? AND co.backer_address = ?`,
     [targetAddress, raterAddress]
   );
   if (!hasContribution) {
     return res.status(403).json({ error: 'Must have contributed to a campaign by this creator' });
   }
   ```

4. **Score validation** (line ~275):
   ```javascript
   if (score < 1 || score > 5 || !Number.isInteger(score)) {
     return res.status(400).json({ error: 'Score must be an integer between 1 and 5' });
   }
   ```

5. **Feed event insertion** (line ~330):
   ```javascript
   db.run(
     `INSERT INTO feed_events (event_type, event_data, actor, campaign_id, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))`,
     ['rating_received', JSON.stringify({ score, summary: `${raterAddress.slice(0,6)}… rated you ${score}/5` }), targetAddress, projectId]
   );
   ```

### File: `backend/tests/ratingValidation.test.js`

**11 tests passing:**

- Self-rating prevention (2 tests)
- Duplicate rating prevention (3 tests)
- Score validation (3 tests)
- Eligibility check (2 tests)
- Feed event insertion (1 test)

## Running Tests

```bash
cd backend && npx vitest run --run tests/ratingValidation.test.js
```

## Database Schema

```sql
CREATE TABLE ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rater_address TEXT NOT NULL,
  target_address TEXT NOT NULL,
  project_id INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  review TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(rater_address, target_address, project_id)
);
```

## Status: ✅ COMPLETE

All validation rules implemented and tested.
