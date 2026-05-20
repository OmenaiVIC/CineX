;; title: bitflow-strategy
;; version: 1.0.0
;; summary: Bitflow AMM pool wrapper for yield strategy
;; author: CineX
;; created: 2025

;; ========== Description ==========
;; Implements strategy-trait to wrap a Bitflow AMM pool.
;; Deploys base asset into a Bitflow pool and tracks LP share.
;;
;; In v1, the strategy is a simplified mock wrapper:
;; - "Deposits" to pool by tracking an internal LP balance
;; - Yield is simulated via an externally-set exchange rate
;;
;; Production version would call actual Bitflow router contracts.
;; ================================

(impl-trait .bitflow-strategy-trait.strategy-trait)
(impl-trait .emergency-module-trait.emergency-module-trait)
(impl-trait .module-base-trait.module-base-trait)

;; ========== ERROR CONSTANTS (u5600-u5615) ==========
(define-constant ERR-NOT-AUTHORIZED (err u5600))
(define-constant ERR-NOT-INITIALIZED (err u5601))
(define-constant ERR-ALREADY-INITIALIZED (err u5602))
(define-constant ERR-INSUFFICIENT-BALANCE (err u5603))
(define-constant ERR-TRANSFER-FAILED (err u5604))
(define-constant ERR-INVALID-AMOUNT (err u5605))
(define-constant ERR-SYSTEM-PAUSED (err u5606))
(define-constant ERR-SYSTEM-NOT-PAUSED (err u5607))

;; ========== CONSTANTS ==========
(define-constant CONTRACT-OWNER tx-sender)
(define-constant BURN-ADDRESS 'SP000000000000000000002Q6VF78)
(define-constant BASE-EXCHANGE-RATE u100000000) ;; 1:1 rate (1e8 precision)

;; ========== DATA VARIABLES ==========

;; Admin contract (timelock) - gates non-emergency admin functions
(define-data-var admin-contract principal BURN-ADDRESS)

;; Emergency admin (multi-sig) - gates emergency functions
(define-data-var emergency-admin principal BURN-ADDRESS)

;; Initialize guard
(define-data-var initialized bool false)

;; Emergency state
(define-data-var emergency-pause bool false)
(define-data-var emergency-ops-counter uint u0)

;; Module metadata
(define-data-var module-version uint u1)
(define-data-var module-active bool true)

;; Bitflow pool configuration
(define-data-var bitflow-router principal BURN-ADDRESS)
(define-data-var pool-id uint u0)

;; Base asset being managed (STX by default)
(define-data-var base-asset principal BURN-ADDRESS)

;; Internal LP balance tracking
(define-data-var lp-balance uint u0)

;; Internal pool balance (total value locked in base asset)
(define-data-var pool-balance uint u0)

;; Exchange rate override (for mock/testing)
;; 1e8 = 1:1 rate. Set higher to simulate yield, lower to simulate loss.
(define-data-var exchange-rate uint BASE-EXCHANGE-RATE)

;; Emergency operations audit trail
(define-map emergency-ops-log { ops-count-id: uint } {
  emergency-ops-type: (string-ascii 150),
  recipient: principal,
  admin: principal,
  block-height: uint,
  reason: (string-ascii 100)
})

;; ========== PUBLIC FUNCTIONS ==========

;; One-time initializer
;; @param admin - admin contract address (timelock)
;; @param emergency - emergency admin address (multi-sig)
;; @param router - Bitflow router contract address
;; @param p-id - Bitflow pool ID
;; @param asset - base asset principal
(define-public (initialize (admin principal) (emergency principal) (router principal) (p-id uint) (asset principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
    (var-set initialized true)
    (var-set admin-contract admin)
    (var-set emergency-admin emergency)
    (var-set bitflow-router router)
    (var-set pool-id p-id)
    (var-set base-asset asset)
    (print { event: "bitflow-strategy-initialized", router: router, pool-id: p-id })
    (ok true)
  )
)

;; Deposit base asset into the yield strategy
;; Transfers STX from caller, mints LP tokens, tracks balance
;; @param amount - amount of base asset to deploy
(define-public (deposit (amount uint))
  (let
    (
      (current-lp (var-get lp-balance))
      (current-pool (var-get pool-balance))
      (new-pool-balance (+ current-pool amount))
      ;; In v1 mock: 1 LP token = 1 base asset unit
      (lp-minted amount)
    )
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (var-get emergency-pause)) ERR-SYSTEM-PAUSED)

    ;; Transfer STX from caller
    (unwrap! (stx-transfer? amount tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)

    ;; Update LP and pool balances
    (var-set lp-balance (+ current-lp lp-minted))
    (var-set pool-balance new-pool-balance)

    (print { event: "strategy-deposited", amount: amount, lp-minted: lp-minted })
    (ok lp-minted)
  )
)

;; Withdraw from the yield strategy
;; Burns LP tokens, returns base asset
;; @param lp-amount - amount of LP tokens / shares to redeem
(define-public (withdraw (lp-amount uint))
  (let
    (
      (caller tx-sender)
      (current-lp (var-get lp-balance))
      (current-pool (var-get pool-balance))
      (rate (var-get exchange-rate))
      ;; base-asset = lp-amount * exchange-rate / 1e8
      (base-asset-return (/ (* lp-amount rate) u100000000))
    )
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (> lp-amount u0) ERR-INVALID-AMOUNT)
    (asserts! (<= lp-amount current-lp) ERR-INSUFFICIENT-BALANCE)
    (asserts! (not (var-get emergency-pause)) ERR-SYSTEM-PAUSED)

    ;; Transfer STX back to caller
    (unwrap! (as-contract (stx-transfer? base-asset-return tx-sender caller)) ERR-TRANSFER-FAILED)

    ;; Update LP and pool balances (computations safe after assertions)
    (var-set lp-balance (- current-lp lp-amount))
    (var-set pool-balance (- current-pool base-asset-return))

    (print { event: "strategy-withdrawn", lp-amount: lp-amount, base-asset: base-asset-return })
    (ok base-asset-return)
  )
)

