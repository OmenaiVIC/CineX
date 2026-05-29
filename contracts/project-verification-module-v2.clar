;; title: project-verification-module-v2
;; version: 2.0.0
;; summary: Creator verification v2 with proxy registration (wallet-free)
;; author: CineX Team
;;
;; ========== Purpose ==========
;; This contract adds a `proxy-register-creator` function callable by the
;; emergency-admin (deployer/backend) to register creators without requiring
;; them to sign with their own wallet. The tx-sender == creator constraint
;; in v1 makes it impossible for the backend to register users on their
;; behalf. This v2 eliminates that constraint for the Quick Register flow.
;;
;; All read-only functions from v1 are replicated here so the backend can
;; check verification status across both contracts.
;; =============================

;; ========== ERROR CONSTANTS ==========
(define-constant ERR-NOT-AUTHORIZED (err u2001))
(define-constant ERR-CREATOR-NOT-FOUND (err u2002))
(define-constant ERR-ALREADY-INITIALIZED (err u2003))
(define-constant ERR-ALREADY-REGISTERED (err u2004))
(define-constant ERR-NOT-VERIFIED (err u2009))
(define-constant ERR-VERIFICATION-EXPIRED (err u2007))
(define-constant ERR-SYSTEM-PAUSED (err u2011))
(define-constant ERR-SYSTEM-NOT-PAUSED (err u2018))
(define-constant ERR-NOT-EMERGENCY-ADMIN (err u2019))
(define-constant ERR-TRANSFER-FAILED (err u2008))
(define-constant ERR-INVALID-AMOUNT (err u2012))
(define-constant ERR-INVALID-RECIPIENT (err u2014))

