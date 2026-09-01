import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ActivityFeed from '../components/common/ActivityFeed';

const WAITLIST = 'https://docs.google.com/forms/d/e/1FAIpQLSdkgWvR_q1ZWPRVfl3-zjqATsGenADtVbBjooyTkUjwqyciJg/viewform?usp=sharing&ouid=116038147133763497901';

export default function HomePage() {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const location = useLocation();

  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (!scrollTo) return;
    requestAnimationFrame(() => {
      document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth' });
    });
    window.history.replaceState({}, '');
  }, [location.state]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0;
    const COUNT = 60;
    const particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    let animId: number;

    const resize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 1.5,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(74,222,128,0.3)';
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(74,222,128,${0.06 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
      />

      {/* HERO */}
      <section id="about" className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-badge">Africa's Creative Economy Financing Infrastructure</div>
          <h1>Fintech Infrastructure for<br /><em>African Creative IP</em></h1>
          <p className="lp-hero-sub">Milestone‑based financing. Verified projects. Productive escrow. We make African creative IP verifiable, investable, and bankable — on a unified financial rail.</p>
          <div className="lp-hero-actions">
            <a href={WAITLIST} target="_blank" rel="noopener" className="lp-btn lp-btn-primary">Join the Waitlist →</a>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="lp-btn lp-btn-secondary">How It Works →</button>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="lp-problem">
        <div className="lp-problem-inner">
          <div className="lp-problem-stat">The Status Quo Is Broken</div>
          <div className="lp-problem-quote">
            Right now, if you're a creative in Jos, Lagos, Port Harcourt, Kano or anywhere in Nigeria – with a creative project ready to go – a film script, a music demo, a game prototype, a fashion collection – and the team to execute it, you still can't access capital unless you know someone who knows someone.<br /><br />
            The system is relationship‑based, not merit‑based. Gatekeeping isn't the problem. What's missing is a way to earn trust through proof of work.<br /><br />
            CineX turns your creative process into a verifiable track record — so your next project raises itself.
          </div>
        </div>
      </section>

      {/* TRUST STATS */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-section-inner">
          <div className="lp-stats-grid">
            <div className="lp-stat-card lp-glass">
              <div className="lp-stat-number">Prototype</div>
              <div className="lp-stat-label">Reference Status</div>
              <div className="lp-stat-detail">Testnet & demo mode</div>
            </div>
            <div className="lp-stat-card lp-glass">
              <div className="lp-stat-number">19</div>
              <div className="lp-stat-label">Logic Contracts</div>
              <div className="lp-stat-detail">Deployed on Stacks testnet</div>
            </div>
            <div className="lp-stat-card lp-glass">
              <div className="lp-stat-number">34+</div>
              <div className="lp-stat-label">Community Conversations</div>
              <div className="lp-stat-detail">Discovery & feedback, not customers</div>
            </div>
            <div className="lp-stat-card lp-glass">
              <div className="lp-stat-number">Past</div>
              <div className="lp-stat-label">Non-Dilutive Grants</div>
              <div className="lp-stat-detail">Earlier programs; not current</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — Escrow Lifecycle */}
      <section id="how-it-works" className="lp-section" style={{ background: 'radial-gradient(ellipse at center,rgba(74,222,128,.02),transparent 60%)' }}>
        <div className="lp-section-inner">
          <div className="lp-label" style={{ textAlign: 'center' }}>How It Works</div>
          <h2 className="lp-title" style={{ textAlign: 'center' }}>The Milestone Escrow Lifecycle</h2>
          <p className="lp-sub" style={{ textAlign: 'center', margin: '0 auto' }}>CineX uses milestone-gated escrow contracts on Stacks testnet. Funds are designed to move only when work is verified — release is governed by the contract and endorser sign-off, not by any single party.</p>
          <div className="lp-how-grid">
            <div className="lp-how-step lp-glass">
              <div className="lp-how-num">1</div>
              <h3>Get Verified</h3>
              <p>Register your identity on-chain. Name, project vertical, and wallet address are recorded in the verification contract. This happens on-chain — a live contract call on testnet.</p>
            </div>
            <div className="lp-how-step lp-glass">
              <div className="lp-how-num">2</div>
              <h3>Create Escrow Campaign</h3>
              <p>Define your project milestones and funding goal in the milestone-escrow contract. Each milestone has a name and release amount. Funds are locked in escrow — only the contract controls disbursement. This is Step 2 of the milestone lifecycle.</p>
            </div>
            <div className="lp-how-step lp-glass">
              <div className="lp-how-num">3</div>
              <h3>Backers Fund Escrow</h3>
              <p>Backers deposit STX directly into the escrow contract. Funds are held by the contract, not by the creator. The contract tracks total deposits per campaign. No one — not even the creator — can withdraw without milestone verification.</p>
            </div>
            <div className="lp-how-step lp-glass">
              <div className="lp-how-num">4</div>
              <h3>Submit Proof of Work</h3>
              <p>Complete a milestone and submit proof on-chain. Photos, videos, files — whatever demonstrates the work was done. The submission is recorded in the contract and visible to endorsers and backers.</p>
            </div>
            <div className="lp-how-step lp-glass">
              <div className="lp-how-num">5</div>
              <h3>Endorse &amp; Release</h3>
              <p>A designated endorser (gatekeeper or backer representative) verifies the submission on-chain. If approved, the milestone amount is released from escrow to the creator. Failed milestones can be disputed.</p>
            </div>
            <div className="lp-how-step lp-glass">
              <div className="lp-how-num">6</div>
              <h3>Project Finalized</h3>
              <p>When all milestones are released, the campaign completes. The full lifecycle — from registration to final withdrawal — is recorded on-chain. Verifiable, transparent, and automated.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVITY FEED */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-label" style={{ textAlign: 'center' }}>Live Activity Feed</div>
          <h2 className="lp-title" style={{ textAlign: 'center' }}>Platform Activity</h2>
          <p className="lp-sub" style={{ textAlign: 'center', margin: '0 auto 32px', maxWidth: 600 }}>
            Real-time activity from campaigns, milestones, ratings, and verification events across the CineX ecosystem.
          </p>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <ActivityFeed limit={10} />
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS NOW */}
      <section className="lp-why">
        <div className="lp-why-inner">
          <div className="lp-label">Why It Matters Now</div>
          <div className="lp-why-highlight">$200 Billion</div>
          <p className="lp-why-body">
            Africa's creative economy is projected to reach $200 billion by 2030, according to the Brookings Institution. Yet less than 1% of creative projects in Nigeria can access formal financing. The infrastructure simply doesn't exist. CineX is building it.
          </p>
          <div className="lp-why-note">
            The market is ready. The technology is ready. What's missing is the financial rail connecting them.
          </div>
        </div>
      </section>

      {/* PILOT PROJECTS — COHORT 0 */}
      <section className="lp-section" id="pilots">
        <div className="lp-section-inner">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="lp-label">Planned — Demo Mode</div>
            <h2 className="lp-title">Four Pilot Concepts in the Pipeline</h2>
            <p className="lp-sub" style={{ margin: '0 auto' }}>Creative works being explored for milestone‑based financing. These are early‑stage / planned pilots shown in demo mode, not live funded deployments.</p>
          </div>
          <div className="lp-pilot-grid">
            <div className="lp-pilot-card lp-glass">
              <div className="lp-pilot-icon">🎬</div>
              <h3>Rain</h3>
              <div className="lp-pilot-format">TV / Streaming • Drama Series</div>
              <p className="lp-pilot-pitch">A gripping Nigerian drama series exploring love, loss, and redemption against the backdrop of Lagos — structured as CineX's first episodic milestone model.</p>
              <div className="lp-pilot-sectors">
                <span className="lp-pilot-sector">Nollywood</span>
                <span className="lp-pilot-sector">Series</span>
              </div>
            </div>
            <div className="lp-pilot-card lp-glass">
              <div className="lp-pilot-icon">🎥</div>
              <h3>The Death of Eternity</h3>
              <div className="lp-pilot-format">Feature Film • Narrative</div>
              <p className="lp-pilot-pitch">A thought‑provoking feature film that questions immortality, legacy, and the price of forever — a showcase for CineX's full lifecycle milestone model.</p>
              <div className="lp-pilot-sectors">
                <span className="lp-pilot-sector">Film</span>
                <span className="lp-pilot-sector">Feature</span>
              </div>
            </div>
            <div className="lp-pilot-card lp-glass">
              <div className="lp-pilot-icon">🥽</div>
              <h3>PrePARE VR</h3>
              <div className="lp-pilot-format">Immersive Media • VR Experience</div>
              <p className="lp-pilot-pitch">An immersive virtual reality experience preparing users for real‑world emergency situations — combining education with experiential storytelling. CineX's first immersive media pilot.</p>
              <div className="lp-pilot-sectors">
                <span className="lp-pilot-sector">VR</span>
                <span className="lp-pilot-sector">EdTech</span>
              </div>
            </div>
            <div className="lp-pilot-card lp-glass">
              <div className="lp-pilot-icon">🌍</div>
              <h3>Northern Travels</h3>
              <div className="lp-pilot-format">Factual • Travel Content</div>
              <p className="lp-pilot-pitch">A documentary travel series exploring the rich cultural heritage, landscapes, and untold stories of Northern Nigeria — bridging regional narratives to global audiences.</p>
              <div className="lp-pilot-sectors">
                <span className="lp-pilot-sector">Documentary</span>
                <span className="lp-pilot-sector">Travel</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM & VALIDATION — Updated: Advisors removed, Stacks Foundry Validate badge added (Selected for) */}
      <section className="lp-section" id="team">
        <div className="lp-section-inner">
          <div className="lp-label">Team &amp; Validation</div>
          <h2 className="lp-title">The People Building CineX</h2>
          <div className="lp-team-grid">
            {[
              { img: 'VIC%20LinkedIn%20Headshot.png', name: 'Victor Omenai', role: 'Technical Founder', bio: 'Smart contract architecture, product strategy, fundraising' },
              { img: 'Stephanie%20profile%20pics.png', name: 'Stephanie Ukiwe', role: 'Product Design', bio: 'UX/UI design, user research, brand identity, product direction' },
              { img: 'McDaniells%20profile%20pics.png', name: 'McDaniells Albert', role: 'Full-Stack Engineer', bio: 'Frontend architecture, API development, smart contract integration' },
              { img: 'Theophilus%20.png', name: 'Theophilus Adelekun', role: 'Project Manager', bio: 'Operations, milestone tracking, creative partner coordination' },
            ].map(m => (
              <div key={m.name} className="lp-team-card lp-glass">
                <img className="lp-team-photo" src={`/assets/images/Team%20profile%20pics/${m.img}`} alt={m.name} loading="lazy" />
                <h4>{m.name}</h4>
                <div className="lp-role">{m.role}</div>
                <div className="lp-bio">{m.bio}</div>
              </div>
            ))}
          </div>

          {/* VALIDATION — Inaugural cohort member (completed program) */}
          <div style={{ marginTop: 48, textAlign: 'center', padding: '1.5rem', background: 'rgba(74,222,128,0.05)', borderRadius: '16px', border: '1px solid rgba(74,222,128,0.2)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: 4 }}>
              Founder was an inaugural cohort member of
            </p>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--green)' }}>
              <a
                href="https://stacksendowment.co/blog/introducing-stacks-foundry-validate"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--green)', textDecoration: 'none' }}
              >
                Stacks Foundry Validate Program
              </a>
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>
              5‑week structured validation · May–June 2026 · Completed cohort
            </p>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section id="roadmap" className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-label">Roadmap</div>
          <h2 className="lp-title">From Strategic Reset to Institutional Capital</h2>
          <div className="lp-roadmap">
            <div className="lp-rm-item">
              <div className="lp-rm-dot"></div>
              <div className="lp-rm-date">Q2 2026</div>
              <div className="lp-rm-title">Strategic Reset</div>
              <div className="lp-rm-desc">Completed. 19 logic contracts deployed on testnet. 590+ tests passing. 2-of-3 multisig in place. Frontend staging live.</div>
            </div>
            <div className="lp-rm-item">
              <div className="lp-rm-dot current"></div>
              <div className="lp-rm-date">Q3 2026</div>
              <div className="lp-rm-title">Pivot MVP Build</div>
              <div className="lp-rm-desc">In progress. Full frontend with wallet abstraction, milestone management UI, gatekeeper onboarding flow, and creative dashboard. Testnet launch.</div>
            </div>
            <div className="lp-rm-item">
              <div className="lp-rm-dot"></div>
              <div className="lp-rm-date">Q4 2026</div>
              <div className="lp-rm-title">Cohort 0 Pilots</div>
              <div className="lp-rm-desc">4 pilot projects live on mainnet. Rain, Death of Eternity, PrePARE VR, Northern Travels. Full milestone lifecycle validated with real creative works.</div>
            </div>
            <div className="lp-rm-item">
              <div className="lp-rm-dot"></div>
              <div className="lp-rm-date">H1 2027</div>
              <div className="lp-rm-title">Supply Partners &amp; Scale</div>
              <div className="lp-rm-desc">Institutional capital partnerships. NGN/USD on-ramps. Pan-African gatekeeper expansion. 100+ projects financed.</div>
            </div>
          </div>
        </div>
      </section>

      {/* INVESTOR ASK */}
      <section id="investors" className="lp-section" style={{ textAlign: 'center' }}>
        <div className="lp-section-inner">
          <div className="lp-label">For Investors</div>
          <h2 className="lp-title">We Are Raising Our Pre-Seed Round</h2>
          <p className="lp-sub" style={{ margin: '0 auto 24px', maxWidth: 600 }}>
            CineX is building the financial infrastructure for Africa's creative economy. This is a prototype: 19 logic contracts deployed on Stacks testnet, and an open, community-driven discovery process. We are an early-stage project looking for mission-aligned angels and funds who see the $200B opportunity in African creative IP — and who want honest, verifiable milestones rather than hype.
          </p>
          <p className="lp-sub" style={{ margin: '0 auto 36px', color: 'var(--green)', fontSize: '.9rem' }}>
            Contact: <a href="mailto:mediacinex@gmail.com" style={{ color: '#4ade80', textDecoration: 'underline' }}>mediacinex@gmail.com</a>
          </p>
          <a href="mailto:mediacinex@gmail.com" className="lp-btn lp-btn-primary" style={{ fontSize: '1rem', padding: '16px 40px' }}>
            Request Investment Deck →
          </a>
        </div>
      </section>

      {/* FINAL WAITLIST CTA */}
      <section className="lp-waitlist">
        <div className="lp-waitlist-inner">
          <h2>Join the Waitlist</h2>
          <p>Be the first to know when CineX launches. Early waitlist members get priority access, creator onboarding support, and exclusive updates.</p>
          <a href={WAITLIST} target="_blank" rel="noopener" className="lp-btn lp-btn-primary" style={{ fontSize: '1.1rem', padding: '18px 48px' }}>
            Join the Waitlist →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <p style={{ fontSize: '.9rem', color: 'var(--text)', fontWeight: 500 }}>New financing rails for film, music, gaming, and immersive media.</p>
        <div className="lp-social-links">
          <a href="/litepaper.html" target="_blank" rel="noopener" style={{ fontSize: '.85rem' }}>Economic Litepaper</a>
          <a href="https://x.com/MediaCinex73878" target="_blank" rel="noopener">Follow us on X</a>
          <a href="https://x.com/paper2screen" target="_blank" rel="noopener">Founder @paper2screen</a>
          <a href="https://www.linkedin.com/in/victor-olumese-omenai/" target="_blank" rel="noopener" style={{ fontSize: '.9rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'currentColor' }}><path d="M19 0H5a5 5 0 0 0-5 5v14a5 5 0 0 0 5 5h14a5 5 0 0 0 5-5V5a5 5 0 0 0-5-5zM8 19H5V8h3v11zM6.5 6.7c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8 1.8.8 1.8 1.8-.8 1.8-1.8 1.8zM20 19h-3v-5.6c0-3.4-4-3.1-4 0V19h-3V8h3v1.8c1.4-2.6 7-2.8 7 2.5V19z"/></svg>
            Victor's LinkedIn
          </a>
        </div>
        <p>© 2026 Victor Omenai. CineX is an open-source project.</p>
      </footer>
    </div>
  );
}