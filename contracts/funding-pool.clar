;; title: funding-pool
;; version: 1.0.0
;; summary: Passive capital pools with weighted-voting governance for CineX
;; author: CineX Team

;; ========== Description ==========
;; Implements funding-pool-trait for shared capital pools.
;; Verified users create pools, set parameters (target, min-reputation, min-contribution),
;; other verified users join and contribute STX toward the target.
;; Once funded, members propose allocations to milestone-escrow campaigns
;; and vote using their committed amount as voting weight.
;; Quorum requires >50% of total voting power for a proposal to pass.
;; ================================

(impl-trait .funding-pool-trait.funding-pool-trait)
(impl-trait .emergency-module-trait.emergency-module-trait)
(impl-trait .module-base-trait.module-base-trait)

;; ========== ERROR CONSTANTS (u5700-u5731) ==========
(define-constant ERR-NOT-AUTHORIZED (err u5700))
(define-constant ERR-NOT-INITIALIZED (err u5701))
(define-constant ERR-ALREADY-INITIALIZED (err u5702))
(define-constant ERR-POOL-NOT-FOUND (err u5703))
(define-constant ERR-INVALID-AMOUNT (err u5704))
(define-constant ERR-INSUFFICIENT-FUNDS (err u5705))
(define-constant ERR-TRANSFER-FAILED (err u5706))
(define-constant ERR-POOL-CLOSED (err u5707))
(define-constant ERR-POOL-FULL (err u5708))
(define-constant ERR-ALREADY-MEMBER (err u5709))
(define-constant ERR-NOT-MEMBER (err u5710))
(define-constant ERR-REPUTATION-TOO-LOW (err u5711))
(define-constant ERR-NOT-VERIFIED (err u5712))
(define-constant ERR-PROPOSAL-NOT-FOUND (err u5713))
(define-constant ERR-PROPOSAL-ACTIVE (err u5714))
(define-constant ERR-PROPOSAL-EXECUTED (err u5715))
(define-constant ERR-PROPOSAL-REJECTED (err u5716))
(define-constant ERR-ALREADY-VOTED (err u5717))
(define-constant ERR-PROPOSAL-EXPIRED (err u5718))
(define-constant ERR-INSUFFICIENT-UNALLOCATED (err u5719))
(define-constant ERR-CAMPAIGN-NOT-FOUND (err u5720))
(define-constant ERR-CAMPAIGN-INACTIVE (err u5721))
(define-constant ERR-SYSTEM-PAUSED (err u5722))
(define-constant ERR-SYSTEM-NOT-PAUSED (err u5723))
(define-constant ERR-ZERO-VOTING-POWER (err u5724))
(define-constant ERR-POOL-NOT-EXPIRED (err u5725))
(define-constant ERR-NO-UNALLOCATED (err u5726))
(define-constant ERR-DURATION-EXCEEDED (err u5727))
(define-constant ERR-MIN-CONTRIBUTION (err u5728))
(define-constant ERR-INVALID-TARGET (err u5729))
(define-constant ERR-ALREADY-CLOSED (err u5730))
(define-constant ERR-CANNOT-EXECUTE (err u5731))

