# Task 3.14.7 — Independent Review Report
## تقرير المراجعة المستقلة

**Project:** Quadcore Smart Catalog — QSC
**Task:** 3.14.7 — Product Media Storage Foundation
**Review date:** 2026-07-23
**Decision:** Correction required before Git commit

---

## 1. Executive Decision | القرار التنفيذي

The review bundle is authentic, complete, and internally consistent. All automated checks passed, and the implementation contains substantial good work.

حزمة المراجعة سليمة ومتكاملة، وجميع الفحوصات الآلية المطلوبة نجحت، كما أن التنفيذ يحتوي على أساس معماري جيد.

However, the implementation is **not approved for Git commit or Pull Request yet** because independent code review found multiple correctness and tenant-isolation defects that the automated tests do not detect.

لكن التنفيذ **غير معتمد حاليًا للـCommit أوPull Request**، لأن المراجعة المستقلة للكود كشفت عيوبًا في عزل الشركات وسلامة عمليات الملفات لم تكتشفها الاختبارات الآلية.

```text
Bundle integrity: Passed
Automated verification: Passed
Architecture direction: Mostly correct
Independent code review: Failed
R1 correction: Required
Ready for Git commit: No
Ready for Pull Request: No
Task 3.14.8: Do not start
```

---

## 2. Bundle Integrity | سلامة الحزمة

```text
SHA-256:
d44c54337b843a23b78f0f3c8e1c35707b07b28736d847cbdc6cbdaf51c54a50

Detached checksum: Matched
ZIP entries: 61
Manifest payload entries: 60
Missing payloads: 0
Extra payloads: 0
Duplicate paths: 0
Unsafe paths: 0
Bundle hash mismatches: 0
Source-to-bundle hash mismatches: 0
Report hash: Matched
Initial/final repository fingerprint: Matched
overallStatus: ReadyForReview
Git integrity: Passed
```

`ReadyForReview` proves evidence integrity. It does not prove that the implementation is architecturally safe.

---

## 3. Automated Verification | التحقق الآلي

```text
TypeScript: Passed
Integration TypeScript: Passed
Lint: Passed
Product/domain tests: 106 passed
DEV-001 tooling tests: 25 passed
Product Media tests: 18 passed
PostgreSQL integration tests: 35 passed
Build: Passed
Drizzle check: Passed
```

Hosted compatibility remains pending:

```text
Ubuntu hosted compatibility: Not executed
Windows hosted compatibility: Not executed
```

---

## 4. Strengths | نقاط القوة

The implementation correctly introduced:

- an independent immutable `ProductMediaRoot`,
- a provider-neutral repository port,
- PostgreSQL migration `0002`,
- `ON DELETE RESTRICT`,
- deterministic readable paths with ProductId collision material,
- typed Main/Gallery slots,
- direct `sharp@0.35.3`,
- WebP normalization,
- source-size and decoded-pixel controls,
- stored-byte SHA-256 verification during staging,
- local Windows tests,
- a focused Windows/Ubuntu compatibility workflow,
- no Product Entry or Task 3.14.8 orchestration.

هذه نقاط قوية وتثبت أن الاتجاه العام صحيح، لكن العيوب التالية تمنع الاعتماد.

---

# Blocking Findings | العيوب المانعة

## 5. Critical — Cross-Workspace Physical Path Collision
## حرج — تصادم المسار الفعلي بين الشركات

The registry currently enforces:

```text
UNIQUE (workspace_id, storage_root_key)
```

and the integration test explicitly permits the exact same `storage_root_key` in two Workspaces.

At the same time, the local adapter uses one global:

```text
QSC_MEDIA_ROOT
```

and resolves only the relative `storage_root_key`.

Therefore these two records:

```text
Workspace A → workspaces/shared/unclassified/product--stable
Workspace B → workspaces/shared/unclassified/product--stable
```

resolve to the same physical directory and files.

This violates Multi-Tenant isolation and can make two companies share or overwrite the same media.

هذا عيب حرج في عزل الشركات. القرار السابق باستخدام Unique مركب كان يحتوي نقطة عمياء لأن مفتاح التخزين يعمل داخل مساحة ملفات عالمية واحدة.

### Required correction

For the current single-provider namespace, `storage_root_key` must be globally unique:

```text
UNIQUE (storage_root_key)
```

The conflict result must not expose another Workspace's ProductId.

The test that currently permits the same key across Workspaces must be reversed.

---

## 6. Critical — Leaf Symlink/Junction Is Not Validated
## حرج — عدم فحص الرابط الرمزي في الملف النهائي

`safePath()` validates only parent segments:

```typescript
key.value.split("/").slice(0, -1)
```

It does not `lstat` the final target.

`inspectFile()` then calls:

```typescript
readFile(path)
```

which follows a final-file symbolic link.

A manually created or malicious final symlink can therefore escape `QSC_MEDIA_ROOT`.

The existing test covers a symlinked parent directory only. It does not cover a symlink at the final file itself.

### Required correction

- validate the leaf object with no-follow semantics before read/inspect/existence operations,
- reject final-file symlinks and Windows reparse points,
- add Linux and Windows-focused tests where platform capabilities permit,
- do not report a leaf symlink as a healthy existing media file.

---

## 7. High — Staging and Trash Use the Same Type
## مرتفع — استخدام نوع واحد لـStaging وTrash

`ProductMediaTemporaryKey` accepts either:

```text
_staging
_trash
```

The same type is used by all operations.

Consequences:

- `stage()` can write into `_trash`,
- `moveToTrash()` can receive an `_staging` destination,
- `publishNew()` can publish directly from `_trash`,
- operation contracts do not enforce namespace intent.

