;; title: project-verification-module-trait
;; version: 1.0.0
;; Trait for multi-vertical creator verification on CineX protocol

;; ========== Summary ==========
;; Trait for the multi-vertical creator verification module
;; supporting film, music, gaming, immersive-media, and other
;; creative verticals.
;;
;; Functions:
;;   - register-creator (with project-vertical field)
;;   - add-portfolio
;;   - verify-creator
;;   - is-creator-currently-verified
;;   - get-creator-identity (returns tuple including project-vertical)
;;   - emergency-verify-creator
;;   - emergency-revoke-verification
;;   - get-verification-funding-cap
;; =============================

(define-trait project-verification-trait
    (
        ;; Register a creator's identity for verification
        ;; project-vertical: "film" | "music" | "gaming" | "immersive-media" | "other"
        (register-creator (principal (string-ascii 100) (string-ascii 255) (buff 32) (string-ascii 20) uint uint) (response uint uint))

        ;; Add a project to a creator's portfolio
        (add-portfolio (principal (string-ascii 100) (string-ascii 255) (string-ascii 500) uint) (response uint uint))

        ;; Verify a creator's identity (admin/timelock only)
        (verify-creator (principal uint) (response bool uint))

        ;; Check if a creator is currently verified
        (is-creator-currently-verified (principal) (response bool uint))

        ;; Get full creator identity details including project-vertical
        (get-creator-identity (principal) (response (optional {
            full-name: (string-ascii 100),
            profile-url: (string-ascii 255),
            identity-hash: (buff 32),
            project-vertical: (string-ascii 20),
            choice-verification-level: uint,
            choice-verification-expiration: uint,
            verified: bool,
            registration-time: uint
        }) uint))

        ;; Emergency verify a creator (bypasses timelock, multi-sig only)
        (emergency-verify-creator (principal uint) (response bool uint))

        ;; Emergency revoke verification (bypasses timelock, multi-sig only)
        (emergency-revoke-verification (principal) (response bool uint))

        ;; Backward-compat: get filmmaker identity (without project-vertical field)
        (get-filmmaker-identity (principal) (response (optional {
            full-name: (string-ascii 100),
            profile-url: (string-ascii 255),
            identity-hash: (buff 32),
            choice-verification-level: uint,
            choice-verification-expiration: uint,
            verified: bool,
            registration-time: uint
        }) uint))

        ;; Get the maximum funding cap for a creator based on their verification level
        ;; Returns cap in micro-STX: unverified=1K, basic=10K, premium=100K
        (get-verification-funding-cap (principal) (response uint uint))
    )
)
