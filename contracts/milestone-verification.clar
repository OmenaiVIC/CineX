;; title: milestone-verification
;; version: 1.0.0
;; summary: Backer-weighted milestone endorsement and creator bonus eligibility
;; Each backer's vote weight = their campaign contribution amount
;; Endorsement passes when YES weight > 50% of total campaign contributions

(impl-trait .emergency-module-trait.emergency-module-trait)
(impl-trait .module-base-trait.module-base-trait)

;; ========== ERROR CONSTANTS (u5600-u5620) ==========
(define-constant ERR-NOT-AUTHORIZED (err u5600))
(define-constant ERR-NOT-INITIALIZED (err u5601))
(define-constant ERR-ALREADY-INITIALIZED (err u5602))
(define-constant ERR-CAMPAIGN-NOT-FOUND (err u5603))
(define-constant ERR-MILESTONE-NOT-FOUND (err u5604))
(define-constant ERR-ALREADY-ENDORSED (err u5605))
(define-constant ERR-DEADLINE-IN-PAST (err u5606))
(define-constant ERR-NOT-CREATOR (err u5607))
(define-constant ERR-NOT-BACKER (err u5608))
(define-constant ERR-NO-SUBMISSION (err u5609))
(define-constant ERR-ALREADY-FINALIZED (err u5610))
(define-constant ERR-SUBMISSION-BUFFER (err u5611))
(define-constant ERR-SYSTEM-PAUSED (err u5612))
(define-constant ERR-SYSTEM-NOT-PAUSED (err u5613))
(define-constant ERR-BONUS-ALREADY-FORFEITED (err u5614))
(define-constant ERR-NO-PENDING-SUBMISSION (err u5615))
(define-constant ERR-DEADLINE-NOT-PASSED (err u5616))
(define-constant ERR-CAMPAIGN-ALREADY-SETUP (err u5617))
(define-constant ERR-EMPTY-MILESTONES (err u5618))

