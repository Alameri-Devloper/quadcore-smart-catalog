# QSC Task 3.15.1-A-R1 — Branch-Scope Vocabulary Alignment and Final-Report Accuracy — Final Report

## Status

ReadyForReview

## Task

3.15.1-A-R1 — Branch-Scope Vocabulary Alignment and Final-Report Accuracy

## Branch

`feature/identity-accounts-recovery-bootstrap`

## English Summary

Corrected both independent-review findings without changing the approved Task A architecture. Identity membership now uses only the approved `AllBranches | SelectedBranches` vocabulary. Every Owner remains constrained to `AllBranches`; R1 does not add selected Branch ID persistence or authorization management.

Documentation and the original Task A final report now accurately state that Task A defines `SessionRevocationPort` only as a future integration seam. Reset and recovery use cases do not invoke session revocation. Actual revocation remains intentionally deferred until Task 3.15.1-B provides server-side session persistence.

## Arabic Summary

تم تصحيح ملاحظتي المراجعة المستقلة دون تغيير معمارية المهمة A المعتمدة. تستخدم عضوية الهوية الآن المفردات المعتمدة فقط `AllBranches | SelectedBranches`. يبقى كل مالك مقيداً بالقيمة `AllBranches`، ولا تضيف R1 تخزين معرفات الفروع المختارة أو إدارة الصلاحيات.

تم أيضاً تصحيح الوثائق والتقرير النهائي الأصلي للمهمة A لتوضيح أن المهمة A تعرّف `SessionRevocationPort` كحد تكامل مستقبلي فقط. لا تستدعي حالات استخدام إعادة التعيين أو الاستعادة إبطال الجلسات. يبقى الإبطال الفعلي مؤجلاً عمداً إلى المهمة 3.15.1-B بعد توفر تخزين جلسات الخادم.

## Root Cause Analysis

1. Task A introduced an incorrect legacy branch-scope term instead of the approved QSC value `SelectedBranches`.
2. The source correctly stopped at a future `SessionRevocationPort` contract, but the Task A report described reset/recovery transactions as if they invoked that seam. No invocation or implementation exists.
3. The first local integration attempt used a previously recorded unmerged `0007` checksum, so the isolated database retained the old constraint. The guarded test database was explicitly validated as loopback `quadcore_smart_catalog_test`, reset, and migrated from `0000` through the corrected `0007` before the successful run.

## Branch-Scope Vocabulary Review

- Domain vocabulary is derived from `BRANCH_SCOPES = ["AllBranches", "SelectedBranches"]`.
- `createMembership` rejects values outside that contract at runtime.
- Staff membership can represent either `AllBranches` or `SelectedBranches`.
- Owner membership accepts only `AllBranches`.
- The Drizzle schema, migration `0007`, and snapshot accept only `AllBranches` and `SelectedBranches`.
- An exact source search, excluding preserved prior review artifacts and generated caches, contains no legacy vocabulary occurrence.
- Selected Branch ID persistence and management remain deferred to Task 3.15.1-C.

## Session Revocation Accuracy Review

Task A defines `SessionRevocationPort` as a contract for later integration. No Task A use case receives, calls, or implements that port. Owner reset, emergency Owner reset, and recovery completion update credentials, increment password versions, clear login protection, invalidate/consume recovery challenges as applicable, and write Audit inside their Task A transactions. They do not revoke sessions because no server-side session persistence exists yet. Actual invocation belongs to Task 3.15.1-B.

No no-op adapter, fake session table, cookie, token, or premature Task B behavior was added.

## Architecture Review

The Identity bounded context, Workspace ownership, separate account/password lifecycles, Argon2id adapter, HMAC recovery digest, challenge lifecycle, bootstrap transaction, emergency reset, shared Audit, PostgreSQL Unit of Work, and Workspace-scoped isolation are unchanged. Application remains the transaction coordinator, and no repository calls another repository.

## Migration Review

Migration `0007_identity_accounts_recovery_bootstrap.sql` and `drizzle/meta/0007_snapshot.json` were corrected in place because `0007` is uncommitted, unmerged, and unapplied to Production. No `0008` was created. Historical migrations `0000`–`0006` remain untouched. The clean guarded integration lifecycle proves that `SelectedBranches` is accepted, the rejected legacy value violates `identity_memberships_branch_scope`, an Owner with `SelectedBranches` violates `identity_memberships_owner_scope`, and `Owner + AllBranches` remains valid.

## Test Results

All established checks passed on the corrected pre-bundle state:

