# REPOSITORY_BOUNDARY — CineX vs Payout Rail

Status: Discovery & mapping. Date: 2026-09-20.

## 1. CineX owns (the protected source product)

Purpose: end-to-end creative financing platform (Web2 + chain proxy + feed/ratings/AI) that happens to contain a payout-orchestration subsystem.

- All creative-financing backend API: campaigns, milestone escrow, verification, pools/yield, funding pool, reputation, profiles, feed, AI summaries, wallets, demo, admin.
- `contractService.js` in full (84 of 86 exports are CineX-financing), `config/chain.js`, `database.js`, `indexerWorker` (activity feed, §11.3/§11.4).
- All Clarity contracts (`contracts/`), `milestone-escrow` + `campaign-module` dual-ID-space convention, error-code namespaces (u300/u5400/u5600/u5700).
- All of `app/` frontend (no `/api/bos/*` usage), demo harness, `spike-pillar/`.
- Migrations 001–005 + 008 (relay/sponsorship — see G-13), Neon deployment, CI/CD, `.env*`/Vercel identities.
- Relay/fee-sponsorship + passkey layer (CineX-owned, not moved — G-13).

## 2. Payout Rail owns (the extracted, reusable product)

- The disbursement state machine (14 states, ~24 transitions), guards, actions — behavior-identical to the canonical `backend/src/services/bos/` copy at extraction time.
- Workers: pipeline, stuck reaper, reconciliation, (optionally) preflight; circuit breaker; two-person approval; payout gates.
- Evidence, audit timeline, webhook fallback/verification.
- Adapters: `StacksAdapter` (burn + status surface — standalone, no `contractService.js`), `xReserveAdapter`, `YellowCardAdapter`, `bridgeAdapterFactory`.
- BOS HTTP surface: webhook receiver + monitoring/cron endpoints (Bearer `CRON_SECRET`), minus `/cron/indexer`.
- Its own migrations (001..004) for the BOS tables, renumbered; its own `chainConfig.js`; its own `RecipientRegistry` interface.
- Its own chain-event capture for BOS contracts only (indexing design: Sprint 0).
- Monitoring/SLA tooling (monitorJob, alerts, deduplicator, thresholds, notifier) against an injected db.

## 3. Boundary contracts (the seam)

The seam is an explicit, versioned interface — CineX calls into Payout Rail, never the reverse:

| Boundary | Producer → Consumer | Contract |
|---|---|---|
| Disbursement request | CineX `escrow.js`/external → Rail | `POST /api/v1/disbursements` with `source_reference` + `source_application` (replaces bare `campaign_id`) + `amount`, `beneficiary`, idempotency key |
| Eligibility | Rail → `RecipientRegistry` impl (CineX provides at init) | `isRecipientEligible(recipientRef, context: {corridor, amount}) → {eligible, reason?}`; CineX impl reads `profiles.verified`; Rail ships `NullRecipientRegistry`; Rail never reads CineX tables directly |
| Callbacks | Rail → registered webhook URL | delivery of state transitions (attestation/release/payout) |
| Webhooks | Yellow Card → Rail | `/api/webhooks/yellowcard`; HMAC `YcHmacV1`; idempotent processing |
| Chain | Rail → Stacks | `StacksAdapter` interface (burn + status), Rail-owned keys/config |
| Monitoring data | Rail → its own tables | Rail writes only BOS tables; never CineX tables |

```
interface RecipientRegistry {
  isRecipientEligible(recipientRef, context: {corridor, amount})
    → { eligible, reason? }
}

CineX provides the implementation (reads profiles.verified). Payout Rail
ships NullRecipientRegistry as the default (returns {eligible: false} unless
a real registry is injected).
```

## 4. Future integration

Possible: CineX becomes a tenant/client of Payout Rail via the §3 contracts (escrow releases → Rail API, verified flag → registry). Deliberately out of scope for this project; the seam is designed so the extraction does not preclude it. No bidirectional imports; fidelity is behavioral, not file-level.

## 5. Rules observed while extracting

- CineX source-of-truth wins on all behavior; Payout Rail copies, then diverges only through A/B/C-class changes.
- No CineX table schema is modified to please Payout Rail; required schema changes happen in Payout Rail's own migrations.
- No secrets, no CineX-identifying URLs, no deployment config cross the seam.
- Evidence-backed: each claimed transition/behavior in Payout Rail is re-verified by its own tests, not asserted by copying CineX's.
- `ATTRIBUTION.md` is a **required output** of extraction: CineX repo URL, commit SHA, extraction date, and license status of the extracted code.