
;; title: escrow-module-trait
;; version: 1.0.0
;; summary:  Traits  of Escrow Module for Secure Fund Management of campaign funds
;; Author: Victor Omenai 
;; Created: 2025

;; Strategic Purpose: Define the "Key Resources" component interface of the Business Model Canvas of CineX
;; This trait ensures proper and secure management of the critical resource (funds)


(define-trait escrow-trait
  (
    ;; Deposit funds to campaign
     ;; @params: 
        ;; campaign ID - uint; amount - uint
    (deposit-to-campaign (uint uint) (response bool uint))
    
    ;; Withdraw funds from campaign
        ;; @params: 
            ;; campaign ID - uint; amount - uint
    (withdraw-from-campaign (uint uint) (response bool uint))
    
    ;; Collect platform fee
        ;; @params: 
            ;; campaign ID - uint; fee amount - uint
    (collect-campaign-fee (uint uint) (response bool uint))

    ;; Authorize withdrawal 
      ;; @params:
        ;; campaign-id - uint ; requester - principal
    (authorize-withdrawal (uint principal) (response bool uint))
    
    ;; Authorize fee-collection 
      ;; @params:
        ;; campaign-id - uint ; requester - principal
    (authorize-fee-collection (uint principal) (response bool uint))

    ;; Get campaign balance
    ;; @params: 
        ;; campaign ID - uint ; requester - principal 
    (get-campaign-balance (uint) (response uint uint))


  )
)