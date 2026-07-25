# Sprint 03 — Task 3.14.7-R2
## Media Root Identity Binding and Partial-Operation Safety

**Project:** Quadcore Smart Catalog — QSC
**Parent Task:** Task 3.14.7
**Target Branch:** `feature/product-media-storage-foundation`
**Architecture:** Preserve DDD, Clean Architecture, Modular Monolith, Multi-Tenant readiness
**Implementation:** TypeScript only, except documentation
**Documentation:** English and Arabic

Do not begin Task 3.14.8.
Do not stage, commit, push, or merge.
Do not create migration `0003` unless a database schema change is genuinely unavoidable and first reported as an architecture blocker. The expected correction should not require a new migration.

---

# 1. Objective

Complete the Product Media foundation by correcting:

1. immutable Workspace/Product identity binding to the media root,
2. case/canonicalization collisions in Workspace path segments,
3. partial hard-link failures in trash and restore operations,
4. incomplete operation tests,
5. inaccurate local migration evidence wording,
6. undocumented local-filesystem trust and hard-link requirements.

Preserve all approved R1 corrections.

---

# 2. New Root Creation vs Rehydration

Separate:

```text
Create a new Product media root
```

from:

```text
Rehydrate a persisted Product media root
```

Introduce an explicit factory or policy-produced candidate so ordinary new-root creation cannot accept an arbitrary raw `ProductMediaStorageRootKey`.

The new-root path must be derived from:

```text
WorkspaceId
DepartmentStorageSegment
ProductId
ProductCode or ProductName
```

The ProductMediaRoot creation API must not allow callers to pair arbitrary identity values with a merely valid-shaped root.

A branded/private-constructor candidate or equivalent runtime-enforced factory is acceptable.

---

# 3. Immutable Identity Binding

For both new roots and persisted rehydration, verify at least:

```text
Workspace segment ↔ WorkspaceId policy
ProductId suffix ↔ ProductId
```

Requirements:

- the Workspace segment must be the exact deterministic result for the supplied `WorkspaceId`,
- the final 16 hexadecimal characters must be the exact stable suffix derived from the supplied `ProductId`,
- a mismatched Workspace segment is rejected,
- a mismatched ProductId suffix is rejected,
- strict rehydration rejects corrupted persisted identity/path combinations,
- Department and readable Product text remain historical immutable path material and are not recomputed after Product edits.

Infrastructure mapping may become asynchronous if identity verification requires hashing.

Do not move roots when mutable Product fields change.

---

# 4. Workspace Segment Collision Safety

Do not treat a transformed identity as the same direct segment.

At minimum:

```text
WS-001
ws-001
```

must either:

- be impossible because `WorkspaceId` itself is globally canonical and case-insensitive, with explicit Domain proof and tests,

or:

- produce distinct collision-resistant storage segments.

Preferred correction inside this task:

- use the direct segment only when the WorkspaceId value is already exactly in approved canonical lowercase form,
- use the stable hash fallback whenever case folding, normalization, transliteration, replacement, or truncation changes the original value.

Add tests for:

- lowercase canonical ID,
- uppercase/lowercase distinct IDs,
- Unicode normalization variants,
- punctuation transformation,
- deterministic fallback.

---

# 5. Trash Move Rollback

For:

```text
link(final, trash)
unlink(final)
```

track whether the new trash link is owned by the current operation.

If removing the final source fails:

1. attempt to remove the owned trash link,
2. if rollback succeeds, throw/return the sanitized original infrastructure failure,
3. if rollback fails, throw/return a dedicated sanitized partial-operation failure requiring reconciliation.

Do not leave duplicate final/trash links after an ordinary recoverable failure.

---

# 6. Trash Restore Rollback

For:

```text
link(trash, final)
unlink(trash)
```

track whether the new final link is owned by the current operation.

If removing the trash source fails:

1. attempt to remove the owned final link,
2. if rollback succeeds, throw/return the sanitized original infrastructure failure,
3. if rollback fails, throw/return a dedicated sanitized partial-operation failure requiring reconciliation.

Do not report `Restored` until the source trash link has been removed.

---

# 7. Failure Semantics

Introduce a sanitized distinction equivalent to:

```text
InfrastructureFailure
PartialOperationFailure
```

No absolute physical path may be exposed.

A partial-operation failure must identify only:

```text
logical operation
reconciliation required
```

It must not expose tenant identity from another Workspace or physical filesystem paths.

Task 3.14.8 will handle workflow-level compensation and reconciliation; this task must provide truthful low-level state semantics.

---

# 8. Testability

Introduce a narrow internal filesystem-operations seam or another controlled fault-injection mechanism.

Do not leak Node.js filesystem types into Domain/Application ports.

Tests must simulate:

- source unlink failure after destination link creation,
- successful rollback of the owned destination,
- rollback failure,
- no accidental removal of pre-existing unrelated files.

