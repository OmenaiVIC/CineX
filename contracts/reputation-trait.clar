;; title: reputation-trait
;; version: 1.0.0
;; Trait defining the peer-to-peer reputation interface for CineX protocol

;; ========== Summary ==========
;; Standard interface for the CineX reputation system.
;; Enables verified users to rate each other on a 1-5 scale
;; after campaign interactions. Provides aggregate scores
;; used by funding-pool for minimum-reputation gates.
;; =============================

(define-trait reputation-trait
    (
        ;; Rate a user after a campaign interaction.
        ;; rating: 1-5 scale
        ;; comment-hash: optional 32-byte hash of off-chain comment
        ;; Returns: new total-ratings count for the target
        (rate-user (principal principal uint uint (optional (buff 32))) (response uint uint))

        ;; Get a user's aggregate reputation score as a percentage (0-100).
        ;; Score = (total-score * 100) / (total-ratings * 5)
        (get-reputation-score (principal) (response uint uint))

        ;; Get recent ratings for a user (paginated).
        ;; Returns: list of rating tuples up to the requested limit
        (get-ratings-for-user (principal uint uint) (response (list 20 {
            rater: principal,
            rating: uint,
            comment-hash: (optional (buff 32)),
            timestamp: uint
        }) uint))
    )
)
