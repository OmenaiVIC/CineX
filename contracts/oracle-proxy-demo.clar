;; title: oracle-proxy-demo
;; version: 1.0.0
;; STX/USD price oracle for CineX protocol -- DEMO/TEST VARIANT
;;
;; IMPORTANT: This is the DEMO variant. DEMO_MODE is true.
;; See oracle-proxy.clar for the production variant (DEMO_MODE = false).
;;
;; DEMO_MODE safety model:
;;   1. DEMO_MODE is a compile-time constant, baked into bytecode.
;;   2. get-stx-price always returns u0, price fetch is a no-op.
;;   3. No runtime toggle exists, no function can flip DEMO_MODE.
;;   4. Deployment scripts pick this file for devnet/testnet only.
;;   5. Frontend detects demo via (get-demo-mode) read-only.
;;
;; Fee bypass chain:
;;   oracle-proxy-demo returns price=0
;;   project-verification-module fee calc returns u0
;;   pay-verification-fee treats 0 as no-op
;;   Basic Verified auto-granted

(impl-trait .oracle-proxy-trait.oracle-proxy-trait)

;; Compile-time demo mode guard. When true, get-stx-price returns u0.
(define-constant DEMO_MODE true)

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
;; NOTE: In DEMO_MODE, get-stx-price ignores this value and returns u0.
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
;; NOTE: In DEMO_MODE, get-stx-price ignores this value and returns u0.
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
;; DEMO_MODE: Always returns u0, stored price is ignored.
(define-read-only (get-stx-price)
    (ok u0)
)

;; Get the STX price with staleness check.
;; DEMO_MODE: Always returns u0, staleness check is bypassed.
(define-read-only (get-stx-price-with-fallback)
    (ok u0)
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

;; Frontend demo mode detection. Returns true in this variant.
(define-read-only (get-demo-mode)
    (ok DEMO_MODE)
)
