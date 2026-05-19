;; title: asset-registry-trait
;; version: 1.0.0
;; Trait defining the asset registry interface for CineX protocol

;; ========== Summary ==========
;; Standard interface for the CineX asset registry.
;; Manages the whitelist of supported assets (STX, sBTC, USDCx, etc.)
;; that can be used in milestone escrow campaigns.
;; =============================

(define-trait asset-registry-trait
    (
        ;; Check if an asset is currently supported
        ;; asset: principal of the SIP-010 token or STX
        ;; Returns: bool
        (is-supported (principal) (response bool uint))
    )
)
