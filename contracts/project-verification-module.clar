;; title: project-verification-module
;; version: 1.0.0
;; Multi-vertical creator verification module for CineX protocol

;; ========== Summary ==========
;; Refactored from film-verification-module.clar (722 lines).
;; Supports multiple creative verticals: film, music, gaming,
;; immersive-media, other.
;;
;; Implements BOTH the new project-verification-trait AND the
;; old film-verification-trait for backward compatibility.
;; Old function names (register-filmmaker-id, etc.) wrap the
;; new internal functions with project-vertical defaulting to
;; "film".
;;
;; Two admin paths:
;;   1. Timelock path (verify-creator): requires contract-caller
;;      == admin-contract. The 2880-block delay has elapsed.
;;   2. Emergency path (emergency-verify-creator,
;;      emergency-revoke-verification): multi-sig bypasses timelock.
;;
;; Day 2: scaffolding with data structures, registration,
;; verification flows, and backward-compat wrappers.
;; Day 3: complete with endorsements, portfolio management,
;; and full test suite.
;; =============================

(impl-trait .project-verification-module-trait.project-verification-trait)
(impl-trait .film-verification-module-trait.film-verification-trait)
(impl-trait .emergency-module-trait.emergency-module-trait)
(impl-trait .module-base-trait.module-base-trait)

;; ========== ERROR CONSTANTS ==========
(define-constant ERR-NOT-AUTHORIZED (err u1001))
(define-constant ERR-CREATOR-NOT-FOUND (err u1002))
(define-constant ERR-INVALID-VERIFICATION-LEVEL-INPUT (err u1003))
(define-constant ERR-ALREADY-REGISTERED (err u1004))
(define-constant ERR-PORTFOLIO-NOT-FOUND (err u1005))
(define-constant ERR-ENDORSEMENT-NOT-FOUND (err u1006))
(define-constant ERR-VERIFICATION-EXPIRED (err u1007))
(define-constant ERR-TRANSFER (err u1008))
(define-constant ERR-NOT-VERIFIED (err u1009))
(define-constant ERR-SYSTEM-NOT-PAUSED (err u1010))
(define-constant ERR-SYSTEM-PAUSED (err u1011))
(define-constant ERR-INVALID-AMOUNT (err u1012))
(define-constant ERR-INSUFFICIENT-FUNDS (err u1013))
(define-constant ERR-INVALID-RECIPIENT (err u1014))
(define-constant ERR-TRANSFER-FAILED (err u1015))
(define-constant ERR-NOT-OWNER (err u1016))
(define-constant ERR-ALREADY-INITIALIZED (err u1017))
(define-constant ERR-NOT-ADMIN (err u1018))
(define-constant ERR-NOT-EMERGENCY-ADMIN (err u1019))
(define-constant ERR-INVALID-VERTICAL (err u1020))

