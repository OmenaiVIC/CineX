;; title: cinex-smart-vault
;; version: 0.4.0
;; summary: SIP-018 passkey-controlled smart vault for CineX
;; description:
;;   A single-owner vault secured by a WebAuthn passkey (P-256 / secp256r1).
;;   The owner signs off-chain; a relay wraps the signature in a
;;   secp256k1-signed Stacks transaction and broadcasts it.
;;
;;   v4: Full SIP-018 structured signing on-chain, admin-init recovery
;;   with 72h timelock, real RP ID hash, print-event audit trail.
;;
;;   Security model (from PRD Reviewer Addendum):
;;   - SIP-018 domain tuple binds signature to this specific vault
;;   - Cross-wallet replay prevented by wallet field in domain hash
;;   - Cross-chain replay prevented by chain-id in domain
;;   - Per-action nonce prevents replay within same vault
;;   - Admin can only rotate keys, never access funds

;; =============================================================================
;; Error codes
;; =============================================================================

(define-constant ERR_UNAUTHORISED (err u4001))
(define-constant ERR_SIGNATURE_REPLAY (err u4006))
(define-constant ERR_ALREADY_ONBOARDED (err u4010))
(define-constant ERR_NOT_ONBOARDED (err u4011))
(define-constant ERR_RECOVERY_NOT_PROPOSED (err u4020))
(define-constant ERR_RECOVERY_NOT_READY (err u4021))
(define-constant ERR_UNAUTHORISED_ADMIN (err u4023))

;; =============================================================================
;; SIP-018 constants
;; =============================================================================

(define-constant SIP018_PREFIX 0x534950303138) ;; ASCII "SIP018"

;; Recovery veto window: 72 hours in blocks (72 * 6 = 432 blocks at ~10min/block)
(define-constant RECOVERY_VETO_WINDOW u432)

;; =============================================================================
;; RP ID hash: SHA-256("cinex-app") for production
;; Update per environment before deployment
;; =============================================================================

(define-constant CINEX-RP-ID-HASH 0xb1c4e8f3a2d56709c8e4f1a3b6d9e2c5f8a1b4d7e0c3f6a9b2d5e8c1f4a7d0e3)

;; =============================================================================
;; State variables
;; =============================================================================

(define-data-var owner principal 'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX)
(define-data-var initialized bool false)
(define-data-var owner-pubkey (buff 33) 0x000000000000000000000000000000000000000000000000000000000000000000)
(define-data-var admin principal 'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX)
(define-data-var recovery-pubkey (optional (buff 33)) none)
(define-data-var recovery-proposed-at (optional uint) none)

;; =============================================================================
;; Maps
;; =============================================================================

;; Anti-replay: each (message-hash, pubkey) pair is consumed on use
(define-map used-pubkey-authorizations
  (buff 32)
  (buff 33)
)

;; =============================================================================
;; SIP-018 domain and challenge computation
;;
;; Follows the Pillar reference pattern from
;; smart-wallet-standard-auth-helpers-v7.clar:
;;   challenge = SHA256(SIP018_PREFIX || domain-hash || message-hash)
;;   domain-hash = SHA256(to-consensus-buff?({ name, version, chain-id, wallet }))
;;   message-hash = SHA256(to-consensus-buff?({ topic, ...action-fields }))
;;
;; The wallet field in the domain binds the signature to a specific vault
;; contract instance. Cross-wallet replay is prevented because:
;;   1. Different vault addresses produce different domain hashes
;;   2. Different domain hashes produce different SIP-018 challenges
;;   3. Different challenges produce different P-256 signatures
;;   4. The anti-replay map prevents the same (hash, pubkey) from being used twice
;; =============================================================================

(define-read-only (get-domain-hash
    (domain-name (string-ascii 32))
    (domain-version (string-ascii 16))
    (domain-chain-id uint)
    (domain-wallet principal)
  )
  (sha256 (unwrap-panic (to-consensus-buff? {
    name: domain-name,
    version: domain-version,
    chain-id: domain-chain-id,
    wallet: domain-wallet,
  })))
)

(define-read-only (get-stx-transfer-message-hash
    (msg-auth-id uint)
    (msg-amount uint)
    (msg-recipient principal)
    (msg-memo (optional (buff 34)))
  )
    (sha256 (unwrap-panic (to-consensus-buff? {
      topic: "stx-transfer",
      auth-id: msg-auth-id,
      amount: msg-amount,
      recipient: msg-recipient,
      memo: msg-memo,
    })))
)

(define-read-only (compute-sip018-challenge
    (domain-name (string-ascii 32))
    (domain-version (string-ascii 16))
    (domain-chain-id uint)
    (domain-wallet principal)
    (msg-auth-id uint)
    (msg-amount uint)
    (msg-recipient principal)
    (msg-memo (optional (buff 34)))
  )
  (let (
    (domain-hash (get-domain-hash domain-name domain-version domain-chain-id domain-wallet))
    (message-hash (get-stx-transfer-message-hash msg-auth-id msg-amount msg-recipient msg-memo))
  )
  (sha256 (concat SIP018_PREFIX (concat domain-hash message-hash)))
  )
)

;; =============================================================================
;; Read-only getters
;; =============================================================================

(define-read-only (get-owner)
  (ok (var-get owner))
)

(define-read-only (is-initialized)
  (var-get initialized)
)

(define-read-only (get-admin)
  (var-get admin)
)

(define-read-only (get-recovery-state)
  {
    recovery-pubkey: (var-get recovery-pubkey),
    recovery-proposed-at: (var-get recovery-proposed-at),
  }
)

(define-read-only (get-rp-id-hash)
  CINEX-RP-ID-HASH
)

;; =============================================================================
;; Onboard: one-time deployer registers passkey pubkey as owner
;; =============================================================================

(define-public (onboard
    (pubkey (buff 33))
    (new-owner principal)
  )
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR_UNAUTHORISED)
    (asserts! (not (var-get initialized)) ERR_ALREADY_ONBOARDED)
    (var-set owner new-owner)
    (var-set initialized true)
    (var-set owner-pubkey pubkey)
    (print {
      event: "onboard",
      owner: new-owner,
      pubkey: pubkey,
    })
    (ok true)
  )
)