;; ========== CONSTANTS ==========
(define-constant CONTRACT-OWNER tx-sender)
(define-constant BURN-ADDRESS 'SP000000000000000000002Q6VF78)
(define-constant MIN-REPUTATION-DEFAULT u50)
(define-constant MAX-POOL-DURATION u86400)
(define-constant QUORUM-PERCENT u50)
(define-constant PROPOSAL-DURATION u14400)
(define-constant MAX-MEMBERS-PER-POOL u50)
(define-constant MAX-MEMBERS-PER-PAGE u20)
(define-constant MAX-PROPOSALS-PER-PAGE u20)

;; ========== DATA VARIABLES ==========

;; Admin contract (timelock) for non-emergency operations
(define-data-var admin-contract principal tx-sender)

;; Emergency admin (multi-sig) for bypass operations
(define-data-var emergency-admin principal tx-sender)

;; Contract references for cross-contract calls
(define-data-var verification-contract principal tx-sender)
(define-data-var reputation-contract principal tx-sender)
(define-data-var escrow-contract principal tx-sender)

;; System state
(define-data-var emergency-pause bool false)
(define-data-var initialized bool false)

;; Module metadata
(define-data-var module-version uint u1)
(define-data-var module-active bool true)

;; Auto-incrementing counters
(define-data-var pool-id-counter uint u0)
(define-data-var proposal-id-counter uint u0)
(define-data-var emergency-ops-counter uint u0)

;; ========== DATA MAPS ==========

(define-map pools uint {
  name: (string-ascii 64),
  creator: principal,
  target-amount: uint,
  min-contribution: uint,
  min-reputation: uint,
  duration: uint,
  created-at: uint,
  total-committed: uint,
  total-contributed: uint,
  total-allocated: uint,
  status: (string-ascii 20),
  member-count: uint,
  max-members: uint
})

(define-map pool-members { pool-id: uint, member: principal } {
  committed-amount: uint,
  contributed-amount: uint,
  joined-at: uint,
  is-active: bool
})

(define-map proposals uint {
  pool-id: uint,
  campaign-id: uint,
  amount: uint,
  proposer: principal,
  status: (string-ascii 15),
  votes-for: uint,
  votes-against: uint,
  created-at: uint,
  deadline: uint,
  total-voting-power: uint
})

(define-map proposal-votes { proposal-id: uint, voter: principal } {
  approve: bool,
  voting-power: uint,
  voted-at: uint
})

(define-map emergency-ops-log { ops-count-id: uint } {
  emergency-ops-type: (string-ascii 150),
  recipient: principal,
  admin: principal,
  block-height: uint,
  reason: (string-ascii 100)
})

;; ========== PRIVATE HELPERS ==========

(define-private (is-pool-open (pool (tuple
    (name (string-ascii 64)) (creator principal) (target-amount uint)
    (min-contribution uint) (min-reputation uint) (duration uint)
    (created-at uint) (total-committed uint) (total-contributed uint)
    (total-allocated uint) (status (string-ascii 20)) (member-count uint)
    (max-members uint))))
  (is-eq (get status pool) "open")
)

(define-private (is-pool-closed (pool (tuple
    (name (string-ascii 64)) (creator principal) (target-amount uint)
    (min-contribution uint) (min-reputation uint) (duration uint)
    (created-at uint) (total-committed uint) (total-contributed uint)
    (total-allocated uint) (status (string-ascii 20)) (member-count uint)
    (max-members uint))))
  (is-eq (get status pool) "closed")
)

(define-private (is-member-active (pool-id uint) (member principal))
  (default-to false
    (get is-active (map-get? pool-members { pool-id: pool-id, member: member }))
  )
)

(define-private (get-unallocated-capital (pool (tuple
    (name (string-ascii 64)) (creator principal) (target-amount uint)
    (min-contribution uint) (min-reputation uint) (duration uint)
    (created-at uint) (total-committed uint) (total-contributed uint)
    (total-allocated uint) (status (string-ascii 20)) (member-count uint)
    (max-members uint))))
  (- (get total-committed pool) (get total-allocated pool))
)

(define-private (stx-balance-of-self)
  (stx-get-balance (as-contract tx-sender))
)

;; ========== INITIALIZE ==========

(define-public (initialize
    (admin principal)
    (emergency principal)
    (verification principal)
    (reputation principal)
    (escrow principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
    (var-set initialized true)
    (var-set admin-contract admin)
    (var-set emergency-admin emergency)
    (var-set verification-contract verification)
    (var-set reputation-contract reputation)
    (var-set escrow-contract escrow)
    (print { event: "initialized", admin: admin, emergency: emergency })
    (ok true)
  )
)

;; ========== CORE PUBLIC: CREATE POOL ==========

(define-public (create-pool
    (name (string-ascii 64))
    (target-amount uint)
    (min-contribution uint)
    (min-reputation uint)
    (duration uint)
    (max-members uint))
  (let
    (
      (current-id (var-get pool-id-counter))
      (new-id (+ current-id u1))
      (escrow (var-get escrow-contract))
    )
    ;; Creator must be verified
    (asserts! (unwrap! (contract-call? .project-verification-module is-creator-currently-verified tx-sender)
                       ERR-NOT-VERIFIED)
              ERR-NOT-VERIFIED)

    ;; Target amount must be positive
    (asserts! (> target-amount u0) ERR-INVALID-TARGET)

    ;; Duration must not exceed maximum
    (asserts! (<= duration MAX-POOL-DURATION) ERR-DURATION-EXCEEDED)

    ;; Max members must be reasonable
    (asserts! (and (> max-members u0) (<= max-members MAX-MEMBERS-PER-POOL)) ERR-INVALID-AMOUNT)

    ;; Min contribution must be positive
    (asserts! (> min-contribution u0) ERR-MIN-CONTRIBUTION)

    ;; Create the pool
    (map-set pools new-id {
      name: name,
      creator: tx-sender,
      target-amount: target-amount,
      min-contribution: min-contribution,
      min-reputation: min-reputation,
      duration: duration,
      created-at: block-height,
      total-committed: u0,
      total-contributed: u0,
      total-allocated: u0,
      status: "open",
      member-count: u0,
      max-members: max-members
    })

    ;; Increment pool ID counter
    (var-set pool-id-counter new-id)

    ;; Creator automatically joins as first member with committed amount = 0
    (map-set pool-members { pool-id: new-id, member: tx-sender } {
      committed-amount: u0,
      contributed-amount: u0,
      joined-at: block-height,
      is-active: true
    })
    (map-set pools new-id (merge (unwrap! (map-get? pools new-id) ERR-POOL-NOT-FOUND) {
      member-count: u1
    }))

    (print { event: "pool-created", pool-id: new-id, creator: tx-sender, name: name, target: target-amount })
    (ok new-id)
  )
)

;; ========== CORE PUBLIC: JOIN POOL ==========

(define-public (join-pool (pool-id uint) (amount uint))
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR-POOL-NOT-FOUND))
      (caller-reputation (unwrap! (contract-call? .reputation get-reputation-score tx-sender)
                                  ERR-REPUTATION-TOO-LOW))
    )
    ;; Pool must be open
    (asserts! (is-pool-open pool) ERR-POOL-CLOSED)

    ;; Amount must meet minimum contribution
    (asserts! (>= amount (get min-contribution pool)) ERR-MIN-CONTRIBUTION)

    ;; Caller must be verified
    (asserts! (unwrap! (contract-call? .project-verification-module is-creator-currently-verified tx-sender)
                       ERR-NOT-VERIFIED)
              ERR-NOT-VERIFIED)

    ;; Caller must meet minimum reputation requirement
    (asserts! (>= caller-reputation (get min-reputation pool)) ERR-REPUTATION-TOO-LOW)

    ;; Must not already be a member
    (asserts! (not (is-member-active pool-id tx-sender)) ERR-ALREADY-MEMBER)

    ;; Pool must not be full
    (asserts! (< (get member-count pool) (get max-members pool)) ERR-POOL-FULL)

    ;; Add member
    (map-set pool-members { pool-id: pool-id, member: tx-sender } {
      committed-amount: amount,
      contributed-amount: u0,
      joined-at: block-height,
      is-active: true
    })

    ;; Update pool member count and total committed
    (map-set pools pool-id (merge pool {
      member-count: (+ (get member-count pool) u1),
      total-committed: (+ (get total-committed pool) amount)
    }))

    (print { event: "pool-joined", pool-id: pool-id, member: tx-sender, amount: amount })
    (ok true)
  )
)

