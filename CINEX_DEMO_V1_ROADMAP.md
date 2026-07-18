# CineX Market-Facing Landing Page — Build Log

**Status:** Deployed (live on Vercel)  
**Philosophy:** Real smart contracts on Stacks testnet, Hiro sandbox iframes as the live demo, plain-English copy for creators & backers.  
**Pattern:** Updated React SPA `HomePage.tsx` with market-facing sections + two live Hiro sandbox iframes embedded as the central validating asset.

---

## 1. Motivation

The original CineX landing page was developer-facing (litepaper, technical moat, competitive matrix). Investors and creators visiting the site had no way to see the protocol in action. The new landing page solves this by:

- **Embedding live testnet contracts** — Hiro Explorer sandbox iframes for `project-verification-module` and `milestone-escrow` that visitors can interact with in 5 minutes (install wallet → testnet → faucet → call)
- **Plain English copy** — no crypto-jargon; "Get Verified ✅ → Set Milestones 📌 → Release Funds on Proof 💸"
- **Non-crypto on-ramp** — YouTube walkthrough video, pre-demo setup checklist, "raw engine view" framing

---

## 2. Architecture

### 2.1 Changes Are SPA-Only

All changes live in the React SPA (`app/`). No backend, no smart contracts, no routing changes:

| File | Change |
|---|---|
| `app/src/pages/HomePage.tsx` | Full rewrite — 10 new sections, Live Demo with iframes, market-facing copy |
| `app/src/index.css` | New CSS classes for Problem, Demo, Why, Waitlist sections + lp-demo-iframe responsive sizing |
| `app/src/components/layout/Navbar.tsx` | "Get Started" → "Join Waitlist" anchor to Google Form |

**Not modified:** router.tsx (17 routes), DemoPage.tsx, backend/, contracts/, tests/

### 2.2 Section Order (Top to Bottom)

1. **Hero** — animated particle canvas, headline + subtitle
2. **The Problem** — "Filmmakers in Africa raise money through WhatsApp groups, spreadsheets, and trust"
3. **Trust Stats** — $3.2B crowdfunding gap, 27 contracts audited, 1:1 STX escrow
4. **How It Works** — 3-step creator flow (Verify ✅ → Milestones 📌 → Proof 💸)
5. **Live Demo** — Pre-demo setup → YouTube walkthrough → Step 1 (verify-creator iframe) → Step 2 (create-campaign iframe) → "raw engine view" note → closing
6. **Why It Matters Now** — $200B African creative economy statistic
7. **Cohort 0 Pilots** — 4 plain glass cards (4 filmmakers locked for beta)
8. **Team** — Victor Omenai, bio, links
9. **Roadmap** — Q1-Q4 timeline
10. **Investor Ask** — mediacinex@gmail.com CTA
11. **Final Waitlist CTA** — "Join the Waitlist" → Google Form
12. **Footer** — Social links preserved

### 2.3 Live Demo Details

- **Pre-demo setup:** 5-step checklist (install Hiro Wallet → Testnet → Faucet → wait → ready)
- **YouTube walkthrough:** https://www.youtube.com/watch?v=CeOaRRDBIDw — 2-min wallet/setup guide
- **Step 1 iframe:** `project-verification-module.verify-creator` on testnet
- **Step 2 iframe:** `milestone-escrow.create-campaign` on testnet
- **Raw engine view note:** *"This is the raw engine view — the final CineX dashboard will wrap these contracts in a clean, friendly interface."*
- **Closing line:** "This is not a mockup. This is the protocol, live and functional."

---

## 3. Key Decisions

| Decision | Rationale |
|---|---|
| Rewrite HomePage.tsx (not replace SPA) | Preserve all 17 routes, auth, navbar, and app features |
| Hiro sandbox iframes (not mock service) | Real proof the contracts work; no backend maintenance |
| "Join Waitlist" (not "Get Started") | No production signup yet; Google Form captures interest |
| Remove Strategic Moat & Competitive Matrix | Market-facing lander needs problem-focused copy, not technical comparisons |
| 4 plain glass pilot cards (no Swiper carousel) | Simpler, faster, no animation dependencies |
| YouTube walkthrough above pre-demo setup | Catches intimidated visitors before they hit the 5-step checklist |
| mediacinex@gmail.com preserved | Investor contact unchanged |
| All footer social links preserved | LinkedIn (Victor Omenai), X @MediaCinex73878, X @paper2screen |

---

## 4. Implementation Log

| Step | Status |
|---|---|
| Read Google Doc prompt + full codebase audit | ✅ |
| Rewrite HomePage.tsx with 10 new sections | ✅ |
| Add CSS classes in index.css | ✅ |
| Update Navbar "Get Started" → "Join Waitlist" | ✅ |
| Fix JSX nesting bug (extra `</div>`) | ✅ |
| Add YouTube walkthrough link (above pre-demo setup) | ✅ |
| Add "raw engine view" framing note | ✅ |
| `npm run build` — zero errors | ✅ |
| `git commit` + `git push` → Vercel auto-deploy | ✅ |

---

## 5. URL Reference

| Resource | URL |
|---|---|
| Live site | https://cine-x-iota.vercel.app |
| Backend | Render (SUSPENDED) — migrating to Vercel experimentalServices |
| Hiro Wallet | https://www.hiro.so/wallet |
| Testnet Faucet | https://explorer.hiro.so/sandbox/faucet?chain=testnet |
| YouTube walkthrough | https://www.youtube.com/watch?v=CeOaRRDBIDw |
| Waitlist form | https://docs.google.com/forms/d/e/1FAIpQLSdkgWvR_q1ZWPRVfl3-zjqATsGenADtVbBjooyTkUjwqyciJg/viewform |
| Verify-creator contract (testnet) | https://explorer.hiro.so/sandbox/contract-call/ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.project-verification-module/verify-creator?chain=testnet |
| Milestone-escrow contract (testnet) | https://explorer.hiro.so/sandbox/contract-call/ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.milestone-escrow/create-campaign?chain=testnet |

---

## 6. Next Steps / Future Work

1. **Record CineX-specific screencast** — show the full verify-creator → create-campaign flow end-to-end (not just wallet setup)
2. **Product mockup / annotated screenshot** — show the future dashboard UI alongside the raw engine view
3. **Campaign Explorer** — embed a live feed of testnet campaigns created through the demo
4. **Demo mode toggle** — if the app needs a full mock-service demo for investor walkthroughs, revive the original Demo V1 strategy from earlier drafts
