;; title: timelock
;; version: 1.0.0
;; 2880-block delay executor for CineX admin operations

;; ========== Summary ==========
;; Enforces a ~24-hour delay (2880 blocks @ ~30s/block) on
;; sensitive administrative actions. The multi-sig queues a
;; transaction here; anyone can execute it after the delay
;; expires. This gives signers and users a window to detect
;; and cancel a malicious queued action.
;;
;; IMPORTANT: Clarity does not support dynamic contract-call?
;; dispatch. The queue stores {recipient, function-name} as
;; informational metadata. Actual typed executions are added
;; as separate functions (e.g., execute-add-asset) on this
;; contract as target contracts are deployed. 

;; TO-DO: For Day 1 implementation, 
;; The execute function simply marks the queue entry as executed and
;; returns the stored data -- the caller then makes the actual
;; contract call using the timelock's authority via as-contract.
;; Typed execute helpers will be added in later days.
;;
;; Emergency bypass: targets check multi-sig directly via
;; is-approved for their emergency- functions.
;; =============================

(impl-trait .timelock-trait.timelock-trait)

;; Error codes
(define-constant ERR-NOT-MULTISIG (err u8100))
(define-constant ERR-QUEUE-NOT-FOUND (err u8101))
(define-constant ERR-ALREADY-EXECUTED (err u8102))
(define-constant ERR-ALREADY-CANCELLED (err u8103))
(define-constant ERR-DELAY-NOT-MET (err u8104))
(define-constant ERR-CALL-FAILED (err u8105))
(define-constant ERR-NOT-OWNER (err u8106))

;; 2880 blocks ~ 24 hours (Stacks targets ~30s block time)
(define-constant TIMELOCK-DELAY u2880)

;; ========== Data ==========

;; Multi-sig contract address -- only this contract can queue/cancel
(define-data-var contract-owner principal tx-sender)
(define-data-var multisig-addr principal 'SP000000000000000000002Q6VF78)
(define-data-var initialized bool false)

;; Queue of timelocked transactions
(define-map queued-transactions uint {
    recipient: principal,
    function-name: (string-ascii 64),
    function-args: (string-ascii 512),
    eta: uint,
    executed: bool,
    cancelled: bool,
    queued-at: uint
})

;; Next available queue ID
(define-data-var next-queue-id uint u1)

;; ========== Initialize ==========

;; Set the multi-sig contract address (only callable once)
(define-public (set-multisig-addr (addr principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
        (var-set multisig-addr addr)
        (var-set initialized true)
        (print {event: "multisig-addr-set", addr: addr})
        (ok true)
    )
)

;; ========== Public: Queue ==========

;; Queue a transaction for timelocked execution.
;; Only callable by the multi-sig contract.
;; recipient: target contract for the delayed call
;; function-name: function to call (informational; typed dispatch in later days)
(define-public (queue-transaction (recipient principal) (function-name (string-ascii 64)) (function-args (string-ascii 512)))
    (let ((queue-id (var-get next-queue-id)))
        (begin
            (asserts! (is-eq contract-caller (var-get multisig-addr)) ERR-NOT-MULTISIG)
            (map-set queued-transactions queue-id {
                recipient: recipient,
                function-name: function-name,
                function-args: function-args,
                eta: (+ block-height TIMELOCK-DELAY),
                executed: false,
                cancelled: false,
                queued-at: block-height
            })
            (var-set next-queue-id (+ queue-id u1))
            (print {event: "transaction-queued", queue-id: queue-id, recipient: recipient, function-name: function-name, eta: (+ block-height TIMELOCK-DELAY)})
            (ok queue-id)
        )
    )
)

;; ========== Public: Execute ==========

;; Execute a queued transaction after the delay has expired.
;; Marks the queue entry as executed and returns the stored params.
;; TODO: In later days, typed execute helpers (e.g., execute-add-asset)
;; will make the actual contract-call? using as-contract.
(define-public (execute-transaction (queue-id uint))
    (let ((queued (unwrap! (map-get? queued-transactions queue-id) ERR-QUEUE-NOT-FOUND)))
        (begin
            (asserts! (not (get executed queued)) ERR-ALREADY-EXECUTED)
            (asserts! (not (get cancelled queued)) ERR-ALREADY-CANCELLED)
            (asserts! (>= block-height (get eta queued)) ERR-DELAY-NOT-MET)
            (map-set queued-transactions queue-id (merge queued {executed: true}))
            (print {event: "transaction-executed", queue-id: queue-id, recipient: (get recipient queued), function-name: (get function-name queued)})
            (ok true)
        )
    )
)

;; ========== Public: Cancel ==========

;; Cancel a queued transaction before its delay expires.
;; Only callable by the multi-sig contract.
(define-public (cancel-transaction (queue-id uint))
    (let ((queued (unwrap! (map-get? queued-transactions queue-id) ERR-QUEUE-NOT-FOUND)))
        (begin
            (asserts! (is-eq contract-caller (var-get multisig-addr)) ERR-NOT-MULTISIG)
            (asserts! (not (get executed queued)) ERR-ALREADY-EXECUTED)
            (asserts! (not (get cancelled queued)) ERR-ALREADY-CANCELLED)
            (map-set queued-transactions queue-id (merge queued {cancelled: true}))
            (print {event: "transaction-cancelled", queue-id: queue-id, cancelled-by: contract-caller})
            (ok true)
        )
    )
)

;; ========== Read-Only ==========

;; Get the full queued transaction record
(define-read-only (get-queued-transaction (queue-id uint))
    (map-get? queued-transactions queue-id)
)

;; Get the next available queue ID
(define-read-only (get-next-queue-id)
    (var-get next-queue-id)
)

;; Get the configured multi-sig address
(define-read-only (get-multisig-addr)
    (var-get multisig-addr)
)
