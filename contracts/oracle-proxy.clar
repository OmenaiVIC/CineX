;; title: oracle-proxy
;; version: 1.0.0
;; STX/USD price oracle for CineX protocol

;; ========== Summary ==========
;; Stores and serves a STX price in cents (100 = $1.00).
;; Price is pushed by the multi-sig (no external oracle in v1).
;;
;; Two admin paths:
;;   1. Timelock path (set-price-oracle, update-price): requires
;;      contract-caller == admin-contract (timelock.clar).
;;      The 2880-block timelock delay has elapsed before the call.
;;   2. Emergency path (emergency-set-price): requires either
;;      contract-caller == emergency-admin OR the caller is a
;;      confirmed multi-sig signer (contract-call? .cinex-multisig
;;      is-approved). Bypasses timelock.
;;
;; Staleness: if last-updated > 144 blocks (~24h), the price is
;; considered stale. get-stx-price-with-fallback returns an error.
;; =============================

(impl-trait .oracle-proxy-trait.oracle-proxy-trait)

;; Error codes
(define-constant ERR-NOT-ADMIN (err u5100))
(define-constant ERR-NOT-EMERGENCY-ADMIN (err u5101))
(define-constant ERR-STALE-PRICE (err u5102))
(define-constant ERR-INVALID-PRICE (err u5103))
(define-constant ERR-ALREADY-INITIALIZED (err u5104))
(define-constant ERR-NOT-OWNER (err u5105))

;; Stale threshold: 144 blocks (~24 hours at ~30s/block)
(define-constant STALE-THRESHOLD u144)

;; ========== Data ==========

;; Contract deployer - can initialize once
(define-data-var contract-owner principal tx-sender)

;; Admin contract (timelock) - gates non-emergency set/update via contract-caller check
(define-data-var admin-contract principal 'SP000000000000000000002Q6VF78)

;; Emergency admin (multi-sig) - gates emergency set via contract-caller check
(define-data-var emergency-admin principal 'SP000000000000000000002Q6VF78)

;; Initialize guard
(define-data-var initialized bool false)

;; Current STX price in cents (100 = $1.00)
(define-data-var price uint u0)

;; Block height of last price update
(define-data-var last-updated uint u0)

;; ========== Initialize ==========

;; Set admin addresses.
;; Only callable once by the contract deployer.
(define-public (initialize (admin principal) (emergency principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
        (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
        (var-set initialized true)
        (var-set admin-contract admin)
        (var-set emergency-admin emergency)
        (print {event: "initialized", admin: admin, emergency: emergency})
        (ok true)
    )
)

;; ========== Public: Admin (Timelock Path) ==========

;; Set the price oracle address (placeholder for future external oracle).
;; Only callable by the admin contract (timelock).
(define-public (set-price-oracle (oracle-addr principal))
    (begin
        (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-ADMIN)
        (print {event: "price-oracle-set", oracle: oracle-addr})
        (ok true)
    )
)

;; Push a new price. Only callable by the admin contract (timelock).
;; price: new price in cents (100 = $1.00). Must be > 0.
(define-public (update-price (new-price uint))
    (begin
        (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-ADMIN)
        (asserts! (> new-price u0) ERR-INVALID-PRICE)
        (var-set price new-price)
        (var-set last-updated block-height)
        (print {event: "price-updated", price: new-price, updated-at: block-height})
        (ok true)
    )
)

;; ========== Public: Emergency (Multi-Sig Path) ==========

;; Emergency price override. Bypasses timelock.
;; Accepts either emergency-admin (multi-sig contract) or
;; a confirmed multi-sig signer calling directly.
(define-public (emergency-set-price (new-price uint))
    (let
        (
            (is-ems-admin (is-eq contract-caller (var-get emergency-admin)))
            (is-ms-signer (unwrap-panic (contract-call? .cinex-multisig is-approved tx-sender)))
        )
        (asserts! (or is-ems-admin is-ms-signer) ERR-NOT-EMERGENCY-ADMIN)
        (asserts! (> new-price u0) ERR-INVALID-PRICE)
        (var-set price new-price)
        (var-set last-updated block-height)
        (print {event: "emergency-price-set", price: new-price, updated-at: block-height, set-by: tx-sender})
        (ok true)
    )
)

;; ========== Read-Only ==========

;; Get the current STX price in cents.
;; Always returns the stored price, even if stale.
(define-read-only (get-stx-price)
    (ok (var-get price))
)

;; Get the STX price with staleness check.
;; Returns ERR-STALE-PRICE if last-updated > 144 blocks ago.
(define-read-only (get-stx-price-with-fallback)
    (let ((current-price (var-get price))
          (current-last-updated (var-get last-updated)))
        (asserts! (> current-last-updated u0) ERR-STALE-PRICE)
        (asserts! (<= (- block-height current-last-updated) STALE-THRESHOLD) ERR-STALE-PRICE)
        (ok current-price)
    )
)

;; Get the last-updated block height
(define-read-only (get-last-updated)
    (ok (var-get last-updated))
)

;; Get admin contract address
(define-read-only (get-admin-contract)
    (ok (var-get admin-contract))
)

;; Get emergency admin address
(define-read-only (get-emergency-admin)
    (ok (var-get emergency-admin))
)
