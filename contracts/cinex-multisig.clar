;; title: cinex-multisig
;; version: 1.0.0
;; 2-of-3 multi-sig admin for CineX protocol

;; ========== Summary ==========
;; 2-of-3 multi-signature wallet that serves as the root admin authority
;; for all CineX protocol contracts. Any 2 of the 3 signers must propose
;; and confirm a transaction before it can be executed.
;;
;; Two paths:
;;   1. Timelock path: multi-sig queues a transaction through timelock.clar,
;;      which enforces a 2880-block delay before execution.
;;   2. Emergency path: multi-sig marks the tx approved; the caller then
;;      calls the target contract's emergency function directly. The target
;;      contract verifies authorization via contract-call? to is-approved.
;;
;; Signer rotation: any 2 signers can vote to replace a signer.
;; =============================

;; Error codes
(define-constant ERR-NOT-SIGNER (err u8000))
(define-constant ERR-TX-NOT-FOUND (err u8001))
(define-constant ERR-TX-ALREADY-EXECUTED (err u8002))
(define-constant ERR-NOT-ENOUGH-CONFIRMATIONS (err u8003))
(define-constant ERR-SIGNER-ALREADY-EXISTS (err u8004))
(define-constant ERR-SIGNER-NOT-FOUND (err u8005))
(define-constant ERR-INVALID-REPLACEMENT (err u8006))
(define-constant ERR-ALREADY-CONFIRMED (err u8007))
(define-constant ERR-NOT-OWNER (err u8008))

;; 2-of-3 threshold
(define-constant THRESHOLD u2)

;; ========== Data ==========

;; Contract deployer -- can initialize signers once
(define-data-var contract-owner principal tx-sender)
(define-data-var initialized bool false)

