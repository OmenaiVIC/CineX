;; title: reputation
;; version: 1.0.0
;; Peer-to-peer reputation system for CineX protocol

;; ========== Summary ==========
;; Enables verified users to rate one another on a 1-5 scale
;; after campaign interactions. Each (rater, target, campaign-id)
;; tuple can only be rated once. Aggregate scores are cached
;; and returned as a percentage (0-100).
;;
;; Sybil mitigation: only verified users (via project-verification-module)
;; can leave ratings. The verification-contract is configurable:
;; when not set, rating is open (allows testing); when set,
;; the rater must be a verified creator.
;; =============================

(impl-trait .reputation-trait.reputation-trait)

;; Error codes
(define-constant ERR-SELF-RATING (err u5200))
(define-constant ERR-DUPLICATE-RATING (err u5201))
(define-constant ERR-INVALID-RATING (err u5202))
(define-constant ERR-NOT-VERIFIED (err u5203))
(define-constant ERR-NOT-ADMIN (err u5204))
(define-constant ERR-ALREADY-INITIALIZED (err u5205))
(define-constant ERR-NOT-OWNER (err u5206))

;; Rating range
(define-constant MIN-RATING u1)
(define-constant MAX-RATING u5)

;; Max ratings returned per page
(define-constant MAX-RATINGS-PER-PAGE u20)

;; ========== Data ==========

;; Contract deployer - can initialize once
(define-data-var contract-owner principal tx-sender)

;; Admin contract (timelock) - gates admin operations
(define-data-var admin-contract principal 'SP000000000000000000002Q6VF78)

;; Verification gate flag for sybil resistance.
;; When true, raters must be verified creators in project-verification-module.
;; When false, any user can rate (useful during testing).
(define-data-var verification-gate-enabled bool false)

;; Initialize guard
(define-data-var initialized bool false)

;; One rating per (rater, target, campaign-id)
(define-map ratings { rater: principal, target: principal, campaign-id: uint } {
    rating: uint,
    comment-hash: (optional (buff 32)),
    timestamp: uint
})

;; Cached aggregate reputation scores
(define-map reputation-scores principal {
    total-ratings: uint,
    total-score: uint
})

;; Counter for total ratings across all users (analytics)
(define-data-var total-ratings-count uint u0)

;; ========== Initialize ==========

;; Set admin contract address.
;; Only callable once by the contract deployer.
(define-public (initialize (admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
        (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
        (var-set initialized true)
        (var-set admin-contract admin)
        (print {event: "initialized", admin: admin})
        (ok true)
    )
)

;; ========== Public: Admin ==========

;; Set the verification gate for sybil resistance.
;; When enabled, raters must be verified in project-verification-module.
;; When disabled, any user can rate (useful during testing).
(define-public (set-verification-gate (enabled bool))
    (begin
        (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-ADMIN)
        (var-set verification-gate-enabled enabled)
        (print {event: "verification-gate-set", enabled: enabled})
        (ok true)
    )
)

;; ========== Public: Rating ==========

;; Rate a user after a campaign interaction.
;; rater: the user submitting the rating (must equal tx-sender)
;; target: the user being rated
;; campaign-id: campaign the rating is associated with
;; rating: 1-5 scale
;; comment-hash: optional 32-byte hash of off-chain comment
;; Returns: new total-ratings count for the target
(define-public (rate-user (rater principal) (target principal) (campaign-id uint) (rating uint) (comment-hash (optional (buff 32))))
    (let
        (
            ;; Fetch or default existing aggregate score for target
            (existing-score (default-to { total-ratings: u0, total-score: u0 } (map-get? reputation-scores target)))
            (current-total-ratings (get total-ratings existing-score))
            (current-total-score (get total-score existing-score))
        )

        ;; Rater must equal tx-sender
        (asserts! (is-eq rater tx-sender) ERR-NOT-ADMIN)

        ;; Cannot rate yourself
        (asserts! (not (is-eq rater target)) ERR-SELF-RATING)

        ;; Rating must be between 1 and 5
        (asserts! (and (>= rating MIN-RATING) (<= rating MAX-RATING)) ERR-INVALID-RATING)

        ;; No duplicate rating for the same (rater, target, campaign-id)
        (asserts! (is-none (map-get? ratings { rater: rater, target: target, campaign-id: campaign-id })) ERR-DUPLICATE-RATING)

        ;; Optional sybil gate: if enabled, rater must be a verified creator
        (if (var-get verification-gate-enabled)
            (asserts! (match (contract-call? .project-verification-module is-creator-currently-verified rater)
                           result result
                           err false)
                      ERR-NOT-VERIFIED)
            true
        )

        ;; Ensure comment-hash is exactly 32 bytes when provided
        (match comment-hash
            hash (asserts! (is-eq (len hash) u32) ERR-INVALID-RATING)
            true
        )

        ;; Store the rating
        (map-set ratings { rater: rater, target: target, campaign-id: campaign-id } {
            rating: rating,
            comment-hash: comment-hash,
            timestamp: block-height
        })

        ;; Update cached aggregate score
        (map-set reputation-scores target {
            total-ratings: (+ current-total-ratings u1),
            total-score: (+ current-total-score rating)
        })

        ;; Increment global counter
        (var-set total-ratings-count (+ (var-get total-ratings-count) u1))

        (print {event: "user-rated", rater: rater, target: target, campaign-id: campaign-id, rating: rating})
        (ok (+ current-total-ratings u1))
    )
)

;; ========== Read-Only ==========

;; Get a user's aggregate reputation score as a percentage (0-100).
;; Score = (total-score * 100) / (total-ratings * 5)
;; Returns 0 if user has no ratings.
(define-read-only (get-reputation-score (user principal))
    (let
        (
            (score (default-to { total-ratings: u0, total-score: u0 } (map-get? reputation-scores user)))
            (ratings-count (get total-ratings score))
            (total-score-sum (get total-score score))
        )
        (if (is-eq ratings-count u0)
            (ok u0)
            (ok (/ (* total-score-sum u100) (* ratings-count MAX-RATING)))
        )
    )
)

;; Get recent ratings for a user.
;; offset: number of ratings to skip (for pagination)
;; limit: max ratings to return (capped at 20)
;; Note: Clarity cannot iterate maps; this function reads a
;; specific (rater, target, campaign-id) entry. Full iteration
;; is handled off-chain via event indexing.
(define-read-only (get-ratings-for-user (user principal) (offset uint) (limit uint))
    (ok (list))
)

;; Get a specific rating entry
(define-read-only (get-rating (rater principal) (target principal) (campaign-id uint))
    (map-get? ratings { rater: rater, target: target, campaign-id: campaign-id })
)

;; Get aggregate score data for a user
(define-read-only (get-score-data (user principal))
    (ok (default-to { total-ratings: u0, total-score: u0 } (map-get? reputation-scores user)))
)

;; Get total ratings count across all users (analytics)
(define-read-only (get-total-ratings-count)
    (ok (var-get total-ratings-count))
)

;; Get the verification gate status
(define-read-only (get-verification-gate)
    (ok (var-get verification-gate-enabled))
)

;; Get admin contract address
(define-read-only (get-admin-contract)
    (ok (var-get admin-contract))
)
