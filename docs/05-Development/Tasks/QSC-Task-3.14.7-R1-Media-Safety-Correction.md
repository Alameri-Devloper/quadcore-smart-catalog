# Sprint 03 — Task 3.14.7-R1
## Product Media Tenant Isolation and Filesystem Safety Correction

**Project:** Quadcore Smart Catalog — QSC
**Parent Task:** Task 3.14.7
**Target Branch:** `feature/product-media-storage-foundation`
**Architecture:** Preserve DDD, Clean Architecture, Modular Monolith, and Multi-Tenant readiness
**Implementation:** TypeScript only, except YAML and regenerated SQL
**Documentation:** English and Arabic

Do not begin Task 3.14.8.
Do not stage, commit, push, or merge.

---

# 1. Objective

Correct the independent-review findings without redesigning the approved Product Media foundation.

Required outcomes:

1. prevent cross-Workspace physical storage collisions,
2. harden final-target symlink/junction protection,
3. separate staging and trash key types,
4. preserve staging until final publication is verified,
5. compare final stored bytes with expected staged integrity,
6. stop misclassifying I/O failures as unsafe keys or missing files,
7. enforce Product Media root shape,
8. complete unsupported-format and configuration tests,
9. regenerate migration `0002` cleanly because it is uncommitted and undeployed.

---

# 2. Provider Namespace and Tenant Isolation

The configured local provider has one physical namespace under:

```text
QSC_MEDIA_ROOT
```

Therefore `storage_root_key` must be globally unique in that provider namespace.

Replace:

```text
UNIQUE (workspace_id, storage_root_key)
```

with:

```text
UNIQUE (storage_root_key)
```

Keep:

```text
PRIMARY KEY (workspace_id, product_id)
FOREIGN KEY (workspace_id, product_id)
ON DELETE RESTRICT
```

Rules:

- the same storage root cannot be registered by two Workspaces,
- a cross-Workspace collision must not expose the other WorkspaceId or ProductId,
- revise `StorageRootConflict` so it does not leak another tenant's identity,
- reverse the existing integration test that permits the same key in two Workspaces,
- add concurrent cross-Workspace collision coverage.

Because migration `0002` is uncommitted and undeployed:

- safely remove the current generated `0002` SQL and matching snapshot/journal entry,
- regenerate with the same descriptive name:
  `product_media_root_registry`,
- do not create `0003`,
- do not modify committed `0000` or `0001`.

---

# 3. Product Media Root Shape

`ProductMediaStorageRootKey` must represent only:

```text
workspaces/{workspace-segment}/{department-segment}/{product-folder}
```

Required rules:

- exact `workspaces/` prefix,
- exact approved root depth,
- no `_staging`, `_trash`, or `_variants` root segment,
- no arbitrary short or nested root,
- safe bounded segment lengths,
- `DepartmentStorageSegment` must have a practical maximum length,
- Product folder retains stable ProductId collision material,
- root candidates must be generated through `ProductMediaPathPolicy` or an explicit factory,
- persistence rehydration remains strict.

Add tests for invalid root shapes, reserved namespaces, excessive Department segment length, and overlapping-root attempts.

---

# 4. Separate Key Types

Replace the shared temporary-key type with:

```typescript
ProductMediaStagingKey
ProductMediaTrashKey
```

Recommended additional type:

```typescript
ProductMediaFinalKey
```

Rules:

- staging key must be under the exact Product root `_staging` namespace,
- trash key must be under the exact Product root `_trash` namespace,
- final key must be generated from Product root + typed media slot,
- stage cannot target trash,
- trash operations cannot target staging,
- publication, replacement, and restore inputs must enforce that all keys belong to the same Product root,
- `_variants` remains reserved and unusable.

Update ports and tests accordingly.

---

# 5. Leaf Symlink and Junction Safety

The local adapter must validate both:

- every parent segment,
- the leaf target when it exists.

Requirements:

- `inspect`, `exists`, trash, restore, replacement, and cleanup must not follow a final-file symlink outside the root,
- reject leaf symlink and Windows reparse-point targets,
- verify containment again after canonical resolution where possible,
- preserve no-follow behavior for existing objects,
- add a Linux leaf-symlink test,
- add Windows coverage where link privileges permit,
- skipped platform tests must be reported explicitly.

Do not expose absolute paths in results or sanitized errors.

---

# 6. Directory Creation Concurrency

Concurrent operations may both create the same parent directory.

Required behavior:

- handle `EEXIST` during directory creation,
- re-read and revalidate the resulting object,
- do not return `UnsafeKey` merely because another valid operation created the directory first,
- add a focused concurrent staging test.

---

# 7. Publication Integrity

Change publication input so it carries expected staged integrity, preferably through the staged object or explicit:

```text
expectedSha256
expectedByteLength
expectedMediaType
expectedWidth
expectedHeight
```

Required order:

```text
create non-overwriting final link
inspect/read final
compare final bytes with expected staged integrity
remove staging only after successful verification
```

On verification failure:

```text
remove only the owned final link
preserve the staged object
return ChecksumMismatch
```

Add tests for:

- staged-file modification before publish,
- byte-length mismatch,
- checksum mismatch,
- final verification failure,
- no leftover invalid final file,
- staged recovery object remains available.

