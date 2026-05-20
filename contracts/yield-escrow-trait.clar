;; title: yield-escrow-trait
;; version: 2.0.0
;; Purpose: Standard interface for yield escrow operations
;; v2: Backer-centric yield distribution (70/20/10 split)

(define-trait yield-escrow-trait
    (
        ;; Deposit campaign funds into yield escrow
        ;; @param campaign-id - campaign whose funds are being deposited
        ;; @param amount - amount of base asset to deposit
        ;; @param strategy-opt - optional override strategy (none = default strategy)
        ;; @returns ok if deposited
        (deposit-to-yield-escrow (uint uint (optional principal)) (response bool uint))

        ;; Withdraw principal from yield escrow back to campaign
        ;; @param campaign-id - campaign withdrawing funds
        ;; @param amount - amount of base asset to withdraw
        ;; @returns ok if withdrawn
        (withdraw-from-yield-escrow (uint uint) (response bool uint))

        ;; Backer: claim proportional share of accrued yield (70% pool)
        ;; @param campaign-id - campaign to claim from
        ;; @returns amount of yield claimed
        (claim-backer-yield (uint) (response uint uint))

        ;; Creator: claim performance bonus (10% pool), conditional on milestone standing
        ;; @param campaign-id - campaign to claim bonus from
        ;; @returns amount of bonus claimed
        (claim-creator-bonus (uint) (response uint uint))

        ;; Admin: sweep accumulated platform yield share (20% pool)
        ;; @param campaign-id - campaign to distribute from
        ;; @returns amount distributed
        (distribute-platform-yield (uint) (response uint uint))
    )
)