;; ========== CORE PUBLIC: CONTRIBUTE ==========

(define-public (contribute (pool-id uint) (amount uint))
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR-POOL-NOT-FOUND))
      (member (unwrap! (map-get? pool-members { pool-id: pool-id, member: tx-sender }) ERR-NOT-MEMBER))
      (remaining-commitment (- (get committed-amount member) (get contributed-amount member)))
    )
    ;; Pool must be open
    (asserts! (is-pool-open pool) ERR-POOL-CLOSED)

    ;; Member must be active
    (asserts! (get is-active member) ERR-NOT-MEMBER)

    ;; Amount must be positive
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)

    ;; Amount must not exceed remaining commitment
    (asserts! (<= amount remaining-commitment) ERR-INSUFFICIENT-FUNDS)

    ;; Transfer STX from member to this contract
    (unwrap! (stx-transfer? amount tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)

    ;; Update member's contributed amount
    (map-set pool-members { pool-id: pool-id, member: tx-sender }
      (merge member { contributed-amount: (+ (get contributed-amount member) amount) }))

    ;; Update pool total-contributed and auto-close if target met
    (let
      (
        (new-total-contributed (+ (get total-contributed pool) amount))
        (new-status (if (>= new-total-contributed (get target-amount pool)) "closed" (get status pool)))
      )
      (map-set pools pool-id (merge pool {
        total-contributed: new-total-contributed,
        status: new-status
      }))
    )

    (print { event: "contributed", pool-id: pool-id, member: tx-sender, amount: amount })
    (ok true)
  )
)

