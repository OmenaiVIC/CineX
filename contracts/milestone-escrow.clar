;; title: milestone-escrow
;; version: 1.0.0
;; summary: Milestone escrow with sequential backer approval and platform fee
;; author: Victor Omenai
;; created: 2025

;; ========== Description ==========
;; Implements milestone-escrow-trait for secure milestone-based fund releases.
;; Backers deposit STX, creators submit proof for each milestone,
;; backers approve milestones sequentially (cannot skip ahead),
;; funds release with 5% platform fee to the platform-fee-collector.
;; Strategic: "Key Resources" - secures campaign funds for CineX.
;; ================================

(impl-trait .milestone-escrow-trait.milestone-escrow-trait)
(impl-trait .emergency-module-trait.emergency-module-trait)
(impl-trait .module-base-trait.module-base-trait)
(use-trait asset-registry-trait .asset-registry-trait.asset-registry-trait)
(use-trait oracle-proxy-trait .oracle-proxy-trait.oracle-proxy-trait)
(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; ========== ERROR CONSTANTS (u5400-u5423) ==========
(define-constant ERR-CAMPAIGN-NOT-FOUND (err u5400))
(define-constant ERR-MILESTONE-NOT-FOUND (err u5401))
(define-constant ERR-NOT-AUTHORIZED (err u5402))
(define-constant ERR-CAMPAIGN-ALREADY-EXISTS (err u5403))
(define-constant ERR-INSUFFICIENT-FUNDS (err u5404))
(define-constant ERR-TRANSFER-FAILED (err u5405))
(define-constant ERR-INVALID-AMOUNT (err u5406))
(define-constant ERR-PREVIOUS-MILESTONE-NOT-APPROVED (err u5407))
(define-constant ERR-CREATOR-CANNOT-APPROVE (err u5408))
(define-constant ERR-NOT-A-CONTRIBUTOR (err u5409))
(define-constant ERR-MILESTONE-ALREADY-APPROVED (err u5410))
(define-constant ERR-MILESTONE-ALREADY-RELEASED (err u5411))
(define-constant ERR-CAMPAIGN-COMPLETED (err u5412))
(define-constant ERR-INVALID-DEADLINE (err u5413))
(define-constant ERR-MILESTONE-LIMIT (err u5414))
(define-constant ERR-CAMPAIGN-EXPIRED (err u5415))
(define-constant ERR-FUNDING-CAP-EXCEEDED (err u5416))
(define-constant ERR-NO-PROOF (err u5417))
(define-constant ERR-SYSTEM-NOT-PAUSED (err u5418))
(define-constant ERR-SYSTEM-PAUSED (err u5419))
(define-constant ERR-SELF-NOT-INIT (err u5420))
(define-constant ERR-ASSET-NOT-SUPPORTED (err u5421))
(define-constant ERR-ORACLE-FETCH-FAILED (err u5422))
(define-constant ERR-NOT-INITIALIZED (err u5423))

;; ========== CONSTANTS ==========
(define-constant CONTRACT-OWNER tx-sender)
(define-constant BURN-ADDRESS 'SP000000000000000000002Q6VF78)
(define-constant MAX-MILESTONES u10)
(define-constant INITIAL-FEE-BPS u500) ;; 5% platform fee in basis points
(define-constant VERIFICATION-FEE-USD-CENTS u500) ;; $5.00 in USD cents (500c)

;; ========== DATA VARIABLES ==========

;; Core contract address for authorization routing
(define-data-var core-contract principal tx-sender)

;; Verification contract for funding cap lookups
(define-data-var verification-contract principal tx-sender)

;; Address where the 5% platform fee is collected on each milestone release
;; Initially set to deployer; owner can update via set-fee-parameters
(define-data-var platform-fee-collector principal CONTRACT-OWNER)

;; Fee rate in basis points (500 = 5%, max 2500 = 25%)
(define-data-var fee-bps uint INITIAL-FEE-BPS)

;; Emergency state
(define-data-var emergency-pause bool false)
(define-data-var emergency-ops-counter uint u0)

;; Module metadata
(define-data-var module-version uint u1)
(define-data-var module-active bool true)

;; ========== DATA MAPS ==========

;; Core campaign storage - milestones list is stored inline (immutable after creation)
(define-map campaigns uint {
  project-id: uint,
  creator: principal,
  asset: principal,
  total-goal: uint,
  total-deposited: uint,
  milestones: (list 10 { name: (string-ascii 64), amount: uint }),
  milestone-count: uint,
  released-count: uint,
  status: (string-ascii 20),
  created-at: uint,
  deadline: uint
})

;; Per-milestone mutable state - tracks approval, release, proof hash
;; Defaults to all-false via default-to; no initialization needed
(define-map milestone-state { campaign-id: uint, milestone-index: uint } {
  approved: bool,
  released: bool,
  proof-hash: (optional (buff 32)),
  approved-by: (optional principal)
})

;; Tracks each backer's total deposits - gates approval rights
(define-map campaign-contributors { campaign-id: uint, contributor: principal } {
  amount: uint
})

;; Auto-incrementing campaign ID counter
(define-map campaign-counter uint uint)

;; Emergency operations audit trail
(define-map emergency-ops-log { ops-count-id: uint } {
  emergency-ops-type: (string-ascii 150),
  recipient: principal,
  admin: principal,
  block-height: uint,
  reason: (string-ascii 100)
})

;; ========== PRIVATE HELPERS ==========

;; Returns the default (unset) milestone state for use with default-to
(define-private (default-milestone-state)
  { approved: false, released: false, proof-hash: none, approved-by: none }
)

;; ========== PUBLIC FUNCTIONS ==========

;; Create a new campaign with milestone definitions
;; @param project-id - external project identifier
;; @param asset - accepted asset principal (STX or SIP-010, v1 = STX only)
;; @param total-goal - fundraising target in micro-STX
;; @param milestones - list of up to 10 milestone definitions
;; @param deadline - block height after which deposits are rejected
;; @returns new campaign ID
(define-public (create-campaign
    (project-id uint)
    (asset principal)
    (total-goal uint)
    (milestones (list 10 { name: (string-ascii 64), amount: uint }))
    (deadline uint))
  (let
    (
      (milestone-count (len milestones))
      (current-count (default-to u0 (map-get? campaign-counter u0)))
      (new-id (+ current-count u1))
      (funding-cap (unwrap! (contract-call? .project-verification-module
                             get-verification-funding-cap tx-sender)
                   ERR-NOT-AUTHORIZED))
      (stx-price-cents (unwrap! (contract-call? .oracle-proxy get-stx-price) ERR-ORACLE-FETCH-FAILED))
      (verification-fee-ustx (/ (* VERIFICATION-FEE-USD-CENTS u1000000) stx-price-cents))
    )
    ;; Validate deadline is in the future
    (asserts! (> deadline block-height) ERR-INVALID-DEADLINE)

    ;; Validate at least one milestone
    (asserts! (> milestone-count u0) ERR-MILESTONE-NOT-FOUND)

    ;; Validate milestone count within max
    (asserts! (<= milestone-count MAX-MILESTONES) ERR-MILESTONE-LIMIT)

    ;; Validate total goal is positive
    (asserts! (> total-goal u0) ERR-INVALID-AMOUNT)

    ;; Validate total goal within creator's funding cap
    (asserts! (<= total-goal funding-cap) ERR-FUNDING-CAP-EXCEEDED)

    ;; Validate asset is supported by the registry
    (asserts! (unwrap! (contract-call? .asset-registry is-supported asset) ERR-ASSET-NOT-SUPPORTED)
              ERR-ASSET-NOT-SUPPORTED)

    ;; Transfer verification fee from creator (STX)
    (unwrap! (stx-transfer? verification-fee-ustx tx-sender (as-contract tx-sender))
             ERR-TRANSFER-FAILED)

    ;; Persist the campaign
    (map-set campaigns new-id {
      project-id: project-id,
      creator: tx-sender,
      asset: asset,
      total-goal: total-goal,
      total-deposited: u0,
      milestones: milestones,
      milestone-count: milestone-count,
      released-count: u0,
      status: "active",
      created-at: block-height,
      deadline: deadline
    })

    ;; Increment the campaign ID counter
    (map-set campaign-counter u0 new-id)

    (ok new-id)
  )
)

;; Deposit STX into a campaign's escrow balance
;; @param campaign-id - target campaign
;; @param amount - amount in micro-STX
(define-public (deposit (campaign-id uint) (amount uint))
  (let
    (
      (campaign (unwrap! (map-get? campaigns campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (new-total (+ (get total-deposited campaign) amount))
      (funding-cap (unwrap! (contract-call? .project-verification-module
                             get-verification-funding-cap (get creator campaign))
                   ERR-NOT-AUTHORIZED))
    )
    ;; Campaign must be active
    (asserts! (is-eq (get status campaign) "active") ERR-CAMPAIGN-COMPLETED)

    ;; Deadline must not have passed
    (asserts! (<= block-height (get deadline campaign)) ERR-CAMPAIGN-EXPIRED)

    ;; Amount must be positive
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)

    ;; New total must not exceed the campaign's fundraising goal
    (asserts! (<= new-total (get total-goal campaign)) ERR-INSUFFICIENT-FUNDS)

    ;; Live funding cap check - creator may have been downgraded mid-campaign
    (asserts! (<= new-total funding-cap) ERR-FUNDING-CAP-EXCEEDED)

    ;; Transfer STX from sender to this contract
    (unwrap! (stx-transfer? amount tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)

    ;; Update campaign deposited total
    (map-set campaigns campaign-id (merge campaign { total-deposited: new-total }))

    ;; Record or update contributor's deposit amount
    (map-set campaign-contributors { campaign-id: campaign-id, contributor: tx-sender } {
      amount: (+ (default-to u0
                   (get amount (map-get? campaign-contributors
                     { campaign-id: campaign-id, contributor: tx-sender }))) amount)
    })

    (ok true)
  )
)

;; Backward-compat: deposit STX into a campaign's escrow (alias for deposit)
;; Called by campaign-module during backer contributions
(define-public (deposit-to-campaign (campaign-id uint) (amount uint))
  (deposit campaign-id amount)
)

;; Deposit SIP-010 tokens into a campaign's escrow balance
;; Validates campaign exists and is active, then transfers tokens via sip-010-trait
;; @param token - SIP-010 token trait (contract-call validated against stored asset)
;; @param campaign-id - target campaign
;; @param amount - amount in token's smallest unit
(define-public (deposit-token
    (token <sip-010-trait>)
    (campaign-id uint)
    (amount uint))
  (let
    (
      (campaign (unwrap! (map-get? campaigns campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (new-total (+ (get total-deposited campaign) amount))
      (funding-cap (unwrap! (contract-call? .project-verification-module
                             get-verification-funding-cap (get creator campaign))
                   ERR-NOT-AUTHORIZED))
    )
    ;; Campaign must be active
    (asserts! (is-eq (get status campaign) "active") ERR-CAMPAIGN-COMPLETED)

    ;; Deadline must not have passed
    (asserts! (<= block-height (get deadline campaign)) ERR-CAMPAIGN-EXPIRED)

    ;; Amount must be positive
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)

    ;; New total must not exceed the campaign's fundraising goal
    (asserts! (<= new-total (get total-goal campaign)) ERR-INSUFFICIENT-FUNDS)

    ;; Live funding cap check - creator may have been downgraded mid-campaign
    (asserts! (<= new-total funding-cap) ERR-FUNDING-CAP-EXCEEDED)

    ;; Token contract must match the campaign's registered asset
    (asserts! (is-eq (contract-of token) (get asset campaign)) ERR-ASSET-NOT-SUPPORTED)

    ;; Transfer tokens from sender to this contract
    (unwrap! (contract-call? token transfer amount tx-sender (as-contract tx-sender) none)
             ERR-TRANSFER-FAILED)

    ;; Update campaign deposited total
    (map-set campaigns campaign-id (merge campaign { total-deposited: new-total }))

    ;; Record or update contributor's deposit amount
    (map-set campaign-contributors { campaign-id: campaign-id, contributor: tx-sender } {
      amount: (+ (default-to u0
                   (get amount (map-get? campaign-contributors
                     { campaign-id: campaign-id, contributor: tx-sender }))) amount)
    })

    (ok true)
  )
)

;; Backward-compat: withdraw funds from escrow to campaign creator
;; Called by campaign-module during claim-campaign-funds
(define-public (withdraw-from-campaign (campaign-id uint) (amount uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) ERR-CAMPAIGN-NOT-FOUND)))
    (unwrap! (as-contract (stx-transfer? amount tx-sender (get creator campaign))) ERR-TRANSFER-FAILED)
    (ok true)
  )
)

;; Backward-compat: collect platform fee from campaign escrow
;; Called by campaign-module during claim-campaign-funds
(define-public (collect-campaign-fee (campaign-id uint) (amount uint))
  (let ((collector (var-get platform-fee-collector)))
    (unwrap! (as-contract (stx-transfer? amount tx-sender collector)) ERR-TRANSFER-FAILED)
    (ok true)
  )
)

;; Submit proof hash for a completed milestone
;; @param campaign-id - target campaign
;; @param milestone-index - 0-based milestone index
;; @param proof-hash - 32-byte hash of off-chain proof of completion
(define-public (submit-milestone-proof (campaign-id uint) (milestone-index uint) (proof-hash (buff 32)))
  (let
    (
      (campaign (unwrap! (map-get? campaigns campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (current-state (default-to (default-milestone-state)
                       (map-get? milestone-state
                         { campaign-id: campaign-id, milestone-index: milestone-index })))
    )
    ;; Only the campaign creator may submit proof
    (asserts! (is-eq tx-sender (get creator campaign)) ERR-NOT-AUTHORIZED)

    ;; Campaign must be active
    (asserts! (is-eq (get status campaign) "active") ERR-CAMPAIGN-COMPLETED)

    ;; Milestone index must be within valid range
    (asserts! (< milestone-index (get milestone-count campaign)) ERR-MILESTONE-NOT-FOUND)

    ;; Milestone must not already be released
    (asserts! (not (get released current-state)) ERR-MILESTONE-ALREADY-RELEASED)

    ;; Store/overwrite the proof hash (allows re-submission before approval)
    (map-set milestone-state { campaign-id: campaign-id, milestone-index: milestone-index }
      (merge current-state { proof-hash: (some proof-hash) }))

    (ok true)
  )
)

;; Approve a milestone (backer-gated, sequential)
;; @param campaign-id - target campaign
;; @param milestone-index - 0-based milestone index to approve
(define-public (approve-milestone (campaign-id uint) (milestone-index uint))
  (let
    (
      (campaign (unwrap! (map-get? campaigns campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (current-state (default-to (default-milestone-state)
                       (map-get? milestone-state
                         { campaign-id: campaign-id, milestone-index: milestone-index })))
    )
    ;; Campaign must be active
    (asserts! (is-eq (get status campaign) "active") ERR-CAMPAIGN-COMPLETED)

    ;; Milestone index must be valid
    (asserts! (< milestone-index (get milestone-count campaign)) ERR-MILESTONE-NOT-FOUND)

    ;; Creator cannot approve their own milestone
    (asserts! (not (is-eq tx-sender (get creator campaign))) ERR-CREATOR-CANNOT-APPROVE)

    ;; Only contributors with a deposit record may approve
    (asserts! (is-some (map-get? campaign-contributors
                         { campaign-id: campaign-id, contributor: tx-sender }))
              ERR-NOT-A-CONTRIBUTOR)

    ;; Milestone must not already be approved
    (asserts! (not (get approved current-state)) ERR-MILESTONE-ALREADY-APPROVED)

    ;; Milestone must not already be released
    (asserts! (not (get released current-state)) ERR-MILESTONE-ALREADY-RELEASED)

    ;; Milestone must have a proof hash submitted
    (asserts! (is-some (get proof-hash current-state)) ERR-NO-PROOF)

    ;; Sequential approval check: milestone 0 has no predecessor;
    ;; milestone n requires milestone n-1 to be approved
    (asserts! (or (is-eq milestone-index u0)
                  (let ((prev-state (default-to (default-milestone-state)
                                      (map-get? milestone-state
                                        { campaign-id: campaign-id
                                        , milestone-index: (- milestone-index u1) }))))
                    (get approved prev-state)))
              ERR-PREVIOUS-MILESTONE-NOT-APPROVED)

    ;; Persist approved state
    (map-set milestone-state { campaign-id: campaign-id, milestone-index: milestone-index }
      (merge current-state { approved: true, approved-by: (some tx-sender) }))

    (ok true)
  )
)

;; Release funds for an approved milestone
;; Deducts 5% platform fee, sends remainder to creator
;; Auto-completes campaign if all milestones are released
;; @param campaign-id - target campaign
;; @param milestone-index - 0-based milestone index to release
(define-public (release-milestone-funds (campaign-id uint) (milestone-index uint))
  (let
    (
      (campaign (unwrap! (map-get? campaigns campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (current-state (default-to (default-milestone-state)
                       (map-get? milestone-state
                         { campaign-id: campaign-id, milestone-index: milestone-index })))
      (milestone (unwrap! (element-at (get milestones campaign) milestone-index)
                  ERR-MILESTONE-NOT-FOUND))
      (collector (var-get platform-fee-collector))
      (fee-rate (var-get fee-bps))
      (milestone-amount (get amount milestone))
      (fee-amount (/ (* milestone-amount fee-rate) u10000))
      (creator-payout (- milestone-amount fee-amount))
      (new-deposited (- (get total-deposited campaign) milestone-amount))
      (new-released (+ (get released-count campaign) u1))
      (all-released (>= new-released (get milestone-count campaign)))
      (new-status (if all-released "completed" (get status campaign)))
    )
    ;; Campaign must be active
    (asserts! (is-eq (get status campaign) "active") ERR-CAMPAIGN-COMPLETED)

    ;; Milestone must be approved
    (asserts! (get approved current-state) ERR-NOT-AUTHORIZED)

    ;; Milestone must not already be released
    (asserts! (not (get released current-state)) ERR-MILESTONE-ALREADY-RELEASED)

    ;; Contract must hold sufficient deposited funds
    (asserts! (>= (get total-deposited campaign) milestone-amount) ERR-INSUFFICIENT-FUNDS)

    ;; Transfer platform fee to collector
    (unwrap! (as-contract (stx-transfer? fee-amount tx-sender collector)) ERR-TRANSFER-FAILED)

    ;; Transfer creator payout to campaign creator
    (unwrap! (as-contract (stx-transfer? creator-payout tx-sender (get creator campaign)))
             ERR-TRANSFER-FAILED)

    ;; Mark milestone as released
    (map-set milestone-state { campaign-id: campaign-id, milestone-index: milestone-index }
      (merge current-state { released: true }))

    ;; Update campaign totals and status (auto-complete if all released)
    (map-set campaigns campaign-id (merge campaign {
      total-deposited: new-deposited,
      released-count: new-released,
      status: new-status
    }))

    (ok true)
  )
)

;; Release funds for an approved milestone using SIP-010 token transfers
;; Deducts 5% platform fee, sends remainder to creator via token contract
;; Auto-completes campaign if all milestones are released
;; @param token - SIP-010 token trait (must match campaign's registered asset)
;; @param campaign-id - target campaign
;; @param milestone-index - 0-based milestone index to release
(define-public (release-milestone-funds-token
    (token <sip-010-trait>)
    (campaign-id uint)
    (milestone-index uint))
  (let
    (
      (campaign (unwrap! (map-get? campaigns campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (current-state (default-to (default-milestone-state)
                       (map-get? milestone-state
                         { campaign-id: campaign-id, milestone-index: milestone-index })))
      (milestone (unwrap! (element-at (get milestones campaign) milestone-index)
                  ERR-MILESTONE-NOT-FOUND))
      (collector (var-get platform-fee-collector))
      (fee-rate (var-get fee-bps))
      (milestone-amount (get amount milestone))
      (fee-amount (/ (* milestone-amount fee-rate) u10000))
      (creator-payout (- milestone-amount fee-amount))
      (new-deposited (- (get total-deposited campaign) milestone-amount))
      (new-released (+ (get released-count campaign) u1))
      (all-released (>= new-released (get milestone-count campaign)))
      (new-status (if all-released "completed" (get status campaign)))
    )
    ;; Campaign must be active
    (asserts! (is-eq (get status campaign) "active") ERR-CAMPAIGN-COMPLETED)

    ;; Milestone must be approved
    (asserts! (get approved current-state) ERR-NOT-AUTHORIZED)

    ;; Milestone must not already be released
    (asserts! (not (get released current-state)) ERR-MILESTONE-ALREADY-RELEASED)

    ;; Contract must hold sufficient deposited funds
    (asserts! (>= (get total-deposited campaign) milestone-amount) ERR-INSUFFICIENT-FUNDS)

    ;; Token contract must match the campaign's registered asset
    (asserts! (is-eq (contract-of token) (get asset campaign)) ERR-ASSET-NOT-SUPPORTED)

    ;; Transfer platform fee to collector via token contract
    (unwrap! (as-contract (contract-call? token transfer fee-amount tx-sender collector none))
             ERR-TRANSFER-FAILED)

    ;; Transfer creator payout to campaign creator via token contract
    (unwrap! (as-contract (contract-call? token transfer creator-payout tx-sender (get creator campaign) none))
             ERR-TRANSFER-FAILED)

    ;; Mark milestone as released
    (map-set milestone-state { campaign-id: campaign-id, milestone-index: milestone-index }
      (merge current-state { released: true }))

    ;; Update campaign totals and status (auto-complete if all released)
    (map-set campaigns campaign-id (merge campaign {
      total-deposited: new-deposited,
      released-count: new-released,
      status: new-status
    }))

    (ok true)
  )
)

;; Set fee collector address and fee rate
;; @param new-collector - principal receiving platform fees
;; @param new-fee-bps - fee rate in basis points (max 2500 = 25%)
(define-public (set-fee-parameters (new-collector principal) (new-fee-bps uint))
  (begin
    ;; Only contract owner may change fee parameters
    ;; TODO: route through timelock after timelock.clar deployment
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)

    ;; Fee rate must not exceed 25%
    (asserts! (<= new-fee-bps u2500) ERR-INVALID-AMOUNT)

    ;; Collector must not be the burn address
    (asserts! (not (is-eq new-collector BURN-ADDRESS)) ERR-INVALID-AMOUNT)

    (var-set platform-fee-collector new-collector)
    (var-set fee-bps new-fee-bps)

    (ok true)
  )
)

;; One-time initializer to set contract references
(define-public (initialize (core principal) (verification principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set core-contract core)
    (var-set verification-contract verification)
    (ok true)
  )
)

;; Set verification contract reference (owner only)
(define-public (set-verification-contract (verification principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set verification-contract verification)
    (ok true)
  )
)

;; ========== READ-ONLY FUNCTIONS ==========

(define-read-only (get-campaign (campaign-id uint))
  (ok (map-get? campaigns campaign-id))
)

(define-read-only (get-milestone-state (campaign-id uint) (milestone-index uint))
  (ok (default-to (default-milestone-state)
       (map-get? milestone-state
         { campaign-id: campaign-id, milestone-index: milestone-index })))
)

(define-read-only (get-campaign-contributor (campaign-id uint) (contributor principal))
  (ok (map-get? campaign-contributors
       { campaign-id: campaign-id, contributor: contributor }))
)

(define-read-only (get-campaign-balance (campaign-id uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) ERR-CAMPAIGN-NOT-FOUND)))
    (ok (get total-deposited campaign))
  )
)

(define-read-only (get-platform-fee-collector)
  (ok (var-get platform-fee-collector))
)

(define-read-only (get-fee-bps)
  (ok (var-get fee-bps))
)

(define-read-only (get-verification-fee-usd-cents)
  (ok VERIFICATION-FEE-USD-CENTS)
)

;; ========== EMERGENCY MODULE TRAIT ==========

(define-public (set-pause-state (pause bool))
  (begin
    (asserts! (is-eq contract-caller (var-get core-contract)) ERR-NOT-AUTHORIZED)
    (asserts! (not (var-get emergency-pause)) ERR-SYSTEM-PAUSED)
    (var-set emergency-pause pause)
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
    (asserts! (is-eq contract-caller (var-get core-contract)) ERR-NOT-AUTHORIZED)
    (asserts! (var-get emergency-pause) ERR-SYSTEM-NOT-PAUSED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (<= amount contract-balance) ERR-INSUFFICIENT-FUNDS)
    (asserts! (and (not (is-eq recipient BURN-ADDRESS))
                   (not (is-eq recipient CONTRACT-OWNER))
                   (not (is-eq recipient (as-contract tx-sender))))
              ERR-INVALID-AMOUNT)

    (map-set emergency-ops-log { ops-count-id: next-ops-count } {
      emergency-ops-type: "emergency withdraw milestone-escrow",
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
  (ok "milestone-escrow")
)


