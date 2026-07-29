# stacks-payout-bos

**STX → fiat payout orchestration engine**  
Bridge Orchestration Service (BOS) — open-source DeGrants M1 deliverable.

Manages the full lifecycle of converting on-chain STX/USDCx into fiat (NGN via Yellow Card):

```
[Campaign Escrow] → [STX/USDCx Burn] → [xReserve Attestation] → [Destination Release] → [Yellow Card Payout] → [Settled]
```

## Features

- **10-step state machine** — `disbursement_initiated → ... → settled`
- **14-state** model including `manual_review_required`, `preflight_check`, `failed`, `cancelled`
- **Idempotent** — every handler is safe under duplicate execution
- **Injectable context** — works with any DB (Postgres/Neon/SQLite), any logger, any adapter
- **Built-in adapters** — Stacks (burn/tx status), xReserve (attestation/release), Yellow Card (payout)
- **WS-A add-ons** — payout gates (1-of-2 approval), two-person approval, circuit breaker
- **Monitoring** — alert dedup, thresholds, dashboard queries, notifier
- **Fallback poller** — polls external APIs to catch missed webhooks
- **Audit timeline** — full event trail with external status snapshots
- **Evidence collector** — records API responses, tx hashes, webhook payloads per step

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full state machine diagram and flow details.
See [ADAPTER_SPEC.md](./ADAPTER_SPEC.md) for adapter interface contracts.

## Quick Start

```js
import { createDisbursementService } from 'stacks-payout-bos';
import { createStateMachine } from 'stacks-payout-bos';
import { createPipelineWorker } from 'stacks-payout-bos';

// 1. Provide your DB, logger, config, and adapters
const ctx = {
  db: db,               // must expose .query(sql, params)
  logger: console,       // must expose .info/.warn/.error/.debug
  config: {
    relayAddress: process.env.RELAY_ADDRESS,
  },
  adapters: {
    stacks: { /* StacksAdapter interface */ },
    xreserve: { /* XReserveAdapter interface */ },
    yellowcard: { /* YellowCardAdapter interface */ },
  },
};

// 2. Create the pipeline worker
const pipeline = createPipelineWorker(ctx);
pipeline.start(); // polls every 30s, advances eligible disbursements

// 3. Create a disbursement
const service = createDisbursementService(ctx);
await service.createDisbursement({
  idempotencyKey: 'uuid-v4',
  amountUsd: 100.50,
  ngnRecipient: '+2348012345678',
});
```

## Injectable Interfaces

All CineX-specific imports (`../../config/chain.js`, `../../../database.js`, `../../services/contractService.js`) have been replaced with injected `ctx.*` calls. See `src/types/adapterInterfaces.js` for full JSDoc type definitions.

## State Machine States

| State | Meaning |
|---|---|
| `disbursement_initiated` | Created, awaiting preflight |
| `preflight_check` | Validating inputs and balance |
| `manual_review_required` | Flagged for human review |
| `burn_submitted` | STX/USDCx burn tx broadcast |
| `burn_confirmed` | Burn confirmed on-chain |
| `attestation_requested` | xReserve attestation requested |
| `attestation_confirmed` | Attestation received |
| `destination_release_submitted` | Release to destination submitted |
| `destination_release_confirmed` | Destination release confirmed |
| `yellowcard_payout_submitted` | Yellow Card payout initiated |
| `yellowcard_payout_confirmed` | Yellow Card payout confirmed |
| `settled` | Disbursement complete |
| `failed` | Terminal failure |
| `cancelled` | Cancelled |

## Tests

```bash
npm install
npx vitest run
```