;; ========== CORE PUBLIC: PROPOSE ALLOCATION ==========

(define-public (propose-allocation (pool-id uint) (campaign-id uint) (amount uint))
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR-POOL-NOT-FOUND))
      (current-proposal-id (var-get proposal-id-counter))
      (new-proposal-id (+ current-proposal-id u1))
      (member (unwrap! (map-get? pool-members { pool-id: pool-id, member: tx-sender }) ERR-NOT-MEMBER))
      (unallocated (get-unallocated-capital pool))
    )
    ;; Member must be active
    (asserts! (get is-active member) ERR-NOT-MEMBER)

    ;; Pool must be open or closed (not fully allocated)
    (asserts! (or (is-pool-open pool) (is-pool-closed pool)) ERR-POOL-CLOSED)

    ;; Amount must be positive
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)

    ;; Amount must not exceed unallocated capital
    (asserts! (<= amount (get-unallocated-capital pool)) ERR-INSUFFICIENT-UNALLOCATED)

    ;; Campaign must exist and be active in milestone-escrow
    (let
      (
        (campaign-opt (unwrap! (contract-call? .milestone-escrow get-campaign campaign-id)
                               ERR-CAMPAIGN-NOT-FOUND))
      )
      (asserts! (is-some campaign-opt) ERR-CAMPAIGN-NOT-FOUND)
    )

    ;; Create proposal
    (map-set proposals new-proposal-id {
      pool-id: pool-id,
      campaign-id: campaign-id,
      amount: amount,
      proposer: tx-sender,
      status: "active",
      votes-for: u0,
      votes-against: u0,
      created-at: block-height,
      deadline: (+ block-height PROPOSAL-DURATION),
      total-voting-power: (get total-committed pool)
    })

    ;; Increment proposal ID counter
    (var-set proposal-id-counter new-proposal-id)

    (print { event: "proposal-created", proposal-id: new-proposal-id, pool-id: pool-id, campaign-id: campaign-id, amount: amount })
    (ok new-proposal-id)
  )
)

;; ========== CORE PUBLIC: VOTE ==========

(define-public (vote (proposal-id uint) (approve bool))
  (let
    (
      (proposal (unwrap! (map-get? proposals proposal-id) ERR-PROPOSAL-NOT-FOUND))
      (pool (unwrap! (map-get? pools (get pool-id proposal)) ERR-POOL-NOT-FOUND))
      (member (unwrap! (map-get? pool-members { pool-id: (get pool-id proposal), member: tx-sender }) ERR-NOT-MEMBER))
      (voting-power (get committed-amount member))
      (new-votes-for (if approve (+ (get votes-for proposal) voting-power) (get votes-for proposal)))
      (new-votes-against (if approve (get votes-against proposal) (+ (get votes-against proposal) voting-power)))
      (quorum (/ (* voting-power u100) (get total-voting-power proposal)))
    )
    ;; Proposal must be active
    (asserts! (is-eq (get status proposal) "active") ERR-PROPOSAL-ACTIVE)

    ;; Deadline must not have passed
    (asserts! (<= block-height (get deadline proposal)) ERR-PROPOSAL-EXPIRED)

    ;; Member must be active in the pool
    (asserts! (get is-active member) ERR-NOT-MEMBER)

    ;; Must not have already voted
    (asserts! (is-none (map-get? proposal-votes { proposal-id: proposal-id, voter: tx-sender }))
              ERR-ALREADY-VOTED)

    ;; Voting power must be non-zero
    (asserts! (> voting-power u0) ERR-ZERO-VOTING-POWER)

    ;; Record the vote
    (map-set proposal-votes { proposal-id: proposal-id, voter: tx-sender } {
      approve: approve,
      voting-power: voting-power,
      voted-at: block-height
    })

    ;; Update proposal tallies and check auto-resolution
    (let
      (
        (total-votes (+ new-votes-for new-votes-against))
        (new-status (if (and (> new-votes-for (/ (* (get total-voting-power proposal) QUORUM-PERCENT) u100))
                             (> new-votes-for new-votes-against))
                        "passed"
                        "active"))
      )
      (map-set proposals proposal-id (merge proposal {
        votes-for: new-votes-for,
        votes-against: new-votes-against,
        status: new-status
      }))
    )

    (print { event: "vote-cast", proposal-id: proposal-id, voter: tx-sender, approve: approve, voting-power: voting-power })
    (ok true)
  )
)

;; ========== CORE PUBLIC: EXECUTE ALLOCATION ==========

