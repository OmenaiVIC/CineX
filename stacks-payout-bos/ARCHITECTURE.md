# BOS Architecture

## Overview

The Bridge Orchestration Service (BOS) is a state machine engine that orchestrates the full lifecycle of converting on-chain digital assets (STX/USDCx) into fiat currency (NGN) via a multi-step pipeline.

## State Machine

```
disbursement_initiated
       │
       ▼
   preflight_check ──→ manual_review_required
       │
       ▼
   burn_submitted
       │
       ▼
   burn_confirmed
       │
       ▼
   attestation_requested
       │
       ▼
   attestation_confirmed
       │
       ▼
   destination_release_submitted
       │
       ▼
   destination_release_confirmed
       │
       ▼
   yellowcard_payout_submitted
       │
       ▼
   yellowcard_payout_confirmed
       │
       ▼
     settled
       │
       ├── failed (from any non-terminal state)
       └── cancelled (from any non-terminal state)
```

## Layer Architecture

```
┌──────────────────────────────────────────────────┐
│                    Adapters                       │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Stacks  │  │ xReserve │  │  Yellow Card   │  │
│  │  Burn/   │  │ Attest/  │  │  Payout/       │  │
│  │  Tx      │  │ Release  │  │  Status        │  │
│  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
└───────┼─────────────┼────────────────┼───────────┘
        │             │                │
┌───────┴─────────────┴────────────────┴───────────┐
│              Engine Layer                         │
│  ┌──────────────┐  ┌────────────────────────┐    │
│  │ StateMachine │  │   Transition Guards    │    │
│  │ ─ transitions│  │ ─ isBurnConfirmed      │    │
│  │ ─ transitions│  │ ─ isAttestationReceived│    │
│  │ ─ transitions│  │ ─ isPayoutCompleted    │    │
│  └──────────────┘  └────────────────────────┘    │
│  ┌──────────────┐  ┌────────────────────────┐    │
│  │Trans Actions │  │    PipelineWorker      │    │
│  │ ─ submitBurn │  │ ─ heartbeat loop      │    │
│  │ ─ requestAtt │  │ ─ advance per step     │    │
│  │ ─ submitPay  │  │ ─ retry logic         │    │
│  └──────────────┘  └────────────────────────┘    │
│  ┌──────────────┐  ┌────────────────────────┐    │
│  │  Preflight   │  │  DisbursementService   │    │
│  └──────────────┘  └────────────────────────┘    │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│           WS-A Extensions                        │
│  ┌──────────────┐  ┌────────────────────────┐    │
│  │ PayoutGates  │  │ TwoPersonApproval      │    │
│  │ 1-of-2 flow  │  │ 2-of-2 auth flow      │    │
│  └──────────────┘  └────────────────────────┘    │
│  ┌──────────────────────────────────────┐         │
│  │        Circuit Breaker               │         │
│  │ failure thresholds, auto-open        │         │
│  └──────────────────────────────────────┘         │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│        Background Workers                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Stuck    │  │ Reconc.  │  │ Fallback     │   │
│  │ Reaper   │  │ Worker   │  │ Poller       │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│        Monitoring Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Monitor  │  │ Alert    │  │ Dashboard    │   │
│  │ Job      │  │ Dedup    │  │ Queries      │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
│  ┌──────────┐  ┌──────────┐                     │
│  │ Notifier │  │ Evidence │                     │
│  │          │  │ Collector│                     │
│  └──────────┘  └──────────┘                     │
└──────────────────────────────────────────────────┘
```

## File Map

```
stacks-payout-bos/
├── src/
│   ├── types/                         # JSDoc type definitions
│   │   └── adapterInterfaces.js
│   ├── types.js                       # BOS state constants
│   ├── disbursementService.js         # CRUD for disbursements
│   ├── stateMachine.js                # Transition engine
│   ├── transitionActions.js           # Action handlers
│   ├── transitionGuards.js            # Guard conditions
│   ├── pipelineWorker.js              # Heartbeat loop
│   ├── preflight.js                   # Validation checks
│   ├── bridgeAdapterFactory.js        # Adapter resolver
│   ├── xreserveAdapter.js             # xReserve REST client
│   ├── yellowcardAdapter.js           # Yellow Card REST client
│   ├── payoutGates.js                 # WS-A 1-of-2 gates
│   ├── twoPersonApproval.js           # WS-A 2-of-2 approval
│   ├── circuitBreaker.js              # WS-A circuit breaker
│   ├── reconciliationWorker.js        # Balance reconciliation
│   ├── stuckStateReaper.js            # Stuck disbursement reaper
│   ├── webhookVerifier.js             # HMAC webhook verification
│   ├── fallbackPoller.js              # External status polling
│   ├── auditTimeline.js               # Audit trail builder
│   ├── evidenceCollector.js           # Per-step evidence recording
│   └── monitoring/
│       ├── thresholdConfig.js         # Configurable thresholds
│       ├── monitorJob.js              # Periodic health checks
│       ├── alertDeduplicator.js       # Duplicate alert suppression
│       ├── dashboardQueries.js        # Dashboard data fetchers
│       └── notifier.js                # Alert dispatch
├── migrations/
│   ├── 001_bos_schema.sql             # Core BOS tables
│   ├── 002_bos_monitoring.sql         # Monitoring tables
│   └── 003_bos_e2e.sql                # E2E test fixtures
├── tests/
│   └── bosE2E.test.js                 # E2E integration test
├── package.json
├── README.md
├── ARCHITECTURE.md
└── ADAPTER_SPEC.md
```