Replacement must:

- retain the old object in trash,
- verify the new final before removing staging,
- remove an invalid new final before restoration,
- restore the old final on failed promotion,
- return `ReplacementRestorationFailed` only when restoration genuinely fails.

---

# 8. Infrastructure Failure Semantics

Do not map arbitrary errors to:

```text
UnsafeKey
```

Do not make `exists()` return `false` for every error.

Required policy:

- `ENOENT` → Missing,
- `EEXIST` → Conflict,
- validated path/security violations → UnsafeKey,
- unexpected I/O failures → sanitized dedicated infrastructure failure or rethrown typed infrastructure error,
- no physical absolute path in user-visible/application-visible error details.

Change `exists()` to a typed result, or guarantee that it returns `false` only for `ENOENT` and propagates other failures.

Add focused tests using controlled failure injection where practical.

---

# 9. Deterministic Image Signature Gate

Before optional native decoder behavior, implement deterministic signature classification for:

```text
JPEG
PNG
WebP
```

Explicitly reject signatures for:

```text
GIF
BMP
TIFF
HEIC/HEIF
SVG/text
unknown
```

Requirements:

- no reliance on uploaded filename or MIME header,
- no reliance on optional HEIC support in the installed libvips build,
- parse WebP RIFF chunks correctly,
- do not scan the complete binary as a Latin-1 string for `ANIM`,
- keep metadata/page validation as defense in depth.

Add explicit tests for every listed rejected format.

---

# 10. Processing Configuration Validation

Introduce validated processing configuration behavior.

Reject invalid configuration such as:

- non-positive source limit,
- non-positive decoded-pixel limit,
- non-positive dimensions,
- invalid WebP quality,
- non-finite values.

Do not return `CorruptImage` for infrastructure configuration errors.

Use either:

- a validated immutable configuration value object, or
- a constructor/factory that fails before image processing.

Add focused tests.

---

# 11. Migration and PostgreSQL Tests

Regenerate `0002_product_media_root_registry`.

Tests must cover:

- global storage-key uniqueness,
- no cross-tenant identity leakage,
- same Product `AlreadyExists`,
- same root another Product/Workspace `StorageRootConflict`,
- `ON DELETE RESTRICT`,
- no backfill,
- root-shape database constraints where practical,
- clean hosted migration path remains pending until Pull Request.

Do not overstate local clean-database proof when only the migration journal count was checked.

---

# 12. Verification

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

Do not claim hosted Ubuntu or Windows success before a real Pull Request run.

---

# 13. Acceptance Criteria

R1 is accepted only when:

1. physical storage keys cannot collide across Workspaces,
2. conflict results do not leak cross-tenant identity,
3. Product root shape is strict,
4. staging and trash keys are distinct types,
5. all operation keys share one Product root,
6. final-file symlinks/junctions are rejected,
7. concurrent directory creation is safe,
8. staging survives until verified publication,
9. final bytes are compared with expected staged integrity,
10. failed verification leaves no invalid final,
11. unexpected I/O is not reported as `UnsafeKey` or Missing,
12. `exists` does not hide infrastructure failure,
13. format rejection is deterministic,
14. BMP and HEIC/HEIF tests exist,
15. processing configuration is validated,
16. migration `0002` is cleanly regenerated,
17. all existing and new checks pass,
18. review bundle is `ReadyForReview`,
19. no Git commit exists,
20. Task 3.14.8 remains untouched.

---

# 14. Required Final Report

Create:

```text
docs/05-Development/Reports/Task-3.14.7-R1-Final-Report.md
```

Required sections:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Cross-Workspace Collision Correction
6. Provider Namespace Uniqueness
7. Tenant Identity Leakage Prevention
8. Product Root Shape
9. Staging Key Type
10. Trash Key Type
11. Final Key and Root Cohesion
12. Leaf Symlink/Junction Protection
13. Directory Creation Concurrency
14. Publication Verification Order
15. Expected Checksum and Byte Length
16. Failed Publication Cleanup
17. Replacement Restoration
18. Infrastructure Failure Semantics
19. Exists Semantics
20. Deterministic Signature Gate
21. WebP Animation Parsing
22. Explicit Rejected-Format Tests
23. Processing Configuration Validation
24. Migration Regeneration
25. PostgreSQL Uniqueness
26. PostgreSQL Integration Tests
27. Local Storage Tests
28. Image Processor Tests
29. Windows Local Compatibility
30. Ubuntu Hosted Compatibility Status
31. Windows Hosted Compatibility Status
32. TypeScript Result
33. Integration TypeScript Result
34. Lint Result
35. Unit Test Result
36. PostgreSQL Integration Test Result
37. Build Result
38. Drizzle Check Result
39. Runtime Audit Result
40. Development Audit Result
41. Architecture Integrity Review
42. Scope Exclusion Review
43. Remaining Risks
44. Architecture Changes
45. Status

Status:

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
npm.cmd run review:bundle -- --task=3.14.7-R1 --report=docs/05-Development/Reports/Task-3.14.7-R1-Final-Report.md
```

Export ZIP and detached `.sha256` to Desktop.

Do not stage, commit, push, or merge.

Stop after Task 3.14.7-R1.
