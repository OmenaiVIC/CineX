;; Title: escrow-module
;; Version: 1.0.0
;; Summary: Escrow Module for Secure Fund Management of campaign funds
;; Author: Victor Omenai 
;; Created: 2025
;; version: 1.0.0

;;;; ============= Description ==============
;; Implementation of Escrow module trait
;; Strategic Purpose: Secures and manages campaign funds
;; This addresses the "Key Resources for delivering Value propostion" component of the Business Model Canvas of CineX


;; Import the escrow trait interface to ensure the contract implements required functions
(impl-trait .escrow-module-trait.escrow-trait)

;; Implementing the emergecny-module-trait 
(impl-trait .emergency-module-trait.emergency-module-trait)
(impl-trait .module-base-trait.module-base-trait)

;; Store the principal address of the core contract 
(define-data-var core-contract principal tx-sender)

;;  Contract principal variable as the crowdfunding module contract reference pointing to the crowdfunding contract
(define-data-var crowdfunding-contract principal tx-sender)

;;  Contract principal variable as the escrow module contract reference
(define-data-var escrow-contract principal tx-sender)

;; Define custom error codes for standardized error handling
(define-constant ERR-NOT-AUTHORIZED (err u4000))         ;; Caller is not authorized
(define-constant ERR-CAMPAIGN-NOT-FOUND (err u4001))      ;; Campaign ID not found
(define-constant ERR-TRANSFER-FAILED (err u4002))         ;; STX transfer failed
(define-constant ERR-INSUFFICIENT-BALANCE (err u4003))    ;; Not enough funds in escrow
(define-constant ERR-SYSTEM-NOT-PAUSED (err u4004)) ;; System still running
(define-constant ERR-SYSTEM-PAUSED (err u4005))
(define-constant ERR-INVALID-AMOUNT (err u4006))
(define-constant ERR-INSUFFICIENT-FUNDS (err u4007))
(define-constant ERR-INVALID-RECIPIENT (err u4008))
(define-constant ERR-SELF-NOT-INIT (err u4009))           ;; Self-contract not initialized

;; Constant holding contract-owner principal
(define-constant CONTRACT-OWNER tx-sender)

