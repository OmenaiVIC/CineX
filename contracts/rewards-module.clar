;; title: rewards-module
;; version: 1.0.0
;; Author: Victor Omenai 
;; Created: 2025

;; ========= Summary ==========
;; This rewards-module acts like a "Reward Manager" 
;;    => collecting minting fees, 
;;    => ensuring only the right people can give rewards, recording who earned what, 
;;    => and organizing mass (batch) reward distribution; the actual NFT minting is done separately by the NFT contract.


;; ========= Description ==========
;; Implementation of Rewards module trait
;; This Rewards Module in CineX handles the secure distribution of campaign rewards to contributors. It allows campaign owners to mint 
;; and assign NFT rewards based on contribution tiers, tracks each reward issued, and collects minting fees to support platform sustainability. 
;; The module ensures that rewards are properly authorized, recorded, and linked to the correct campaigns through direct interaction 
;; with the core CineX platform and a separate NFT rewards contract.

;; Strategic Purpose: Manages backer incentives and value delivery
;; This addresses the "Value Proposition component of the Business Model of CineX

;; Implements the Rewards Trait interface
(impl-trait .rewards-module-trait.rewards-trait)

;; Implementing the emergecny-module-trait 
(impl-trait .emergency-module-trait.emergency-module-trait)
(impl-trait .module-base-trait.module-base-trait)

;; Import traits that will be called 
(use-trait rewards-crowdfunding-trait .crowdfunding-module-traits.crowdfunding-trait)
(use-trait rewards-nft-trait .rewards-module-trait.rewards-trait)
(use-trait rewards-emergency-module .emergency-module-trait.emergency-module-trait)
(use-trait rewards-module-base .module-base-trait.module-base-trait)


;; Contract principal as Core contract reference pointing to the CineX main contract
(define-data-var core-contract principal tx-sender)

;; Contract principal as Rewards-NFT contract reference pointing to the NFT contract that mints rewards
(define-data-var rewards-contract principal tx-sender)

;;  Contract principal variable as the crowdfunding module contract reference pointing to the crowdfunding contract
(define-data-var crowdfunding-contract principal tx-sender)

;; Emergency operations counter for audit trail 
(define-data-var emergency-ops-counter uint u0) ;; initialized to u0 at deployment - no audit of emergency operations yet

;;;; ========== Emergency State ========
;; Variable to hold state of operations 'not paused (false)' until when necessary 
(define-data-var emergency-pause bool false)

;; Variable to hold state of module-version - initialized to the first version (V1) at deployment 
(define-data-var module-version uint u1)

;; Variable to hold state of module-active - initialized to true, implying module is actively running
(define-data-var module-active bool true)


;; Constant holding contract-owner principal
(define-constant CONTRACT-OWNER tx-sender)

