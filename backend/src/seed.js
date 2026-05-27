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

    // Campaigns
    const campCount = await db2.get('SELECT COUNT(*) as count FROM campaigns');
    if (!campCount || campCount.count === 0) {
      const now = NOW;
      const d30 = d(30), d45 = d(45), d60 = d(60), d90 = d(90), d120 = d(120), d15 = d(15), d1 = d(1), d2 = d(2), d5 = d(5);
      const c1 = await db2.run(`INSERT INTO campaigns (title, description, creator, target_amount, current_amount, deadline, category, status, tags, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        ['Echoes of Harmattan', 'A poetic short film capturing the haunting beauty of the harmattan season in northern Nigeria.', C1, '250000', '187500', d30 + 86400 * 60, 'short-film', 'active', JSON.stringify(['harmattan', 'northern-nigeria', 'poetic']), d45, d2]);
      const cid1 = c1.lastInsertRowid;
      const c2 = await db2.run(`INSERT INTO campaigns (title, description, creator, target_amount, current_amount, deadline, category, status, tags, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        ['The Last Mangrove', 'A feature-length documentary on mangrove deforestation in the Niger Delta.', C1, '800000', '800000', d90 + 86400 * 30, 'documentary', 'funded', JSON.stringify(['environment', 'niger-delta', 'climate']), d120, d5]);
      const cid2 = c2.lastInsertRowid;
      const c3 = await db2.run(`INSERT INTO campaigns (title, description, creator, target_amount, current_amount, deadline, category, status, tags, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        ['Satin Shadows', 'A vibrant feature film set in Lagos\'s underground fashion scene.', C2, '5000000', '1200000', NOW + 86400 * 45, 'feature', 'active', JSON.stringify(['lagos', 'fashion', 'fantasy']), d15, d1]);
      const cid3 = c3.lastInsertRowid;
      console.log('  ✓ campaigns');

      // Contributions
      for (const cont of [
        { cid: cid1, contributor: B1, amount: '50000', ago: 40 },
        { cid: cid1, contributor: 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001', amount: '25000', ago: 35 },
        { cid: cid1, contributor: 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002', amount: '12500', ago: 28 },
        { cid: cid2, contributor: B1, amount: '200000', ago: 100 },
        { cid: cid2, contributor: 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001', amount: '100000', ago: 95 },
        { cid: cid2, contributor: 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002', amount: '500000', ago: 90 },
        { cid: cid3, contributor: B1, amount: '100000', ago: 10 },
        { cid: cid3, contributor: 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001', amount: '500000', ago: 8 },
        { cid: cid3, contributor: 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002', amount: '600000', ago: 5 },
      ]) {
        await db2.run('INSERT INTO contributions (campaign_id, contributor, amount, tx_id, created_at) VALUES ($1,$2,$3,$4,$5)',
          [cont.cid, cont.contributor, cont.amount, `0xseed${cont.ago}`, d(cont.ago)]);
      }
      console.log('  ✓ contributions');

      // Milestones
      for (const ms of [
        { cid: cid1, title: 'Pre-Production & Script', desc: 'Complete script polish, storyboard.', funding: '50000', deadline: d30 + 86400 * 14, status: 'completed', deliverables: ['Final script', 'Storyboard deck'], completedAt: d(20) },
        { cid: cid1, title: 'Principal Photography — Kano', desc: 'Filming Kano scenes.', funding: '75000', deadline: d30 + 86400 * 28, status: 'completed', deliverables: ['Raw footage'], completedAt: d(10) },
        { cid: cid1, title: 'Principal Photography — Katsina', desc: 'Filming Katsina desert sequences.', funding: '60000', deadline: d30 + 86400 * 42, status: 'active', deliverables: ['Raw footage'] },
        { cid: cid1, title: 'Post-Production', desc: 'Editing, color grading, sound design.', funding: '40000', deadline: d30 + 86400 * 56, status: 'active', deliverables: ['First cut'] },
        { cid: cid1, title: 'Festival Submission', desc: 'Submit to AFRIFF and FESPACO.', funding: '25000', deadline: d30 + 86400 * 70, status: 'active', deliverables: ['DCP master'] },
        { cid: cid2, title: 'Research & Outreach', desc: 'Community engagement in Niger Delta.', funding: '100000', deadline: d120 + 86400 * 21, status: 'completed', deliverables: ['Research journal'], completedAt: d(105) },
        { cid: cid2, title: 'Production Block 1', desc: 'Filming Rivers State.', funding: '150000', deadline: d120 + 86400 * 42, status: 'completed', deliverables: ['Raw footage'], completedAt: d(80) },
        { cid: cid2, title: 'Production Block 2', desc: 'Bayelsa underwater cinematography.', funding: '180000', deadline: d120 + 86400 * 63, status: 'completed', deliverables: ['Underwater footage'], completedAt: d(60) },
        { cid: cid2, title: 'Post-Production Assembly', desc: 'Rough cut to final.', funding: '150000', deadline: d120 + 86400 * 105, status: 'completed', deliverables: ['Final color grade'], completedAt: d(15) },
        { cid: cid2, title: 'Impact Campaign', desc: 'NGO screening tours.', funding: '100000', deadline: d120 + 86400 * 126, status: 'active', deliverables: ['Impact report'] },
        { cid: cid3, title: 'Costume Design', desc: '30+ avant-garde costumes.', funding: '800000', deadline: NOW + 86400 * 14, status: 'completed', deliverables: ['Costume portfolio'], completedAt: NOW - 86400 * 3 },
        { cid: cid3, title: 'Week 1-2 Photography', desc: 'Lagos establishing shots.', funding: '1200000', deadline: NOW + 86400 * 28, status: 'active', deliverables: ['Raw footage'] },
        { cid: cid3, title: 'Week 3-4 Photography', desc: 'Climactic sequences.', funding: '1200000', deadline: NOW + 86400 * 42, status: 'active', deliverables: ['Raw footage'] },
        { cid: cid3, title: 'VFX & Post-Production', desc: 'Magic realism VFX.', funding: '1200000', deadline: NOW + 86400 * 60, status: 'active', deliverables: ['VFX shots'] },
        { cid: cid3, title: 'Marketing & Premiere', desc: 'Trailer release and premiere.', funding: '600000', deadline: NOW + 86400 * 75, status: 'pending', deliverables: ['Trailer'] },
      ]) {
        await db2.run('INSERT INTO milestones (campaign_id, title, description, funding_required, deadline, status, deliverables, completed_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
          [ms.cid, ms.title, ms.desc, ms.funding, ms.deadline, ms.status, JSON.stringify(ms.deliverables), ms.completedAt || null, NOW]);
      }
      console.log('  ✓ milestones');

      // Feed events for campaigns
      const feedCount = await db2.get('SELECT COUNT(*) as count FROM feed_events');
      if (!feedCount || feedCount.count < 6) {
        for (const f of [
          { type: 'campaign_created', actor: C1, data: { summary: 'Chidi Okonkwo launched "Echoes of Harmattan".' }, ago: 45 },
          { type: 'campaign_created', actor: C1, data: { summary: 'Chidi Okonkwo launched "The Last Mangrove".' }, ago: 120 },
          { type: 'campaign_created', actor: C2, data: { summary: 'Amara Obi launched "Satin Shadows".' }, ago: 15 },
          { type: 'milestone_reached', actor: C1, data: { summary: 'Chidi completed Pre-Production for Echoes of Harmattan.' }, ago: 20 },
          { type: 'campaign_funded', actor: B1, data: { summary: '"The Last Mangrove" reached its funding goal!' }, ago: 90 },
          { type: 'milestone_reached', actor: C2, data: { summary: 'Amara completed Costume Design for Satin Shadows.' }, ago: 3 },
        ]) {
          await db2.run('INSERT INTO feed_events (event_type, event_data, actor, created_at) VALUES ($1,$2,$3,$4)',
            [f.type, JSON.stringify(f.data), f.actor, d(f.ago)]);
        }
        console.log('  ✓ feed events');
      }
    } else {
      console.log('  ✓ campaigns already seeded');
    }

    console.log('  ✓ Demo data seeded successfully');
  } catch (err) {
    console.error('  ✗ Seed failed:', err.message);
  } finally { db2.release(); }
}
