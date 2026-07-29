# BOS Adapter Specification

All BOS engine files are decoupled from CineX-specific infrastructure. Every external dependency must be injected at startup via `ctx`. This document specifies each injectable interface.

## BosContext (ctx)

```js
{
  db: BosDb,
  logger: BosLogger,
  config: BosConfig,
  adapters: BosAdapters,
  pipelineWorker?: { advanceDisbursement(id): Promise<void> },
  alertHandler?: Function,
}
```

## BosDb

A database client that exposes a query method compatible with `pg.Client`:

```js
{
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>
}
```

- Must accept parameterized queries with `$1, $2, ...` placeholders.
- Must return `{ rows: [...] }` (or an array directly — the code checks both).

## BosLogger

Any object with the following methods:

```js
{
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
  debug?(msg: string): void
}
```

`console` works as-is.

## BosConfig

```js
{
  // Adapter credentials
  stacksPrivateKey?: string
  stacksNetwork?: string                // 'mainnet' | 'testnet'
  deployerAddress?: string
  v2DeployerAddress?: string
  usdcxContract?: string
  hiroApiUrl?: string
  explorerUrl?: string

  xreserveApiUrl?: string
  xreserveApiKey?: string
  xreserveWebhookSecret?: string

  yellowCardApiUrl?: string
  yellowCardApiKey?: string
  yellowCardWebhookSecret?: string

  // Relay
  relayAddress?: string

  // Pipeline
  pipelineIntervalMs?: number           // default 30000
  pipelineBatchSize?: number            // default 50

  // Monitor
  monitorIntervalMs?: number            // default 300000
  fallbackPollerIntervalMs?: number     // default 300000
  reconciliationIntervalMs?: number     // default 3600000

  // Thresholds (see monitoring/thresholdConfig.js for defaults)
  monitoring?: {
    minStx?: number
    minUsdcx?: number
    dailyMaxStx?: number
    dailyMaxUsdcx?: number
    maxFailureRatePercent?: number
    failureRateWindowSize?: number
    maxStuckTimeMinutes?: number
    minBurnConfirmations?: number
  }

  // Circuit breaker
  circuitBreaker?: {
    failureThreshold?: number
    resetTimeout?: number
  }
}
```

## StacksAdapter

```js
{
  // Required
  getTransactionStatus(txId: string): Promise<{
    status: string
    tx_status?: string
    confirmations?: number
  }>
  broadcastTx(signedTx: string): Promise<{ txId: string }>
  getStxBalance(address: string): Promise<number>

  // Burn operations
  burnUsdcx(params: {
    amount: string
    memo?: string
    idempotencyKey?: string
  }): Promise<{ txId: string }>

  // Read-only calls
  readOnlyCall(contract: string, fn: string, args: any[]): Promise<any>

  // Optional
  getAccountInfo?(address: string): Promise<{
    nonce: number
    balance: string
  }>
  estimateFee?(options: any): Promise<number>
}
```

## XReserveAdapter

```js
{
  requestAttestation(params: {
    txHash: string
    amount: string
    destinationChain: string
  }): Promise<{ requestId: string }>

  getAttestationStatus(requestId: string): Promise<{
    status: string
    attestationHash?: string
  }>

  releaseDestination(params: {
    attestationHash: string
    amount: string
    recipient: string
  }): Promise<{ releaseId: string }>

  getReleaseStatus(releaseId: string): Promise<{
    status: string
    txHash?: string
  }>

  healthCheck(): Promise<{ ok: boolean }>
}
```

## YellowCardAdapter

```js
{
  initiatePayout(params: {
    amount: number
    currency: string
    recipient: string
    reference: string
  }): Promise<{ payoutId: string }>

  getPayoutStatus(payoutId: string): Promise<{
    status: string           // 'completed' | 'pending' | 'failed'
    normalized: string
  }>

  healthCheck(): Promise<{ ok: boolean }>
}
```

## BosAdapters

```js
{
  stacks: StacksAdapter
  xreserve: XReserveAdapter
  yellowcard: YellowCardAdapter
}
```
