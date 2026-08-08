import 'dotenv/config';
import { initDb, getDb, closeDb } from '../src/database.js';

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;
const d = (daysAgo) => NOW - daysAgo * DAY;

const C1 = 'ST1J4G6R0VX7NZYF1DGX8MNSNYVE3VGZJSRTPGZGM';
const C2 = 'ST2N81HZ0YM5PZQF2EHX9ONTZWF4WHZKJSQVWXYZM';
const B1 = 'ST3PQXKV6RJXZFY3FIY8MPSOZVE3VGZJSQTVWABC';

async function main() {
  await initDb();
  const db = await getDb();
  try {
    const campCount = await db.get('SELECT COUNT(*) as count FROM campaigns');
    if (campCount && campCount.count > 0) {
      console.log(`  ✓ campaigns already seeded (${campCount.count} rows)`);
      return;
    }

    const d30 = d(30), d45 = d(45), d60 = d(60), d90 = d(90), d120 = d(120), d15 = d(15), d1 = d(1), d2 = d(2), d5 = d(5);

    const c1 = await db.run(`INSERT INTO campaigns (title, description, creator, target_amount, current_amount, deadline, category, status, tags, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      ['Echoes of Harmattan', 'A poetic short film capturing the haunting beauty of the harmattan season in northern Nigeria.', C1, '250000', '187500', d30 + 86400 * 60, 'short-film', 'active', JSON.stringify(['harmattan', 'northern-nigeria', 'poetic']), d45, d2]);
    const cid1 = c1.lastInsertRowid;
    const c2 = await db.run(`INSERT INTO campaigns (title, description, creator, target_amount, current_amount, deadline, category, status, tags, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      ['The Last Mangrove', 'A feature-length documentary on mangrove deforestation in the Niger Delta.', C1, '800000', '800000', d90 + 86400 * 30, 'documentary', 'funded', JSON.stringify(['environment', 'niger-delta', 'climate']), d120, d5]);
    const cid2 = c2.lastInsertRowid;
    const c3 = await db.run(`INSERT INTO campaigns (title, description, creator, target_amount, current_amount, deadline, category, status, tags, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      ['Satin Shadows', 'A vibrant feature film set in Lagos\'s underground fashion scene.', C2, '5000000', '1200000', NOW + 86400 * 45, 'feature', 'active', JSON.stringify(['lagos', 'fashion', 'fantasy']), d15, d1]);
    const cid3 = c3.lastInsertRowid;
    console.log('  ✓ campaigns');

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
      await db.run('INSERT INTO contributions (campaign_id, contributor, amount, tx_id, created_at) VALUES ($1,$2,$3,$4,$5)',
        [cont.cid, cont.contributor, cont.amount, `0xseed${cont.ago}`, d(cont.ago)]);
    }
    console.log('  ✓ contributions');

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
      await db.run('INSERT INTO milestones (campaign_id, title, description, funding_required, deadline, status, deliverables, completed_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
        [ms.cid, ms.title, ms.desc, ms.funding, ms.deadline, ms.status, JSON.stringify(ms.deliverables), ms.completedAt || null, NOW]);
    }
    console.log('  ✓ milestones');

    console.log('  ✓ Campaigns seeded successfully');
  } catch (err) {
    console.error('  ✗ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    db.release();
    await closeDb();
  }
}

main();
