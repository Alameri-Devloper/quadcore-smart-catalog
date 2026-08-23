# QSC Task 3.17-R1 Final Report

## Status

ReadyForReview

## Task

Task 3.17-R1 — Atomic Transfer Rollback Hardening

## Branch

`feature/branch-inventory-pricing` at baseline commit `65021e26ba1d8e9d0a979835d51e3a0294b7a22a`.

## English Summary

Fixed the independently reviewed Branch Inventory transfer defect with the smallest architecture-consistent change. A failed balance persistence step now raises an internal typed transaction-abort exception; the owning Unit of Work rolls back every write, and the application translates the exception outside the transaction to the existing sanitized `InventoryConflict` result. A deterministic transaction test proves rollback after the source save succeeds and the destination save fails, including clean same-operation retry behavior.

## Arabic Summary

تم إصلاح عيب ذرية تحويل مخزون الفروع الذي كشفته المراجعة المستقلة بأصغر تعديل متوافق مع البنية الحالية. يؤدي فشل حفظ الرصيد الآن إلى استثناء داخلي Typed يُجهض المعاملة؛ فتتراجع وحدة العمل عن جميع الكتابات، ثم تحوّل طبقة التطبيق الاستثناء خارج المعاملة إلى النتيجة المنقحة الحالية `InventoryConflict`. يثبت اختبار حتمي للمعاملة التراجع بعد نجاح حفظ رصيد المصدر وفشل حفظ رصيد الوجهة، كما يثبت إمكانية إعادة المحاولة بالمعرف نفسه بصورة صحيحة.

## Independent Review Finding

The original transfer used short-circuit boolean persistence checks and returned `InventoryConflict` normally when the destination balance save returned `false`. Because the PostgreSQL Unit of Work commits a normally returned callback, a successful source update could commit without the destination update.

## Root Cause Review

The defect was not in PostgreSQL locking or transfer calculations. It was a transaction-control mismatch: the application represented a post-mutation persistence failure as a normal result inside the transaction, while the Unit of Work uses thrown rejection to trigger rollback.

The issue was reproduced before the fix with a deterministic transactional fake. The assertion observed source on-hand quantity `3` instead of the original `5` after the forced second save failure.

## Transfer Atomicity Review

Transfer remains one Application-owned PostgreSQL transaction. Source and destination balances are locked in deterministic Branch-ID order. Both balance saves now execute sequentially and either failed save throws `InventoryTransactionAbort`; movements, Audit, operation completion, and commit are reached only after both saves succeed.

## Transaction Rollback Review

`InventoryTransactionAbort` is internal to the application module and carries an approved `InventoryError`. It escapes the Unit-of-Work callback so PostgreSQL rolls back, then the outer application boundary translates it to `InventoryConflict`. Exceptions from movement inserts, Audit inserts, operation completion, and other later persistence steps already escape and roll back naturally.

The same abort mechanism was applied to the other Inventory `saveBalance(false)` paths because the operation claim and a balance row created by `lockBalance` may already exist. This is the same partial-commit class, not an architectural expansion.

## Forced Second-Write Failure Review

The focused test uses a transaction-aware in-memory Unit of Work with one test-only fault: the first balance save succeeds and the second returns `false`. A normal callback commits its working copy, while a thrown callback discards it, matching the relevant PostgreSQL transaction contract without adding a Production fault-injection seam.

The test proves:

- source balance remains `5`;
- destination balance remains `0`;
- no `TransferOut` movement exists;
- no `TransferIn` movement exists;
- no successful Audit event exists;
- no claimed or completed operation survives;
- retrying the same command and operation ID succeeds, producing balances `3` and `2`, two correlated movements, one Audit event, and a completed operation result.

## Idempotency Rollback Review

The operation claim is created inside the same transaction. A persistence abort therefore removes the claim and any result with the rest of the transaction. A valid retry with the same operation ID executes normally. Successful transfer replay behavior remains unchanged and is still covered by PostgreSQL integration.

## Multi-Write Transaction Audit Review

- Inventory receive, issue, damage, restore, and correction: `saveBalance(false)` now aborts; movement, Audit, and operation completion failures already throw and roll back.
- Reservation creation: balance-save conflict now aborts; reservation/movement/Audit failures throw and roll back.
- Reservation release/fulfillment: balance-save conflict now aborts; the locked reservation update, movement, and Audit remain inside the same transaction and thrown failures roll back.
- Transfer: both balance-save conflicts abort; both movements, Audit, and operation completion remain in the transaction.
- Branch lifecycle: create/update conflict outcomes represent a single repository write that did not occur; a later Audit failure throws and rolls back the successful write.
- Branch Product listing: `set` conflict is a single no-write optimistic outcome; a later Audit failure throws and rolls back a successful listing write.
- Base/override pricing: set/clear conflict is a single no-write optimistic outcome; a later Audit failure throws and rolls back a successful price write.

No other Task 3.17 path contained the reviewed pattern of a successful business-state write followed by a repository `false` result and a normal failure return.

## Inventory Regression Review

All Inventory behavior remains intact: piece-only quantities, immutable movements, derived balances, receive/issue, reservations, release/fulfill, damage/restore, corrections, deterministic transfers, non-negative invariants, and idempotent successful replay. Focused Inventory tests pass 9 of 9.

## Concurrency Review

PostgreSQL tests pass for concurrent issue of the final piece, concurrent reservations without oversubscription, and atomic/idempotent transfer. Deterministic transfer lock ordering was not changed.

