# Sprint 03 — Task 3.14.7
## Product Media Storage Foundation

**Project:** Quadcore Smart Catalog — QSC
**Base Branch:** `feature/product-entry-engine`
**Target Branch:** `feature/product-media-storage-foundation`
**Architecture:** DDD, Clean Architecture, Modular Monolith, Multi-Tenant-ready
**Implementation:** TypeScript only, except YAML and generated SQL
**Documentation:** English and Arabic

Do not begin Task 3.14.8.
Do not implement Product Entry UI, upload endpoints, integrated Smart Save/media orchestration, reconciliation, permanent deletion, public media URLs, cloud storage, stock, pricing, or branch features.
Do not stage, commit, push, or merge.

---

# 1. Objective

Build the provider-neutral foundation for Product media:

1. immutable `ProductMediaRoot` registry,
2. PostgreSQL repository and migration,
3. secure deterministic path policy,
4. typed media slots and storage keys,
5. provider-neutral storage and image-processing ports,
6. local filesystem adapter,
7. direct `sharp` adapter,
8. JPEG/PNG/WebP inspection and WebP normalization,
9. SHA-256 integrity,
10. safe staging/publication primitives,
11. focused Windows and Ubuntu compatibility workflow.

Task 3.14.8 will coordinate database state, filesystem operations, compensation, upload/replace/remove workflows, and reconciliation.

---

# 2. Architecture Boundary

`ProductMediaRoot` is not part of Product business state:

```text
Product Aggregate
≠
Product Media Root Registry
```

Keep it inside the Catalog bounded context. Preserve dependency direction:

```text
Domain/value objects
← Application ports and policies
← Infrastructure adapters
```

React, Next.js, Drizzle, PostgreSQL, Node filesystem APIs, and `sharp` must not leak into Domain contracts. Use `Uint8Array`, not `Buffer`, in provider-neutral ports.

---

# 3. ProductMediaRoot

Introduce an immutable model equivalent to:

```typescript
export interface ProductMediaRoot {
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly storageRootKey: ProductMediaStorageRootKey;
  readonly createdAt: Date;
}
```

Rules:

- one root per `(WorkspaceId, ProductId)`,
- created lazily by a later media workflow,
- no automatic root creation in this task,
- no normal update or delete,
- removing all images does not remove the root,
- Product name, ProductCode, Department, Category, ProductType, or lifecycle changes do not move it,
- future uploads reuse the same persisted root,
- do not add `storageRootKey` to Product Aggregate.

Repository contract:

```typescript
export interface ProductMediaRootRepository {
  findByProduct(
    workspaceId: WorkspaceId,
    productId: ProductId,
  ): Promise<ProductMediaRoot | null>;

  create(
    root: ProductMediaRoot,
  ): Promise<ProductMediaRootCreateResult>;
}
```

Typed create outcomes:

```typescript
type ProductMediaRootCreateResult =
  | { readonly type: "Created"; readonly root: ProductMediaRoot }
  | {
      readonly type: "AlreadyExists";
      readonly existingRoot: ProductMediaRoot;
    }
  | {
      readonly type: "StorageRootConflict";
      readonly conflictingProductId: ProductId;
    };
```

Expected uniqueness conflicts must not be thrown as generic exceptions.

---

# 4. PostgreSQL Registry

Add:

```text
catalog_product_media_roots
```

Columns:

```text
workspace_id
product_id
storage_root_key
created_at
```

Constraints:

```text
PRIMARY KEY (workspace_id, product_id)

UNIQUE (workspace_id, storage_root_key)

FOREIGN KEY (workspace_id, product_id)
REFERENCES catalog_products(workspace_id, product_id)
ON DELETE RESTRICT
```

Do not add mutable Product naming/classification fields. Do not use `ON DELETE CASCADE`.

Database constraints must enforce what is practical:

- non-empty storage key,
- maximum length 512,
- lowercase canonical value,
- forward slashes only,
- no leading/trailing slash,
- no backslash,
- no repeated `//`,
- no `.` or `..` segments,
- no Windows drive or UNC prefix.

Generate a descriptive migration:

```text
drizzle/0002_product_media_root_registry.sql
```

Use the approved generation mechanism with:

```text
--name=product_media_root_registry
```

Do not rewrite `0000` or `0001`. Do not backfill fake roots.

---

# 5. Storage Keys and Path Policy

Create strongly typed immutable value objects for:

```text
ProductMediaStorageRootKey
ProductMediaStorageKey
ProductMediaTemporaryKey
DepartmentStorageSegment
```