| Command | Result |
| --- | --- |
| `npx.cmd tsc --noEmit` | Passed |
| `npx.cmd tsc --noEmit -p tsconfig.integration.json` | Passed |
| `npm.cmd run lint` | Passed |
| `npm.cmd test` | Passed; all existing suites plus 33/33 Identity tests |
| `npm.cmd run test:integration` | Passed: 77/77 across 15 suites after clean migration application |
| `npm.cmd run build` | Passed |
| `npm.cmd run db:check` | Passed: `Everything's fine` |
| exact legacy-vocabulary source search | Passed: no source matches |
| `git diff --check` | Passed; only non-failing LF-to-CRLF working-copy notices |
| `git status --short` | Inspected; expected combined Task A and A-R1 changes only |
| `git diff --stat` | Inspected |

Focused R1 coverage proves both approved branch-scope values, scoped Staff representation, runtime rejection of the legacy value, the Owner invariant, and PostgreSQL constraint behavior from the corrected migration.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.15.1-A-R1-Final-Report.md`

Task A files remain uncommitted and are included unchanged or corrected in the combined review bundle, as documented by the original Task A report.

## Files Modified

- `domains/identity/domain/member.ts`
- `domains/identity/domain/identity-domain.test.ts`
- `domains/identity/infrastructure/persistence/schema.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.integration.test.ts`
- `drizzle/0007_identity_accounts_recovery_bootstrap.sql`
- `drizzle/meta/0007_snapshot.json`
- `docs/01-Architecture/Identity/README.md`
- `docs/05-Development/Identity-Accounts-Recovery-Bootstrap.md`
- `docs/05-Development/Reports/QSC-Task-3.15.1-A-Final-Report.md`

## Files Deleted

None.

## Files Intentionally Unchanged

- Historical migrations `0000`–`0006` and their snapshots.
- Workspace bootstrap Owner result: `Owner + AllBranches`.
- Account, credential, login-protection, recovery, Audit, Unit-of-Work, multi-tenant, CLI, and cryptographic behavior.
- Task B sessions/cookies and Task C selected Branch ID persistence/authorization management.
- Catalog bounded contexts, APIs, UI, and trusted-context safeguards.
- Git index, refs, commits, history, and remote state.
- Prior DEV-001 artifacts, which remain preserved as historical review evidence.

## Architecture Changes

None. R1 aligns vocabulary and report accuracy inside the already approved Task A boundaries.

## Security Review

No credential, OTP, digest, HMAC secret, session token, provider credential, or database URL was added to source or reports. No public endpoint or session implementation was introduced. `npm audit`, `npm audit --omit=dev`, and `npm audit fix` were not run because explicit per-run approval was not provided; both optional DEV-001 audit checks are skipped.

## Known Limitations

- `SelectedBranches` is vocabulary only in Task A/R1; selected Branch IDs and their management belong to Task C.
- `SessionRevocationPort` is a future seam only; actual revocation belongs to Task B.
- Independent review and Production migration approval remain outstanding.

## Required Confirmations

- Confirm the only branch-scope vocabulary is `AllBranches | SelectedBranches`.
- Confirm every Owner remains `AllBranches`.
- Confirm selected Branch ID persistence was not introduced.
- Confirm corrected migration `0007` and snapshot align, with no `0008` or historical migration edits.
- Confirm Task A defines but does not invoke or implement session revocation.
- Confirm actual session revocation remains deferred to Task B.
- Confirm no Git write or unapproved audit command occurred.

### التأكيدات المطلوبة

- التأكد من أن مفردات نطاق الفروع الوحيدة هي `AllBranches | SelectedBranches`.
- التأكد من بقاء كل مالك بالقيمة `AllBranches`.
- التأكد من عدم إضافة تخزين معرفات الفروع المختارة.
- التأكد من تطابق الترحيل `0007` واللقطة دون إنشاء `0008` أو تعديل الترحيلات التاريخية.
- التأكد من أن المهمة A تعرّف حد إبطال الجلسات ولا تستدعيه أو تنفذه.
- التأكد من بقاء الإبطال الفعلي مؤجلاً إلى المهمة B.

## Summary

Both A-R1 findings are corrected and verified. Status is `ReadyForReview`, not independently approved.

## Next Recommendation

Independently review the A-R1 DEV-001 bundle. After approval, commit Task A and A-R1 together, push the prepared branch, create and independently review the PR, merge, and only then begin Task 3.15.1-B.

## Git and Review Integrity

- Current branch remains `feature/identity-accounts-recovery-bootstrap`.
- Combined Task A and A-R1 changes remain unstaged/untracked.
- No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, branch deletion, or other Git write operation was performed.
- Only the guarded local `quadcore_smart_catalog_test` database was reset; its prior test-only contents are not recoverable. No Production or external database was touched.
- Prior review artifacts were not deleted or overwritten.
- DEV-001 uses both audit skip flags and publishes collision-safe R1 report, ZIP, and checksum artifacts with exact source copies and sanitized evidence.
