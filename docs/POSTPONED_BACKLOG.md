# Postponed Backlog

Items deferred under the Product Change Control rule (see `docs/PRODUCT_CHANGE_CONTROL.md`).

Each entry records: proposed feature, reason it is valuable, why it is currently deferred, dependencies, estimated complexity, and the change-control classification.

---

## Entry: CineX Migration Tracking Missing (found during Payout Rail extraction)

- **Proposed fix:** Add a schema_migrations tracking table to CineX's migration system, so seeds and other migrations do not re-run on every application boot.
- **Reason it is valuable:** CineX's current migration runner executes all files on every boot with no tracking. Migration 009's seed INSERT lacks a unique constraint, so it accumulates duplicate rows in the exchange_rates table each restart. This can produce ambiguous "latest rate" reads and other silent data drift. The defect surfaced while designing Payout Rail's extraction, where higher restart frequency makes the issue obvious.
- **Why it is currently deferred:** This is a CineX maintenance issue, not a Payout Rail extraction requirement. The extraction phase must not modify CineX behavior. Fixing it now would violate the "CineX is preserved verbatim" boundary and complicate the extraction.
- **Dependencies:** None blocking. Any CineX deployment or schema change touching exchange_rates would benefit from this fix.
- **Estimated complexity:** Low. One new migration file (schema_migrations table), a runner update to check/skip previously applied files, and optionally a unique constraint on the exchange_rates seed. Roughly 20–40 lines of code plus one SQL file.
- **Classification under PRODUCT_CHANGE_CONTROL:** B — Required for product correctness (CineX), but deferred by extraction boundary.