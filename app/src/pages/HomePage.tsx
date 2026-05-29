import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuide } from '../contexts/GuideContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { openGuide } = useGuide();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let w: number, h: number;
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
      <section className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-badge">Africa's Creative Economy Financing Infrastructure</div>
          <h1>Fintech Infrastructure for<br /><em>African Creative IP</em></h1>
          <p className="lp-hero-sub">Milestone‑based financing. Verified projects. Productive escrow. We make African creative work investable, verifiable, and bankable — on a unified financial rail.</p>
          <div className="lp-hero-actions">
            <button onClick={() => navigate('/signup')} className="lp-btn lp-btn-primary">Get Started →</button>
            <button onClick={() => navigate('/demo')} className="lp-btn lp-btn-secondary">Try Demo</button>
            <a href="#features" className="lp-btn lp-btn-ghost">Explore Model</a>
          </div>
        </div>
      </section>

      {/* GATEKEEPER */}
      <section className="lp-section" id="gatekeeper">
        <div className="lp-section-inner">
          <div className="lp-label">Strategic Moat</div>
          <h2 className="lp-title">Not Just a Waitlist — a Movement of Gatekeepers</h2>
          <p className="lp-sub" style={{ marginBottom: 8 }}>In Africa, adoption is tribal. We recruited 34 guild leaders, association heads, and industry influencers through trust‑based meetups — zero paid ads. Global players spent millions on marketing but ignored cultural trust. CineX is built around Africa's reality.</p>
          <div className="lp-gk-grid">
            <div className="lp-gk-visual lp-glass">
              <div className="lp-gk-network">
                <div className="lp-gk-node"><div className="lp-gk-dot"></div><span><strong>34 Gatekeepers</strong> <span style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>— guild leaders, association heads</span></span></div>
                <div className="lp-gk-line"></div>
                <div className="lp-gk-branch">
                  <div className="lp-gk-leaf">Filmmakers Guild — 200+ members</div>
                  <div className="lp-gk-leaf">Music Producers Network — 150+ members</div>
                  <div className="lp-gk-leaf">Game Developers Collective — 80+ members</div>
                  <div className="lp-gk-leaf">Fashion Creatives Hub — 120+ members</div>
                  <div className="lp-gk-leaf" style={{ borderColor: 'rgba(74,222,128,.2)', color: 'var(--text)' }}>+30 more gatekeepers × 100+ creatives each</div>
                </div>
                <div className="lp-gk-mult">×100+</div>
                <div className="lp-gk-node" style={{ borderColor: 'rgba(74,222,128,.2)' }}>
                  <div className="lp-gk-dot" style={{ boxShadow: '0 0 8px var(--green-glow)' }}></div>
                  <span><strong style={{ color: 'var(--green)' }}>3,400+</strong> <span style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>potential users at zero marginal CAC</span></span>
                </div>
              </div>
            </div>
            <div className="lp-gk-text">
              <h3>Distribution That Mirrors Reality</h3>
              <p>In Nigeria, creative communities organize around trusted leaders — guild presidents, association chairs, industry elders. They decide what tools their tribe adopts.</p>
              <p>CineX's GTM is built around this cultural reality: <strong style={{ color: '#fff' }}>tribesmen decide the success of a village.</strong> We don't buy ads. We earn trust. One gatekeeper endorsement unlocks their entire network.</p>
              <p style={{ color: 'var(--green)', fontWeight: 500, fontSize: '.9rem' }}>34 gatekeepers × 100+ creatives each = 3,400+ potential users at zero marginal cost. Adoption spreads like political parties — through tribe leaders.</p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-section-inner">
          <div className="lp-stats-grid">
            <div className="lp-stat-card lp-glass">
              <div className="lp-stat-number">34+</div>
              <div className="lp-stat-label">Verified Gatekeepers</div>
              <div className="lp-stat-detail">Not users — guild leaders</div>
            </div>
            <div className="lp-stat-card lp-glass">
              <div className="lp-stat-number">$1M+</div>
              <div className="lp-stat-label">Pipeline Value</div>
              <div className="lp-stat-detail">From waitlist conversations</div>
            </div>
            <div className="lp-stat-card lp-glass">
              <div className="lp-stat-number">93.5%</div>
              <div className="lp-stat-label">Nigeria‑First Focus</div>
              <div className="lp-stat-detail">Beachhead market</div>
            </div>
            <div className="lp-stat-card lp-glass">
              <div className="lp-stat-number">$9k+</div>
              <div className="lp-stat-label">Non‑dilutive Grants</div>
              <div className="lp-stat-detail">Stacks Ascent + DeGrants</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-label">The CineX Engine</div>
          <h2 className="lp-title">Financing Infrastructure, Not a Donation Page</h2>
          <p className="lp-sub">Four interconnected capabilities that make creative IP a real asset class.</p>
          <div className="lp-features-grid">
            <div className="lp-feature-card lp-glass">
              <div className="lp-feature-icon">✓</div>
              <h3>Verified Project Onboarding</h3>
              <div className="stat-line">34 gatekeepers already committed</div>
              <p>No blind funding. Every project is vouched for by a trusted gatekeeper before it reaches our platform.</p>
            </div>
            <div className="lp-feature-card lp-glass">
              <div className="lp-feature-icon">◈</div>
              <h3>Milestone‑Gated Payouts</h3>
              <div className="stat-line">$1M+ pipeline in active conversation</div>
              <p>Capital releases in stages, only when deliverables are proven. No lump-sum risk. Backers see exactly where their money goes.</p>
            </div>
            <div className="lp-feature-card lp-glass">
              <div className="lp-feature-icon">⟁</div>
              <h3>Productive Escrow Yield</h3>
              <div className="stat-line">70% backers / 20% platform / 10% creator bonus</div>
              <p>Idle capital doesn't sit still — it earns yield through secure DeFi strategies. No lock-ups, no waste, no speculation.</p>
            </div>
            <div className="lp-feature-card lp-glass">
              <div className="lp-feature-icon">◆</div>
              <h3>Nigeria‑First, Built for Africa</h3>
              <div className="stat-line">$5B+ market today → $200B by 2030</div>
              <p>Designed for African creative realities from day one. NGN/USD wallet abstraction. Mobile-first. Tribal GTM.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PILOT PROJECTS */}
      <section className="lp-section" id="pilots">
        <div className="lp-section-inner">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="lp-label">Traction — Cohort 0</div>
            <h2 className="lp-title">Four Pilot Projects in the Pipeline</h2>
            <p className="lp-sub" style={{ margin: '0 auto' }}>Real creative works being structured for milestone‑based financing. Each represents a creative sector CineX serves.</p>
          </div>
          <div className="lp-pilot-grid">
            {/* Rain Series */}
            <div className="lp-pilot-card lp-glass">
              <h3>Rain</h3>
              <div className="lp-pilot-format">Series Development • TV / Streaming</div>
              <p className="lp-pilot-pitch">A gripping Nigerian drama series exploring love, loss, and redemption against the backdrop of Lagos — structured as CineX's first episodic milestone model.</p>
              <div className="lp-flip-grid" style={{ marginTop: 16 }}>
                <div className="lp-flip-card">
                  <div className="lp-flip-inner">
                    <div className="lp-flip-front">
                      <img src="/assets/images/Pilot%20Creative%20projects_2%20of%20the%204/Rain%20Series%20Concept%20Cover%20pics.png" alt="Rain Series Concept Cover" loading="lazy" />
                      <div className="lp-flip-label">Concept Cover</div>
                    </div>
                    <div className="lp-flip-back">
                      <strong>The Visual Identity</strong>
                      <p>The world of Rain — a rich, atmospheric Lagos where every frame tells a story of contrast: wealth and struggle, tradition and ambition.</p>
                    </div>
                  </div>
                </div>
                <div className="lp-flip-card">
                  <div className="lp-flip-inner">
                    <div className="lp-flip-front">
                      <img src="/assets/images/Pilot%20Creative%20projects_2%20of%20the%204/Rain%20Series%20Story%20format%20type%20pics.png" alt="Rain Series Format" loading="lazy" />
                      <div className="lp-flip-label">Story Format</div>
                    </div>
                    <div className="lp-flip-back">
                      <strong>Format: TV Series</strong>
                      <p>Genre: Drama. Target: Streaming platforms. Structured in milestone-aligned episodes — each episode unlocks the next tranche of financing.</p>
                    </div>
                  </div>
                </div>
                <div className="lp-flip-card">
                  <div className="lp-flip-inner">
                    <div className="lp-flip-front">
                      <img src="/assets/images/Pilot%20Creative%20projects_2%20of%20the%204/Rain%20Series%20Logline%20pics.png" alt="Rain Series Logline" loading="lazy" />
                      <div className="lp-flip-label">Logline</div>
                    </div>
                    <div className="lp-flip-back">
                      <strong>The Core Story</strong>
                      <p>When a young Lagos filmmaker returns home after a decade abroad, she discovers the family estate — and its secrets — are crumbling alongside her mother's health.</p>
                    </div>
                  </div>
                </div>
                <div className="lp-flip-card">
                  <div className="lp-flip-inner">
                    <div className="lp-flip-front">
                      <img src="/assets/images/Pilot%20Creative%20projects_2%20of%20the%204/Rain%20Series%20Synopsis%20pics.png" alt="Rain Series Synopsis" loading="lazy" />
                      <div className="lp-flip-label">Synopsis</div>
                    </div>
                    <div className="lp-flip-back">
                      <strong>The Journey</strong>
                      <p>A story of identity, belonging, and the rain that washes away more than dirt. Each episode milestone maps to a phase of the protagonist's reckoning.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Death of Eternity */}
            <div className="lp-pilot-card lp-glass">
              <h3>The Death of Eternity</h3>
              <div className="lp-pilot-format">Narrative Film • Feature</div>
              <p className="lp-pilot-pitch">A thought‑provoking feature film that questions immortality, legacy, and the price of forever — a showcase for CineX's full lifecycle milestone model.</p>
              <div className="lp-doe-grid" style={{ marginTop: 16 }}>
                {[
                  { id: 'doe1', src: 'Death%20of%20Eternity%20Concept%20pics.png', label: 'View Concept →' },
                  { id: 'doe2', src: 'Death%20of%20Eternity%20Concept%20pics2.png', label: 'View Concept →' },
                  { id: 'doe3', src: 'Death%20of%20Eternity%20Concept%20Premise%20pics.png', label: 'View Premise →' },
                  { id: 'doe4', src: 'Death%20of%20Eternity%20Logline%20pics.png', label: 'View Logline →' },
                ].map(item => (
                  <div key={item.id} className="lp-doe-cell" onClick={() => setLightbox(item.id)}>
                    <img src={`/assets/images/Pilot%20Creative%20projects_2%20of%20the%204/${item.src}`} alt={item.label} loading="lazy" />
                    <div className="lp-doe-overlay"><span>{item.label}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, color: 'var(--text-dim)', fontSize: '.8rem', textAlign: 'center' }}>Click any image to expand — cinematic mood board</div>
            </div>

            {/* PrePARE VR */}
            <div className="lp-pilot-card lp-glass" style={{ background: 'linear-gradient(135deg,rgba(74,222,128,.04),rgba(34,197,94,.02))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 16, opacity: 0.5 }}>◉</div>
                <h3>PrePARE VR</h3>
                <div className="lp-pilot-format">Immersive Media • VR Experience</div>
                <p className="lp-pilot-pitch" style={{ maxWidth: 500 }}>An immersive virtual reality experience preparing users for real‑world emergency situations — combining education with experiential storytelling. CineX's first immersive media pilot.</p>
              </div>
            </div>

            {/* Northern Travels */}
            <div className="lp-pilot-card lp-glass" style={{ background: 'linear-gradient(135deg,rgba(74,222,128,.04),rgba(34,197,94,.02))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 16, opacity: 0.5 }}>⊡</div>
                <h3>Northern Travels</h3>
                <div className="lp-pilot-format">Factual / Travel Content</div>
                <p className="lp-pilot-pitch" style={{ maxWidth: 500 }}>A documentary travel series exploring the rich cultural heritage, landscapes, and untold stories of Northern Nigeria — bridging regional narratives to global audiences.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="lp-section" style={{ background: 'radial-gradient(ellipse at center,rgba(74,222,128,.02),transparent 60%)' }}>
        <div className="lp-section-inner">
          <div className="lp-label" style={{ textAlign: 'center' }}>How It Works</div>
          <h2 className="lp-title" style={{ textAlign: 'center' }}>Three Steps to Bankable Creativity</h2>
          <p className="lp-sub" style={{ textAlign: 'center', margin: '0 auto' }}>Plain English. No technical jargon. Just a better way to finance creative work.</p>
          <div className="lp-how-grid">
            <div className="lp-how-step lp-glass">
              <div className="lp-how-num">1</div>
              <h3>Verified Intake</h3>
              <p>Gatekeepers invite vetted creatives. Projects are validated for quality and feasibility before any funding is raised. No blind pitches.</p>
            </div>
            <div className="lp-how-step lp-glass">
              <div className="lp-how-num">2</div>
              <h3>Milestone Gating</h3>
              <p>Funds release in stages, secured by automated agreements on a digital ledger. Each deliverable is verified before the next tranche unlocks.</p>
            </div>
            <div className="lp-how-step lp-glass">
              <div className="lp-how-num">3</div>
              <h3>Productive Escrow</h3>
              <p>Idle capital earns yield automatically through secure strategies — no lock-ups, no waste. Backers earn while projects develop. Creators get a success bonus (70/20/10 split).</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <button
              onClick={openGuide}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-[#4ade80] border border-[rgba(74,222,128,0.3)] hover:bg-[rgba(74,222,128,0.1)] hover:border-[#4ade80] rounded-full transition-all"
            >
              See the Complete Lifecycle →
            </button>
          </div>
        </div>
      </section>

      {/* COMPETITIVE MATRIX */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-label">Why CineX</div>
          <h2 className="lp-title">Built Different for a Different Reality</h2>
          <div className="lp-matrix-wrap">
            <table className="lp-matrix-table lp-glass" style={{ padding: 0, overflow: 'hidden' }}>
              <thead>
                <tr><th>Feature</th><th>Traditional Crowdfunding</th><th>Generic Crypto Platforms</th><th style={{ color: 'var(--green)' }}>CineX</th></tr>
              </thead>
              <tbody>
                <tr><td>Milestone control</td><td><span className="lp-cross">✗</span> Lump-sum</td><td><span className="lp-cross">✗</span> Usually none</td><td><span className="lp-check">✓</span> Staged releases</td></tr>
                <tr><td>Escrow visibility</td><td>Opaque</td><td>Pseudonymous</td><td><span className="lp-check">✓</span> Fully transparent</td></tr>
                <tr><td>Yield on idle capital</td><td><span className="lp-cross">✗</span> None</td><td>Sometimes speculative</td><td><span className="lp-check">✓</span> Productive escrow (70/20/10)</td></tr>
                <tr><td>Africa‑specific tribes</td><td><span className="lp-cross">✗</span> Ignored</td><td><span className="lp-cross">✗</span> Western-centric</td><td><span className="lp-check">✓</span> Built on gatekeeper trust</td></tr>
                <tr><td>Admin security</td><td>Centralized</td><td>Variable</td><td><span className="lp-check">✓</span> 2-of-3 multisig + timelock</td></tr>
                <tr><td style={{ borderBottom: 'none' }}>Smart contract audit readiness</td><td style={{ borderBottom: 'none' }}>N/A</td><td style={{ borderBottom: 'none' }}>Varies</td><td style={{ borderBottom: 'none', color: 'var(--green)', fontWeight: 600 }}>29 contracts, 50+ tests</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* MARKET OPPORTUNITY */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-label">Market Opportunity</div>
          <h2 className="lp-title">A $200 Billion Market by 2030</h2>
          <div className="lp-market-bar-wrap">
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <div className="lp-market-bar"><div className="lp-market-fill" style={{ width: '1%' }}>$1M+ Pipeline</div></div>
              <div className="lp-market-bar"><div className="lp-market-fill" style={{ width: '15%' }}>$5B+ Today</div></div>
              <div className="lp-market-bar"><div className="lp-market-fill" style={{ width: '100%', background: 'linear-gradient(90deg,rgba(74,222,128,.2),rgba(74,222,128,.05))', color: 'var(--text-dim)' }}>$200B by 2030</div></div>
            </div>
            <div className="lp-market-source">Source: <a href="https://www.brookings.edu/articles/the-rise-of-africas-creative-economy/" target="_blank" rel="noopener" style={{ color: 'var(--text-dim)', textDecoration: 'underline' }}>Brookings Institution — Africa's Creative Economy</a></div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="lp-section" id="team">
        <div className="lp-section-inner">
          <div className="lp-label">Team & Advisors</div>
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
          <h3 style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: '1rem', fontWeight: 600, marginTop: 40, marginBottom: 12 }}>Advisors</h3>
          <div className="lp-advisors-grid">
            {[
              { name: 'Setzeus', role: 'Clarity Smart Contracts OG — Stacks Ecosystem Projects Engineering Audit — CineX Mentor' },
              { name: 'Gary Riger', role: 'Clarity Smart Contracts Working Group Host — Stacks Ecosystem Strategy' },
              { name: 'Stephen Perrino', role: 'Stacks Ecosystem OG Media & Communication Lead & Host DeOrganized Media' },
            ].map(a => (
              <div key={a.name} className="lp-advisor-card lp-glass">
                <h4>{a.name}</h4>
                <div className="lp-role">{a.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-label">Roadmap</div>
          <h2 className="lp-title">From Strategic Reset to Institutional Capital</h2>
          <div className="lp-roadmap">
            <div className="lp-rm-item">
              <div className="lp-rm-dot"></div>
              <div className="lp-rm-date">Q2 2026</div>
              <div className="lp-rm-title">Strategic Reset</div>
              <div className="lp-rm-desc">Completed. 29 contracts deployed on testnet. 50+ tests passing. 2-of-3 multisig live. Backend on Render, new frontend placeholder.</div>
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
              <div className="lp-rm-title">Supply Partners & Scale</div>
              <div className="lp-rm-desc">Institutional capital partnerships. NGN/USD on-ramps. Pan-African gatekeeper expansion. 100+ projects financed.</div>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM / BUILDING IN PUBLIC */}
      <section className="lp-section" style={{ textAlign: 'center' }}>
        <div className="lp-section-inner">
          <div className="lp-label">Building in Public</div>
          <h2 className="lp-title">Backed by Stacks Ascent + DeGrants</h2>
          <p className="lp-sub" style={{ margin: '0 auto 24px' }}>
            Non-dilutive grant funding from the Stacks ecosystem. Read our economic litepaper for the full breakdown — cap table, use of funds, token model, and long-term vision.
          </p>
          <a href="/litepaper.html" target="_blank" rel="noopener" className="lp-btn lp-btn-primary" style={{ fontSize: '1rem', padding: '16px 40px' }}>
            Read Economic Litepaper →
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
        <p>© 2026 CineX. All rights reserved.</p>
      </footer>

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="lp-lightbox active" onClick={() => setLightbox(null)}>
          <button className="lp-lightbox-close" onClick={(e) => { e.stopPropagation(); setLightbox(null); }}>✕</button>
          {lightbox === 'doe1' && <img src="/assets/images/Pilot%20Creative%20projects_2%20of%20the%204/Death%20of%20Eternity%20Concept%20pics.png" alt="" onClick={e => e.stopPropagation()} />}
          {lightbox === 'doe2' && <img src="/assets/images/Pilot%20Creative%20projects_2%20of%20the%204/Death%20of%20Eternity%20Concept%20pics2.png" alt="" onClick={e => e.stopPropagation()} />}
          {lightbox === 'doe3' && <img src="/assets/images/Pilot%20Creative%20projects_2%20of%20the%204/Death%20of%20Eternity%20Concept%20Premise%20pics.png" alt="" onClick={e => e.stopPropagation()} />}
          {lightbox === 'doe4' && <img src="/assets/images/Pilot%20Creative%20projects_2%20of%20the%204/Death%20of%20Eternity%20Logline%20pics.png" alt="" onClick={e => e.stopPropagation()} />}
        </div>
      )}

    </div>
  );
}
