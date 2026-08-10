# QSC Task 3.15.1-C-R1 Final Report

## Status

ReadyForReview

## Task

3.15.1-C-R1 — Workspace-Scoped Branch Reference Lookup

## Branch

`feature/identity-member-management`

Baseline HEAD: `3b923cb246ae1d1329c0cf8899eebce7a1754a66`.

## Root Cause

`WorkspaceBranchReferenceRepository.findByIds` accepted only Branch IDs. The PostgreSQL adapter consequently queried `branch_id IN (...)` across every Workspace, and Application code inspected the returned tenant identities to distinguish `BranchNotFound` from `BranchOutsideWorkspace`. This allowed a foreign Workspace row to cross the persistence boundary merely so Application could reject it, violating the QSC multi-tenant repository-read invariant.

The issue was reproduced before the fix with a focused Application regression: a Branch ID present only in Workspace B returned `BranchOutsideWorkspace` to an Owner in Workspace A, while a completely nonexistent ID returned `BranchNotFound`.

## English Summary

Corrected the Task C Branch-reference lookup at the repository/database boundary. The repository contract now requires trusted `WorkspaceId`; PostgreSQL applies `workspace_id = trusted workspaceId AND branch_id IN requested IDs`; the in-memory adapter mirrors the same invariant; and Application validates only scoped results. Foreign-only and nonexistent Branch IDs now both return `BranchNotFound`. The unmerged `BranchOutsideWorkspace` result code was removed because it has no remaining approved use. No schema, migration, dependency, UI, Branch aggregate, or broader Task C design changed.

## Arabic Summary

تم تصحيح البحث عن مراجع الفروع في المهمة C عند حد المستودع وقاعدة البيانات. يفرض عقد المستودع الآن تمرير `WorkspaceId` الموثوق، ويطبق PostgreSQL الشرطين `workspace_id = trusted workspaceId` و`branch_id IN requested IDs`، كما يطبق المستودع داخل الذاكرة القاعدة نفسها، ويتحقق التطبيق فقط من النتائج المقيدة. يعيد معرّف الفرع الموجود في مساحة عمل أجنبية والمعرّف غير الموجود النتيجة نفسها `BranchNotFound`. أزيلت النتيجة غير المدمجة `BranchOutsideWorkspace` لعدم وجود استخدام معتمد آخر لها. لم يتغير المخطط أو الهجرة أو الاعتماديات أو الواجهة أو تجميع الفرع أو تصميم المهمة C الأوسع.

## Architecture Changes

No architecture redesign. The existing Workspace-owned Branch-reference port was hardened so trusted tenant scope is mandatory at its method boundary and enforced by each adapter before rows are returned. Identity Application remains the transaction coordinator, no repository calls another repository, and `TrustedActorContext.workspaceId` remains the only authority source. Migration `0009` is unchanged and no migration `0010` was created.

## Multi-Tenant Verification

- Workspace A and Workspace B may each contain Active `branch-01`; Workspace A resolves only its own row.
- A Branch present only in Workspace B never appears in Workspace A repository results.
- Workspace A receives `BranchNotFound` for both a foreign-only ID and a completely missing ID.
- An Active same-Workspace Branch succeeds.
- An Inactive same-Workspace Branch still returns `BranchInactive`.
- Direct PostgreSQL repository coverage proves the Workspace predicate is applied before results leave persistence.

## Result Vocabulary Review

`BranchOutsideWorkspace` was removed from `IdentityErrorCode` and all validation logic. No active HTTP mapping or contract-documentation entry remains; this report mentions it only as historical root-cause evidence. `BranchNotFound` is the single scoped-not-found result for SelectedBranches validation, preventing tenant-existence disclosure.

## Migration Review

No schema change was required. `drizzle/0009_identity_member_administration.sql`, its snapshot, and migrations `0000` through `0008` were not changed by C-R1. No production or external migration was run.

## Verification Results

