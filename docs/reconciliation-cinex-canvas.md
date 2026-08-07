# CineX Canvas — Mock Frontend Reconciliation Report

Date: 2026-08-06
Target: `cinex-canvas/` (TanStack Start + mock/localStorage frontend, storage key `cinex-state-v2`)
Ground truth: `contracts/milestone-verification.clar`, `contracts/milestone-escrow.clar`, `contracts/campaign-module.clar`, project brief (Issue 1–3)

## Summary

`cinex-canvas/` is a pure mock frontend (no backend, no chain) used to preview the CineX product flow. This pass reconciled its role model, voting semantics, and media handling against the real smart contracts so the mock no longer teaches users behavior that contradicts the on-chain engine.

- **Issue 1 — Backer vs Creative role UX: COMPLETE.** Backers are now first-class citizens: they can register as backers, contribute to campaigns, and cast contribution-weighted milestone votes that mirror `milestone-verification.clar` exactly.
- **Issue 2 — Gatekeeper / Endorsement flow: COMPLETE.** The self-registration Gatekeeper role and the vote-on-endorsement flow are replaced by a "Coming Soon" placeholder; the Gatekeeper role in the register picker is disabled with a badge.
- **Issue 3 — Project thumbnails: COMPLETE.** Campaigns, discover cards, dashboard cards, and portfolio work accept thumbnail media (file upload → data URL, or YouTube/Vimeo/image URL), render with lazy loading and graceful fallback.
- **Addendum — Exhaustive category UX: COMPLETE.** Portfolio and campaign forms share one exhaustive preset list (~66 categories across 10 sectors) with "Other — specify" custom naming; sectors drive thumbnail tones and backend category mapping.
- **Phase 4 — this report.**
- **Phase 5 — delete `/demo` + `/demo-scenario` from `app/`: COMPLETE.** Homepage LIVE DEMO section, both demo routes/pages/tests removed; navbar redesigned to landing-section anchors; tagline updated. Commit + push still pending user request.
- **Phase 6 (P2) — live CineX API data plane: COMPLETE.** `cinex-canvas` now runs against the live backend in live mode while mock mode stays functionally identical behind the same `DataSource` surface. See [Live API Data Plane](#phase-6-p2--live-cinex-api-data-plane).
- **Phase 7 — de-Lovable + flatten into repo: COMPLETE.** `cinex-canvas/.git` removed (now tracked by the main repo at `cinex-canvas/`); every Lovable trace deleted; `vite.config.ts` rewritten to a standard `tanstackStart()` config; `bun.lock`/`bunfig.toml` dropped (npm is the package manager); build verified. See [Phase 7 — De-Lovable + Flatten](#phase-7--de-lovable--flatten).

## Issue 1 — Backer vs Creative Role UX

### Contract ground truth (from `milestone-verification.clar`)

- Voting weight = **contribution amount** (STX contributed to the campaign), not 1-vote-per-user.
- A milestone passes when **YES amount > 50% of total contributed**; it is disputed when NO amount ≥ 50%.
- Guards: only backers with a contribution can vote (`ERR-NOT-BACKER` u5608); creator cannot vote on own milestone; double votes rejected.
- Backers are registered users, distinct from creatives. Campaigns are created by creatives, funded by backers.

### What changed

| Area | Before (mock) | After (contract-accurate) |
|---|---|---|
| Backer registration | No path; backers were implicitly creatives | `register` persists by role — Creative → `creatives`, else → `backers`; `login` searches both pools |
| Backer identity | `Role` was basically decorative | New `Contribution[]` on campaigns; `campaign.contributions` records `{ userId, userName, amount, timestamp }` |
| Contributing | Creative-backed fake data only | Backer-only `contribute(campaignId, amount)` — caps at `fundingTarget − raised`, appends contribution, raises total, debits `usdcxBalance`, adds a transaction |
| Milestone votes | 1-user-1-vote toggle | Contribution-weighted `voteMilestone` — YES/NO recorded in `Milestone.voters` + `MilestoneVotes { yes, no, yesAmount, noAmount }`; resolution mirrors contract (`yesAmount > totalContributed/2` → Approved, `noAmount ≥ totalContributed/2` → Disputed, else Pending) |
| Campaign page | Read-only preview | Contribute panel (Backer-only, non-creator, amount capped at remaining), weighted approval bar (`yesAmount / totalContributed`), vote buttons gated to contributors, `myVote` state |
| Dashboard | Creative-centric | Role split: creatives see their campaigns + reputation; backers see "Backing" totals + "Milestone approvals" needing their vote |
| Profile | Creative-only sections | Backer branch: "Projects you've backed" with per-campaign backed amounts + progress bars; portfolio/verification/endorsements rendered only for creatives |
| Header/Nav | Creative-heavy | `Discover` now includes Backers; `/profile` for all roles; "Become an Endorser" for all |

### Files

`src/lib/cinex-types.ts`, `src/lib/store.tsx`, `src/routes/campaign.$id.tsx`, `src/routes/dashboard.tsx`, `src/routes/profile.index.tsx`, `src/components/layout/Header.tsx`, `src/routes/discover.tsx`, `src/routes/register.tsx`, `src/routes/login.tsx`

## Issue 2 — Gatekeeper / Endorsement Flow → Coming Soon

The on-chain engine uses verified industry endorsers (not self-registered "gatekeepers") and the endorsement program is not yet open. The mock previously let anyone self-register as a Gatekeeper and "vote to endorse" creatives — a flow the real product does not offer.

### What changed

- `src/routes/endorse.tsx` — gutted the endorsement-voting UI. Now a Coming Soon placeholder (all roles): "Self-registration for endorsers isn't open yet…" + "Browse campaigns" CTA.
- `src/routes/register.tsx` — `Gatekeeper` role card is `disabled`, dimmed, with a "Coming Soon" pill; registration copy now reads "creative or backer".
- `src/routes/create-campaign.tsx` — submission toast changed from "…for gatekeeper review" to "Campaign submitted — backers can now fund it"; the funding-cap panel now reads "A verified endorsement lifts your cap — the endorsement program opens soon." with a link to `/endorse`.
- `store.tsx` — `addEndorsement` removed from the public API; seed backers have empty endorsements; role model keeps `Gatekeeper` type only for backward-compatible rendering (admin mapping).
- Copy sweep: dashboard/profile meta no longer promise "gatekeeper" endorsements.

## Issue 3 — Project Thumbnails

Contract-mandated: campaigns must carry a thumbnail. Implemented ahead of schedule (not deferred).

### Behavior

- **Campaign creation / portfolio work**: `ImagePicker` component — upload a PNG/JPG/WEBP (downscaled to ≤960px, canvas → WEBP `data:` URL via `uploadToDataUrl`), or paste a YouTube/Vimeo/image URL. Preview card with Replace/Remove; URL text field stays empty when the value is a `data:` URL so re-editing an upload isn't confusing.
- **Resolution** (`src/lib/thumbnails.ts`): YouTube → `img.youtube.com/vi/{id}/hqdefault.jpg`; Vimeo → `vumbnail.com/{id}.jpg`; PNG/JPG/WEBP/GIF → direct URL or data URL; MP4/unknown → `null`.
- **Rendering** (`ProjectThumb`): lazy `<img>` with `onError` → gradient fallback (tone + Film icon). Used across discover cards (`h-28`), dashboard cards (`h-24`), campaign page header, and portfolio cards (`h-32`).
- Validation updated to accept `data:image/` in addition to `https?://`.

### Files

`src/lib/thumbnails.ts` (new), `src/components/cinex/ProjectThumb.tsx` (rewritten), `src/components/cinex/portfolio.tsx`, `src/routes/create-campaign.tsx`, `src/routes/discover.tsx`, `src/routes/dashboard.tsx`, `src/routes/campaign.$id.tsx`

## Addendum — Exhaustive Category UX

Portfolio and campaign forms previously used a 5-entry `CATEGORIES` list with a hardcoded `category: "Other"` on new campaigns. Now both forms share one category system so every creative work can be described precisely.

### What changed

- **`src/lib/cinex-types.ts`** — new `PresetPortfolioCategory` union (~66 presets across creative sectors) with `"Other"` pinned last; `PortfolioCategory = PresetPortfolioCategory | (string & {})` so custom names are valid; new `PortfolioSector` (10 sectors). Added `CATEGORY_TO_SECTOR` (all presets → sector), `categorySector()` (unknown strings fall back to `"Other"`), `SECTOR_COVER_TONES` (10 sector gradients), and `coverToneFor(category)`. `CATEGORY_TO_BACKEND` is now sector-level (`Record<PortfolioSector, BackendCategory>`); `BACKEND_TO_CATEGORY` unchanged.
- **`src/components/cinex/CategoryField.tsx`** (new) — shared preset picker + custom input: Radix Select over `CATEGORIES` with an "Other — specify" item; selecting Other (or loading a non-preset value on edit) reveals an autofocused text input for the exact category; clearing the input returns to `"Other"`. Props: `value`, `onChange`, `label` (default "Category"), `id`, `error`, `placeholder`.
- **`src/components/cinex/portfolio.tsx`** — `PortfolioDraft.category` widened to `PortfolioCategory | ""` with `emptyDraft.category = ""` (was "Film"); validation: "Select a category" when empty, "Tell us your exact category" when the value is literally "Other"; the category Select is replaced with `<CategoryField>`; empty-state copy softened to "Add your first work so backers and the community can assess your track record."
- **`src/routes/create-campaign.tsx`** — new `category` state (`PortfolioCategory | ""`), `CategoryField` in the first panel (between description and thumbnail), same validation, and `category` is passed through to `addCampaign`.
- **`src/lib/store.tsx`** — `addCampaign` takes `category: PortfolioCategory | ""`; the hardcoded `category: "Other"` + fixed cover tone are replaced with `category || "Other"` and `coverToneFor(category || "Other")`.

### Behavior notes

- Legacy items stored under old values (e.g. `"Film"`, `"Music"`, or `"Other"`) render/search fine as raw strings; opening the edit dialog loads a non-preset value into the "Other — specify" text input so the owner can confirm or reclassify.
- Discover/index filter by free-text (no preset dropdown), so demo seed categories remain as-is.
- Cover tones on new campaigns now follow the sector gradient (`coverToneFor`), matching the portfolio card treatment.

## Verification

- `npm run build` in `cinex-canvas/` — passes, 0 errors (client + SSR + Nitro/Cloudflare preset).
- SSR smoke on `http://localhost:8080` after P2: `/`, `/login`, `/register`, `/dashboard` all render 200; homepage still serves seeded demo data (harmattan, Amara) — mock data plane unaffected by the async hydration change.
- Manual pass still required on `http://localhost:8080`: register a backer → contribute → weighted vote; confirm Gatekeeper "Coming Soon" + disabled register card; upload thumbnail + preview; add portfolio work with a deep preset category and one with "Other — specify" (custom name), edit a portfolio item to confirm pre-fill, and create a campaign with a category.

## Phase 6 (P2) — Live CineX API Data Plane

Second stage of the approved dual-mode plan. `cinex-canvas` now has a real `ApiDataSource` (live mode) alongside `MockDataSource` (preview mode). Both live behind the same async-capable `DataSource` surface, selected by the existing `resolveDataMode()` (`VITE_DATA_MODE=live` or `localStorage.cinexDataMode === 'live'`).

### Auth contract (backend `auth.js`)

- `POST /api/auth/register` — body `{ email, displayName, role }`; role passed via `ROLE_TO_BACKEND`.
- `POST /api/auth/login` — body `{ email }` (lowercased/trimmed); `setAuthToken` stored in `localStorage`.
- `POST /api/auth/logout` — best-effort (`catch`), auth state cleared regardless.
- `GET /api/auth/me` — session lookup; non-200 → `clearAuthState` (avoids 401 loops).

### Behavior

- **Mock mode unchanged** — same seed snapshot, same sync-looking methods (mock `register`/`login` are now `async` but behavior is identical; store awaits them).
- **Live auth** — `register`/`login` await the real API and only succeed when the backend accepts; failures surface field errors (duplicate email → "That email is already registered…", unknown email → "No account found…").
- **Live hydrate** — no token → `user: null`, `hydrated: true` (no phantom 401). Token present → `GET /auth/me`, on failure clear auth state and fall back to logged-out.
- **Live wallet** — `GET /wallets/:address/balance` (`parseNumber(ngn)`, `parseNumber(usd)`) + `GET /wallets/:address/transactions` (`mapTransaction`: NGN when `amountNaira != null && !== 0` else USDCx; status via `BACKEND_TO_TX_STATUS`), both caught to `emptyWallet` on failure.
- **Live profile** — `GET /profiles/:address`; reputation `round(avgScore * 200)` when `ratingSummary.count > 0`; portfolio via `BACKEND_TO_CATEGORY`, first `mediaUrls` entry, `year || 0`; bio + verification tier mapped; returns `null` on failure.
- **updateUser** — optimistic local merge + `notify`, persists `name`/`bio` via `PUT /profiles/:address` fire-and-forget.
- **Not backed yet** (confirm before wiring): portfolio CRUD and campaigns/contributions remain local in live mode — no live portfolio/campaign mutation endpoints yet.

### Files

`src/lib/api.ts` (SSR-safe `API_BASE`, `get/post/put`, `getAuthToken`/`setAuthToken`/`clearAuthToken`), `src/lib/data-source.ts` (`ApiDataSource`), `src/lib/store.tsx` (async auth, `cancelled`-guarded hydrate with `finally(setHydrated)`), `src/routes/login.tsx`, `src/routes/register.tsx`, `src/lib/cinex-types.ts` (exported backend maps: `BACKEND_TO_ROLE`, `ROLE_TO_BACKEND`, `BACKEND_TO_CATEGORY`, `BACKEND_TO_TX_STATUS`, `verificationTierFromLevel`, `parseNumber`).

## Known Follow-up Bugs (not fixed in this pass)

- `src/routes/profile.edit.tsx` — updating email leaves a stale `currentUser.email` in localStorage (the store's `currentUser` isn't refreshed after `updateProfile`). Cosmetic; affects the persisted session until next login.

## Phase 5 — Complete

Demo surfaces removed from `app/` (the primary app surface — separate from `cinex-canvas/`, which remains the preview mock):

1. Deleted `app/src/pages/DemoPage.tsx`, `app/src/pages/DemoScenarioPage.tsx`, and `DemoScenarioPage.test.tsx`.
2. Stripped `/demo` + `/demo-scenario` (imports + routes) from `app/src/app/router.tsx`.
3. Removed the LIVE DEMO section (hero iframe → `cinex-milestone-flow.vercel.app`, walkthrough, pre-demo setup, technical preview) from `app/src/pages/HomePage.tsx`.
4. Redesigned the public navbar: anchor links to landing sections (About · How It Works · Pilots · Roadmap · Investors — Team deferred), no "Try Demo", Litepaper visible on all breakpoints. Hero CTA replaced "See Live Demo" with a "How It Works →" smooth-scroll button. Cross-page anchor navigation via `navigate('/', { state: { scrollTo } })`.
5. Tagline updated: "…We make African creative IP verifiable, investable, and bankable — on a unified financial rail." `app/index.html` retitled + meta description added.
6. Verification: `npx vitest run` in `app/` → 41 passing (was 50; deleted demo test file had 9) across 4 files; `npm run build` → clean.

Remaining (pending user request): commit + push `main`.

## Phase 7 — De-Lovable + Flatten

Flatten decision (in-session): keep `cinex-canvas/` as a **tracked subdirectory** of the main repo (delete its nested `.git`) rather than `git mv`-ing contents into root — the root already owns `package.json` (contract-test harness `CineX-project-tests`), `tsconfig.json`, `README.md`, `AGENTS.md`, and `node_modules`, so a literal flatten would destroy the root test setup. The UI port into `app/` happens as a later phase.

### What changed

| Area | Before | After |
|---|---|---|
| VCS boundary | `cinex-canvas/.git` (standalone repo) | Deleted — subdir tracked by main repo |
| Lovable config | `@lovable.dev/vite-tanstack-config` in `vite.config.ts` | Rewritten to standard `tanstackStart()` from `@tanstack/react-start/plugin/vite` with `importProtection` + `server: { entry: "server" }`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `tsConfigPaths`, and build-only `nitro({ defaultPreset: "cloudflare-module" })` |
| Lovable telemetry | `src/lib/lovable-error-reporting.ts` + wrapped `useEffect` in `src/routes/__root.tsx` | File deleted, import + call removed |
| Lovable dep | `@lovable.dev/vite-tanstack-config: ^2.8.5` in `package.json` | Removed; `npm install` → `package-lock.json` has 0 Lovable references |
| Package manager | `bun.lock` + `bunfig.toml` (bun not on PATH) | Deleted — npm-managed |
| `.lovable/` + dev logs | `.lovable/`, `dev.log`, `dev-err.log` | Deleted (stale `vite dev`/`preview` processes stopped first) |
| Docs | README "Build with Lovable" + AGENTS `<!-- LOVABLE -->` block | Replaced with neutral "## Development" / `# CineX Canvas` |

### Verification

- Repo-wide grep: zero Lovable references in `cinex-canvas/src`, remaining top-level files, `.wrangler/`, `.tanstack/`, `package-lock.json`.
- `npm run build` passes twice (client + SSR + Nitro output) after the config rewrite and after dep removal.
- `git add -n cinex-canvas/` → 93 files staged, no `node_modules`/`.output`/`.tanstack`/`.wrangler`/log artifacts (subdir `.gitignore` covers them).

Not committed yet: `cinex-canvas/` + this report are untracked; commit + push `main` pending user request.
