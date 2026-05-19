;; title: milestone-escrow-trait
;; version: 1.0.0
;; summary: Trait for milestone-based escrow with sequential backer approval
;; author: Victor Omenai
;; created: 2025

;; ========== Description ==========
;; Defines the milestone-escrow interface for CineX.
;; Campaigns hold milestones; backers deposit STX;
;; creators submit proof; backers approve sequentially;
;; funds release with platform fee deduction.
;; ================================

(define-trait milestone-escrow-trait
  (
    ;; Create a campaign with project metadata and milestones
    ;; Returns the new campaign ID
    (create-campaign (uint principal uint (list 10 { name: (string-ascii 64), amount: uint }) uint) (response uint uint))

    ;; Deposit STX into a campaign's escrow
    (deposit (uint uint) (response bool uint))

    ;; Submit proof hash for a completed milestone (creator only)
    (submit-milestone-proof (uint uint (buff 32)) (response bool uint))

    ;; Approve a milestone (backer-gated, creator cannot self-approve)
    (approve-milestone (uint uint) (response bool uint))

    ;; Release funds for an approved milestone, deducting platform fee
    (release-milestone-funds (uint uint) (response bool uint))

    ;; Set platform fee collector address and fee rate (owner only)
    (set-fee-parameters (principal uint) (response bool uint))
  )
)