;; ========== CONSTANTS ==========
(define-constant CONTRACT-OWNER tx-sender)
(define-constant BURN-ADDRESS 'SP000000000000000000002Q6VF78)
;; ~5 days at ~5s blocks = 86400 blocks
(define-constant RESUBMISSION-BUFFER u86400)
;; 3 missed milestones triggers forfeiture
(define-constant MAX-MISSED u3)
;; >50% threshold in basis points
(define-constant ENDORSEMENT-BPS u5000)

;; ========== DATA VARIABLES ==========
(define-data-var admin-contract principal BURN-ADDRESS)
(define-data-var emergency-admin principal BURN-ADDRESS)
(define-data-var yield-escrow-contract principal BURN-ADDRESS)
(define-data-var milestone-escrow-contract principal BURN-ADDRESS)
(define-data-var initialized bool false)
(define-data-var emergency-pause bool false)
(define-data-var emergency-ops-counter uint u0)
(define-data-var module-version uint u1)
(define-data-var module-active bool true)

;; ========== DATA MAPS ==========

;; Per-campaign milestone aggregate state
(define-map campaign-milestone-state uint {
  total-milestones: uint,
  approved-milestones: uint,
  missed-milestones: uint,
  bonus-forfeited: bool,
  forfeited-at: uint,
  creator: principal
})

;; Individual milestone record
(define-map milestones { campaign-id: uint, milestone-index: uint } {
  deadline: uint,
  first-submission: uint,
  last-submission: uint,
  resubmission-count: uint,
  yes-weight: uint,
  no-weight: uint,
  is-endorsed: bool,
  is-finalized: bool
})

;; Per-backer endorsement per milestone
(define-map endorsements { campaign-id: uint, milestone-index: uint, backer: principal } {
  vote: bool,
  weight: uint,
  endorsed-at: uint
})

;; ========== PRIVATE HELPERS ==========

(define-private (check-not-paused)
  (begin
    (asserts! (not (var-get emergency-pause)) ERR-SYSTEM-PAUSED)
    (ok true)
  )
)

;; Fold helper: insert one milestone, return incremented idx tuple
(define-private (insert-milestone (deadline uint) (acc { cid: uint, idx: uint }))
  (begin
    (map-set milestones { campaign-id: (get cid acc), milestone-index: (get idx acc) } {
      deadline: deadline,
      first-submission: u0,
      last-submission: u0,
      resubmission-count: u0,
      yes-weight: u0,
      no-weight: u0,
      is-endorsed: false,
      is-finalized: false
    })
    { cid: (get cid acc), idx: (+ (get idx acc) u1) }
  )
)

;; ========== PUBLIC FUNCTIONS ==========

(define-public (initialize (admin principal) (emergency principal) (yield-escrow principal) (escrow principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
    (var-set initialized true)
    (var-set admin-contract admin)
    (var-set emergency-admin emergency)
    (var-set yield-escrow-contract yield-escrow)
    (var-set milestone-escrow-contract escrow)
    (print { event: "milestone-verification-initialized" })
    (ok true)
  )
)

;; Admin: update milestone-escrow contract reference
(define-public (set-milestone-escrow (escrow principal))
  (begin
    (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-AUTHORIZED)
    (var-set milestone-escrow-contract escrow)
    (print { event: "milestone-escrow-set", escrow: escrow })
    (ok true)
  )
)

;; Creator: set up milestone deadlines for their campaign
;; Validates caller is the campaign creator via milestone-escrow::get-campaign
;; Admin does NOT create milestones - creators know their own milestones
(define-public (create-milestones (campaign-id uint) (deadlines (list 10 uint)))
  (let
    (
      (existing (map-get? campaign-milestone-state campaign-id))
      (campaign-opt (unwrap! (contract-call? .milestone-escrow get-campaign campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (campaign (unwrap! campaign-opt ERR-CAMPAIGN-NOT-FOUND))
    )
    (try! (check-not-paused))
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (is-eq tx-sender (get creator campaign)) ERR-NOT-CREATOR)
    (asserts! (is-none existing) ERR-CAMPAIGN-ALREADY-SETUP)
    (asserts! (> (len deadlines) u0) ERR-EMPTY-MILESTONES)

    ;; Store campaign aggregate state
    (map-set campaign-milestone-state campaign-id {
      total-milestones: (len deadlines),
      approved-milestones: u0,
      missed-milestones: u0,
      bonus-forfeited: false,
      forfeited-at: u0,
      creator: (get creator campaign)
    })

    ;; Insert each milestone using fold with campaign-id accumulator
    (fold insert-milestone deadlines { cid: campaign-id, idx: u0 })

    (print { event: "milestones-created", campaign-id: campaign-id, count: (len deadlines) })
    (ok true)
  )
)

;; Creator: submit milestone work for endorsement
(define-public (submit-milestone (campaign-id uint) (milestone-index uint))
  (let
    (
      (state (unwrap! (map-get? campaign-milestone-state campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (ms (unwrap! (map-get? milestones { campaign-id: campaign-id, milestone-index: milestone-index }) ERR-MILESTONE-NOT-FOUND))
    )
    (try! (check-not-paused))
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (is-eq tx-sender (get creator state)) ERR-NOT-CREATOR)
    (asserts! (not (get bonus-forfeited state)) ERR-BONUS-ALREADY-FORFEITED)
    (asserts! (not (get is-finalized ms)) ERR-ALREADY-FINALIZED)
    (asserts! (<= block-height (get deadline ms)) ERR-DEADLINE-IN-PAST)

    ;; Enforce resubmission buffer
    (asserts! (or (is-eq (get last-submission ms) u0)
                  (>= block-height (+ (get last-submission ms) RESUBMISSION-BUFFER)))
              ERR-SUBMISSION-BUFFER)

    (map-set milestones { campaign-id: campaign-id, milestone-index: milestone-index }
      (merge ms {
        first-submission: (if (is-eq (get first-submission ms) u0) block-height (get first-submission ms)),
        last-submission: block-height,
        resubmission-count: (+ (get resubmission-count ms) u1)
      })
    )

    (print { event: "milestone-submitted", campaign-id: campaign-id, milestone-index: milestone-index })
    (ok true)
  )
)

;; Backer: endorse (true) or reject (false) a milestone submission
;; Vote weight = backer's total campaign contribution (from crowdfunding-module)
(define-public (endorse-milestone (campaign-id uint) (milestone-index uint) (vote bool))
  (let
    (
      (state (unwrap! (map-get? campaign-milestone-state campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (ms (unwrap! (map-get? milestones { campaign-id: campaign-id, milestone-index: milestone-index }) ERR-MILESTONE-NOT-FOUND))
      (existing-endorsement (map-get? endorsements { campaign-id: campaign-id, milestone-index: milestone-index, backer: tx-sender }))
      (contrib (unwrap! (contract-call? .campaign-module get-campaign-contributions campaign-id tx-sender) ERR-NOT-BACKER))
      (weight (get total-contributed contrib))
    )
    (try! (check-not-paused))
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (is-none existing-endorsement) ERR-ALREADY-ENDORSED)
    (asserts! (> weight u0) ERR-NOT-BACKER)
    (asserts! (not (get is-finalized ms)) ERR-ALREADY-FINALIZED)
    (asserts! (> (get last-submission ms) u0) ERR-NO-PENDING-SUBMISSION)
    (asserts! (not (is-eq tx-sender (get creator state))) ERR-NOT-BACKER)

    (map-set endorsements { campaign-id: campaign-id, milestone-index: milestone-index, backer: tx-sender } {
      vote: vote,
      weight: weight,
      endorsed-at: block-height
    })

    (map-set milestones { campaign-id: campaign-id, milestone-index: milestone-index }
      (merge ms {
        yes-weight: (if vote (+ (get yes-weight ms) weight) (get yes-weight ms)),
        no-weight: (if vote (get no-weight ms) (+ (get no-weight ms) weight))
      })
    )

    (print { event: "milestone-endorsed", campaign-id: campaign-id, milestone-index: milestone-index,
             vote: vote, weight: weight })
    (ok true)
  )
)

;; Anyone: finalize a milestone after submission + deadline passed
;; Checks >50% weighted YES threshold
(define-public (finalize-milestone (campaign-id uint) (milestone-index uint))
  (let
    (
      (state (unwrap! (map-get? campaign-milestone-state campaign-id) ERR-CAMPAIGN-NOT-FOUND))
      (ms (unwrap! (map-get? milestones { campaign-id: campaign-id, milestone-index: milestone-index }) ERR-MILESTONE-NOT-FOUND))
      (total-raised (unwrap! (contract-call? .campaign-module get-total-raised-funds campaign-id) ERR-CAMPAIGN-NOT-FOUND))
    )
    (try! (check-not-paused))
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (not (get is-finalized ms)) ERR-ALREADY-FINALIZED)
    (asserts! (> (get last-submission ms) u0) ERR-NO-PENDING-SUBMISSION)
    (asserts! (> block-height (get deadline ms)) ERR-DEADLINE-NOT-PASSED)

    (let
      (
        (yes (get yes-weight ms))
        ;; >50%: yes * 10000 > total_raised * 5000
        (endorsed (> (* yes u10000) (* total-raised ENDORSEMENT-BPS)))
      )
      (map-set milestones { campaign-id: campaign-id, milestone-index: milestone-index }
        (merge ms { is-endorsed: endorsed, is-finalized: true })
      )

      (map-set campaign-milestone-state campaign-id (merge state {
        approved-milestones: (if endorsed (+ (get approved-milestones state) u1) (get approved-milestones state)),
        missed-milestones: (if endorsed (get missed-milestones state) (+ (get missed-milestones state) u1))
      }))

      ;; Check forfeiture: if missed >= MAX_MISSED and not already forfeited
      (let
        (
          (updated (unwrap! (map-get? campaign-milestone-state campaign-id) ERR-CAMPAIGN-NOT-FOUND))
        )
        (if (and (>= (get missed-milestones updated) MAX-MISSED) (not (get bonus-forfeited updated)))
          (map-set campaign-milestone-state campaign-id (merge updated {
            bonus-forfeited: true,
            forfeited-at: block-height
          }))
          false
        )
      )

      (print { event: "milestone-finalized", campaign-id: campaign-id, milestone-index: milestone-index,
               endorsed: endorsed })
      (ok true)
    )
  )
)

;; ========== READ-ONLY FUNCTIONS ==========

;; Called by yield-escrow to check creator bonus eligibility
(define-read-only (is-bonus-forfeited (campaign-id uint))
  (match (map-get? campaign-milestone-state campaign-id)
    state (ok (get bonus-forfeited state))
    (ok false)
  )
)

(define-read-only (get-creator-standing (campaign-id uint))
  (match (map-get? campaign-milestone-state campaign-id)
    state (ok {
      total-milestones: (get total-milestones state),
      approved-milestones: (get approved-milestones state),
      missed-milestones: (get missed-milestones state),
      bonus-forfeited: (get bonus-forfeited state),
      creator: (get creator state)
    })
    ERR-CAMPAIGN-NOT-FOUND
  )
)

(define-read-only (get-milestone (campaign-id uint) (milestone-index uint))
  (ok (map-get? milestones { campaign-id: campaign-id, milestone-index: milestone-index }))
)

(define-read-only (get-endorsement (campaign-id uint) (milestone-index uint) (backer principal))
  (ok (map-get? endorsements { campaign-id: campaign-id, milestone-index: milestone-index, backer: backer }))
)

;; Bonus retention rate as percentage (0-100)
(define-read-only (get-bonus-retention-rate (campaign-id uint))
  (match (map-get? campaign-milestone-state campaign-id)
    state (if (> (get total-milestones state) u0)
      (ok (/ (* (get approved-milestones state) u100) (get total-milestones state)))
      (ok u100))
    (ok u100)
  )
)

;; ========== MODULE BASE TRAIT ==========
(define-read-only (get-module-version)
  (ok (var-get module-version))
)

(define-read-only (is-module-active)
  (ok (var-get module-active))
)

(define-read-only (get-module-name)
  (ok "milestone-verification")
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
      (balance (stx-get-balance (as-contract tx-sender)))
      (current-ops (var-get emergency-ops-counter))
      (next-ops (+ current-ops u1))
    )
    (asserts! (is-eq contract-caller (var-get emergency-admin)) ERR-NOT-AUTHORIZED)
    (asserts! (var-get emergency-pause) ERR-SYSTEM-NOT-PAUSED)
    (asserts! (> amount u0) ERR-NOT-AUTHORIZED)
    (asserts! (<= amount balance) ERR-NOT-AUTHORIZED)

    (map-set emergency-ops-log { ops-count-id: next-ops } {
      emergency-ops-type: "emergency withdraw milestone-verification",
      recipient: recipient,
      admin: contract-caller,
      block-height: block-height,
      reason: "emergency funds recovery"
    })

    (var-set emergency-ops-counter next-ops)
    (unwrap! (stx-transfer? amount (as-contract tx-sender) recipient) ERR-NOT-AUTHORIZED)
    (ok true)
  )
)

(define-map emergency-ops-log { ops-count-id: uint } {
  emergency-ops-type: (string-ascii 150),
  recipient: principal,
  admin: principal,
  block-height: uint,
  reason: (string-ascii 100)
})
