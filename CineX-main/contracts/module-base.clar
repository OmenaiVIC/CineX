;; title: module-base
;; version: 1.0.1

;; Summary:A simple reference implementation for module-base-trait
;; Safe to add. Does not interfere with other contracts.

(impl-trait .module-base-trait.module-base-trait)

(define-constant MODULE-VERSION u1)
(define-constant MODULE-NAME "BASE-MODULE")

(define-data-var active bool true)


;; Returns the version of this module
(define-read-only (get-module-version)
    (ok MODULE-VERSION)
)


;; Returns whether the module is active
(define-read-only (is-module-active)
    (ok (var-get active))
)


;; Returns the module's name
(define-read-only (get-module-name) 
    (ok MODULE-NAME)
)