All storage keys are canonical relative keys, never absolute filesystem paths.

Candidate root format:

```text
workspaces/{workspace-segment}/{department-segment}/{product-folder}
```

## Workspace segment

- derived from immutable `WorkspaceId`,
- never from mutable Workspace name,
- safe canonical ID when possible,
- stable hash fallback when necessary,
- deterministic and collision-resistant.

## Department segment

Introduce a port equivalent to:

```typescript
export interface DepartmentStorageSegmentResolver {
  resolve(input: {
    readonly workspaceId: WorkspaceId;
    readonly departmentId: DepartmentId | null;
  }): Promise<DepartmentStorageSegment>;
}
```

Do not redesign Department. When no Department exists at first root creation, use:

```text
unclassified
```

A persisted root under `unclassified` is not relocated automatically later.

## Product folder

Use:

```text
{readable-reference}--{stable-product-id-segment}
```

Rules:

- prefer ProductCode,
- otherwise use a safe ASCII portion of Product name,
- Arabic-only or unusable name falls back to `product`,
- append a stable ProductId segment to prevent collisions,
- do not rely only on a slug,
- handle Windows reserved names, trailing dots/spaces, control characters, invalid filename characters, repeated punctuation, and path-length limits,
- output must be deterministic.

---

# 6. Product Media Slots

Introduce:

```typescript
export type ProductMediaSlot =
  | { readonly type: "Main" }
  | {
      readonly type: "Gallery";
      readonly slotNumber: number;
    };
```

Rules:

- `Main` → `main.webp`,
- Gallery 1..99 → `gallery-01.webp` through `gallery-99.webp`,
- invalid slot numbers are rejected,
- deleting a slot does not renumber later slots,
- display reordering does not rename files,
- uploaded filenames are never used as storage filenames.

Reserve:

```text
_staging/
_trash/
_variants/
```

Create staging/trash lazily. `_variants` is reserved only; do not generate variants.

---

# 7. Image Processor

Port:

```typescript
export interface ProductImageProcessor {
  inspect(input: Uint8Array): Promise<ProductImageInspection>;

  normalize(
    input: Uint8Array,
    configuration: ProductImageProcessingConfiguration,
  ): Promise<NormalizedProductImage>;
}
```

Accepted source formats:

```text
JPEG
PNG
WebP
```

Reject:

```text
SVG
GIF
Animated WebP
BMP
TIFF
HEIC/HEIF
Unknown or corrupt binary
```

Validation must use file content and decoder inspection, not filename extension or claimed MIME type.

Documented default processing policy:

```text
Maximum source size: 10 MiB
Maximum decoded pixels: configurable safe limit
Maximum output: 2000 × 2000
Upscaling: disabled
Output: non-animated WebP
Quality: approximately 82
Orientation: auto-rotate
Color space: sRGB
Metadata: remove EXIF/GPS and unnecessary metadata
Transparency: preserve
Animation: reject
```

Expected invalid inputs must return typed failure codes.

Add `sharp` as a direct runtime dependency. Do not rely on a transitive Next.js copy. Keep all `sharp` imports in Infrastructure. Record the exact version and compatibility evidence. Run audits without `npm audit fix` or forced overrides.

A newly introduced critical advisory blocks the task. A new direct high-severity runtime advisory requires explicit review.

---

# 8. Storage Port

Introduce typed provider-neutral primitives equivalent to:

```typescript
export interface ProductMediaStoragePort {
  stage(input: StageProductMediaInput): Promise<StageProductMediaResult>;

  publishNew(
    input: PublishNewProductMediaInput,
  ): Promise<PublishNewProductMediaResult>;

  publishReplacement(
    input: PublishReplacementProductMediaInput,
  ): Promise<PublishReplacementProductMediaResult>;

  moveToTrash(
    input: MoveProductMediaToTrashInput,
  ): Promise<MoveProductMediaToTrashResult>;

  restoreFromTrash(
    input: RestoreProductMediaFromTrashInput,
  ): Promise<RestoreProductMediaFromTrashResult>;

  discardTemporary(
    input: DiscardTemporaryProductMediaInput,
  ): Promise<DiscardTemporaryProductMediaResult>;

  inspect(
    key: ProductMediaStorageKey,
  ): Promise<ProductMediaStoredObjectInspectionResult>;

  exists(key: ProductMediaStorageKey): Promise<boolean>;
}
```

Typed outcomes must distinguish expected conditions such as target conflict, missing temporary object, missing final object, checksum mismatch, unsafe key, trash conflict, and replacement restoration failure.

