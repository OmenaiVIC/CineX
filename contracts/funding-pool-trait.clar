;; title: funding-pool-trait
;; version: 1.0.0
;; summary: Trait for passive capital pools with weighted-voting governance
;; author: CineX Team

;; ========== Description ==========
;; Defines the funding-pool interface for CineX.
;; Verified users pool STX into shared capital pools, then vote
;; on allocating capital to milestone-escrow campaigns.
;; Each member's voting power equals their committed amount.
;; Quorum requires >50% of total voting power.
;; ================================

(define-trait funding-pool-trait
  (
    ;; Create a new capital pool
    ;; creator must be verified and meet min reputation
    ;; Returns the new pool ID
    (create-pool ((string-ascii 64) uint uint uint uint uint) (response uint uint))

    ;; Join an open pool with a commitment amount
    ;; caller must be verified and meet pool's min reputation
    (join-pool (uint uint) (response bool uint))

    ;; Contribute STX toward the caller's committed amount
    ;; Auto-closes pool when total-committed >= target-amount
    (contribute (uint uint) (response bool uint))

    ;; Propose allocating pool capital to a milestone-escrow campaign
    ;; Only pool members may propose
    ;; Amount must not exceed remaining unallocated capital
    (propose-allocation (uint uint uint) (response uint uint))

    ;; Vote on an active proposal
    ;; Voting power = member's committed-amount
    ;; Auto-resolves when quorum reached
    (vote (uint bool) (response bool uint))

    ;; Execute an approved allocation
    ;; Calls milestone-escrow::deposit to transfer capital
    (execute-allocation (uint) (response bool uint))

    ;; Get pool details by ID
    (get-pool (uint) (response (optional {
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
    }) uint))

    ;; Get paginated pool members
    (get-pool-members (uint uint uint) (response (list 20 {
      member: principal,
      committed-amount: uint,
      contributed-amount: uint,
      joined-at: uint,
      is-active: bool
    }) uint))
  )
)
