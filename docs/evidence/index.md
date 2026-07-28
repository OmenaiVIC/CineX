# Evidence Index — CineX Deliverables

> Master index for Prompt Bible §10–§13 deliverables
> Created: 2026-07-27

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ | Complete — evidence exists |
| 🟡 | Partial — work in progress |
| ❌ | Not started |

## §7 — BOS Orchestration (4/4 = 100%)

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| §7.1 XReserve Bridge Adapter | ✅ | `backend/src/services/bos/xreserveAdapter.js`, `backend/src/services/bos/bridgeAdapterFactory.js` |
| §7.2 Pipeline Worker | ✅ | `backend/src/services/bos/pipelineWorker.js` (full 10-step lifecycle) |
| §7.3 Destination-Side Release | ✅ | Transition tests in `tests/bosWorkers.test.js` |
| §7.4 Yellow Card Payout | ✅ | `backend/src/services/bos/yellowcardAdapter.js`, `backend/src/routes/webhooks.js` |
| DeGrants M1 — BOS Prototype | ✅ | All above + `docs/bos-state-machine-design.md`, `docs/BOS_MONITORING_RUNBOOK.md` |

## §10 — Pilot Execution (4/4 = 100%)

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| §10.1 Pilot Launch Checklist | ✅ | See `section-10-1-pilot-launch-checklist.md` |
| §10.2 Pilot Execution Plan | ✅ | See `section-10-2-pilot-execution-plan.md` |

## §11 — Tier 2 Features (4/5 = 80%)

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| §11.1 Reputation & KYC | 🟡 | Partial — backend routes exist, frontend stubs |
| §11.2 Rating System | ✅ | `backend/src/routes/profiles.js` (validation rules at POST /:address/ratings) |
| §11.3 Pool Discovery | 🟡 | `backend/src/routes/pools.js` + `app/src/pages/PoolExplorePage.tsx` |
| §11.4 Activity Feed Indexer | ✅ | `backend/src/services/indexerWorker.js` (274 lines) |
| §11.5 AI Credibility Summary | ✅ | `backend/src/routes/ai.js` (Postgres fix, AbortController timeout, fallback path), `app/src/components/common/AICredibilityModal.tsx` (standalone modal with loading/error/empty states), `backend/tests/ai.test.js` (9 tests), `backend/.env.example` (`OPENAI_API_KEY` doc) |

## §12 — Interledger Protocol (0/2 = 0%)

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| §12.1 ILP Architecture Doc | ✅ | `docs/ILP_ARCHITECTURE.md` (conditional P2) |
| §12.2 Demo Harness | ❌ | Not started — blocked on grant confirmation |

## §13 — Documentation & Evidence (2/2 = 100%)

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| §13.1 Technical Evidence Package | ✅ | `docs/evidence/` directory + this index |
| §13.2 Public-Facing Documentation | ✅ | `docs/` directory, `app/public/litepaper.html`, `frontend/litepaper.html` |

---

## Test Results

### Contract Tests
- 322 tests across 14 test files
- `tests/funding-pool.test.ts` (28), `tests/integration.test.ts` (22), `tests/pilot-campaign-parameterization.test.ts` (32)

### Backend Tests
- 232 tests across 12 test files
- `backend/tests/bosWorkers.test.js` (53), `backend/tests/indexerWorker.test.js` (11), `backend/tests/ratingValidation.test.js` (11), `backend/tests/ai.test.js` (9)

### Frontend Tests
- 50 tests across 5 test files
- `app/src/components/onboarding/OnboardingWizard.test.tsx`, `app/src/components/campaign/CampaignCreationForm.test.tsx`, etc.

## Key Files Reference

| File | Purpose | LOC |
|------|---------|-----|
| `backend/src/services/indexerWorker.js` | Activity Feed Indexer | 274 |
| `backend/src/routes/profiles.js` | Profile + Rating Validation | ~400 |
| `backend/src/routes/pools.js` | Funding Pool Routes | 358 |
| `backend/src/routes/feed.js` | Activity Feed Backend | ~200 |
| `backend/src/routes/ai.js` | AI Credibility Summary | 119 |
| `app/src/components/common/AICredibilityModal.tsx` | AI Credibility Modal UI | ~120 |
| `backend/tests/ai.test.js` | AI Credibility Tests (9 tests) | ~260 |
| `backend/src/config/chain.js` | Chain Config (single source of truth) | ~50 |
| `docs/ILP_ARCHITECTURE.md` | ILP Architecture | ~250 |

## Running Tests

```bash
# Contract tests
npm test

# Backend tests
cd backend && npx vitest run

# Frontend tests
cd app && npx vitest run

# Indexer tests only
cd backend && npx vitest run --run tests/indexerWorker.test.js

# Rating validation tests only
cd backend && npx vitest run --run tests/ratingValidation.test.js

# AI credibility tests only
cd backend && npx vitest run --run tests/ai.test.js
```

---

*Last updated: 2026-07-28*
