;; title: yield-escrow
;; version: 2.0.0
;; summary: Yield escrow - backer-centric yield distribution (70/20/10)
;; author: CineX
;; created: 2025

;; ========== Description ==========
;; Implements yield-escrow-trait for deploying idle campaign funds into
;; external yield strategies (e.g., Bitflow AMM pools).
;;
;; Yield split: 70% backers (proportional to contribution), 20% platform, 10% creator
;; Creator bonus is conditional on milestone performance (via milestone-verification)
;; Forfeited bonus redistributed: 70% to backers, 30% to platform
;;
;; v2 changes:
;;   - Backer-proportional yield claiming (70% pool)
;;   - Conditional creator performance bonus (10% pool)
;;   - Platform yield sweeping (20% pool)
;;   - Forfeited bonus automatic redistribution
;;   - Per-backer claim tracking
;; ================================

(impl-trait .yield-escrow-trait.yield-escrow-trait)
(impl-trait .emergency-module-trait.emergency-module-trait)
(impl-trait .module-base-trait.module-base-trait)
(use-trait strategy-trait .bitflow-strategy-trait.strategy-trait)

;; ========== ERROR CONSTANTS (u5500-u5520) ==========
(define-constant ERR-NOT-AUTHORIZED (err u5500))
(define-constant ERR-NOT-INITIALIZED (err u5501))
(define-constant ERR-ALREADY-INITIALIZED (err u5502))
(define-constant ERR-CAMPAIGN-NOT-FOUND (err u5503))
(define-constant ERR-INSUFFICIENT-BALANCE (err u5504))
(define-constant ERR-TRANSFER-FAILED (err u5505))
(define-constant ERR-INVALID-AMOUNT (err u5506))
(define-constant ERR-STRATEGY-FAILED (err u5507))
(define-constant ERR-NO-YIELD (err u5508))
(define-constant ERR-NO-STRATEGY (err u5509))
(define-constant ERR-SYSTEM-PAUSED (err u5510))
(define-constant ERR-SYSTEM-NOT-PAUSED (err u5511))
(define-constant ERR-NO-YIELD-TO-CLAIM (err u5512))
(define-constant ERR-BONUS-ALREADY-CLAIMED (err u5513))
(define-constant ERR-BONUS-FORFEITED (err u5514))
(define-constant ERR-NOT-BACKER (err u5515))
(define-constant ERR-NOT-CREATOR (err u5516))
(define-constant ERR-NO-SNAPSHOT (err u5517))
(define-constant ERR-NO-ACCUMULATED-YIELD (err u5518))

