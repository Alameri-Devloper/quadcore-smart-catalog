# Task 3.14.7-R2 — Independent Review Report
## تقرير المراجعة المستقلة

**Project:** Quadcore Smart Catalog — QSC
**Task:** 3.14.7-R2 — Media Root Identity Binding and Partial-Operation Safety
**Review date:** 2026-07-24
**Decision:** R2 corrected its declared scope, but Task 3.14.7 still requires R3 before Git commit

---

## 1. Executive Decision | القرار التنفيذي

The timestamped review pair is the authoritative pair:

```text
QSC-Task-3.14.7-R2-Review-20260724T022740Z.zip
QSC-Task-3.14.7-R2-Review-20260724T022740Z.zip.sha256
```

Its archive, detached checksum, manifest, payload hashes, Git-integrity evidence, and repository fingerprints are valid.

R2 materially corrected:

- Workspace/Product identity binding,
- case and normalization collision handling,
- new-root creation versus persistence rehydration,
- move-to-trash rollback,
- restore-from-trash rollback,
- sanitized partial-operation errors,
- missing success/conflict tests,
- hard-link deployment documentation.

However, the parent Product Media foundation is not ready to commit because the independent review found:

1. incomplete partial-failure handling in `publishNew`,
2. missing restoration when `publishReplacement` receives a thrown publication failure,
3. missing deterministic evidence for PostgreSQL `StorageRootConflict`,
4. an explicit mismatch between the final report and bundle manifest for dependency audits,
5. an unneeded report template containing `PENDING` placeholders in the working tree,
6. a missing R2 entry in the final-report index.

```text
Authoritative bundle integrity: Passed
R2 declared correction scope: Passed
Automated verification: Passed
Publication failure safety: Failed
Replacement compensation: Failed
Audit evidence alignment: Failed
Repository documentation hygiene: Failed

Ready for Git commit: No
Ready for Pull Request: No
R3 required: Yes
Task 3.14.8: Do not start
```

---

## 2. Why Four Files Were Produced | لماذا ظهرت أربعة ملفات؟

Two complete ZIP/checksum pairs were generated.

### First pair — rejected evidence

```text
QSC-Task-3.14.7-R2-Review.zip
QSC-Task-3.14.7-R2-Review.zip.sha256
```

Checksum:

```text
992514a23892c4a574b26875b0e3791a829d0ef85dc3bab850087174f97659d5
```

The checksum matches the ZIP, but its manifest reports:

```text
overallStatus: VerificationFailed
gitIntegrity.untracked.passed: false
```

The reason was seven trailing-whitespace findings in:

```text
docs/05-Development/Tasks/QSC-Task-3.14.7-R2-Identity-and-Partial-Operation-Correction.md
```

### Second pair — corrected evidence

```text
QSC-Task-3.14.7-R2-Review-20260724T022740Z.zip
QSC-Task-3.14.7-R2-Review-20260724T022740Z.zip.sha256
```

Checksum:

```text
0cd61f6d884934b4e0a4dc437421290fb5caae1602b7bc70324cc2b28eb202c9
```

This pair reports:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

The timestamped filename was created by collision-safe publication because the rejected pair already existed. This is correct DEV-001 behavior.

---

## 3. Authoritative Bundle Integrity | سلامة الحزمة المعتمدة

```text
ZIP entries including manifest: 65
Manifest payload entries: 64
Changed source files copied: 41
Missing payloads: 0
Extra payloads: 0
Duplicate archive paths: 0
Unsafe archive paths: 0
ZIP symbolic-link entries: 0
Payload hash mismatches: 0
Source-to-bundle hash mismatches: 0
Report hash mismatch: 0
Initial repository fingerprint: ba655e1abfca68d89d7373c5829ebc6c85aaf03f9cecb723c6351dae28ffc2a5
Final repository fingerprint:   ba655e1abfca68d89d7373c5829ebc6c85aaf03f9cecb723c6351dae28ffc2a5
```

The repository did not change during verification or archive publication.

No credential URL, bearer token, PAT, private key marker, or absolute Windows path was found in the copied source payloads.

---

## 4. Timestamp Review | مراجعة التسلسل الزمني

The rejected run began at:

```text
2026-07-24T02:22:04.738Z
```

The corrected run began at:

```text
2026-07-24T02:26:20.831Z
```

The corrected run completed required verification at approximately:

```text
2026-07-24T02:27:38.716Z
```

The timestamped export name contains:

```text
20260724T022740Z
```

The difference between manifest generation time and filename publication time is expected: the final filename is published after verification, archive construction, integrity checks, and repository-stability checks.

The only copied source differences between the rejected and accepted bundles were:

- the seven trailing spaces removed from the R2 specification,
- the final report sentence documenting that cleanup.

No hidden implementation change occurred between the two R2 bundle runs.

---