;; ========== READ-ONLY FUNCTIONS ==========

;; Get current exchange rate (base-asset-per-lp-token * 1e8)
(define-read-only (get-exchange-rate)
  (ok (var-get exchange-rate))
)

;; Get the current pool balance (total value locked in base asset)
(define-read-only (get-pool-balance)
  (ok (var-get pool-balance))
)

;; Get LP balance held by this contract
(define-read-only (get-lp-balance)
  (ok (var-get lp-balance))
)

;; Get configuration
(define-read-only (get-bitflow-router)
  (ok (var-get bitflow-router))
)

(define-read-only (get-pool-id)
  (ok (var-get pool-id))
)

(define-read-only (get-base-asset)
  (ok (var-get base-asset))
)

(define-read-only (get-admin-contract)
  (ok (var-get admin-contract))
)

(define-read-only (get-emergency-admin)
  (ok (var-get emergency-admin))
)

;; ========== ADMIN FUNCTIONS ==========

;; Set exchange rate (for testing / mock)
;; Only callable by admin contract (timelock path)
(define-public (set-exchange-rate (new-rate uint))
  (begin
    (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-AUTHORIZED)
    (asserts! (> new-rate u0) ERR-INVALID-AMOUNT)
    (var-set exchange-rate new-rate)
    (print { event: "exchange-rate-set", rate: new-rate })
    (ok true)
  )
)

;; Set Bitflow router address
(define-public (set-router (router principal))
  (begin
    (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-AUTHORIZED)
    (var-set bitflow-router router)
    (ok true)
  )
)

;; Set pool ID
(define-public (set-pool-id (p-id uint))
  (begin
    (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-AUTHORIZED)
    (var-set pool-id p-id)
    (ok true)
  )
)

;; ========== EMERGENCY MODULE TRAIT ==========

(define-public (set-pause-state (pause bool))
  (begin
    (asserts! (is-eq contract-caller (var-get emergency-admin)) ERR-NOT-AUTHORIZED)
    (var-set emergency-pause pause)
    (print { event: "strategy-pause-set", paused: pause })
    (ok true)
  )
)

(define-read-only (is-system-paused)
  (ok (var-get emergency-pause))
)

(define-read-only (get-emergency-ops-count)
  (ok (var-get emergency-ops-counter))
)

(define-public (emergency-withdraw (amount uint) (recipient principal))
  (let
    (
      (contract-balance (stx-get-balance (as-contract tx-sender)))
      (current-ops-count (var-get emergency-ops-counter))
      (next-ops-count (+ current-ops-count u1))
    )
    (asserts! (is-eq contract-caller (var-get emergency-admin)) ERR-NOT-AUTHORIZED)
    (asserts! (var-get emergency-pause) ERR-SYSTEM-NOT-PAUSED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (<= amount contract-balance) ERR-INSUFFICIENT-BALANCE)

    (map-set emergency-ops-log { ops-count-id: next-ops-count } {
      emergency-ops-type: "emergency withdraw bitflow-strategy",
      recipient: recipient,
      admin: contract-caller,
      block-height: block-height,
      reason: "emergency funds recovery"
    })

    (var-set emergency-ops-counter next-ops-count)
    (unwrap! (stx-transfer? amount (as-contract tx-sender) recipient) ERR-TRANSFER-FAILED)
    (ok true)
  )
)

;; ========== BASE MODULE TRAIT ==========

(define-read-only (get-module-version)
  (ok (var-get module-version))
)

(define-read-only (is-module-active)
  (ok (var-get module-active))
)

(define-read-only (get-module-name)
  (ok "bitflow-strategy")
)
