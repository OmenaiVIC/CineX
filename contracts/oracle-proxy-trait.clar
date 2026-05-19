;; title: oracle-proxy-trait
;; version: 1.0.0
;; Trait defining the STX price oracle interface for CineX protocol

;; ========== Summary ==========
;; Standard interface for the CineX STX price oracle.
;; Returns the current STX price in cents (100 = $1.00).
;; Used by milestone-escrow to compute USD-pegged verification fees.
;; =============================

(define-trait oracle-proxy-trait
    (
        ;; Get the current STX price in cents.
        ;; Returns: price as uint (100 = $1.00)
        (get-stx-price () (response uint uint))

        ;; Get the STX price with staleness check.
        ;; Returns error if the price hasn't been updated in > 144 blocks.
        (get-stx-price-with-fallback () (response uint uint))
    )
)
