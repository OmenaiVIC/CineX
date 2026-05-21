;; Auto-generated Rendezvous sanity test for timelock

(begin
  (print "Running generated sanity test for timelock...")
  (let ((expected 1) (result (+ 1 0)))
    (asserts! (is-eq expected result) "Basic sanity check failed")
  )
  (ok true)
)