;; Security constants aligned with main hub 
(define-constant BURN-ADDRESS 'SP000000000000000000002Q6VF78) ;; Burn address to prevent accidental burn


;; Constant fee required to mint a reward NFT (in microSTX, 1 STX = 1_000_000 microSTX)
(define-constant REWARD-MINTING-FEE u1000000)

;; Define custom error codes for better debugging
(define-constant ERR-NOT-AUTHORIZED (err u3000))
(define-constant ERR-CAMPAIGN-NOT-FOUND (err u3001))
(define-constant ERR-INVALID-REWARD-TIER (err u3002))
(define-constant ERR-TRANSFER-FAILED (err u3003))
(define-constant ERR-REWARD-MINT-FAILED (err u3004))
(define-constant ERR-LISTS-UNEQUAL-LENGTH (err u3005))
(define-constant ERR-REWARD-NOT-FOUND (err u3006))
(define-constant ERR-SYSTEM-NOT-PAUSED (err u3007))
(define-constant ERR-SYSTEM-PAUSED (err u3008))
(define-constant ERR-INVALID-AMOUNT (err u3009))
(define-constant ERR-INSUFFICIENT-FUNDS (err u3010))
(define-constant ERR-INVALID-RECIPIENT (err u3011))


;; Map to track each contributor's reward for each campaign
(define-map contributor-rewards { campaign-id: uint, contributor: principal } {
    tier: uint,                                 ;; Tier of reward received
    description: (string-ascii 150),             ;; Description of the reward
    token-id: (optional uint)                    ;; Token ID of the minted NFT reward
  }
)

;; Emergency operations log for audit trail
(define-map emergency-ops-log { ops-count-id: uint } { 
  emergency-ops-type: (string-ascii 150),
  recipient: principal,
  admin: principal,
  block-height: uint,
  reason: (string-ascii 100) 
  })


;; Tracks the total minting fees collected across all rewards
(define-data-var total-minting-fees uint u0)

;; --- Core functionality begins ---

;; Awards a single campaign reward to a contributor
(define-public (award-campaign-reward (campaign-id uint) 
  (new-contributor principal) 
  (new-reward-tier uint) 
  (new-reward-desc (string-ascii 150))
  (crowdfunding-address <rewards-crowdfunding-trait>))
  (let
    (

      ;; Fetch the campaign details from the crowdfunding module
      (campaign (unwrap! (contract-call? crowdfunding-address get-campaign campaign-id) ERR-CAMPAIGN-NOT-FOUND))

      ;; Get current-owner of campaign
      (current-owner  (get owner campaign))

      ;; Get current-reward-tiers of the campaign
      (current-reward-tiers (get reward-tiers campaign))

      ;; Get core-contract
      (authorized-core-contract (var-get core-contract))

      ;; Get current-total-minting-fees
      (current-total-minting-fees (var-get total-minting-fees))

      ;; Calculate new-total-minting-fees
      (new-total-minting-fees (+ current-total-minting-fees REWARD-MINTING-FEE))

      ;; Track contributor-token-id to unwrapped minting details of exact contributor's token 
      (contributor-token-id (unwrap! (contract-call?  .CineX-rewards-sip09  mint new-contributor campaign-id new-reward-tier new-reward-desc) 
            ERR-REWARD-MINT-FAILED))


    )
      ;; Ensure that the caller is the owner of the campaign
      (asserts! (is-eq tx-sender current-owner) ERR-NOT-AUTHORIZED)
    
      ;; Ensure that the reward tier is within valid range
      (asserts! (and (> new-reward-tier u0) (<= new-reward-tier current-reward-tiers)) ERR-INVALID-REWARD-TIER)
    
      ;; Collect minting fee from caller and send to the core contract
      (unwrap! (stx-transfer? REWARD-MINTING-FEE tx-sender authorized-core-contract) ERR-TRANSFER-FAILED)
    
      ;; Update the total minting fees counter
      (var-set total-minting-fees new-total-minting-fees)

      
      ;; Save the contributor's reward details in the map
      (map-set contributor-rewards { campaign-id: campaign-id, contributor: new-contributor } {
          tier: new-reward-tier,
          description: new-reward-desc,
          token-id: (some contributor-token-id)
        })
      
      ;; Return the minted token ID
      (ok contributor-token-id)
    
  )
)

;; Awards multiple campaign rewards at once (batch processing)
(define-public (batch-award-campaign-rewards (campaign-id uint) 
  (contributors (list 50 principal)) 
  (reward-tiers (list 50 uint)) 
  (reward-descriptions (list 50 (string-ascii 150))) 
  (crowdfunding-address <rewards-crowdfunding-trait>))
  (let
    (
      ;; Fetch the campaign details
      (campaign (unwrap! (contract-call? crowdfunding-address get-campaign campaign-id) ERR-CAMPAIGN-NOT-FOUND))

      ;; get owner of campaign
      (current-owner (get owner campaign)) 

      ;; Get core-contract
      (authorized-core-contract (var-get core-contract))

      ;; Get number of contributors
      (contributors-count (len contributors))
      
      ;; Calculate total minting fee based on number of contributors
      (total-batch-minting-fee (* contributors-count REWARD-MINTING-FEE))

      ;; Get current-total-minting-fees
      (current-total-minting-fees (var-get total-minting-fees))

      ;; Calculate new-total-minting-fees
      (new-batch-total-minting-fees (+ current-total-minting-fees total-batch-minting-fee))

      ;; Use the variable to call the contract and Batch mint NFT rewards
      (mint-result (unwrap! (contract-call? .CineX-rewards-sip09 batch-mint contributors reward-tiers reward-descriptions campaign-id)
                      ERR-REWARD-MINT-FAILED))

    )
      ;; Validate caller is the campaign owner
      (asserts! (is-eq tx-sender current-owner) ERR-NOT-AUTHORIZED)
    
      ;; Ensure input lists (contributors, tiers, descriptions) are the same length
      (asserts! (and 
                  (is-eq contributors-count (len reward-tiers)) 
                  (is-eq contributors-count (len reward-descriptions)))
             ERR-LISTS-UNEQUAL-LENGTH)
    
      ;; Collect total minting fees
      (unwrap! (stx-transfer? total-batch-minting-fee tx-sender authorized-core-contract) ERR-TRANSFER-FAILED)
    
      ;; Update total collected fees
      (var-set total-minting-fees new-batch-total-minting-fees)
    
      ;; Note: This simple version does not store individual token IDs for batch mints
      (ok mint-result)
    
  )
)

;; Fetch the reward information of a contributor for a specific campaign
(define-read-only (get-contributor-reward (campaign-id uint) (contributor principal))
  (match (map-get? contributor-rewards { campaign-id: campaign-id, contributor: contributor })
    reward (ok reward)             ;; If reward exists, return it
    ERR-REWARD-NOT-FOUND                    ;; Else, return reward-not-found error
  )
)

;; Initialization function to set up core-contract, as well as the crowdfunding and escrow contract addresses
;; Purpose: Can only be called once by the contract owner (tx-sender at deployment) to handle initial bootstrapping
(define-public (initialize (core principal) (crowdfunding principal) (rewards principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set core-contract core)
    (var-set crowdfunding-contract crowdfunding)
    (var-set rewards-contract rewards)
    (ok true)
  )
)

;; Set the crowdfunding-contract 
;; Purpose: Dynamic module replacement
(define-public (set-crowdfunding (crowdfunding principal))
  (begin 
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set crowdfunding-contract crowdfunding)
    (ok true)
  )   
)

