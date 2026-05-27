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
      { address: C1, username: 'chidi-okonkwo', bio: 'Award-winning documentary filmmaker from Enugu. Passionate about telling untold stories from across Nigeria\'s diverse communities.', social_twitter: '@chidifilms', social_instagram: '@chidi_okonkwo', social_website: 'chidiokonkwo.film', verification_level: '2-tier' },
      { address: C2, username: 'amara-obi', bio: 'Feature film director and costume designer. Lagos-based with a love for magical realism and African futurism.', social_twitter: '@amaraobi', social_instagram: '@amara_obi_studio', verification_level: '1-tier' },
      { address: B1, username: 'femi-balogun', bio: 'Film enthusiast and impact investor backing African cinema.', social_twitter: '@femibalogun' },
    ]) {
      await db2.run('INSERT INTO profiles (address, username, bio, social_twitter, social_instagram, social_website, verification_level, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) ON CONFLICT DO NOTHING',
        [p.address, p.username, p.bio, p.social_twitter, p.social_instagram, p.social_website, p.verification_level || 'unverified', d(200)]);
    }

    // User settings
    for (const [addr, role] of [[C1, 'creative'], [C2, 'creative'], [B1, 'backer']]) {
      await db2.run('INSERT INTO user_settings (address, role, onboarding_completed, created_at, updated_at) VALUES ($1, $2, 1, $3, $3) ON CONFLICT DO NOTHING',
        [addr, role, d(180)]);
    }

    // Portfolio items (seed with concept art links)
    for (const item of [
      { address: C1, title: 'Echoes of Harmattan — Behind the Scenes', description: 'Behind-the-scenes documentary footage from our Kano shoot.', category: 'short-film', role: 'Director', year: 2026, media_urls: ['https://youtube.com/watch?v=example1'], awards: [] },
      { address: C1, title: 'The Last Mangrove — Teaser Trailer', description: 'Official teaser for our Niger Delta documentary.', category: 'documentary', role: 'Director/Producer', year: 2025, media_urls: ['https://youtube.com/watch?v=example2'], awards: ['Best Documentary — AFRIFF 2025'] },
      { address: C1, title: 'Silent Waters — Short Film', description: 'Award-winning short film about coastal erosion.', category: 'short-film', role: 'Director/Cinematographer', year: 2024, media_urls: ['https://vimeo.com/example3'], awards: ['Best Cinematography', 'Jury Prize — Lagos Film Festival 2024'] },
      { address: C2, title: 'Satin Shadows — Concept Art & Mood Board', description: 'Visual development portfolio for the feature film.', category: 'feature', role: 'Director/Costume Designer', year: 2026, media_urls: ['https://drive.google.com/example4'], awards: [] },
      { address: C2, title: 'Lagos Fashion Week 2025 — Documentary', description: 'A glimpse into the avant-garde fashion scene.', category: 'documentary', role: 'Director', year: 2025, media_urls: ['https://youtube.com/watch?v=example5'], awards: [] },
    ]) {
      await db2.run('INSERT INTO portfolio_items (address, title, description, category, role, year, media_urls, awards, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)',
        [item.address, item.title, item.description, item.category, item.role, item.year, JSON.stringify(item.media_urls), JSON.stringify(item.awards), d(30)]);
    }

    // Ratings
    for (const r of [
      { rater: B1, ratee: C1, score: 5, review: 'Chidi\'s previous work on "Silent Waters" was breathtaking.', category: 'cinematography', ago: 90 },
      { rater: B1, ratee: C1, score: 4, review: 'Great storytelling ability. Would collaborate again.', category: 'storytelling', ago: 40 },
      { rater: B1, ratee: C2, score: 5, review: 'Amara\'s costume design work is unparalleled.', category: 'costume-design', ago: 60 },
      { rater: B1, ratee: C2, score: 4, review: 'Strong visual aesthetic and original storytelling.', category: 'storytelling', ago: 15 },
    ]) {
      await db2.run('INSERT INTO ratings (rater_address, target_address, score, comment, category, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [r.rater, r.ratee, r.score, r.review, r.category, d(r.ago)]);
    }

    // Wallet balances
    for (const w of [
      { user_id: C1, naira_balance: 8450000, usd_balance: 6036, sbtc_balance: '6036', status: 'active', preferred_currency: 'NGN' },
      { user_id: C2, naira_balance: 3200000, usd_balance: 2286, sbtc_balance: '2286', status: 'active', preferred_currency: 'NGN' },
      { user_id: B1, naira_balance: 15000000, usd_balance: 10714, sbtc_balance: '10714', status: 'active', preferred_currency: 'NGN' },
    ]) {
      await db2.run('INSERT INTO wallets (user_id, naira_balance, usd_balance, sbtc_balance, status, preferred_currency, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $7) ON CONFLICT DO NOTHING',
        [w.user_id, w.naira_balance, w.usd_balance, w.sbtc_balance, w.status, w.preferred_currency, d(180)]);
    }

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
