;; title: emergency-module
;; version: 1.0.1
;; Purpose: Dummy contract implementing emergency-module-trait for testing
;; Safe for testing. Does not affect production logic.

(impl-trait .emergency-module-trait.emergency-module-trait)

(define-data-var system-paused bool false)
(define-data-var last-withdrawer principal tx-sender)
(define-constant ERR-NOT-ALLOWED (err u5000))

;; ---- EMERGENCY OPERATIONS
(define-public (emergency-withdraw (amount uint) (recipient principal)) 
    (begin 
        (var-set last-withdrawer recipient)
        (ok true)
    )
)

(define-public (set-pause-state (pause bool))
    (begin 
        (var-set system-paused pause)
        (ok true)
    )

)

(define-read-only (is-system-paused)
    (ok (var-get system-paused))
)