Do not add `deleteForever`. Do not expose absolute paths.

---

# 9. Local Filesystem Adapter

Use infrastructure configuration:

```text
QSC_MEDIA_ROOT
```

Requirements:

- must be a valid absolute directory,
- storage keys remain relative,
- directories are lazy,
- user filenames are ignored,
- resolved paths must remain inside the configured root,
- reject traversal, absolute storage keys, Windows drive paths, UNC paths, symlink escape, and junction/reparse-point escape where supported,
- do not expose physical paths to Application or Presentation,
- tests use isolated temporary directories.

Safe local write flow:

```text
normalized bytes
→ exclusive temporary file in _staging on the same filesystem
→ flush/sync when supported
→ calculate SHA-256 from stored bytes
→ verify byte length and hash
→ rename/promote to final slot
```

Rules:

- never stream directly to final filenames,
- `publishNew` must not overwrite an existing final file,
- replacement uses explicit backup/trash handling,
- on replacement promotion failure, attempt filesystem-level restoration and return a typed result,
- cleanup removes only temporary files owned by the current operation,
- do not claim a distributed transaction between PostgreSQL and filesystem.

Successful stored-object information must include:

```text
relative storage key
SHA-256
byte length
media type
width
height
```

The hash must represent normalized bytes actually written.

---

# 10. PostgreSQL Adapter

Follow the existing Drizzle/PostgreSQL conventions.

Requirements:

- workspace-scoped reads,
- strict mapping,
- typed uniqueness conflicts,
- no update/delete methods,
- no absolute paths in PostgreSQL,
- concurrent create behavior is deterministic,
- distinguish same Product `AlreadyExists` from another Product using the same storage root.

Task 3.14.8 will perform orchestration and compensation.

---

# 11. Cross-Platform Workflow

Add a focused workflow without changing the approved DEV-002 two-job workflow:

```text
.github/workflows/product-media-compatibility.yml
```

Matrix:

```text
ubuntu-latest
windows-latest
```

Run only Product Media foundation tests and required TypeScript validation.

Use:

- `npm ci`,
- repository `.nvmrc`,
- read-only permissions,
- concurrency cancellation.

Triggers:

```text
push:
  main
  feature/product-entry-engine

pull_request:
  main
  feature/product-entry-engine

workflow_dispatch:
```

It must prove direct `sharp` installation, JPEG/PNG/WebP normalization, storage-key behavior, staging/publication, path containment, Windows reserved-name handling, and owned-test-artifact cleanup.

Do not claim hosted success before a real PR run.

---

# 12. Required Tests

## Value objects and path policy

Cover:

- valid/invalid root keys,
- canonical equality,
- absolute/backslash/traversal/control-character rejection,
- maximum length,
- root immutability,
- Main and Gallery slots,
- ProductCode and name fallbacks,
- Arabic-only name,
- ProductId collision protection,
- Department and `unclassified`,
- Workspace safe/hash fallback,
- Windows reserved names,
- deterministic output,
- overall path length.

## PostgreSQL

Cover:

- create/find,
- workspace isolation,
- `AlreadyExists`,
- `StorageRootConflict`,
- database key constraints,
- `ON DELETE RESTRICT`,
- concurrent create,
- migration `0000 → 0001 → 0002`,
- existing Products remain valid,
- no fake backfill.

## Image processor

Cover:

- JPEG/PNG/WebP accepted,
- WebP output,
- signature validation,
- extension spoofing,
- corrupt data,
- rejected formats,
- animated WebP rejection,
- source-size limit,
- decoded-pixel limit,
- max dimensions,
- no upscaling,
- orientation and sRGB,
- metadata removal,
- transparency,
- checksum accuracy.

Use only small repository-owned or generated fixtures.

## Local adapter

Cover:

- valid/invalid root configuration,
- containment,
- traversal/absolute/drive/UNC rejection,
- symlink and Windows junction behavior where testable,
- exclusive staging,
- checksum from stored bytes,
- publish-new conflict,
- no partial final file,
- replacement backup/restoration attempt,
- trash/restore,
- owned temporary cleanup,
- preservation of unrelated temporary files,
- no absolute path returned.

---

# 13. Documentation

Create bilingual ADR:

```text
ADR-012 — Product Media Root Registry and Local Storage Foundation
```

Document:

- independent immutable registry,
- PostgreSQL constraints and `ON DELETE RESTRICT`,
- path policy and `unclassified`,
- ProductId collision protection,
- storage slots,
- local-storage limitations,
- WebP normalization,
- unsupported formats,
- no permanent delete,
- cross-platform evidence,
- future object-storage adapter,
- Task 3.14.8 responsibilities.