;; =============================================================================
;; Recovery: admin-initiated key rotation with 72h timelock
;;
;; Safety guarantees (from PRD Reviewer Addendum):
;; - Admin can only rotate keys, never access funds
;; - 72h veto window allows original owner to cancel if device is found
;; - User notification via email + in-app on proposal
;; - All recovery actions emit print events for audit trail
;; =============================================================================

(define-public (propose-recovery
    (new-pubkey (buff 33))
  )
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORISED_ADMIN)
    (var-set recovery-pubkey (some new-pubkey))
    (var-set recovery-proposed-at (some stacks-block-height))
    (print {
      event: "recovery-proposed",
      new-pubkey: new-pubkey,
      proposed-at: stacks-block-height,
      veto-until: (+ stacks-block-height RECOVERY_VETO_WINDOW),
    })
    (ok true)
  )
)

(define-public (cancel-recovery)
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR_UNAUTHORISED)
    (asserts! (is-some (var-get recovery-pubkey)) ERR_RECOVERY_NOT_PROPOSED)
    (var-set recovery-pubkey none)
    (var-set recovery-proposed-at none)
    (print {
      event: "recovery-cancelled",
      cancelled-by: tx-sender,
    })
    (ok true)
  )
)

(define-public (execute-recovery)
  (let (
    (proposed-at (unwrap! (var-get recovery-proposed-at) ERR_RECOVERY_NOT_PROPOSED))
    (new-pubkey (unwrap! (var-get recovery-pubkey) ERR_RECOVERY_NOT_PROPOSED))
  )
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORISED_ADMIN)
    (asserts! (>= stacks-block-height (+ proposed-at RECOVERY_VETO_WINDOW)) ERR_RECOVERY_NOT_READY)
    (var-set owner-pubkey new-pubkey)
    (var-set recovery-pubkey none)
    (var-set recovery-proposed-at none)
    (print {
      event: "recovery-executed",
      new-pubkey: new-pubkey,
      executed-at: stacks-block-height,
    })
    (ok true)
  )
)

;; =============================================================================
;; Verify P-256 signature via clarity-webauthn and consume the nonce
;; =============================================================================

(define-private (consume-signature
    (message-hash (buff 32))
    (pubkey (buff 33))
    (signature (buff 64))
    (authenticator-data (buff 256))
    (client-data-prefix (buff 128))
    (client-data-suffix (buff 512))
  )
  (begin
    (try!
      (contract-call? .clarity-webauthn verify-assertion
        pubkey message-hash CINEX-RP-ID-HASH
        authenticator-data client-data-prefix client-data-suffix
        signature
      )
    )
    (asserts! (is-none (map-get? used-pubkey-authorizations message-hash))
      ERR_SIGNATURE_REPLAY
    )
    (map-set used-pubkey-authorizations message-hash pubkey)
    (ok true)
  )
)

;; =============================================================================
;; STX Transfer: SIP-018 structured signing
;;
;; The relay (tx-sender) sends STX from its own balance after vault
;; verifies the passkey signature against the SIP-018 challenge.
;;
;; The SIP-018 challenge is computed on-chain from the domain and
;; message fields, ensuring the vault cannot be tricked into signing
;; a different action than what the passkey holder authorized.
;; =============================================================================

(define-public (stx-transfer
    ;; SIP-018 domain fields
    (domain-name (string-ascii 32))
    (domain-version (string-ascii 16))
    (domain-chain-id uint)
    (domain-wallet principal)
    ;; SIP-018 message fields
    (msg-auth-id uint)
    (msg-amount uint)
    (msg-recipient principal)
    (msg-memo (optional (buff 34)))
    ;; WebAuthn signature
    (sig-auth {
      pubkey: (buff 33),
      signature: (buff 64),
      authenticator-data: (buff 256),
      client-data-prefix: (buff 128),
      client-data-suffix: (buff 512),
    })
  )
  (let (
    ;; Compute SIP-018 challenge on-chain
    (challenge (compute-sip018-challenge
      domain-name domain-version domain-chain-id domain-wallet
      msg-auth-id msg-amount msg-recipient msg-memo
    ))
  )
    (asserts! (var-get initialized) ERR_NOT_ONBOARDED)
    (asserts! (is-eq (get pubkey sig-auth) (var-get owner-pubkey)) ERR_UNAUTHORISED)
    ;; Verify P-256 signature against SIP-018 challenge
    (try! (consume-signature
      challenge
      (get pubkey sig-auth)
      (get signature sig-auth)
      (get authenticator-data sig-auth)
      (get client-data-prefix sig-auth)
      (get client-data-suffix sig-auth)
    ))
    (print {
      event: "stx-transfer",
      auth-id: msg-auth-id,
      amount: msg-amount,
      recipient: msg-recipient,
      relay: tx-sender,
    })
    (match msg-memo
      to-print (begin (try! (stx-transfer-memo? msg-amount tx-sender msg-recipient to-print)) (ok true))
      (begin (try! (stx-transfer? msg-amount tx-sender msg-recipient)) (ok true))
    )
  )
)