(define-public (execute-allocation (proposal-id uint))
  (let
    (
      (proposal (unwrap! (map-get? proposals proposal-id) ERR-PROPOSAL-NOT-FOUND))
      (pool (unwrap! (map-get? pools (get pool-id proposal)) ERR-POOL-NOT-FOUND))
    )
      ;; Proposal must have passed
      (asserts! (is-eq (get status proposal) "passed") ERR-CANNOT-EXECUTE)

      ;; Amount must not exceed available unallocated capital
      (asserts! (<= (get amount proposal) (get-unallocated-capital pool)) ERR-INSUFFICIENT-UNALLOCATED)

      ;; Execute deposit to milestone-escrow
      ;; Uses as-contract so tx-sender = funding-pool contract principal,
      ;; and milestone-escrow transfers STX from this contract's balance.
      (try! (as-contract (contract-call? .milestone-escrow deposit (get campaign-id proposal) (get amount proposal))))

      ;; Mark proposal as executed
      (map-set proposals proposal-id (merge proposal { status: "executed" }))

      ;; Update pool allocated amount
      (map-set pools (get pool-id proposal) (merge pool {
        total-allocated: (+ (get total-allocated pool) (get amount proposal))
      }))

      (print { event: "allocation-executed", proposal-id: proposal-id, pool-id: (get pool-id proposal),
               campaign-id: (get campaign-id proposal), amount: (get amount proposal) })
      (ok true)
  )
)

;; ========== PUBLIC: POOL MANAGEMENT ==========

;; Close an expired pool. Any member can call this after MAX-POOL-DURATION blocks.
(define-public (close-pool (pool-id uint))
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR-POOL-NOT-FOUND))
    )
    ;; Pool must be open
    (asserts! (is-pool-open pool) ERR-ALREADY-CLOSED)

    ;; Pool must have exceeded its duration
    (asserts! (>= block-height (+ (get created-at pool) (get duration pool))) ERR-POOL-NOT-EXPIRED)

    ;; Close the pool
    (map-set pools pool-id (merge pool { status: "closed" }))

    (print { event: "pool-closed", pool-id: pool-id })
    (ok true)
  )
)

;; Withdraw contributed-but-unallocated STX from a closed pool.
(define-public (withdraw-unused (pool-id uint) (amount uint))
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR-POOL-NOT-FOUND))
      (member (unwrap! (map-get? pool-members { pool-id: pool-id, member: tx-sender }) ERR-NOT-MEMBER))
      (member-contributed (get contributed-amount member))
      (pool-allocated (get total-allocated pool))
      (pool-committed (get total-committed pool))
    )
      ;; Pool must be closed
      (asserts! (is-pool-closed pool) ERR-POOL-CLOSED)

      ;; Member must be active
      (asserts! (get is-active member) ERR-NOT-MEMBER)

      ;; Amount must be positive
      (asserts! (> amount u0) ERR-INVALID-AMOUNT)

      ;; Amount must not exceed member's contributed but unallocated portion
      ;; Each member's allocated share is proportional to their contribution
      ;; For simplicity: if pool has unallocated capital, members can withdraw
      ;; up to their contributed amount (but not more than unallocated)
      (asserts! (<= amount member-contributed) ERR-INSUFFICIENT-FUNDS)

      ;; Contract must have sufficient balance
      (asserts! (>= (stx-balance-of-self) amount) ERR-INSUFFICIENT-FUNDS)

      ;; Transfer STX from contract to member
      (unwrap! (as-contract (stx-transfer? amount tx-sender tx-sender)) ERR-TRANSFER-FAILED)

      ;; Update member's contributed amount
      (map-set pool-members { pool-id: pool-id, member: tx-sender }
        (merge member { contributed-amount: (- member-contributed amount) }))

      ;; Update pool totals
      (map-set pools pool-id (merge pool {
        total-committed: (- pool-committed amount),
        total-contributed: (- (get total-contributed pool) amount),
        total-allocated: (if (>= pool-allocated amount) (- pool-allocated amount) u0)
      }))

      (print { event: "withdraw-unused", pool-id: pool-id, member: tx-sender, amount: amount })
      (ok true)
  )
)

;; ========== ADMIN FUNCTIONS ==========

(define-public (set-contract-addresses
    (verification principal)
    (reputation principal)
    (escrow principal))
  (begin
    (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-AUTHORIZED)
    (var-set verification-contract verification)
    (var-set reputation-contract reputation)
    (var-set escrow-contract escrow)
    (print { event: "contract-addresses-updated", verification: verification, reputation: reputation, escrow: escrow })
    (ok true)
  )
)