Update relevant architecture, domain, application, infrastructure, and development indexes.

State clearly:

```text
V1:
Single application server with local media storage

Future:
Provider-neutral object-storage adapter
```

Do not claim local storage supports horizontal scaling.

---

# 14. Scope Exclusions

Do not implement:

- Product Entry UI,
- React media controls,
- Server Actions or Route Handlers,
- multipart endpoints,
- Smart Save/media workflow,
- automatic root-creation use case,
- Product image metadata mutation,
- database/filesystem compensation orchestration,
- reconciliation or repair,
- permanent deletion or retention scheduler,
- thumbnails or variants,
- public URLs/CDN,
- S3/Supabase/cloud storage,
- HEIC/HEIF,
- stock, pricing, or branch inventory.

---

# 15. Verification

Run locally:

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

After local review approval, use a Pull Request to prove:

```text
Product Media Compatibility (ubuntu-latest)
Product Media Compatibility (windows-latest)
```

Do not merge unless existing DEV-002 checks and both compatibility matrix entries pass.

---

# 16. Acceptance Criteria

Accepted locally only when:

1. ProductMediaRoot is independent and immutable,
2. repository exposes only find/create,
3. PostgreSQL is workspace-safe with `ON DELETE RESTRICT`,
4. migration `0002_product_media_root_registry` is clean,
5. `0000` and `0001` remain unchanged,
6. no fake backfill,
7. path policy is deterministic and collision-resistant,
8. `unclassified` and ProductId protection work,
9. slots and storage keys are typed,
10. no absolute paths escape,
11. traversal/symlink/junction escape is rejected,
12. JPEG/PNG/WebP safely normalize to WebP,
13. unsupported and animated formats are rejected,
14. source-size and decoded-pixel limits exist,
15. SHA-256 matches stored normalized bytes,
16. final files are never written directly,
17. no permanent delete exists,
18. `sharp` is direct,
19. focused Windows tests pass locally,
20. compatibility workflow exists,
21. all existing checks pass,
22. no Task 3.14.8 behavior is introduced,
23. DEV-001 bundle is `ReadyForReview`,
24. no Git commit is created.

Final approval additionally requires successful hosted Windows and Ubuntu runs.

---

# 17. Required Final Report

Create:

```text
docs/05-Development/Reports/Task-3.14.7-Final-Report.md
```

Required sections:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. ProductMediaRoot Model
6. Root Immutability
7. Repository Contract
8. PostgreSQL Registry
9. Workspace Isolation
10. Database Constraints
11. ON DELETE Policy
12. Migration Name and Sequence
13. Storage Root Key
14. Workspace Segment
15. Department and Unclassified Policy
16. Product Folder and Collision Protection
17. Media Slots
18. Storage Port
19. Local Filesystem Adapter
20. QSC_MEDIA_ROOT Validation
21. Traversal and Symlink/Junction Protection
22. Staging and Publication
23. Replacement and Trash/Restore
24. Integrity Metadata
25. Image Processor Port
26. Sharp Adapter
27. Supported and Rejected Formats
28. Signature Validation
29. WebP Normalization
30. Size and Pixel Protection
31. Value-Object and Path Tests
32. Local Storage Tests
33. Image Processor Tests
34. PostgreSQL and Migration Tests
35. Windows Local Compatibility
36. Ubuntu Hosted Compatibility Status
37. Windows Hosted Compatibility Status
38. TypeScript Result
39. Integration TypeScript Result
40. Lint Result
41. Unit Test Result
42. PostgreSQL Integration Test Result
43. Build Result
44. Drizzle Check Result
45. Runtime Audit Result
46. Development Audit Result
47. Architecture Integrity Review
48. Scope Exclusion Review
49. Remaining Risks
50. Architecture Changes
51. Status

Hosted status must be one of:

```text
Not executed yet; requires pull-request workflow run.
Executed successfully with GitHub Actions evidence.
Executed with failure; details documented.
```

Status must be:

```text
Ready for review.
```

or:

```text
Blocked pending architecture decision.
```

---

# 18. Review Bundle

Generate:

```powershell
npm.cmd run review:bundle -- --task=3.14.7 --report=docs/05-Development/Reports/Task-3.14.7-Final-Report.md
```

Export ZIP and detached `.sha256` to Desktop.

The manifest must report:

```text
overallStatus: ReadyForReview
```

Stop after Task 3.14.7.