This weakens the DDD contract and makes later compensation logic error-prone.

### Required correction

Create separate types:

```text
ProductMediaStagingKey
ProductMediaTrashKey
```

Each type must enforce its exact namespace and valid shape.

Operation inputs must use the correct specific type.

---

## 8. High — Publication Removes Staging Before Final Verification
## مرتفع — حذف الملف المرحلي قبل التحقق النهائي

Current order:

```text
hard-link temporary → final
unlink temporary
inspect final
```

Problems:

1. The temporary recovery copy is removed before final verification.
2. `PublishNewProductMediaInput` does not carry the expected staged checksum and byte length.
3. Final inspection calculates a hash but does not compare it to the staged object.
4. If final inspection fails, the final object can remain while the staged copy is already gone.

This is not a safe publication contract.

### Required correction

Use:

```text
create final link
verify final against expected staged SHA-256 and byte length
only then remove staging
```

If verification fails:

```text
remove the owned final link
preserve the staged object
return ChecksumMismatch
```

Add a test that modifies the staged file between `stage()` and `publishNew()`.

Replacement must restore the previous final object after any failed or mismatched promotion.

---

## 9. High — Infrastructure Failures Are Misclassified
## مرتفع — تصنيف أخطاء البنية التحتية بصورة خاطئة

The adapter maps almost every unexpected error to:

```text
UnsafeKey
```

Examples that can be incorrectly classified:

- disk full,
- permission failure,
- too many open files,
- filesystem unavailable,
- antivirus/file lock,
- I/O failure.

`exists()` catches every failure and returns `false`, so an inaccessible object is treated as missing.

This will produce incorrect reconciliation and compensation decisions in Task 3.14.8.

### Required correction

- map only known caller/path conditions to typed expected outcomes,
- preserve `ENOENT` as Missing and `EEXIST` as Conflict,
- rethrow or return a sanitized dedicated infrastructure failure for unexpected I/O,
- change `exists()` to a typed result, or return `false` only for `ENOENT`,
- never expose absolute physical paths in errors.

---

## 10. High — ProductMediaStorageRootKey Does Not Enforce Root Shape
## مرتفع — Root Key لا يفرض بنية جذر المنتج

`ProductMediaStorageRootKey` currently accepts any canonical relative key.

It does not require:

```text
workspaces/{workspace-segment}/{department-segment}/{product-folder}
```

It can accept a short arbitrary key or a root containing reserved namespaces.

This allows invalid roots, overlapping roots, and roots not generated by the approved policy.

### Required correction

- enforce the Product root shape,
- require the `workspaces/` prefix,
- require exactly the approved root segments,
- reject `_staging`, `_trash`, and `_variants` as root segments,
- cap `DepartmentStorageSegment` to a safe segment length,
- ensure root creation goes through the path policy/factory,
- preserve a separate strict rehydration path for persisted data.

---

# Non-Blocking but Required Test Corrections
# تصحيحات الاختبارات المطلوبة

## 11. Explicit Format Evidence Is Incomplete

The specification required explicit tests for:

```text
BMP
HEIC/HEIF
```

The current focused tests explicitly cover GIF, TIFF, SVG, corrupt data, and a synthetic animated marker, but not BMP and HEIC/HEIF.

The code likely rejects them because only JPEG/PNG/WebP are accepted, but the report claims broader evidence than the tests provide.

### Required correction

Add deterministic content-signature rejection before `sharp` decoding and explicit tests for:

```text
BMP
TIFF
GIF
SVG
HEIC/HEIF
unknown
```

Do not rely on optional native codec support.

---

## 12. Image Processing Configuration Is Not Validated

Invalid settings such as zero dimensions, negative limits, or invalid WebP quality can be reported as `CorruptImage`.

Configuration failure is not image corruption.

### Required correction

Validate processing configuration explicitly and fail fast with a separate configuration error or validated configuration value object.

---

## 13. WebP Animation Detection Is Too Broad

The implementation converts the complete input to a Latin-1 string and searches for:

```text
ANIM
```

anywhere in the file.

This is inefficient and can theoretically reject a valid still WebP when the byte sequence appears inside compressed payload data.

### Required correction

Parse the RIFF/WebP chunk structure or rely on verified metadata/pages without scanning the entire binary as text.

---

## 14. Migration Evidence Limitation

The integration test checks that the Drizzle migration table contains at least three records:

```text
count >= 3
```

This does not independently prove a fresh local `0000 → 0001 → 0002` run.

The hosted ephemeral PostgreSQL job will provide the stronger evidence after R1 and Pull Request.

This alone is not the reason for rejection, but the final report must avoid overstating local clean-migration proof.

---

## 15. Security Audit | التدقيق الأمني

Runtime audit:

```text
3 vulnerabilities
1 moderate
2 high
```

Full audit:

```text
7 vulnerabilities
5 moderate
2 high
```

The direct dependency `sharp@0.35.3` is outside the `<0.35.0` advisory range shown in the supplied audit. Existing high findings are in the accepted Next.js/transitive baseline.

No critical advisory was introduced.

These risks remain unresolved and must stay documented.

---

## 16. Final Decision | القرار النهائي

```text
Task 3.14.7 bundle integrity: Approved
Automated checks: Approved
General architecture direction: Approved
Tenant isolation: Failed
Filesystem safety contract: Failed
Publication integrity: Failed
Operation key typing: Failed
Final approval: Rejected pending R1
```

Do not:

```text
git add
git commit
git push
open Pull Request
start Task 3.14.8
```

Complete `Task 3.14.7-R1`, regenerate the review bundle, and submit it for a new independent review.