## Multi-Tenant Review

Workspace-scoped composite ownership, trusted Branch scope, same-Workspace transfer policy, and foreign nondisclosure were unchanged. PostgreSQL tenant constraints and existing HTTP/application tests continue to pass.

## Pricing Non-Regression Review

Pricing application behavior and persistence were not changed. All 8 focused pricing/listing/HTTP tests and PostgreSQL BIGINT, inheritance, override, clear, uniqueness, and enabled-currency tests pass.

## Permission Code Consistency Review

The implementation and documentation now consistently use the actual registry codes:

- `referenceCost.view`
- `referenceCost.manage`
- `referenceCost.branchOverride.manage`

The incorrect documentation-only alias `pricing.reference-cost.view` was corrected. No permission definition, assignment, or schema constraint was changed.

## Migration Non-Change Review

No migration or Drizzle snapshot was changed. Migrations and metadata `0000` through `0014` remain intentionally unchanged. The Task 3.17 migration files retain their 2026-08-20 timestamps, and `npm run db:check` passes. No Production migration was executed.

## Test Results

- `npx.cmd tsc --noEmit`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json`: passed.
- `npm.cmd run lint`: passed with no diagnostics.
- `npm.cmd test`: passed, including the new Inventory rollback test.
- `npm.cmd run test:branch`: 5 tests passed.
- `npm.cmd run test:inventory`: 9 tests passed.
- `npm.cmd run test:pricing`: 8 tests passed.
- `npm.cmd run test:reference-data`: 14 tests passed.
- `npm.cmd run test:product-entry`: passed.
- `npm.cmd run test:product-media`: 108 passed and 1 platform-permission skip.
- `npm.cmd run test:integration`: final run passed 110 tests in 22 suites.
- `npm.cmd run build`: passed; 37 static pages generated and all API routes compiled.
- `npm.cmd run db:check`: passed.
- `git diff --check`: passed; Git emitted only existing line-ending normalization notices.

## Forced Failure Test Results

The new test first failed against the reviewed implementation with `3n !== 5n`, proving the source mutation committed after the forced destination failure. After the fix, the same test passes all rollback, absence-of-side-effects, and retry assertions.

## PostgreSQL Integration Results

The guarded local test database reached assertions. After Docker Desktop was started, the first full run passed all Inventory tests but encountered one unrelated transient Identity concurrent-login assertion (`failed_attempt_count` was `4` instead of `0`). No Identity source was changed. A complete clean rerun passed all 110 tests across 22 suites, including Inventory concurrency and transfer assertions. No Production database was used.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.17-R1-Final-Report.md`.
- Generated review ZIP and detached checksum under the ignored `artifacts/task-reviews/` directory.

## Files Modified

- `domains/inventory/application/inventory.use-cases.ts` — internal typed transaction abort and aborting Inventory balance-save conflicts.
- `domains/inventory/application/inventory.use-cases.test.ts` — deterministic second-save failure, rollback, absence-of-side-effects, and retry proof.
- `docs/01-Architecture/Inventory/Branch-Inventory-and-Pricing.md` — bilingual rollback/idempotency transaction semantics.
- `docs/05-Development/Reports/QSC-Task-3.17-Final-Report.md` — corrected the Reference Cost permission code alias.

## Files Deleted

None.

## Files Intentionally Unchanged

- All migrations and snapshots `0000` through `0014`.
- Inventory persistence schema, PostgreSQL Unit of Work, repository ports, HTTP routes, and HTTP response contracts.
- Branch lifecycle, Branch Product listing, pricing, Identity permission definitions, Product Entry implementation, and Presentation files.
- Production configuration and real environment files.

## Known Limitations

- The forced second-write failure is proven through a deterministic application/Unit-of-Work transaction test. No Production PostgreSQL fault-injection behavior was added solely for testing.
- The existing PostgreSQL transfer integration continues to cover live success, replay, concurrency, constraints, and failure-before-write behavior, but does not inject a repository `false` after the first live balance update.
- Docker Desktop and the repository-local PostgreSQL test container remain running after verification.

## Required Confirmations

- Independent review should confirm that the internal exception escapes the transaction callback and is translated only outside it.
- Independent review should confirm the test proves rollback of balances, movements, Audit, and operation claim/result before approving R1.
- Production migration remains out of scope; there is no R1 schema change to deploy.

## Git and Review Integrity

- Work remained on `feature/branch-inventory-pricing` at baseline commit `65021e26ba1d8e9d0a979835d51e3a0294b7a22a`.
- No checkout, switch, reset, restore, clean, stash, stage, commit, merge, rebase, push, tag, or branch deletion was performed.
- Task 3.17 working-tree changes were preserved.
- No npm audit command was run.
- No credentials, environment files, database dumps, private values, or Production data are included.
- Review source files are preserved byte-for-byte; generated command evidence is sanitized.

## Architecture Changes

None. Application still owns one PostgreSQL transaction, repositories do not coordinate other repositories, public results remain typed, and no Saga, compensating movement, nested transaction, mutex, Redis, event sourcing, or new dependency was introduced.

## Summary

R1 closes the partial transfer commit path and the same Inventory balance-save transaction-abort class while preserving every approved Task 3.17 boundary and behavior. Required static, unit, focused, PostgreSQL, build, migration, and Git integrity gates pass.

## Next Recommendation

Stop for independent Task 3.17-R1 review. Do not begin Task 3.18. After approval only, the user may commit, push, wait for GitHub Actions, and merge according to the project workflow.