- Focused pre-fix regression — failed as expected: foreign-only ID returned `BranchOutsideWorkspace` instead of `BranchNotFound`.
- Focused post-fix member-administration test — passed 8/8.
- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed with zero warnings/errors.
- `npm.cmd test` — passed; Identity 65/65, Product Entry 132/132, task-review 45/45, Product aggregate 106/106, and Product Media 103 passed with one platform-permission skip.
- `npm.cmd run test:integration` — passed 86/86 across 17 suites using the guarded isolated PostgreSQL database.
- `npm.cmd run build` — passed.
- `npm.cmd run db:check` — passed.
- `git diff --check` — passed; informational Windows LF/CRLF conversion warnings only.
- `git status --short` and `git diff --stat` were inspected.
- Initial DEV-001 invocation — all command checks passed, but artifact status was `VerificationFailed` because two Markdown hard-break spaces failed the untracked-file integrity gate; the failed evidence was preserved.
- Corrected DEV-001 invocation — `ReadyForReview`; repository/ZIP/checksum integrity, stable working-tree fingerprint, source-byte preservation, sanitization, and Desktop publication verification passed.
- No npm audit command was run because explicit per-run approval was not provided.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.15.1-C-R1-Final-Report.md`

## Files Modified

- `docs/01-Architecture/Workspace/README.md`
- `docs/05-Development/Identity-Member-Administration.md`
- `docs/05-Development/Reports/QSC-Task-3.15.1-C-Final-Report.md`
- `domains/identity/application/identity-results.ts`
- `domains/identity/application/member-administration.test.ts`
- `domains/identity/application/member-administration.use-cases.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.integration.test.ts`
- `domains/identity/mock/in-memory-identity-unit-of-work.ts`
- `domains/workspace/infrastructure/persistence/postgresql-workspace.repository.ts`
- `domains/workspace/repositories/workspace.repository.ts`

## Files Deleted

None.

## Files Intentionally Unchanged

- `drizzle/0009_identity_member_administration.sql` and `drizzle/meta/0009_snapshot.json`.
- Migrations `0000` through `0008`.
- Task C permission, role, session, WhatsApp, Last Active Owner, HTTP, and persistence architecture outside this correction.
- `package.json` and dependency lockfiles.
- Task D, Task E, Task 3.17, UI, Branch CRUD, Inventory, and Pricing scope.

## Review Artifacts

- Repository report: `docs/05-Development/Reports/QSC-Task-3.15.1-C-R1-Final-Report.md`
- Verified repository bundle: `artifacts/task-reviews/3.15.1-C-R1-verified`
- Verified repository ZIP: `artifacts/task-reviews/QSC-Task-3.15.1-C-R1-Review-20260809T074545Z.zip`
- Verified repository checksum: `artifacts/task-reviews/QSC-Task-3.15.1-C-R1-Review-20260809T074545Z.zip.sha256`
- Exported report: `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.15.1-C-R1-Final-Report-20260809T074545Z.md`
- Exported ZIP: `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.15.1-C-R1-Review-20260809T074545Z.zip`
- Exported checksum: `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.15.1-C-R1-Review-20260809T074545Z.zip.sha256`

The exact base-name artifacts from the first invocation are retained as failed evidence and are superseded by the verified timestamped set above; DEV-001 did not overwrite or delete prior evidence.

## Summary

C-R1 closes the independent-review blocker with the smallest boundary-level correction. Foreign Workspace Branch-reference rows are no longer queried or returned during SelectedBranches validation, and external behavior no longer discloses whether a requested ID exists under another tenant.

## Next Recommendation

Perform independent review of the C-R1 repository predicate, nondisclosure semantics, and regression evidence. After C-R1 approval, commit Task C and C-R1 together, push `feature/identity-member-management`, create the planned pull request to `feature/product-entry-engine`, review GitHub Actions, merge, and only then begin Task 3.15.1-D. Do not self-approve or begin subsequent task scope automatically.

## Git and Review Integrity

No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion was performed. Branch remained `feature/identity-member-management`. The PostgreSQL test service was stopped after verification. Source files are preserved byte-for-byte in review evidence, command output is sanitized, and no credentials or real environment files are included.