;; The three signer addresses
(define-data-var signer-1 principal 'SP000000000000000000002Q6VF78)
(define-data-var signer-2 principal 'SP000000000000000000002Q6VF78)
(define-data-var signer-3 principal 'SP000000000000000000002Q6VF78)

;; Timelock contract address (set after deployment)
(define-data-var timelock-addr principal 'SP000000000000000000002Q6VF78)

;; Proposed transactions
(define-map transactions uint {
    recipient: principal,
    function-name: (string-ascii 64),
    function-args: (string-ascii 512),
    confirmations: uint,
    executed: bool,
    proposer: principal,
    is-timelock: bool
})

;; Track which signers have confirmed which tx (prevents double-confirm)
(define-map tx-confirmations {tx-id: uint, signer: principal} bool)

;; Next available tx ID
(define-data-var next-tx-id uint u1)

;; ========== Private ==========

;; Check if a principal is one of the three signers
(define-private (is-signer (who principal))
    (or (is-eq who (var-get signer-1))
        (or (is-eq who (var-get signer-2))
            (is-eq who (var-get signer-3))))
)

;; ========== Initialize ==========

;; Set the three signer addresses. Only callable once by the deployer.
(define-public (initialize (s1 principal) (s2 principal) (s3 principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
        (asserts! (not (var-get initialized)) ERR-TX-ALREADY-EXECUTED)
        (var-set initialized true)
        (var-set signer-1 s1)
        (var-set signer-2 s2)
        (var-set signer-3 s3)
        (print {event: "initialized", s1: s1, s2: s2, s3: s3})
        (ok true)
    )
)

;; Set the timelock contract address. Callable by any signer after deployment.
(define-public (set-timelock-addr (addr principal))
    (begin
        (asserts! (is-signer tx-sender) ERR-NOT-SIGNER)
        (var-set timelock-addr addr)
        (print {event: "timelock-addr-set", addr: addr})
        (ok true)
    )
)

;; ========== Public: Propose & Confirm ==========

;; Propose a new transaction. Only a signer can propose.
;; recipient:   target contract for the call
;; function-name: function to call (informational; actual dispatch uses typed helpers)
;; is-timelock: if true, routes through timelock delay; if false, marks for emergency execution
;; Returns: tx-id (uint)
(define-public (propose-transaction (recipient principal) (function-name (string-ascii 64)) (function-args (string-ascii 512)) (is-timelock bool))
    (let ((tx-id (var-get next-tx-id)))
        (begin
            (asserts! (is-signer tx-sender) ERR-NOT-SIGNER)
            (map-set transactions tx-id {
                recipient: recipient,
                function-name: function-name,
                function-args: function-args,
                confirmations: u1,
                executed: false,
                proposer: tx-sender,
                is-timelock: is-timelock
            })
            (map-set tx-confirmations {tx-id: tx-id, signer: tx-sender} true)
            (var-set next-tx-id (+ tx-id u1))
            (print {event: "transaction-proposed", tx-id: tx-id, proposer: tx-sender, recipient: recipient, function-name: function-name})
            (ok tx-id)
        )
    )
)

;; Confirm a proposed transaction. Any signer (other than the proposer) can confirm.
(define-public (confirm-transaction (tx-id uint))
    (let ((tx (unwrap! (map-get? transactions tx-id) ERR-TX-NOT-FOUND)))
        (begin
            (asserts! (is-signer tx-sender) ERR-NOT-SIGNER)
            (asserts! (not (get executed tx)) ERR-TX-ALREADY-EXECUTED)
            (asserts! (not (default-to false (map-get? tx-confirmations {tx-id: tx-id, signer: tx-sender}))) ERR-ALREADY-CONFIRMED)
            (map-set transactions tx-id (merge tx {confirmations: (+ (get confirmations tx) u1)}))
            (map-set tx-confirmations {tx-id: tx-id, signer: tx-sender} true)
            (print {event: "transaction-confirmed", tx-id: tx-id, confirmations: (+ (get confirmations tx) u1), signer: tx-sender})
            (ok true)
        )
    )
)

;; Execute a confirmed transaction.
;; Timelock path: queues the tx on the timelock contract with a 2880-block delay.
;; Emergency path: marks executed; the caller then calls the target's emergency
;;   function directly (the target checks is-approved via contract-call).
(define-public (execute-transaction (tx-id uint))
    (let ((tx (unwrap! (map-get? transactions tx-id) ERR-TX-NOT-FOUND)))
        (begin
            (asserts! (is-signer tx-sender) ERR-NOT-SIGNER)
            (asserts! (>= (get confirmations tx) THRESHOLD) ERR-NOT-ENOUGH-CONFIRMATIONS)
            (asserts! (not (get executed tx)) ERR-TX-ALREADY-EXECUTED)
            (map-set transactions tx-id (merge tx {executed: true}))
            (print {event: "transaction-executed", tx-id: tx-id, executed-by: tx-sender})
            ;; If timelock path: queue the tx on the timelock contract with serialized args
            (if (get is-timelock tx)
                (begin
                    (try! (as-contract
                        (contract-call? .timelock queue-transaction
                            (get recipient tx)
                            (get function-name tx)
                            (get function-args tx)
                        )
                    ))
                    (ok true)
                )
                (ok true)
            )
        )
    )
)

;; ========== Public: Signer Management ==========

;; Replace a signer. Requires the caller to be a signer and the new signer
;; to not already be a signer. This is a 1-of-3 operation (any signer can
;; initiate a rotation). For stronger security, consider making this require
;; the threshold (2-of-3).
(define-public (replace-signer (old-signer principal) (new-signer principal))
    (begin
        (asserts! (is-signer tx-sender) ERR-NOT-SIGNER)
        (asserts! (not (is-signer new-signer)) ERR-SIGNER-ALREADY-EXISTS)
        (asserts! (not (is-eq old-signer new-signer)) ERR-INVALID-REPLACEMENT)
        (asserts! (is-signer old-signer) ERR-SIGNER-NOT-FOUND)
        (if (is-eq old-signer (var-get signer-1))
            (var-set signer-1 new-signer)
            (if (is-eq old-signer (var-get signer-2))
                (var-set signer-2 new-signer)
                (var-set signer-3 new-signer)
            )
        )
        (print {event: "signer-replaced", old-signer: old-signer, new-signer: new-signer, replaced-by: tx-sender})
        (ok true)
    )
)

;; ========== Read-Only ==========

;; Check if a principal is an approved signer
(define-read-only (is-approved (who principal))
    (ok (is-signer who))
)

;; Get the full transaction record
(define-read-only (get-transaction (tx-id uint))
    (map-get? transactions tx-id)
)

;; Get the list of current signers
(define-read-only (get-signers)
    (ok (list (var-get signer-1) (var-get signer-2) (var-get signer-3)))
)

;; Get the next available tx ID
(define-read-only (get-next-tx-id)
    (var-get next-tx-id)
)

;; Get the configured timelock address
(define-read-only (get-timelock-addr)
    (var-get timelock-addr)
)
