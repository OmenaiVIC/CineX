;; title: timelock-trait
;; version: 1.0.0
;; Trait defining the timelock contract interface for CineX protocol

;; ========== Summary ==========
;; Standard interface for the timelock contract.
;; Enables the multi-sig to queue, cancel, and execute
;; administrative transactions with a 2880-block delay.
;; =============================

(define-trait timelock-trait
    (
        ;; Queue a transaction for timelocked execution
        ;; recipient: target contract to call
        ;; function-name: function to call on target
        ;; function-args: serialized arguments
        ;; Returns: queue-id (uint)
        (queue-transaction (principal (string-ascii 64) (string-ascii 512)) (response uint uint))

        ;; Execute a previously queued transaction after delay has passed
        ;; queue-id: the ID returned by queue-transaction
        (execute-transaction (uint) (response bool uint))

        ;; Cancel a queued transaction before execution
        ;; queue-id: the ID of the transaction to cancel
        (cancel-transaction (uint) (response bool uint))
    )
)