## 5. Automated Verification | نتائج التحقق الآلي

```text
TypeScript: Passed
Integration TypeScript: Passed
Lint: Passed
Product/domain tests: 106 passed
DEV-001 tooling tests: 25 passed
Product Media tests: 31 total
Product Media passed: 30
Product Media skipped: 1
PostgreSQL integration tests: 36 passed
Build: Passed
Drizzle check: Passed
```

The skipped Product Media test was the local Windows leaf-link test because the account did not have permission to create the test-owned link.

Hosted Ubuntu and Windows compatibility remain pending.

---

## 6. R2 Scope Review | مراجعة نطاق R2

R2 correctly implemented its stated corrections.

### Root creation and rehydration

- `ProductMediaRoot.createNew` derives the root from identity and path-policy inputs.
- New-root creation no longer accepts an arbitrary raw root key.
- `ProductMediaRoot.rehydrate` is a separate asynchronous persistence boundary.
- Rehydration validates Workspace segment and ProductId suffix.

### Identity binding

- direct Workspace segments are used only when the original ID is already exact canonical lowercase safe text,
- uppercase, Unicode normalization, punctuation replacement, transliteration, or truncation uses a stable hash fallback,
- Product folders use a SHA-256-derived 16-hex ProductId suffix,
- mismatched persisted Workspace/Product identity is rejected.

### Trash and restore rollback

- `moveToTrash` removes its owned trash destination when source removal fails,
- `restoreFromTrash` removes its owned final destination when source removal fails,
- rollback failure throws `ProductMediaStoragePartialOperationError`,
- the error exposes logical operation and `reconciliationRequired = true` without exposing physical paths.

### Tests added

The focused tests now cover:

- successful trash move,
- successful restore,
- trash conflict,
- publish target conflict,
- successful replacement,
- retained old trash object,
- staging discard,
- unrelated staging preservation,
- deterministic unlink failure,
- successful rollback,
- rollback failure,
- case/normalization Workspace distinctions,
- corrupted persisted identity rejection.

R2 therefore deserves credit for correcting its declared scope.

---

# Blocking Findings | العيوب المانعة

## 7. High — `publishNew` Can Hide a Partial Publication State
## مرتفع — النشر الجديد قد يخفي حالة جزئية

`publishNew` creates an operation-owned final hard link and then performs verification and staging removal.

In multiple catch paths it runs:

```typescript
await unlink(finalPath).catch(() => undefined);
```

This silently ignores failure to remove the operation-owned final object.

Examples:

1. final inspection throws an infrastructure error,
2. final verification detects a mismatch but removing the invalid final fails,
3. removing staging after successful verification fails,
4. cleanup of the final link also fails.

In these cases the adapter may leave:

```text
final exists
staging exists
```

or another ambiguous state, but throws only a general infrastructure error.

That is not truthful enough for Task 3.14.8 compensation and reconciliation.

### Required correction

- use the injected filesystem-operation seam for publication link/unlink operations,
- track ownership of the final link,
- if publication cleanup succeeds, restore the pre-operation state and return/rethrow the original sanitized failure,
- if cleanup fails, throw a dedicated `ProductMediaStoragePartialOperationError` such as:
  - `publish-new`,
  - or `publish-new-cleanup`,
- preserve staging whenever publication is not fully committed,
- add deterministic fault-injection tests.

---

## 8. High — `publishReplacement` Does Not Restore on Thrown Publication Failure
## مرتفع — الاستبدال لا يعيد القديم عند استثناء النشر

Current control flow:

```typescript
const moved = await moveToTrash(...);
const published = await publishNew(...);
if (published.type === "Published") ...
const restored = await restoreFromTrash(...);
```

Restoration occurs only when `publishNew` returns a typed `Failed` result.

If `publishNew` throws `ProductMediaStorageInfrastructureError`, the exception escapes immediately. The previous final remains in trash, and no restoration attempt occurs.

This violates the approved rule:

```text
restore the old final on failed promotion
```

It also weakens the later Smart Save/media compensation workflow.

### Required correction

After a successful move to trash:

- catch ordinary thrown publication infrastructure failures,
- attempt to restore the old final,
- if restoration succeeds, rethrow the original sanitized publication error,
- if restoration fails, return or throw a truthful reconciliation-required replacement failure,
- if publication already reports a partial/ambiguous state, do not perform a blind restore that could overwrite or conflict; propagate reconciliation-required state,
- add deterministic tests for all branches.

---

## 9. Medium — PostgreSQL `StorageRootConflict` Is Not Actually Tested
## متوسط — تعارض جذر التخزين غير مثبت باختبار فعلي

The test named:

```text
returns AlreadyExists for the same Product and StorageRootConflict for another Product
```

does not assert `StorageRootConflict`.

It creates another valid Product root and expects:

```text
Created
```