;; ========== CONSTANTS ==========
(define-constant CONTRACT-OWNER tx-sender)
(define-constant BURN-ADDRESS 'SP000000000000000000002Q6VF78)
(define-constant UNVERIFIED-FUNDING-CAP u1000000000)    ;; 1,000 STX
(define-constant BASIC-FUNDING-CAP u10000000000)         ;; 10,000 STX
(define-constant PREMIUM-FUNDING-CAP u100000000000)      ;; 100,000 STX
(define-constant VERTICAL-FILM "film")
(define-constant VERTICAL-MUSIC "music")
(define-constant VERTICAL-GAMING "gaming")
(define-constant VERTICAL-IMMERSIVE "immersive-media")
(define-constant VERTICAL-OTHER "other")

;; ========== DATA VARIABLES ==========
(define-data-var emergency-admin principal CONTRACT-OWNER)
(define-data-var total-registered-creators uint u0)
(define-data-var initialized bool false)
(define-data-var module-version uint u2)
(define-data-var module-active bool true)
(define-data-var emergency-pause bool false)
(define-data-var emergency-ops-counter uint u0)

;; ========== DATA MAPS ==========
(define-map creator-identities principal {
    full-name: (string-ascii 100),
    profile-url: (string-ascii 255),
    identity-hash: (buff 32),
    project-vertical: (string-ascii 20),
    choice-verification-level: uint,
    choice-verification-expiration: uint,
    verified: bool,
    registration-time: uint
})

(define-map emergency-ops-log { ops-count-id: uint } {
    emergency-ops-type: (string-ascii 150),
    recipient: principal,
    admin: principal,
    block-height: uint,
    reason: (string-ascii 100)
})

;; ========== PRIVATE FUNCTIONS ==========
(define-private (is-registered (creator principal))
    (is-some (map-get? creator-identities creator))
)

(define-private (is-valid-vertical (vertical (string-ascii 20)))
    (or (is-eq vertical VERTICAL-FILM)
        (or (is-eq vertical VERTICAL-MUSIC)
            (or (is-eq vertical VERTICAL-GAMING)
                (or (is-eq vertical VERTICAL-IMMERSIVE)
                    (is-eq vertical VERTICAL-OTHER)))))
)

(define-private (is-verification-current (creator principal))
    (let
        (
            (existing-data (unwrap! (map-get? creator-identities creator) ERR-CREATOR-NOT-FOUND))
            (verified-status (get verified existing-data))
            (current-expiration (get choice-verification-expiration existing-data))
        )
        (asserts! (is-eq verified-status true) ERR-NOT-VERIFIED)
        (asserts! (> current-expiration block-height) ERR-VERIFICATION-EXPIRED)
        (ok true)
    )
)

(define-private (check-system-not-paused)
    (not (var-get emergency-pause))
)

;; ========== INITIALIZE ==========
(define-public (initialize (emergency principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
        (var-set initialized true)
        (var-set emergency-admin emergency)
        (print {event: "initialized", emergency: emergency})
        (ok true)
    )
)

;; ========== PROXY REGISTER CREATOR (Wallet-Free) ==========
;; Callable by emergency-admin (backend) on behalf of any user.
;; Stores creator identity with unverified status (1,000 STX cap).
(define-public (proxy-register-creator (creator principal)
    (full-name (string-ascii 100))
    (profile-url (string-ascii 255))
    (identity-hash (buff 32))
    (project-vertical (string-ascii 20))
    (choice-verification-level uint)
    (choice-verification-level-expiration uint))
    (begin
        (asserts! (is-eq tx-sender (var-get emergency-admin)) ERR-NOT-EMERGENCY-ADMIN)
        (asserts! (not (is-registered creator)) ERR-ALREADY-REGISTERED)
        (asserts! (is-valid-vertical project-vertical) (err u1020))
        (map-set creator-identities creator {
            full-name: full-name,
            profile-url: profile-url,
            identity-hash: identity-hash,
            project-vertical: project-vertical,
            choice-verification-level: choice-verification-level,
            choice-verification-expiration: choice-verification-level-expiration,
            verified: false,
            registration-time: block-height
        })
        (var-set total-registered-creators (+ (var-get total-registered-creators) u1))
        (print {event: "creator-registered", creator: creator, vertical: project-vertical})
        (ok true)
    )
)

;; ========== REGISTER CREATOR (Self-Sign) ==========
;; Standard self-registration with tx-sender == creator check.
;; Included for backward compatibility.
(define-public (register-creator (creator principal)
    (full-name (string-ascii 100))
    (profile-url (string-ascii 255))
    (identity-hash (buff 32))
    (project-vertical (string-ascii 20))
    (choice-verification-level uint)
    (choice-verification-level-expiration uint))
    (begin
        (asserts! (is-eq creator tx-sender) ERR-NOT-AUTHORIZED)
        (asserts! (not (is-registered creator)) ERR-ALREADY-REGISTERED)
        (asserts! (is-valid-vertical project-vertical) (err u1020))
        (map-set creator-identities creator {
            full-name: full-name,
            profile-url: profile-url,
            identity-hash: identity-hash,
            project-vertical: project-vertical,
            choice-verification-level: choice-verification-level,
            choice-verification-expiration: choice-verification-level-expiration,
            verified: false,
            registration-time: block-height
        })
        (var-set total-registered-creators (+ (var-get total-registered-creators) u1))
        (print {event: "creator-registered", creator: creator, vertical: project-vertical})
        (ok true)
    )
)

;; ========== EMERGENCY VERIFY ==========
(define-public (emergency-verify-creator (creator principal) (new-expiration-block uint))
    (let
        (
            (existing-data (unwrap! (map-get? creator-identities creator) ERR-CREATOR-NOT-FOUND))
        )
        (asserts! (is-eq tx-sender (var-get emergency-admin)) ERR-NOT-EMERGENCY-ADMIN)
        (map-set creator-identities creator
            (merge existing-data {
                verified: true,
                choice-verification-expiration: new-expiration-block,
                registration-time: block-height
            })
        )
        (print {event: "emergency-creator-verified", creator: creator, set-by: tx-sender})
        (ok true)
    )
)

(define-public (emergency-revoke-verification (creator principal))
    (let
        (
            (existing-data (unwrap! (map-get? creator-identities creator) ERR-CREATOR-NOT-FOUND))
        )
        (asserts! (is-eq tx-sender (var-get emergency-admin)) ERR-NOT-EMERGENCY-ADMIN)
        (map-set creator-identities creator
            (merge existing-data { verified: false })
        )
        (print {event: "emergency-verification-revoked", creator: creator, set-by: tx-sender})
        (ok true)
    )
)

;; ========== EMERGENCY MODULE TRAIT ==========
(define-public (set-pause-state (pause bool))
    (begin
        (asserts! (is-eq tx-sender (var-get emergency-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (check-system-not-paused) ERR-SYSTEM-PAUSED)
        (var-set emergency-pause pause)
        (print {event: "pause-state-changed", new-state: pause, caller: tx-sender, block-height: block-height})
        (ok true)
    )
)

(define-read-only (is-system-paused)
    (ok (var-get emergency-pause))
)

(define-public (emergency-withdraw (amount uint) (recipient principal))
    (let
        (
            (current-balance (stx-get-balance (as-contract tx-sender)))
            (current-ops-counter (var-get emergency-ops-counter))
            (next-ops-count (+ current-ops-counter u1))
        )
        (asserts! (is-eq tx-sender (var-get emergency-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (var-get emergency-pause) ERR-SYSTEM-NOT-PAUSED)
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (asserts! (<= amount current-balance) (err u2005))
        (asserts! (and (not (is-eq recipient BURN-ADDRESS))
                       (not (is-eq recipient CONTRACT-OWNER))
                       (not (is-eq recipient (as-contract tx-sender))))
                   ERR-INVALID-RECIPIENT)
        (map-set emergency-ops-log { ops-count-id: next-ops-count } {
            emergency-ops-type: "emergency ops withdraw",
            recipient: recipient,
            admin: tx-sender,
            block-height: block-height,
            reason: "emergency funds recovery"
        })
        (var-set emergency-ops-counter next-ops-count)
        (unwrap! (stx-transfer? amount (as-contract tx-sender) recipient) ERR-TRANSFER-FAILED)
        (print {event: "emergency-withdrawal", operation-id: next-ops-count, amount: amount, recipient: recipient})
        (ok true)
    )
)

;; ========== READ-ONLY FUNCTIONS ==========
(define-read-only (is-creator-currently-verified (creator principal))
    (is-verification-current creator)
)

(define-read-only (get-creator-identity (creator principal))
    (ok (map-get? creator-identities creator))
)

(define-read-only (get-filmmaker-identity (creator principal))
    (ok (match (map-get? creator-identities creator)
        data (some {
            full-name: (get full-name data),
            profile-url: (get profile-url data),
            identity-hash: (get identity-hash data),
            choice-verification-level: (get choice-verification-level data),
            choice-verification-expiration: (get choice-verification-expiration data),
            verified: (get verified data),
            registration-time: (get registration-time data)
        })
        none
    ))
)

(define-read-only (get-verification-funding-cap (creator principal))
    (match (map-get? creator-identities creator)
        data (let ((verified (get verified data))
                   (level (get choice-verification-level data)))
              (if verified
                  (if (is-eq level u1)
                      (ok BASIC-FUNDING-CAP)
                      (ok PREMIUM-FUNDING-CAP))
                  (ok UNVERIFIED-FUNDING-CAP)))
        (ok UNVERIFIED-FUNDING-CAP)
    )
)

(define-read-only (get-total-registered-creators)
    (var-get total-registered-creators)
)

;; ========== BASE TRAIT ==========
(define-read-only (get-module-version)
    (ok (var-get module-version))
)

(define-read-only (is-module-active)
    (ok (var-get module-active))
)

(define-read-only (get-module-name)
    (ok "project-verification-module-v2")
)