;; ========== EMERGENCY MODULE TRAIT ==========

(define-public (set-pause-state (pause bool))
  (begin
    (asserts! (is-eq contract-caller (var-get emergency-admin)) ERR-NOT-AUTHORIZED)
    (var-set emergency-pause pause)
    (print { event: "pause-state-set", paused: pause })
    (ok true)
  )
)

(define-read-only (is-system-paused)
  (ok (var-get emergency-pause))
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
    (asserts! (<= amount contract-balance) ERR-INSUFFICIENT-FUNDS)
    (asserts! (and (not (is-eq recipient BURN-ADDRESS))
                   (not (is-eq recipient CONTRACT-OWNER))
                   (not (is-eq recipient (as-contract tx-sender))))
              ERR-INVALID-AMOUNT)

    (map-set emergency-ops-log { ops-count-id: next-ops-count } {
      emergency-ops-type: "emergency withdraw funding-pool",
      recipient: recipient,
      admin: contract-caller,
      block-height: block-height,
      reason: "emergency funds recovery"
    })

    (var-set emergency-ops-counter next-ops-count)
    (unwrap! (stx-transfer? amount (as-contract tx-sender) recipient) ERR-TRANSFER-FAILED)
    (print { event: "emergency-withdraw", recipient: recipient, amount: amount })
    (ok true)
  )
)

(define-read-only (get-emergency-ops-count)
  (ok (var-get emergency-ops-counter))
)

;; Emergency close pool - bypasses timelock for urgent situations
(define-public (emergency-close-pool (pool-id uint))
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR-POOL-NOT-FOUND))
    )
    (asserts! (is-eq contract-caller (var-get emergency-admin)) ERR-NOT-AUTHORIZED)
    (asserts! (is-pool-open pool) ERR-ALREADY-CLOSED)

    (map-set pools pool-id (merge pool { status: "closed" }))
    (print { event: "emergency-pool-closed", pool-id: pool-id })
    (ok true)
  )
)

;; Emergency refund a specific member - bypasses timelock
(define-public (emergency-refund-member (pool-id uint) (member principal))
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR-POOL-NOT-FOUND))
      (member-data (unwrap! (map-get? pool-members { pool-id: pool-id, member: member }) ERR-NOT-MEMBER))
      (refund-amount (get contributed-amount member-data))
    )
    (asserts! (is-eq contract-caller (var-get emergency-admin)) ERR-NOT-AUTHORIZED)
    (asserts! (> refund-amount u0) ERR-INVALID-AMOUNT)

    ;; Deactivate member
    (map-set pool-members { pool-id: pool-id, member: member }
      (merge member-data { is-active: false, contributed-amount: u0 }))

    ;; Refund STX
    (unwrap! (as-contract (stx-transfer? refund-amount tx-sender member)) ERR-TRANSFER-FAILED)

    (print { event: "emergency-refund", pool-id: pool-id, member: member, amount: refund-amount })
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
  (ok "funding-pool")
)

;; ========== READ-ONLY FUNCTIONS ==========

(define-read-only (get-pool (pool-id uint))
  (ok (map-get? pools pool-id))
)

(define-read-only (get-pool-members (pool-id uint) (offset uint) (limit uint))
  (ok (list))
)

(define-read-only (get-proposal (proposal-id uint))
  (ok (map-get? proposals proposal-id))
)

(define-read-only (get-proposal-vote (proposal-id uint) (voter principal))
  (ok (map-get? proposal-votes { proposal-id: proposal-id, voter: voter }))
)

(define-read-only (get-member (pool-id uint) (member principal))
  (ok (map-get? pool-members { pool-id: pool-id, member: member }))
)

(define-read-only (get-admin-contract)
  (ok (var-get admin-contract))
)

(define-read-only (get-emergency-admin)
  (ok (var-get emergency-admin))
)

(define-read-only (get-verification-contract)
  (ok (var-get verification-contract))
)

(define-read-only (get-reputation-contract)
  (ok (var-get reputation-contract))
)

(define-read-only (get-escrow-contract)
  (ok (var-get escrow-contract))
)

(define-read-only (get-pool-counter)
  (ok (var-get pool-id-counter))
)

(define-read-only (get-proposal-counter)
  (ok (var-get proposal-id-counter))
)