;; ========== CONSTANTS ==========
(define-constant CONTRACT-OWNER tx-sender)
(define-constant BURN-ADDRESS 'SP000000000000000000002Q6VF78)
;; Yield split: 70% backers, 20% platform, 10% creator bonus
(define-constant BACKER-YIELD-BPS u7000)
(define-constant PLATFORM-YIELD-BPS u2000)
(define-constant CREATOR-BONUS-BPS u1000)
;; Forfeited bonus redistribution: 70% to backers, 30% to platform
(define-constant FORFEITED-BACKER-BPS u7000)
(define-constant FORFEITED-PLATFORM-BPS u3000)
(define-constant BASIS-POINTS u10000)

;; ========== DATA VARIABLES ==========
(define-data-var admin-contract principal BURN-ADDRESS)
(define-data-var emergency-admin principal BURN-ADDRESS)
(define-data-var milestone-escrow-contract principal BURN-ADDRESS)
(define-data-var milestone-verification-contract principal BURN-ADDRESS)
(define-data-var default-strategy (optional principal) none)
(define-data-var initialized bool false)
(define-data-var emergency-pause bool false)
(define-data-var emergency-ops-counter uint u0)
(define-data-var module-version uint u2)
(define-data-var module-active bool true)
(define-data-var platform-yield-accumulated uint u0)

;; ========== DATA MAPS ==========

;; Per-campaign yield pool (replaces yield-positions from v1)
(define-map campaign-yield-pools uint {
  principal-deposited: uint,
  total-yield-accrued: uint,
  backer-pool-claimed: uint,
  creator-bonus-claimed: bool,
  creator-bonus-forfeited: bool,
  platform-pool-claimed: uint,
  total-raised-at-deposit: uint,
  campaign-creator: principal,
  asset: principal,
  last-yield-accrual: uint
})

;; Per-backer yield claim tracking
(define-map backer-yield-claims { campaign-id: uint, backer: principal } {
  total-claimed: uint
})

;; Emergency operations audit trail
(define-map emergency-ops-log { ops-count-id: uint } {
  emergency-ops-type: (string-ascii 150),
  recipient: principal,
  admin: principal,
  block-height: uint,
  reason: (string-ascii 100)
})

;; ========== PRIVATE HELPERS ==========

(define-private (get-strategy-balance)
  (if (is-some (var-get default-strategy))
    (unwrap! (contract-call? .bitflow-strategy get-pool-balance) u0)
    u0
  )
)

;; Accrue yield: compute new yield since last accrual and add to total
(define-private (do-accrue-yield (pool {
  principal-deposited: uint, total-yield-accrued: uint,
  backer-pool-claimed: uint, creator-bonus-claimed: bool,
  creator-bonus-forfeited: bool, platform-pool-claimed: uint,
  total-raised-at-deposit: uint, campaign-creator: principal,
  asset: principal, last-yield-accrual: uint
}))
  (let
    (
      (strategy-balance (get-strategy-balance))
      (total-position (+ (get principal-deposited pool) (get total-yield-accrued pool)))
      (new-yield (if (>= strategy-balance total-position)
                   (- strategy-balance total-position)
                   u0))
    )
    (if (> new-yield u0)
      (merge pool { total-yield-accrued: (+ (get total-yield-accrued pool) new-yield),
                    last-yield-accrual: block-height })
      pool
    )
  )
)

;; Compute backer's total entitlement (including forfeited bonus redistribution)
(define-private (compute-backer-entitlement (pool {
  principal-deposited: uint, total-yield-accrued: uint,
  backer-pool-claimed: uint, creator-bonus-claimed: bool,
  creator-bonus-forfeited: bool, platform-pool-claimed: uint,
  total-raised-at-deposit: uint, campaign-creator: principal,
  asset: principal, last-yield-accrual: uint
}) (backer-contribution uint))
  (let
    (
      (total-yield (get total-yield-accrued pool))
      (base-pool (/ (* total-yield BACKER-YIELD-BPS) BASIS-POINTS))
      (forfeited-extra (if (get creator-bonus-forfeited pool)
                         (/ (* total-yield CREATOR-BONUS-BPS FORFEITED-BACKER-BPS) BASIS-POINTS BASIS-POINTS)
                         u0))
      (total-pool (+ base-pool forfeited-extra))
      (total-raised (get total-raised-at-deposit pool))
    )
    (if (> total-raised u0)
      (/ (* total-pool backer-contribution) total-raised)
      u0
    )
  )
)

;; Compute platform's total entitlement
(define-private (compute-platform-entitlement (pool {
  principal-deposited: uint, total-yield-accrued: uint,
  backer-pool-claimed: uint, creator-bonus-claimed: bool,
  creator-bonus-forfeited: bool, platform-pool-claimed: uint,
  total-raised-at-deposit: uint, campaign-creator: principal,
  asset: principal, last-yield-accrual: uint
}))
  (let
    (
      (total-yield (get total-yield-accrued pool))
      (base-pool (/ (* total-yield PLATFORM-YIELD-BPS) BASIS-POINTS))
      (forfeited-extra (if (get creator-bonus-forfeited pool)
                         (/ (* total-yield CREATOR-BONUS-BPS FORFEITED-PLATFORM-BPS) BASIS-POINTS BASIS-POINTS)
                         u0))
    )
    (+ base-pool forfeited-extra)
  )
)

;; Compute creator's bonus
(define-private (compute-creator-bonus (pool {
  principal-deposited: uint, total-yield-accrued: uint,
  backer-pool-claimed: uint, creator-bonus-claimed: bool,
  creator-bonus-forfeited: bool, platform-pool-claimed: uint,
  total-raised-at-deposit: uint, campaign-creator: principal,
  asset: principal, last-yield-accrual: uint
}))
  (/ (* (get total-yield-accrued pool) CREATOR-BONUS-BPS) BASIS-POINTS)
)

;; ========== PUBLIC FUNCTIONS ==========

;; One-time initializer
;; @param admin - admin contract address (timelock)
;; @param emergency - emergency admin address (multi-sig)
;; @param escrow - milestone-escrow contract address
;; @param milestone-verification - milestone-verification contract address
(define-public (initialize (admin principal) (emergency principal) (escrow principal) (milestone-verification principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
    (var-set initialized true)
    (var-set admin-contract admin)
    (var-set emergency-admin emergency)
    (var-set milestone-escrow-contract escrow)
    (var-set milestone-verification-contract milestone-verification)
    (print { event: "yield-escrow-initialized", admin: admin, escrow: escrow })
    (ok true)
  )
)

;; Deposit campaign funds into yield escrow
;; Captures total-raised-at-deposit snapshot from crowdfunding-module
(define-public (deposit-to-yield-escrow (campaign-id uint) (amount uint) (strategy-opt (optional principal)))
  (let
    (
      (pool (default-to
        { principal-deposited: u0, total-yield-accrued: u0,
          backer-pool-claimed: u0, creator-bonus-claimed: false,
          creator-bonus-forfeited: false, platform-pool-claimed: u0,
          total-raised-at-deposit: u0, campaign-creator: tx-sender,
          asset: BURN-ADDRESS, last-yield-accrual: block-height }
        (map-get? campaign-yield-pools campaign-id)))
      (total-raised (unwrap! (contract-call? .campaign-module-2 get-total-raised-funds campaign-id) ERR-NO-SNAPSHOT))
    )
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (is-eq contract-caller (var-get milestone-escrow-contract)) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (var-get emergency-pause)) ERR-SYSTEM-PAUSED)

    ;; Transfer STX from caller (milestone-escrow forwards it)
    (unwrap! (stx-transfer? amount tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)

    ;; Deploy to strategy if configured
    (match (var-get default-strategy)
      strategy-addr (unwrap! (contract-call? .bitflow-strategy deposit amount) ERR-STRATEGY-FAILED)
      u0
    )

    ;; Snapshot total-raised only on first deposit for this campaign
    (map-set campaign-yield-pools campaign-id (merge pool {
      principal-deposited: (+ (get principal-deposited pool) amount),
      campaign-creator: (get campaign-creator pool),
      total-raised-at-deposit: (if (is-eq (get total-raised-at-deposit pool) u0)
                                total-raised
                                (get total-raised-at-deposit pool)),
      last-yield-accrual: block-height
    }))

    (print { event: "yield-deposited", campaign-id: campaign-id, amount: amount })
    (ok true)
  )
)

;; Withdraw principal from yield escrow
;; Only callable by milestone-escrow contract
(define-public (withdraw-from-yield-escrow (campaign-id uint) (amount uint))
  (let
    (
      (pool (unwrap! (map-get? campaign-yield-pools campaign-id) ERR-CAMPAIGN-NOT-FOUND))
    )
    (asserts! (not (var-get emergency-pause)) ERR-SYSTEM-PAUSED)
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (is-eq contract-caller (var-get milestone-escrow-contract)) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (<= amount (get principal-deposited pool)) ERR-INSUFFICIENT-BALANCE)

    ;; Withdraw from strategy first if active
    (if (is-some (var-get default-strategy))
      (let
        (
          (exchange-rate (unwrap! (contract-call? .bitflow-strategy get-exchange-rate) ERR-STRATEGY-FAILED))
          (lp-amount (if (is-eq exchange-rate u0)
                       amount
                       (/ (+ (* amount u100000000) (- exchange-rate u1)) exchange-rate)))
          (withdrawn (unwrap! (contract-call? .bitflow-strategy withdraw lp-amount) ERR-STRATEGY-FAILED))
        )
        (asserts! (>= withdrawn amount) ERR-TRANSFER-FAILED)
      )
      true
    )

    ;; Transfer STX back to caller (milestone-escrow forwards to campaign)
    (unwrap! (as-contract (stx-transfer? amount tx-sender (get campaign-creator pool)))
             ERR-TRANSFER-FAILED)

    ;; Update position
    (map-set campaign-yield-pools campaign-id (merge pool {
      principal-deposited: (- (get principal-deposited pool) amount),
      last-yield-accrual: block-height
    }))

    (print { event: "yield-withdrawn", campaign-id: campaign-id, amount: amount })
    (ok true)
  )
)