;; Set the rewards-contract 
;; Purpose: Dynamic module replacement
(define-public (set-rewards (rewards principal))
  (begin 
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set rewards-contract rewards)
    (ok true)
  )   
)


;; ========== EMERGENCY PAUSE MANAGEMENT FUNCTIONS ==========
;; Function to allow only core contract to set pause state
(define-public (set-pause-state (pause bool))
  (let 
    (
      ;; Get hub 
      (cinex-hub (var-get core-contract))
    ) 
    ;; Only core contract can set pause state
    (asserts! (is-eq contract-caller cinex-hub) ERR-NOT-AUTHORIZED)

    ;; Ensure system is not paused
    (asserts! (check-system-not-paused) ERR-SYSTEM-PAUSED)

    ;; Set the system-paused to pause
    (var-set emergency-pause pause)

    ;; Print log for efficient Audit trails
    (print 
       {
        event: "pause-state-changed",
        new-state: pause,
        caller: contract-caller,
        block-height: block-height

       }
    
    
    )
      
    (ok true) 
  )
)

;; Helper function to check system-not-paused
(define-private (check-system-not-paused)
  (let 
    (
      ;; Get system-paused state
      (current-system-paused-state (var-get emergency-pause))
    ) 
    (not current-system-paused-state)
  )
)

;; Get system-paused status
(define-read-only (is-system-paused) 
  (ok (var-get emergency-pause))
)


;; Function to implement emergency withdraw
(define-public (emergency-withdraw (amount uint) (recipient principal))
  (let 
    (
      ;; Get current contract's balance 
      (current-contract-balance (stx-get-balance (as-contract tx-sender)))

      ;; Get current emergency-ops counter, and consequently its next-emergency-ops counter to track state of a new emergency operation
      (current-emergency-ops-counter (var-get emergency-ops-counter))
      (next-emergency-ops-count (+ current-emergency-ops-counter u1))

    )

    ;; Ensure only core contract can call this emergency withdraw function
    (asserts! (is-eq contract-caller (var-get core-contract)) ERR-NOT-AUTHORIZED)

    ;; Ensure system must be paused before emergency withdrawal
    (asserts! (var-get emergency-pause) ERR-SYSTEM-NOT-PAUSED)

    ;; Ensure amount to be withdrawn is > u0
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)

    ;; Ensure amount to be withdrawn is <= current-balance, else trigger INSUFFICIENT FUNDS
    (asserts! (<= amount current-contract-balance) ERR-INSUFFICIENT-FUNDS)

    ;; Ensure contract is not BURN-ADDRESS, is not CONTRACT-OWNER, and, is not also of this contract principal
    (asserts! (and 
                (not (is-eq contract-caller BURN-ADDRESS)) 
                (not (is-eq contract-caller CONTRACT-OWNER)) 
                  (not (is-eq contract-caller (as-contract tx-sender))) 
              )
                ERR-INVALID-RECIPIENT)

    ;; Update emergency-ops state map
    (map-set emergency-ops-log { ops-count-id: next-emergency-ops-count } { 
      emergency-ops-type: "emergency ops withdraw",
      recipient: recipient,
      admin: contract-caller,
      block-height: block-height,
      reason: "emergency funds recovery" 
    })

    ;; Update emergency ops counter with new emergency ops count
    (var-set emergency-ops-counter next-emergency-ops-count)

    ;; Perform emergency withdrawal
    (unwrap! (stx-transfer? amount (as-contract tx-sender) recipient) ERR-TRANSFER-FAILED)

    ;; Print log for efficient Audit trails
    (print 
        {
        event: "emergency withdrawal",
        operation-id: next-emergency-ops-count,
        amount: amount,
        recipient: recipient,
        admin: contract-caller,
        block-height: block-height

      }
    
    )

    (ok true)

  )  
)

;; ========== BASE TRAIT IMPLEMENTATIONS ==========
;; Get module version number    
(define-read-only (get-module-version)
    (ok (var-get module-version)) ;; return module version number
) 

;; Check if module is active/currently working properly 
(define-read-only (is-module-active)
    (ok (var-get module-active)) ;; return if true or false
)

;; Get module name to identify which module this is
(define-read-only (get-module-name) 
    (ok "rewards-module") ;; return current module name
)


