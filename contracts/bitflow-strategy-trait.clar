;; title: bitflow-strategy-trait
;; version: 1.0.0
;; Purpose: Standard interface for yield strategy integration
;; Implemented by AMM pool wrappers (Bitflow, ALEX, etc.)

(define-trait strategy-trait
    (
        ;; Deposit base asset into the yield strategy
        ;; @param amount - amount of base asset to deploy
        ;; @returns amount of LP tokens / shares received
        (deposit (uint) (response uint uint))

        ;; Withdraw from the yield strategy
        ;; @param lp-amount - amount of LP tokens / shares to redeem
        ;; @returns amount of base asset returned
        (withdraw (uint) (response uint uint))

        ;; Get current exchange rate (base-asset-per-lp-token * 1e8)
        ;; Used to compute accrued yield
        (get-exchange-rate () (response uint uint))

        ;; Get the current pool balance (total value locked in base asset)
        (get-pool-balance () (response uint uint))
    )
)