Avoid tests that depend only on unpredictable operating-system permission behavior.

---

# 9. Complete Storage Operation Tests

Add explicit tests for:

- successful move to trash,
- successful restore from trash,
- trash target conflict,
- final publish target conflict,
- successful replacement,
- successful replacement retains the old trash object,
- successful discard of the owned staging object,
- unrelated staging objects remain,
- move-to-trash partial failure rollback,
- restore partial failure rollback,
- partial-operation failure when rollback also fails.

All operation keys must remain within one Product root.

---

# 10. Filesystem Deployment and Trust Contract

Document one of the following:

## Hard-link implementation retained

State explicitly:

- `QSC_MEDIA_ROOT` must be on one filesystem/volume,
- the filesystem must support hard links,
- production V1 is expected to use a compatible filesystem such as a supported Linux filesystem,
- Windows compatibility is proven only by the hosted workflow,
- untrusted operating-system users/processes must not have write access to the media tree.

## Verified exclusive-copy implementation used

Document the alternative durability and rollback guarantees.

Do not claim full protection against a hostile local administrator.

---

# 11. Migration Evidence Wording

Do not change committed migrations `0000` or `0001`.

Do not create `0003` for documentation or Application/Infrastructure-only corrections.

Keep regenerated `0002` unchanged unless identity binding requires a genuine database constraint change.

Correct the final report:

```text
Local migration metadata and the migrated integration database passed.
A clean ephemeral 0000 → 0001 → 0002 run remains pending GitHub PostgreSQL Integration.
```

Do not describe the local database as clean unless a unique empty database was created for that execution.

---

# 12. Required Verification

Run:

```powershell
npx.cmd tsc --noEmit
npx.cmd tsc --project tsconfig.integration.json
npm.cmd run lint
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
npm.cmd run db:check
git diff --check
git status --short
git diff --name-status
git diff --stat
npm.cmd audit --omit=dev
npm.cmd audit
```

Run focused Product Media tests on Windows.

Do not claim hosted Ubuntu or Windows success before the Pull Request workflow.

---

# 13. Acceptance Criteria

R2 is accepted only when:

1. new Product media roots cannot be created from arbitrary raw root keys,
2. Workspace segment is bound to WorkspaceId,
3. Product suffix is bound to ProductId,
4. persisted identity/path mismatch is rejected,
5. case-distinct Workspace IDs cannot silently collapse to one segment,
6. trash move rolls back its owned destination after source-removal failure,
7. restore rolls back its owned destination after source-removal failure,
8. rollback failure has a truthful dedicated sanitized outcome,
9. successful move/trash/restore/replacement/discard paths are explicitly tested,
10. target/trash conflicts are explicitly tested,
11. unrelated temporary files are preserved,
12. local migration evidence is described accurately,
13. filesystem hard-link/trust assumptions are documented,
14. all previous R1 tests remain passing,
15. all required commands pass,
16. review bundle reports `ReadyForReview`,
17. no Git commit exists,
18. Task 3.14.8 remains untouched.

---

# 14. Required Final Report

Create:

```text
docs/05-Development/Reports/Task-3.14.7-R2-Final-Report.md
```

Required sections:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. New Root Factory
6. Rehydration Boundary
7. Workspace Identity Binding
8. Product Identity Suffix Binding
9. Workspace Case Collision Protection
10. Persisted Corruption Rejection
11. Move-To-Trash Rollback
12. Restore-From-Trash Rollback
13. Partial Operation Failure
14. Filesystem Failure Injection
15. Successful Trash Move Test
16. Successful Trash Restore Test
17. Trash Conflict Test
18. Publish Target Conflict Test
19. Successful Replacement Test
20. Staging Discard and Isolation Test
21. Hard-Link or Copy Deployment Contract
22. Local Filesystem Trust Assumption
23. Migration Change Review
24. Local Migration Evidence
25. Ubuntu Hosted Compatibility Status
26. Windows Hosted Compatibility Status
27. TypeScript Result
28. Integration TypeScript Result
29. Lint Result
30. Unit Test Result
31. PostgreSQL Integration Test Result
32. Build Result
33. Drizzle Check Result
34. Runtime Audit Result
35. Development Audit Result
36. Architecture Integrity Review
37. Scope Exclusion Review
38. Remaining Risks
39. Architecture Changes
40. Status

Status must be:

```text
Ready for review.
```

or:

```text
Blocked pending architecture decision.
```

---

# 15. Review Bundle

Generate:

```powershell
npm.cmd run review:bundle -- --task=3.14.7-R2 --report=docs/05-Development/Reports/Task-3.14.7-R2-Final-Report.md
```

Export the ZIP and detached `.sha256` to Desktop.

Do not stage, commit, push, or merge.

Stop after Task 3.14.7-R2.