;; Security constants aligned with main hub 
(define-constant BURN-ADDRESS 'SP000000000000000000002Q6VF78) ;; Burn address to prevent accidental burn


;; Emergency operations counter for audit trail 
(define-data-var emergency-ops-counter uint u0) ;; initialized to u0 at deployment - no audit of emergency operations yet

;;;; ========== Emergency State ========
;; Variable to hold state of operations 'not paused (false)' until when necessary 
(define-data-var emergency-pause bool false)

;; Variable to hold state of module-version - initialized to the first version (V1) at deployment 
(define-data-var module-version uint u1)

;; Variable to hold state of module-active - initialized to true, implying module is actively running
(define-data-var module-active bool true)


;; Mapping to track each campaign's STX funds in escrow
(define-map campaign-escrow-balances uint uint)

;; Authorization map
(define-map authorized-withdrawals { campaign-id: uint, requester: principal } bool)

;; Authorization map for fee collection permission
(define-map authorized-fee-collections { campaign-id: uint, requester: principal } bool)


;; Emergency operations log for audit trail
(define-map emergency-ops-log { ops-count-id: uint } { 
  emergency-ops-type: (string-ascii 150),
  recipient: principal,
  admin: principal,
  block-height: uint,
  reason: (string-ascii 100) 
  })




;; ======= PUBLIC FUNCTIONS ====
;; Public function: Allows any user to deposit funds into a campaign's escrow balance
(define-public (deposit-to-campaign (campaign-id uint) (amount uint))
  (let
    (
      ;; Retrieve current balance, defaulting to 0 if campaign does not exist yet
      (current-balance (default-to u0 (map-get? campaign-escrow-balances campaign-id)))
      ;; Calculate the new balance after deposit
      (new-balance (+ current-balance amount))
    )
    ;; Transfer the STX from sender to contract address
    (unwrap! (stx-transfer? amount tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)
    
    ;; Update the escrow balance with new-balance for the campaign
    (map-set campaign-escrow-balances campaign-id new-balance)
    
    (ok true)
  )
)

;; Core contract authorizes withdrawal
(define-public (authorize-withdrawal (campaign-id uint) (new-requester principal))
  (begin
    ;; Ensure Only core contract can authorize withdrawals
    (asserts! (is-eq tx-sender (var-get core-contract)) ERR-NOT-AUTHORIZED)
    (ok (map-set authorized-withdrawals { campaign-id: campaign-id, requester: new-requester } true))
  
  )

)

;; Core contract authorizes fee collection
(define-public (authorize-fee-collection (campaign-id uint) (requester principal))
  (begin
    ;; Ensure only core contract can authorize fee collection
    (asserts! (is-eq tx-sender (var-get core-contract)) ERR-NOT-AUTHORIZED)
    (map-set authorized-fee-collections { campaign-id: campaign-id, requester: requester } true)
    (ok true)
     
  )
)



;; Public function: Allows the campaign owner to withdraw a specified amount from escrow
(define-public (withdraw-from-campaign (campaign-id uint) (amount uint))
  (let
    (
      ;; Retrieve current balance
      (current-balance (default-to u0 (map-get? campaign-escrow-balances campaign-id)))

      ;; Check authorization from authorize-withdrawal map, else default to false
      (is-withdrawal-authorized (default-to false (map-get? authorized-withdrawals { campaign-id: campaign-id, requester: tx-sender })))

      (requester tx-sender)
    )
      ;; Ensure caller is authorized core for withdrawal 
      (asserts! is-withdrawal-authorized ERR-NOT-AUTHORIZED)

      ;; Ensure there are enough funds to withdraw
      (asserts! (>= current-balance amount) ERR-INSUFFICIENT-BALANCE)
    
      (let 
        (
          ;; Calculate the new balance after withdrawal
          (new-balance (- current-balance amount))
        ) 
        ;; Update the escrow balance
        (map-set campaign-escrow-balances campaign-id new-balance)
    
        ;; Transfer the withdrawn amount to the authorized requester
        (unwrap! (as-contract (stx-transfer? amount tx-sender requester)) ERR-TRANSFER-FAILED)
    
        ;; Clear authorization after successful withdrawal
        (map-delete authorized-withdrawals { campaign-id: campaign-id, requester: tx-sender })
        (ok true)
      )
  )
)

;; Public function: Allows the campaign owner to pay a fee from the campaign's escrowed funds to the core contract
(define-public (collect-campaign-fee (campaign-id uint) (fee-amount uint))
  (let
    (
      ;; Retrieve current balance
      (current-balance (default-to u0 (map-get? campaign-escrow-balances campaign-id)))

      ;; Check authorization from authorize-fee-collection map, else default to false
      (is-fee-collection-authorized (default-to false (map-get? authorized-fee-collections { campaign-id: campaign-id, requester: tx-sender })))

      ;; Calculate the new balance after fee deduction
      (new-balance (- current-balance fee-amount))

      ;;Get core-contract
      (authorized-core-contract (var-get core-contract))
    )
      ;; Ensure caller is authorized core for fee-collection-authorized
      (asserts! is-fee-collection-authorized ERR-NOT-AUTHORIZED)

      ;; Ensure there are enough funds to cover the fee
      (asserts! (>= current-balance fee-amount) ERR-INSUFFICIENT-BALANCE)
    
      ;; Update the escrow balance
      (map-set campaign-escrow-balances campaign-id new-balance)
    
      ;; Transfer the fee amount to the core contract address
      (unwrap! (stx-transfer? fee-amount (as-contract tx-sender) authorized-core-contract) ERR-TRANSFER-FAILED)

      ;;  Clear authorization after successful fee collection
      (map-delete authorized-fee-collections { campaign-id: campaign-id, requester: tx-sender })
    
      (ok true)
  )
)

;; Read-only function: Fetches the current escrow balance for a given campaign
(define-read-only (get-campaign-balance (campaign-id uint))
  ;; default-to zero if optional-value of campaign-balance is none 
  (ok (default-to u0 (map-get? campaign-escrow-balances campaign-id)))
)

;; Public function: One-time initializer to set the core contract address, as well as the crowdfunding and escrow contract addresses
;; Purpose: Can only be called once by the contract owner (tx-sender at deployment) to handle initial bootstrapping
(define-public (initialize (core principal) (crowdfunding principal) (escrow principal))
  (begin
    ;; Ensure that only the contract owner can initialize
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Set the core-contract variable
    (var-set core-contract core)
    (var-set crowdfunding-contract crowdfunding)
    (var-set escrow-contract escrow )
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


;; Set the escrow-contract 
;; Purpose: Dynamic module replacement
(define-public (set-escrow (escrow principal))
  (begin 
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set escrow-contract escrow)
    (ok true)
  )   
)


;; ========== EMERGENCY MODULE TRAIT IMPLEMENTATIONS ==========
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

;; Get emergency-ops count
(define-read-only (get-emergency-ops-count)
  (ok (var-get emergency-ops-counter))
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
    (ok "escrow-module") ;; return current module name
)



