;; title: asset-registry
;; version: 1.0.0
;; Asset whitelist registry for CineX protocol

;; ========== Summary ==========
;; Maintains a whitelist of supported assets that can be used
;; in milestone escrow campaigns. Only assets registered here
;; are accepted by milestone-escrow::create-campaign.
;;
;; Two admin paths:
;;   1. Timelock path (add-asset, remove-asset): requires
;;      contract-caller == admin-contract (timelock.clar).
;;      The 2880-block timelock delay has already elapsed before
;;      the call reaches here.
;;   2. Emergency path (emergency-remove-asset): requires
;;      contract-caller == emergency-admin (cinex-multisig).
;;      Immediate removal, bypasses timelock.
;;
;; Seed assets (set during initialize):
;;   - STX (sentinel principal SP000000000000000000002Q6VF78)
;;   - sBTC (contract principal passed at init)
;;   - USDCx (contract principal passed at init)
;; =============================

(impl-trait .asset-registry-trait.asset-registry-trait)

;; Error codes
(define-constant ERR-NOT-ADMIN (err u5000))
(define-constant ERR-ASSET-ALREADY-EXISTS (err u5001))
(define-constant ERR-ASSET-NOT-FOUND (err u5002))
(define-constant ERR-ASSET-DISABLED (err u5003))
(define-constant ERR-NOT-EMERGENCY-ADMIN (err u5004))
(define-constant ERR-CANNOT-REMOVE-STX (err u5005))
(define-constant ERR-INVALID-DECIMALS (err u5006))
(define-constant ERR-ALREADY-INITIALIZED (err u5007))
(define-constant ERR-NOT-OWNER (err u5008))
(define-constant ERR-EMPTY-NAME (err u5009))

;; STX sentinel principal (STX has no contract address)
(define-constant STX-PRINCIPAL 'SP000000000000000000002Q6VF78)

;; ========== Data ==========

;; Contract deployer -- can initialize once
(define-data-var contract-owner principal tx-sender)

;; Admin contract (timelock) -- gates non-emergency add/remove via contract-caller check
(define-data-var admin-contract principal 'SP000000000000000000002Q6VF78)

;; Emergency admin (multi-sig) -- gates emergency remove via contract-caller check
(define-data-var emergency-admin principal 'SP000000000000000000002Q6VF78)

;; Initialize guard
(define-data-var initialized bool false)

;; Supported assets map
(define-map supported-assets principal {
    name: (string-ascii 32),
    decimals: uint,
    active: bool,
    added-at: uint
})

;; Ordered list of asset principals for enumeration
(define-data-var asset-count uint u0)
(define-map asset-index uint principal)

;; ========== Initialize ==========

;; Set admin addresses and seed the three initial assets (STX, sBTC, USDCx).
;; Only callable once by the contract deployer.
(define-public (initialize (admin principal) (emergency principal) (sbtc-contract principal) (usdcx-contract principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
        (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
        (var-set initialized true)
        (var-set admin-contract admin)
        (var-set emergency-admin emergency)

        ;; Seed STX
        (map-set supported-assets STX-PRINCIPAL {
            name: "Stacks Token",
            decimals: u6,
            active: true,
            added-at: block-height
        })
        (map-set asset-index u0 STX-PRINCIPAL)
        (var-set asset-count u1)

        ;; Seed sBTC
        (map-set supported-assets sbtc-contract {
            name: "sBTC",
            decimals: u8,
            active: true,
            added-at: block-height
        })
        (map-set asset-index u1 sbtc-contract)
        (var-set asset-count u2)

        ;; Seed USDCx
        (map-set supported-assets usdcx-contract {
            name: "USDCx",
            decimals: u6,
            active: true,
            added-at: block-height
        })
        (map-set asset-index u2 usdcx-contract)
        (var-set asset-count u3)

        (print {event: "initialized", admin: admin, emergency: emergency, sbtc: sbtc-contract, usdcx: usdcx-contract})
        (ok true)
    )
)

;; ========== Public: Admin (Timelock Path) ==========

;; Add a new supported asset. Only callable by the admin contract (timelock).
(define-public (add-asset (asset principal) (name (string-ascii 32)) (decimals uint))
    (begin
        (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-ADMIN)
        (asserts! (is-none (map-get? supported-assets asset)) ERR-ASSET-ALREADY-EXISTS)
        (asserts! (>= (len name) u1) ERR-EMPTY-NAME)
        (asserts! (<= decimals u18) ERR-INVALID-DECIMALS)
        (let ((idx (var-get asset-count)))
            (map-set supported-assets asset {
                name: name,
                decimals: decimals,
                active: true,
                added-at: block-height
            })
            (map-set asset-index idx asset)
            (var-set asset-count (+ idx u1))
        )
        (print {event: "asset-added", asset: asset, name: name, decimals: decimals})
        (ok true)
    )
)

;; Soft-remove a supported asset (sets active=false, preserves history).
;; Only callable by the admin contract (timelock).
(define-public (remove-asset (asset principal))
    (begin
        (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-ADMIN)
        (asserts! (not (is-eq asset STX-PRINCIPAL)) ERR-CANNOT-REMOVE-STX)
        (match (map-get? supported-assets asset)
            existing (begin
                (map-set supported-assets asset (merge existing {active: false}))
                (print {event: "asset-removed", asset: asset})
                (ok true)
            )
            ERR-ASSET-NOT-FOUND
        )
    )
)

;; ========== Public: Emergency (Multi-Sig Path) ==========

;; Hard-remove a supported asset (deletes from map entirely).
;; Only callable by the emergency admin (multi-sig), bypasses timelock.
(define-public (emergency-remove-asset (asset principal))
    (begin
        (asserts! (is-eq contract-caller (var-get emergency-admin)) ERR-NOT-EMERGENCY-ADMIN)
        (asserts! (not (is-eq asset STX-PRINCIPAL)) ERR-CANNOT-REMOVE-STX)
        (asserts! (is-some (map-get? supported-assets asset)) ERR-ASSET-NOT-FOUND)
        (map-delete supported-assets asset)
        (print {event: "asset-emergency-removed", asset: asset})
        (ok true)
    )
)

;; ========== Read-Only ==========

;; Check if an asset is currently supported (active in the registry).
;; STX is always supported.
(define-read-only (is-supported (asset principal))
    (match (map-get? supported-assets asset)
        entry (ok (get active entry))
        (ok (is-eq asset STX-PRINCIPAL))
    )
)

;; Get the full asset record
(define-read-only (get-asset (asset principal))
    (map-get? supported-assets asset)
)

;; Get the total number of registered assets
(define-read-only (get-asset-count)
    (var-get asset-count)
)

;; Get the asset principal at a given index
(define-read-only (get-asset-at-index (idx uint))
    (map-get? asset-index idx)
)