The repository mapping code appears correct, but the required anonymous provider-global conflict path has no direct evidence.

### Required correction

Create a deterministic integration test that:

1. creates a valid candidate root for Product B,
2. pre-inserts a conflicting provider key for another persisted Product using SQL test setup,
3. calls `repository.create(candidateB)`,
4. asserts exactly:

```text
StorageRootConflict
```

5. proves no other WorkspaceId or ProductId is exposed.

Rename the existing misleading test.

---

## 10. Evidence Failure — Audit Report and Manifest Disagree
## فشل في الأدلة — التقرير والـManifest غير متوافقين

The R2 final report states:

```text
The required current command was executed but the sandbox could not reach the npm audit endpoint.
```

However, the authoritative manifest states for both audit commands:

```text
skipped: true
skipReason: Skipped by explicit optional-command request.
durationMs: 0
```

No audit evidence files are present.

Therefore the report's claim is unsupported by the submitted bundle.

### Required correction

Run the bundle without explicitly skipping:

```text
audit-runtime
audit-full
```

Because they are optional, a network or advisory failure may remain non-blocking, but the commands must produce evidence and the report must state the exact observed result.

Alternatively, if they are intentionally skipped, the report must say they were skipped. The R2 task required executing them, so execution with captured evidence is the preferred correction.

---

## 11. Repository Hygiene — Unfinished Template Must Not Be Committed
## نظافة المستودع — لا يجب اعتماد قالب غير مكتمل

The working tree contains:

```text
docs/05-Development/Reports/Task-3.14.7-R2-Final-Report-Template.md
```

It contains 40 `PENDING` placeholders.

This file was a temporary aid used to create the real report. It is not an implementation report and should not be committed.

The R2 final report also says only the final R2 report was created, while the template remains untracked, so the report does not fully describe the final working tree.

### Required correction

Delete the template before the next review bundle.

Do not delete:

```text
Task-3.14.7-R2-Final-Report.md
```

---

## 12. Documentation Index Is Incomplete
## فهرس التقارير غير مكتمل

`docs/05-Development/Reports/README.md` lists:

- Task 3.14.7,
- Task 3.14.7-R1,

but does not list Task 3.14.7-R2.

Update the bilingual report index. The next correction report should also be indexed.

---

## 13. Hosted Compatibility Status | حالة توافق المنصات

The local evidence does not prove hosted compatibility.

Required before final merge:

```text
Quality: Passed
PostgreSQL Integration: Passed
Product Media Compatibility (ubuntu-latest): Passed
Product Media Compatibility (windows-latest): Passed
```

The local Windows symlink test skip is acceptable only if the hosted Windows job executes the relevant test or documents a platform-supported skip accurately.

---

## 14. Migration Review | مراجعة الترحيل

R2 correctly left these files unchanged relative to R1:

```text
drizzle/0002_product_media_root_registry.sql
drizzle/meta/0002_snapshot.json
drizzle/meta/_journal.json
```

Hashes remained identical.

Journal entries are:

```text
0000 — 2026-07-21T05:05:51.564Z
0001 — 2026-07-22T06:45:41.230Z
0002 — 2026-07-23T06:55:50.165Z
```

The R2 final report accurately states that the local integration database was reused and that a fresh ephemeral `0000 → 0001 → 0002` run remains pending GitHub.

No migration `0003` is required for the R3 corrections identified here.

---

## 15. Security Review | مراجعة الأمان

Positive findings:

- no path traversal was found in typed keys,
- parent and leaf symlink checks exist,
- no physical absolute path is exposed in typed storage errors,
- global provider-root uniqueness exists,
- strict root rehydration detects identity/path corruption,
- user filenames are not used,
- image signatures are content-based,
- BMP/TIFF/GIF/HEIC/SVG/unknown inputs are deterministically rejected,
- animated WebP parsing is structural,
- source size and decoded-pixel limits exist,
- normalized stored bytes use SHA-256 verification.

Residual assumption:

```text
QSC_MEDIA_ROOT must not be writable by untrusted operating-system users or external processes.
```

The path-based Node.js checks cannot provide full protection against a hostile local administrator or an actor that can mutate the tree during operations. The documentation correctly records this limitation.

---

## 16. Final Decision | القرار النهائي

```text
Official timestamped bundle integrity: Approved
R2 identity binding: Approved
R2 move/restore rollback: Approved
R2 test additions: Approved
Migration preservation: Approved

Publish-new partial-state safety: Rejected
Replacement exception compensation: Rejected
StorageRootConflict evidence: Incomplete
Audit report/manifest alignment: Rejected
Temporary report-template cleanup: Required
Report index update: Required

Task 3.14.7 final approval: No
R3 required: Yes
Ready for Git commit: No
Ready for Pull Request: No
```

Do not run `git add`, `git commit`, `git push`, or start Task 3.14.8 before completing R3.
