;; title: mock-strategy
;; version: 1.0.0
;; summary: Minimal strategy mock for yield-escrow testing
;; Returns fixed exchange rate, tracks simple deposit/withdraw

(impl-trait .bitflow-strategy-trait.strategy-trait)

(define-data-var balance uint u0)
(define-data-var lp-balance uint u0)
(define-data-var exchange-rate uint u100000000)

(define-public (deposit (amount uint))
  (begin
    (unwrap! (stx-transfer? amount tx-sender (as-contract tx-sender)) (err u1))
    (var-set balance (+ (var-get balance) amount))
    (var-set lp-balance (+ (var-get lp-balance) amount))
    (print { event: "mock-deposit", amount: amount })
    (ok amount)
  )
)

(define-public (withdraw (lp-amount uint))
  (let
    (
      (caller tx-sender)
      (rate (var-get exchange-rate))
      (base-return (/ (* lp-amount rate) u100000000))
    )
    (unwrap! (as-contract (stx-transfer? base-return tx-sender caller)) (err u1))
    (var-set balance (- (var-get balance) base-return))
    (var-set lp-balance (- (var-get lp-balance) lp-amount))
    (print { event: "mock-withdraw", lp-amount: lp-amount, base-return: base-return })
    (ok base-return)
  )
)

(define-read-only (get-exchange-rate)
  (ok (var-get exchange-rate))
)

(define-read-only (get-pool-balance)
  (ok (var-get balance))
)

(define-read-only (get-lp-balance)
  (ok (var-get lp-balance))
)

(define-public (set-exchange-rate (rate uint))
  (begin
    (var-set exchange-rate rate)
    (ok true)
  )
)
