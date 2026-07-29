/**
 * @module adapterInterfaces
 *
 * Injectable interface contracts for the BOS engine.
 * No runtime export — pure JSDoc types for the injectable context object.
 *
 * Usage:
 *   const ctx = {
 *     db: { query, get, run, all },
 *     logger: { info, warn, error, debug },
 *     config: { ...BosConfig },
 *     adapters: {
 *       stacks: { getTransactionStatus, burnUsdcx },
 *       xreserve: { requestAttestation, getAttestationStatus, releaseDestination, getReleaseStatus, healthCheck },
 *       yellowcard: { initiatePayout, getPayoutStatus, healthCheck },
 *     },
 *     pipelineWorker: { advanceDisbursement },
 *   };
 *
 * @typedef {Object} BosConfig
 * @property {string}  stacksNetwork               — "mainnet" | "testnet"
 * @property {string}  deployerAddress              — Stacks deployer principal
 * @property {string}  usdcxContract                — USDCx contract ID
 * @property {string}  hiroApiUrl                   — Hiro API base URL
 * @property {string}  [yellowCardApiUrl]           — Yellow Card API base URL
 * @property {string}  [yellowCardApiKey]           — Yellow Card API key
 * @property {string}  [yellowCardWebhookSecret]    — HMAC secret for webhook verification
 * @property {string}  [xreserveWebhookSecret]      — HMAC secret for xReserve webhook
 * @property {string}  [xreserveApiUrl]             — xReserve API base URL
 * @property {string}  [xreserveApiKey]             — xReserve API key
 * @property {string}  [bridgeAdapterEnv]           — "xreserve" | "mock"
 * @property {number}  [pipelineIntervalMs]         — heartbeat interval (default 30_000)
 * @property {number}  [pipelineBatchSize]          — max disbursements per tick (default 50)
 * @property {number}  [stuckReaperIntervalMs]      — reaper interval (default 120_000)
 * @property {number}  [fallbackPollerIntervalMs]   — poller interval (default 300_000)
 * @property {number}  [reconciliationIntervalMs]   — reconciliation interval (default 3600_000)
 * @property {string}  [baseUrl]                    — public URL for callbacks
 * @property {string}  [slackWebhookUrl]            — Slack alert webhook URL
 * @property {string}  [bosAlertEmailRecipients]    — comma-separated email recipients
 * @property {string}  [smtpUser]                   — SMTP user for email alerts
 * @property {string}  [smtpPass]                   — SMTP pass for email alerts
 */

/**
 * @typedef {Object} BosContext
 * @property {import('./adapterInterfaces').BosDb} db
 * @property {import('./adapterInterfaces').BosLogger} logger
 * @property {import('./adapterInterfaces').BosConfig} config
 * @property {import('./adapterInterfaces').BosAdapters} adapters
 * @property {{ advanceDisbursement: Function }} [pipelineWorker]
 * @property {(event: string, data?: any) => void} [emit]
 */

/**
 * @typedef {Object} BosDb
 * @property {(sql: string, params?: any[]) => Promise<{rows: any[]}>} query
 * @property {(sql: string, params?: any[]) => Promise<any>} get
 * @property {(sql: string, params?: any[]) => Promise<any>} run
 * @property {(sql: string, params?: any[]) => Promise<any[]>} all
 * @property {() => void} [release]
 */

/**
 * @typedef {Object} BosLogger
 * @property {(msg: string, ...args: any[]) => void} info
 * @property {(msg: string, ...args: any[]) => void} warn
 * @property {(msg: string, ...args: any[]) => void} error
 * @property {(msg: string, ...args: any[]) => void} debug
 */

/**
 * @typedef {Object} StacksAdapter
 * @property {(txid: string) => Promise<any>} getTransactionStatus
 * @property {({ amount, memo, idempotencyKey }: { amount: string, memo?: string, idempotencyKey?: string }) => Promise<any>} burnUsdcx
 */

/**
 * @typedef {Object} XReserveAdapter
 * @property {(amount: string, memo?: string) => Promise<any>} requestAttestation
 * @property {(attestationId: string) => Promise<any>} getAttestationStatus
 * @property {(attestationId: string) => Promise<any>} releaseDestination
 * @property {(releaseId: string) => Promise<any>} getReleaseStatus
 * @property {() => Promise<boolean>} healthCheck
 */

/**
 * @typedef {Object} YellowCardAdapter
 * @property {({ amount, currency, recipient, reference }: { amount: number, currency: string, recipient: any, reference: string }) => Promise<any>} initiatePayout
 * @property {(payoutId: string) => Promise<any>} getPayoutStatus
 * @property {() => Promise<boolean>} healthCheck
 */

/**
 * @typedef {Object} BosAdapters
 * @property {import('./adapterInterfaces').StacksAdapter} stacks
 * @property {import('./adapterInterfaces').XReserveAdapter} xreserve
 * @property {import('./adapterInterfaces').YellowCardAdapter} yellowcard
 */

export {};