;; ========== CONSTANTS ==========
(define-constant basic-verification-level u1)
(define-constant standard-verification-level u2)
(define-constant basic-verification-fee u1000000) ;; 1 STX — affordable for Global South creators
(define-constant standard-verification-fee u5000000) ;; 5 STX — meaningful commitment signal
(define-constant basic-verified-id-valid-period u52560) ;; ~1 year
(define-constant standard-verified-id-valid-period (* u52560 u2)) ;; ~2 years
(define-constant CONTRACT-OWNER tx-sender)
(define-constant BURN-ADDRESS 'SP000000000000000000002Q6VF78)

;; ========== TIERED FUNDING CAPS (in micro-STX) ==========
(define-constant UNVERIFIED-FUNDING-CAP u1000000000)    ;; 1,000 STX — bootstrapping, zero barrier
(define-constant BASIC-FUNDING-CAP u10000000000)         ;; 10,000 STX
(define-constant PREMIUM-FUNDING-CAP u100000000000)      ;; 100,000 STX
(define-constant PLATFORM-MAX u1000000000000)            ;; 1,000,000 STX — outer circuit breaker

;; Valid project verticals
(define-constant VERTICAL-FILM "film")
(define-constant VERTICAL-MUSIC "music")
(define-constant VERTICAL-GAMING "gaming")
(define-constant VERTICAL-IMMERSIVE "immersive-media")
(define-constant VERTICAL-OTHER "other")

;; ========== DATA VARIABLES ==========
(define-data-var contract-admin principal tx-sender)
(define-data-var third-party-endorser principal tx-sender)
(define-data-var core-contract principal tx-sender)
(define-data-var total-registered-creators uint u0)
(define-data-var total-verification-fee-collected uint u0)
(define-data-var total-creator-portfolio-counts uint u0)
(define-data-var total-creator-endorsement-counts uint u0)
(define-data-var renewal-extension-contract principal tx-sender)
(define-data-var emergency-ops-counter uint u0)
(define-data-var emergency-pause bool false)
(define-data-var module-version uint u1)
(define-data-var module-active bool true)

;; Admin contract (timelock) for non-emergency operations
(define-data-var admin-contract principal 'SP000000000000000000002Q6VF78)
;; Emergency admin (multi-sig) for emergency bypass
(define-data-var emergency-admin principal 'SP000000000000000000002Q6VF78)
;; Initialize guard
(define-data-var initialized bool false)

;; ========== DATA MAPS ==========
;; Creator identities with project-vertical field
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

;; Portfolio items by creator and portfolio ID
(define-map creator-portfolios { creator: principal, portfolio-id: uint } {
    project-name: (string-ascii 100),
    project-url: (string-ascii 255),
    project-description: (string-ascii 500),
    project-completion-year: uint,
    added-at-time: uint
})

;; Endorsements by creator and endorsement ID
(define-map creator-endorsements { creator: principal, endorsement-id: uint } {
    endorser-name: (string-ascii 100),
    endorsement-letter: (string-ascii 255),
    endorsement-url: (string-ascii 255),
    added-at-time: uint
})

;; Verification payment status per creator
(define-map verification-payments { creator: principal } {
    level: uint,
    paid: bool,
    payment-time: uint
})

;; Portfolio counter per creator
(define-map creator-portfolio-counts principal uint)

;; Endorsement counter per creator
(define-map creator-endorsement-counts principal uint)

;; Emergency operations log for audit trail
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

(define-private (is-admin)
    (is-eq tx-sender (var-get contract-admin))
)

(define-private (is-endorser)
    (is-eq tx-sender (var-get third-party-endorser))
)

(define-private (get-endorsement-count (creator principal))
    (default-to u0 (map-get? creator-endorsement-counts creator))
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

(define-private (is-valid-vertical (vertical (string-ascii 20)))
    (or (is-eq vertical VERTICAL-FILM)
        (or (is-eq vertical VERTICAL-MUSIC)
            (or (is-eq vertical VERTICAL-GAMING)
                (or (is-eq vertical VERTICAL-IMMERSIVE)
                    (is-eq vertical VERTICAL-OTHER)))))
)

;; ========== PUBLIC: INITIALIZE ==========

;; Set admin addresses. Only callable once by the deployer.
(define-public (initialize (admin principal) (emergency principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
        (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
        (var-set initialized true)
        (var-set admin-contract admin)
        (var-set emergency-admin emergency)
        (print {event: "initialized", admin: admin, emergency: emergency})
        (ok true)
    )
)

;; ========== PUBLIC: CREATOR REGISTRATION ==========

;; Register a creator identity with project-vertical field.
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
        (asserts! (is-valid-vertical project-vertical) ERR-INVALID-VERTICAL)
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
        (map-set creator-portfolio-counts creator u0)
        (map-set creator-endorsement-counts creator u0)
        (var-set total-registered-creators (+ (var-get total-registered-creators) u1))
        (print {event: "creator-registered", creator: creator, vertical: project-vertical})
        (ok (var-get total-registered-creators))
    )
)

;; ========== PUBLIC: BACKWARD-COMPAT WRAPPERS ==========

;; Old function name - wraps register-creator with project-vertical = "film"
(define-public (register-filmmaker-id (new-filmmaker principal)
    (new-full-name (string-ascii 100))
    (new-profile-url (string-ascii 255))
    (new-identity-hash (buff 32))
    (new-choice-verification-level uint)
    (new-choice-verification-level-expiration uint))
    (register-creator new-filmmaker new-full-name new-profile-url new-identity-hash
        VERTICAL-FILM new-choice-verification-level new-choice-verification-level-expiration)
)

;; Add portfolio item (old name wrapper)
(define-public (add-filmmaker-portfolio (new-added-filmmaker principal)
    (new-added-project-name (string-ascii 100))
    (new-added-project-url (string-ascii 255))
    (new-added-project-desc (string-ascii 500))
    (new-added-project-completion-year uint))
    (add-portfolio new-added-filmmaker new-added-project-name
        new-added-project-url new-added-project-desc new-added-project-completion-year)
)

;; Old verify function name - wraps verify-creator
(define-public (verify-filmmaker-identity (filmmaker principal) (new-expiration-block uint))
    (verify-creator filmmaker new-expiration-block)
)

;; ========== PUBLIC: PORTFOLIO ==========

(define-public (add-portfolio (creator principal)
    (project-name (string-ascii 100))
    (project-url (string-ascii 255))
    (project-description (string-ascii 500))
    (project-completion-year uint))
    (let
        (
            (current-count (default-to u0 (map-get? creator-portfolio-counts creator)))
            (new-count (+ u1 current-count))
        )
        (asserts! (is-eq tx-sender creator) ERR-NOT-AUTHORIZED)
        (asserts! (is-registered creator) ERR-CREATOR-NOT-FOUND)
        (map-set creator-portfolios { creator: creator, portfolio-id: new-count } {
            project-name: project-name,
            project-url: project-url,
            project-description: project-description,
            project-completion-year: project-completion-year,
            added-at-time: block-height
        })
        (var-set total-creator-portfolio-counts (+ (var-get total-creator-portfolio-counts) u1))
        (map-set creator-portfolio-counts creator new-count)
        (print {event: "portfolio-added", creator: creator, portfolio-id: new-count})
        (ok new-count)
    )
)

;; ========== PUBLIC: PAYMENT ==========

(define-public (pay-verification-fee (verification-level uint))
    (let
        ((current-core-contract (var-get core-contract)))
        (asserts! (is-registered tx-sender) ERR-CREATOR-NOT-FOUND)
        (if (is-eq verification-level basic-verification-level)
            (begin
                (unwrap! (stx-transfer? basic-verification-fee tx-sender current-core-contract) ERR-TRANSFER)
                (map-set verification-payments { creator: tx-sender } {
                    level: verification-level, paid: true, payment-time: block-height
                })
                (var-set total-verification-fee-collected basic-verification-fee)
            )
            (begin
                (unwrap! (stx-transfer? standard-verification-fee tx-sender current-core-contract) ERR-TRANSFER)
                (map-set verification-payments { creator: tx-sender } {
                    level: verification-level, paid: true, payment-time: block-height
                })
                (var-set total-verification-fee-collected standard-verification-fee)
            )
        )
        (ok true)
    )
)

;; ========== PUBLIC: VERIFICATION (TIMELOCK PATH) ==========

;; Verify a creator. Only callable by admin-contract (timelock).
(define-public (verify-creator (creator principal) (new-expiration-block uint))
    (let
        (
            (payment-data (unwrap! (map-get? verification-payments { creator: creator }) ERR-NOT-AUTHORIZED))
            (existing-data (unwrap! (map-get? creator-identities creator) ERR-CREATOR-NOT-FOUND))
            (paid-status (get paid payment-data))
            (verification-level-status (get level payment-data))
        )
        (asserts! (is-eq contract-caller (var-get admin-contract)) ERR-NOT-ADMIN)
        (asserts! (is-eq paid-status true) ERR-NOT-AUTHORIZED)
        (map-set creator-identities creator
            (merge existing-data {
                verified: true,
                choice-verification-level: verification-level-status,
                choice-verification-expiration: new-expiration-block,
                registration-time: block-height
            })
        )
        (print {event: "creator-verified", creator: creator, level: verification-level-status})
        (ok true)
    )
)

;; ========== PUBLIC: EMERGENCY (MULTI-SIG PATH) ==========

;; Emergency verify - bypasses timelock. Multi-sig only.
(define-public (emergency-verify-creator (creator principal) (new-expiration-block uint))
    (let
        (
            (existing-data (unwrap! (map-get? creator-identities creator) ERR-CREATOR-NOT-FOUND))
            (is-ems-admin (is-eq contract-caller (var-get emergency-admin)))
            (is-ms-signer (unwrap-panic (contract-call? .cinex-multisig is-approved tx-sender)))
        )
        (asserts! (or is-ems-admin is-ms-signer) ERR-NOT-EMERGENCY-ADMIN)
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

;; Emergency revoke verification - bypasses timelock. Multi-sig only.
(define-public (emergency-revoke-verification (creator principal))
    (let
        (
            (existing-data (unwrap! (map-get? creator-identities creator) ERR-CREATOR-NOT-FOUND))
            (is-ems-admin (is-eq contract-caller (var-get emergency-admin)))
            (is-ms-signer (unwrap-panic (contract-call? .cinex-multisig is-approved tx-sender)))
        )
        (asserts! (or is-ems-admin is-ms-signer) ERR-NOT-EMERGENCY-ADMIN)
        (map-set creator-identities creator
            (merge existing-data { verified: false })
        )
        (print {event: "emergency-verification-revoked", creator: creator, set-by: tx-sender})
        (ok true)
    )
)

;; ========== PUBLIC: EXTENSION ==========

(define-public (update-filmmaker-expiration-period (new-filmmaker principal) (new-expiration-period uint))
    (let
        (
            (current-data (unwrap! (map-get? creator-identities new-filmmaker) ERR-CREATOR-NOT-FOUND))
            (current-renewal-contract (var-get renewal-extension-contract))
            (currently-verified (is-verification-current new-filmmaker))
        )
        (asserts! (or (is-admin) (is-eq tx-sender current-renewal-contract)) ERR-NOT-AUTHORIZED)
        (asserts! (is-ok currently-verified) ERR-NOT-VERIFIED)
        (map-set creator-identities new-filmmaker
            (merge current-data {
                choice-verification-expiration: new-expiration-period,
                registration-time: block-height
            })
        )
        (ok new-expiration-period)
    )
)

;; ========== PUBLIC: ENDORSEMENTS ==========

(define-public (add-filmmaker-endorsement (creator principal)
    (endorser-name (string-ascii 100))
    (endorsement-letter (string-ascii 255))
    (endorsement-url (string-ascii 255)))
    (let
        (
            (current-count (get-endorsement-count creator))
            (new-count (+ u1 current-count))
            (is-registered-creator (is-registered creator))
        )
        (asserts! (or (is-eq tx-sender creator) (is-admin) (is-endorser)) ERR-NOT-AUTHORIZED)
        (asserts! is-registered-creator ERR-CREATOR-NOT-FOUND)
        (map-set creator-endorsements { creator: creator, endorsement-id: new-count } {
            endorser-name: endorser-name,
            endorsement-letter: endorsement-letter,
            endorsement-url: endorsement-url,
            added-at-time: block-height
        })
        (map-set creator-endorsement-counts creator new-count)
        (var-set total-creator-endorsement-counts (+ (var-get total-creator-endorsement-counts) u1))
        (print {event: "endorsement-added", creator: creator, endorsement-id: new-count})
        (ok new-count)
    )
)

;; ========== ADMIN FUNCTIONS ==========

(define-public (set-contract-admin (new-admin principal))
    (begin
        (asserts! (is-admin) ERR-NOT-AUTHORIZED)
        (ok (var-set contract-admin new-admin))
    )
)

(define-public (set-core-contract (new-core principal))
    (begin
        (asserts! (is-admin) ERR-NOT-AUTHORIZED)
        (ok (var-set core-contract new-core))
    )
)

(define-public (set-renewal-extension-contract (extension-contract principal))
    (begin
        (asserts! (is-admin) ERR-NOT-AUTHORIZED)
        (ok (var-set renewal-extension-contract extension-contract))
    )
)

(define-public (set-third-party-endorser (new-endorser principal))
    (begin
        (asserts! (is-admin) ERR-NOT-AUTHORIZED)
        (ok (var-set third-party-endorser new-endorser))
    )
)

;; ========== READ-ONLY FUNCTIONS ==========

(define-read-only (is-portfolio-available (creator principal) (id uint))
    (match (map-get? creator-portfolios { creator: creator, portfolio-id: id })
        available (ok true)
        ERR-PORTFOLIO-NOT-FOUND
    )
)

(define-read-only (is-creator-currently-verified (creator principal))
    (is-verification-current creator)
)

(define-read-only (get-verification-funding-cap (creator principal))
    (match (map-get? creator-identities creator)
        data (let ((verified (get verified data))
                   (level (get choice-verification-level data)))
              (if verified
                  (if (is-eq level basic-verification-level)
                      (ok BASIC-FUNDING-CAP)
                      (ok PREMIUM-FUNDING-CAP))
                  (ok UNVERIFIED-FUNDING-CAP)))
        (ok UNVERIFIED-FUNDING-CAP) ;; unregistered = unverified cap
    )
)

;; Backward-compat alias for is-creator-currently-verified
(define-read-only (is-filmmaker-currently-verified (creator principal))
    (is-creator-currently-verified creator)
)

(define-read-only (is-endorsement-available (creator principal) (id uint))
    (match (map-get? creator-endorsements { creator: creator, endorsement-id: id })
        available (ok true)
        ERR-ENDORSEMENT-NOT-FOUND
    )
)

(define-read-only (get-creator-identity (creator principal))
    (ok (map-get? creator-identities creator))
)

;; Backward-compat alias - returns identity without project-vertical to match old trait
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

(define-read-only (get-filmmaker-portfolio (creator principal) (id uint))
    (map-get? creator-portfolios { creator: creator, portfolio-id: id })
)

(define-read-only (get-filmmaker-endorsements (creator principal) (id uint))
    (map-get? creator-endorsements { creator: creator, endorsement-id: id })
)

(define-read-only (get-total-filmmakers)
    (var-get total-registered-creators)
)

(define-read-only (get-total-verification-fees)
    (var-get total-verification-fee-collected)
)

(define-read-only (get-total-registered-filmmaker-portfolios)
    (var-get total-creator-portfolio-counts)
)

(define-read-only (get-total-filmmaker-endorsements)
    (var-get total-creator-endorsement-counts)
)

(define-read-only (get-core)
    (var-get core-contract)
)

(define-read-only (get-third-party-address)
    (var-get third-party-endorser)
)

(define-read-only (get-contract-admin)
    (ok (var-get contract-admin))
)

(define-read-only (get-admin-contract)
    (ok (var-get admin-contract))
)

(define-read-only (get-emergency-admin)
    (ok (var-get emergency-admin))
)

;; ========== EMERGENCY MODULE TRAIT ==========

(define-public (set-pause-state (pause bool))
    (let ((cinex-hub (var-get core-contract)))
        (asserts! (is-eq contract-caller cinex-hub) ERR-NOT-AUTHORIZED)
        (asserts! (check-system-not-paused) ERR-SYSTEM-PAUSED)
        (var-set emergency-pause pause)
        (print {event: "pause-state-changed", new-state: pause, caller: contract-caller, block-height: block-height})
        (ok true)
    )
)

(define-private (check-system-not-paused)
    (not (var-get emergency-pause))
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
        (asserts! (is-eq contract-caller (var-get core-contract)) ERR-NOT-AUTHORIZED)
        (asserts! (var-get emergency-pause) ERR-SYSTEM-NOT-PAUSED)
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (asserts! (<= amount current-balance) ERR-INSUFFICIENT-FUNDS)
        (asserts! (and (not (is-eq contract-caller BURN-ADDRESS))
                       (not (is-eq contract-caller CONTRACT-OWNER))
                       (not (is-eq contract-caller (as-contract tx-sender))))
                   ERR-INVALID-RECIPIENT)
        (map-set emergency-ops-log { ops-count-id: next-ops-count } {
            emergency-ops-type: "emergency ops withdraw",
            recipient: recipient,
            admin: contract-caller,
            block-height: block-height,
            reason: "emergency funds recovery"
        })
        (var-set emergency-ops-counter next-ops-count)
        (unwrap! (stx-transfer? amount (as-contract tx-sender) recipient) ERR-TRANSFER-FAILED)
        (print {event: "emergency-withdrawal", operation-id: next-ops-count, amount: amount, recipient: recipient})
        (ok true)
    )
)

;; ========== BASE TRAIT ==========

(define-read-only (get-module-version)
    (ok (var-get module-version))
)

(define-read-only (is-module-active)
    (ok (var-get module-active))
)

(define-read-only (get-module-name)
    (ok "project-verification-module")
)
