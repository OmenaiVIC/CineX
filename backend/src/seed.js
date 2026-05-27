import { getDb } from './database.js';

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;

const SEED_ADDRESSES = {
  C1: 'ST1J4G6R0VX7NZYF1DGX8MNSNYVE3VGZJSRTPGZGM',
  C2: 'ST2N81HZ0YM5PZQF2EHX9ONTZWF4WHZKJSQVWXYZM',
  B1: 'ST3PQXKV6RJXZFY3FIY8MPSOZVE3VGZJSQTVWABC',
};

export async function seedIfEmpty() {
  const db = await getDb();
  try {
    const row = await db.get('SELECT COUNT(*) as count FROM profiles');
    if (row && row.count > 0) {
      console.log(`  ✓ Database has ${row.count} profiles — skipping seed`);
      return;
    }
  } finally { db.release(); }
  console.log('  → Seeding demo data...');
  const { C1, C2, B1 } = SEED_ADDRESSES;
  const d = (daysAgo) => NOW - daysAgo * DAY;

  const db2 = await getDb();
  try {
    // Profiles
    for (const p of [
      { address: C1, username: 'chidi-okonkwo', bio: 'Award-winning documentary filmmaker from Enugu.', social_twitter: '@chidifilms', social_instagram: '@chidi_okonkwo', social_website: 'chidiokonkwo.film', verification_level: '2-tier' },
      { address: C2, username: 'amara-obi', bio: 'Feature film director and costume designer.', social_twitter: '@amaraobi', social_instagram: '@amara_obi_studio', social_website: '', verification_level: '1-tier' },
      { address: B1, username: 'femi-balogun', bio: 'Film enthusiast and impact investor.', social_twitter: '@femibalogun', social_instagram: '', social_website: '', verification_level: 'unverified' },
    ]) {
      await db2.run('INSERT INTO profiles (address, username, bio, social_twitter, social_instagram, social_website, verification_level, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) ON CONFLICT DO NOTHING',
        [p.address, p.username, p.bio, p.social_twitter, p.social_instagram, p.social_website, p.verification_level || 'unverified', d(200)]);
    }
    console.log('  ✓ profiles');

    // User settings
    for (const [addr, role] of [[C1, 'creative'], [C2, 'creative'], [B1, 'backer']]) {
      await db2.run('INSERT INTO user_settings (address, role, onboarding_completed, created_at, updated_at) VALUES ($1, $2, 1, $3, $3) ON CONFLICT DO NOTHING',
        [addr, role, d(180)]);
    }
    console.log('  ✓ user_settings');

    // Portfolio items
    for (const item of [
      { address: C1, title: 'Echoes of Harmattan', description: 'BTS documentary footage.', category: 'short-film', role: 'Director', year: 2026, media_urls: '[]', awards: '[]' },
      { address: C1, title: 'The Last Mangrove', description: 'Teaser trailer.', category: 'documentary', role: 'Director/Producer', year: 2025, media_urls: '[]', awards: '["Best Doc — AFRIFF 2025"]' },
      { address: C2, title: 'Satin Shadows', description: 'Concept art.', category: 'feature', role: 'Director', year: 2026, media_urls: '[]', awards: '[]' },
    ]) {
      await db2.run('INSERT INTO portfolio_items (address, title, description, category, role, year, media_urls, awards, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)',
        [item.address, item.title, item.description, item.category, item.role, item.year, item.media_urls, item.awards, d(30)]);
    }
    console.log('  ✓ portfolio');

    // Ratings (simple test first)
    try {
      await db2.run('INSERT INTO ratings (rater_address, target_address, score, comment, category, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [B1, C1, 5, 'Great work.', 'cinematography', d(90)]);
      console.log('  ✓ ratings 1');
      await db2.run('INSERT INTO ratings (rater_address, target_address, score, comment, category, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [B1, C1, 4, 'Good storytelling.', 'storytelling', d(40)]);
      console.log('  ✓ ratings 2');
      await db2.run('INSERT INTO ratings (rater_address, target_address, score, comment, category, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [B1, C2, 5, 'Amazing design.', 'costume-design', d(60)]);
      console.log('  ✓ ratings 3');
      await db2.run('INSERT INTO ratings (rater_address, target_address, score, comment, category, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [B1, C2, 4, 'Strong visual aesthetic.', 'storytelling', d(15)]);
      console.log('  ✓ ratings 4');
    } catch (e) { console.error('  ✗ ratings failed:', e.message); }

    // Wallet balances
    try {
      const t = d(180);
      await db2.run('INSERT INTO wallets (user_id, naira_balance, usd_balance, sbtc_balance, status, preferred_currency, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT(user_id) DO NOTHING',
        [C1, 8450000, 6036, '6036', 'active', 'NGN', t, t]);
      console.log('  ✓ wallet 1 OK');
      await db2.run('INSERT INTO wallets (user_id, naira_balance, usd_balance, sbtc_balance, status, preferred_currency, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT(user_id) DO NOTHING',
        [C2, 3200000, 2286, '2286', 'active', 'NGN', t, t]);
      console.log('  ✓ wallet 2 OK');
      await db2.run('INSERT INTO wallets (user_id, naira_balance, usd_balance, sbtc_balance, status, preferred_currency, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT(user_id) DO NOTHING',
        [B1, 15000000, 10714, '10714', 'active', 'NGN', t, t]);
      console.log('  ✓ wallet 3 OK');
    } catch (e) { console.error('  ✗ wallet insert failed:', e.message); }

    // AI summaries
    for (const s of [
      { address: C1, summary: 'Chidi Okonkwo has a strong track record of completed documentary projects with high peer ratings. Their work on "The Last Mangrove" demonstrates ability to manage complex production across multiple Nigerian states. Portfolio shows consistent delivery and growing reputation in the documentary space.', model: 'seed' },
      { address: C2, summary: 'Amara Obi is an emerging feature film director with a distinctive visual style centered on African futurism and fashion. Costume design work has received consistent 5-star ratings. Currently raising for "Satin Shadows" — a Lagos-based feature that showcases their directorial vision.', model: 'seed' },
    ]) {
      await db2.run('INSERT INTO ai_summaries (address, summary, model, generated_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [s.address, s.summary, s.model, d(7)]);
    }

    // Feed events
    for (const f of [
      { type: 'campaign_created', actor: C1, data: { summary: 'Chidi Okonkwo launched a new documentary project.' }, ago: 45 },
      { type: 'rating_received', actor: C1, data: { summary: 'Chidi Okonkwo received a 5-star review.' }, ago: 90 },
      { type: 'profile_updated', actor: C2, data: { summary: 'Amara Obi updated their portfolio.' }, ago: 15 },
    ]) {
      await db2.run('INSERT INTO feed_events (event_type, event_data, actor, created_at) VALUES ($1, $2, $3, $4)',
        [f.type, JSON.stringify(f.data), f.actor, d(f.ago)]);
    }

    console.log('  ✓ Demo data seeded successfully');
  } catch (err) {
    console.error('  ✗ Seed failed:', err.message);
  } finally { db2.release(); }
}