;; Backer: claim proportional share of accrued yield (70% pool)
;; Auto-accrues yield before computing share
(define-public (claim-backer-yield (campaign-id uint))
  (let
    (
      (pool (unwrap! (map-get? campaign-yield-pools campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (accrued-pool (do-accrue-yield pool))
      (contrib (unwrap! (contract-call? .campaign-module-2 get-campaign-contributions campaign-id tx-sender) ERR-NOT-BACKER))
      (backer-contribution (get total-contributed contrib))
      (entitlement (compute-backer-entitlement accrued-pool backer-contribution))
      (existing-claim (default-to { total-claimed: u0 }
                        (map-get? backer-yield-claims { campaign-id: campaign-id, backer: tx-sender })))
      (claimable (- entitlement (get total-claimed existing-claim)))
    )
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (not (var-get emergency-pause)) ERR-SYSTEM-PAUSED)
    (asserts! (> backer-contribution u0) ERR-NOT-BACKER)
    (asserts! (> claimable u0) ERR-NO-YIELD-TO-CLAIM)
    (asserts! (<= claimable (stx-get-balance (as-contract tx-sender))) ERR-INSUFFICIENT-BALANCE)

    ;; Transfer claimable amount to backer
    (unwrap! (as-contract (stx-transfer? claimable tx-sender tx-sender)) ERR-TRANSFER-FAILED)

    ;; Update global backer-pool-claimed and per-backer claim record
    (map-set campaign-yield-pools campaign-id (merge accrued-pool {
      backer-pool-claimed: (+ (get backer-pool-claimed accrued-pool) claimable)
    }))
    (map-set backer-yield-claims { campaign-id: campaign-id, backer: tx-sender } {
      total-claimed: (+ (get total-claimed existing-claim) claimable)
    })

    (print { event: "backer-yield-claimed", campaign-id: campaign-id, backer: tx-sender, amount: claimable })
    (ok claimable)
  )
)

;; Creator: claim performance bonus (10% pool)
;; Checks milestone-verification for forfeiture status
(define-public (claim-creator-bonus (campaign-id uint))
  (let
    (
      (pool (unwrap! (map-get? campaign-yield-pools campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (accrued-pool (do-accrue-yield pool))
      (bonus (compute-creator-bonus accrued-pool))
    )
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (not (var-get emergency-pause)) ERR-SYSTEM-PAUSED)
    (asserts! (is-eq tx-sender (get campaign-creator pool)) ERR-NOT-CREATOR)
    (asserts! (not (get creator-bonus-claimed accrued-pool)) ERR-BONUS-ALREADY-CLAIMED)

    (let ((forfeited (unwrap-panic (contract-call? .milestone-verification is-bonus-forfeited campaign-id))))
      (if forfeited
        (begin
          (map-set campaign-yield-pools campaign-id (merge accrued-pool {
            creator-bonus-claimed: true,
            creator-bonus-forfeited: true
          }))
          (print { event: "creator-bonus-forfeited", campaign-id: campaign-id })
          (ok u0)
        )
        (begin
          (asserts! (> bonus u0) ERR-NO-YIELD)
          (asserts! (<= bonus (stx-get-balance (as-contract tx-sender))) ERR-INSUFFICIENT-BALANCE)

          (unwrap! (as-contract (stx-transfer? bonus tx-sender tx-sender)) ERR-TRANSFER-FAILED)

          (map-set campaign-yield-pools campaign-id (merge accrued-pool {
            creator-bonus-claimed: true
          }))

          (print { event: "creator-bonus-claimed", campaign-id: campaign-id, amount: bonus })
          (ok bonus)
        )
      )
    )
  )
)

;; Admin: sweep platform yield share (20% pool, plus forfeited bonus redistribution)
(define-public (distribute-platform-yield (campaign-id uint))
  (let
    (
      (pool (unwrap! (map-get? campaign-yield-pools campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (accrued-pool (do-accrue-yield pool))
      (entitlement (compute-platform-entitlement accrued-pool))
      (unclaimed (- entitlement (get platform-pool-claimed accrued-pool)))
    )
    (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-AUTHORIZED)
    (asserts! (> unclaimed u0) ERR-NO-ACCUMULATED-YIELD)
    (asserts! (<= unclaimed (stx-get-balance (as-contract tx-sender))) ERR-INSUFFICIENT-BALANCE)

    (unwrap! (as-contract (stx-transfer? unclaimed tx-sender tx-sender)) ERR-TRANSFER-FAILED)

    (var-set platform-yield-accumulated (+ (var-get platform-yield-accumulated) unclaimed))

    (map-set campaign-yield-pools campaign-id (merge accrued-pool {
      platform-pool-claimed: (+ (get platform-pool-claimed accrued-pool) unclaimed)
    }))

    (print { event: "platform-yield-distributed", campaign-id: campaign-id, amount: unclaimed })
    (ok unclaimed)
  )
)

;; ========== ADMIN FUNCTIONS ==========

(define-public (set-strategy (strategy (optional principal)))
  (begin
    (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-AUTHORIZED)
    (var-set default-strategy strategy)
    (print { event: "strategy-set", strategy: strategy })
    (ok true)
  )
)

(define-public (set-milestone-escrow (escrow principal))
  (begin
    (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-AUTHORIZED)
    (var-set milestone-escrow-contract escrow)
    (ok true)
  )
)

(define-public (set-milestone-verification (verification principal))
  (begin
    (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-AUTHORIZED)
    (var-set milestone-verification-contract verification)
    (ok true)
  )
)

;; ========== READ-ONLY FUNCTIONS ==========

(define-read-only (get-yield-pool (campaign-id uint))
  (ok (map-get? campaign-yield-pools campaign-id))
)

(define-read-only (get-backer-yield-claim (campaign-id uint) (backer principal))
  (ok (map-get? backer-yield-claims { campaign-id: campaign-id, backer: backer }))
)

(define-read-only (get-platform-yield-accumulated)
  (ok (var-get platform-yield-accumulated))
)

(define-read-only (get-default-strategy)
  (ok (var-get default-strategy))
)

(define-read-only (get-milestone-escrow)
  (ok (var-get milestone-escrow-contract))
)

(define-read-only (get-milestone-verification)
  (ok (var-get milestone-verification-contract))
)

(define-read-only (get-admin-contract)
  (ok (var-get admin-contract))
)

(define-read-only (get-emergency-admin)
  (ok (var-get emergency-admin))
)

;; ========== EMERGENCY MODULE TRAIT ==========

(define-public (set-pause-state (pause bool))
  (begin
    (asserts! (is-eq contract-caller (var-get emergency-admin)) ERR-NOT-AUTHORIZED)
    (var-set emergency-pause pause)
    (print { event: "emergency-pause-set", paused: pause })
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
      emergency-ops-type: "emergency withdraw yield-escrow",
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
  (ok "yield-escrow")
)
