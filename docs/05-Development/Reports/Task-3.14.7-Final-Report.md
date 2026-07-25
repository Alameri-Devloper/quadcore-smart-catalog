# Task 3.14.7 Final Report

## 1. Summary

Implemented the provider-neutral Product Media Storage Foundation: an independent immutable media-root registry, deterministic secure keys and slots, PostgreSQL persistence and migration `0002`, direct sharp processing, local filesystem safety primitives, focused tests, and a Windows/Ubuntu compatibility workflow. | تم تنفيذ أساس تخزين وسائط المنتج المحايد للمزوّد مع سجل جذور ثابت ومستقل ومفاتيح آمنة وترحيل PostgreSQL ومعالجة sharp وتخزين محلي آمن واختبارات توافق مركزة.

## 2. Files Created

ADR-012; the Task 3.14.7 report; the Product Media compatibility workflow; Product Media domain keys, root, slots, path policy, ports, adapters, and focused tests; PostgreSQL media-root repository and integration tests; migration `0002_product_media_root_registry.sql`; and its generated Drizzle snapshot.

## 3. Files Modified

Architecture, Catalog, Domain, Application, Infrastructure, PostgreSQL development, development, and report indexes; PostgreSQL schema; Drizzle journal; package manifest and lockfile; integration TypeScript/test configuration; and the supplied task specification header for trailing-whitespace integrity only.

## 4. Files Deleted

None.

## 5. ProductMediaRoot Model

Added an immutable Catalog model containing typed WorkspaceId, ProductId, ProductMediaStorageRootKey, and defensive createdAt. It is not referenced by Product Aggregate.

## 6. Root Immutability

Roots expose no mutation, relocation, or deletion behavior. Dates are defensively copied, and removal of media does not remove a root.

## 7. Repository Contract

`ProductMediaRootRepository` exposes only Workspace-scoped `findByProduct` and `create`, with typed `Created`, `AlreadyExists`, and `StorageRootConflict` results.

## 8. PostgreSQL Registry

Added `catalog_product_media_roots` with Workspace/Product identity, relative storage root, and creation timestamp. No mutable Product naming/classification data or absolute path is stored.

## 9. Workspace Isolation

Primary and unique constraints include Workspace; reads always require WorkspaceId, and the same relative key may exist in different Workspaces.

## 10. Database Constraints

PostgreSQL enforces non-empty length up to 512, lowercase canonical characters, relative boundaries, forward separators, no repeated slash, no dot/traversal segments, no backslash, and no drive prefix.

## 11. ON DELETE Policy

The composite Product foreign key uses `ON DELETE RESTRICT`. Integration tests prove a Product with a registered media root cannot be deleted.

## 12. Migration Name and Sequence

Generated `0002_product_media_root_registry` through Drizzle after `0000_product_persistence_foundation` and `0001_product_archive_reason`. Prior migrations were not modified, and no backfill exists.

## 13. Storage Root Key

Strong immutable root, stored, temporary, and Department-segment value objects reject unsafe, noncanonical, absolute, traversal, Windows-reserved, control-character, or overlength values.

## 14. Workspace Segment

Safe immutable ASCII Workspace IDs are reused; otherwise a deterministic 20-hex SHA-256 fallback is used.

## 15. Department and Unclassified Policy

A provider-neutral Department resolver port was added. Missing Department resolves to persisted `unclassified`; no automatic later relocation is defined.

## 16. Product Folder and Collision Protection

ProductCode is preferred, then safe ASCII Product name, then `product`. Every folder appends a stable 16-hex ProductId-derived SHA-256 segment and handles Arabic-only text, reserved names, punctuation, and path length deterministically.

## 17. Media Slots

Typed Main and Gallery 1–99 slots map to `main.webp` and `gallery-01.webp` through `gallery-99.webp`. Slot deletion/reordering does not imply renaming; uploaded names are unused.

## 18. Storage Port

Added a `Uint8Array`-based provider-neutral port for stage, publish-new, replacement, trash, restore, discard, inspect, and exists, with typed expected failures and no permanent delete.

## 19. Local Filesystem Adapter

Added an infrastructure-only Node filesystem adapter for V1 single-server local storage. It exposes relative keys only and creates nested directories lazily.

## 20. QSC_MEDIA_ROOT Validation

The adapter requires an existing absolute directory from explicit configuration or `QSC_MEDIA_ROOT`; missing, relative, or non-directory targets are rejected.

## 21. Traversal and Symlink/Junction Protection

Canonical keys reject absolute, drive, UNC, backslash, traversal, and reserved segments. Lexical containment plus per-parent lstat/realpath checks reject symlink and Windows junction escape where supported.

## 22. Staging and Publication

Writes use exclusive `wx` staging files, sync, stored-byte reread, SHA-256/length verification, and same-filesystem hard-link promotion. `publishNew` never overwrites and never writes bytes directly to a final name.

## 23. Replacement and Trash/Restore

Replacement moves the prior final object to an explicit trash key, promotes the staged object, and attempts restoration on promotion failure. Trash conflicts and restoration failure are typed; unrelated temporary files remain untouched.

## 24. Integrity Metadata

Successful objects expose relative key, SHA-256, stored byte length, `image/webp`, width, and height. The hash is calculated from normalized bytes reread from storage.

## 25. Image Processor Port

Added provider-neutral inspect/normalize contracts using `Uint8Array`, typed inspections, normalized results, and expected rejection codes.

## 26. Sharp Adapter

Pinned direct runtime dependency `sharp@0.35.3`. Imports remain inside Infrastructure. `npm ls sharp --depth=0`, Windows focused tests, and production build passed with the direct version.

## 27. Supported and Rejected Formats

JPEG, PNG, and non-animated WebP are accepted. SVG, GIF, animated WebP, BMP, TIFF, HEIC/HEIF, unknown, and corrupt input are rejected.

## 28. Signature Validation

Validation uses sharp content decoding and metadata, plus WebP animation-container detection; filenames and claimed MIME types are not accepted as evidence.

## 29. WebP Normalization

Output is non-animated WebP at quality 82, auto-rotated, resized inside 2000×2000 without upscaling, converted to sRGB, metadata stripped, and transparency preserved.

## 30. Size and Pixel Protection

Defaults enforce 10 MiB maximum source bytes and 40,000,000 maximum decoded pixels; both are typed configurable limits and are tested.

## 31. Value-Object and Path Tests

Passed coverage for canonical equality, invalid keys, maximum length, immutability, slots, readable fallbacks, Arabic-only names, ProductId collision protection, Department/unclassified, Workspace hashing, Windows reserved names, determinism, and path length.

## 32. Local Storage Tests

Passed configuration, containment, junction, exclusive staging, checksum, non-overwrite, replacement restoration, trash/restore, owned cleanup, unrelated-file preservation, and relative-result tests.

## 33. Image Processor Tests

Passed JPEG/PNG/WebP normalization, decoder/signature rejection, animation, corrupt/unsupported input, source/pixel limits, maximum dimensions, no upscaling, orientation, sRGB, metadata removal, transparency, and checksum tests.

## 34. PostgreSQL and Migration Tests

Passed create/find, isolation, typed conflicts, concurrent create, constraints, `ON DELETE RESTRICT`, no backfill, existing Product validity, and recorded `0000→0001→0002` coverage on the clean test database.

## 35. Windows Local Compatibility

Passed 18 focused Product Media tests on Windows with Node.js 24.18.0 and direct sharp 0.35.3, including Windows junction and reserved-name behavior.

## 36. Ubuntu Hosted Compatibility Status

Not executed yet; requires pull-request workflow run.

## 37. Windows Hosted Compatibility Status

Not executed yet; requires pull-request workflow run.

## 38. TypeScript Result

`npx.cmd tsc --noEmit` passed.

## 39. Integration TypeScript Result

`npx.cmd tsc --project tsconfig.integration.json` passed.

## 40. Lint Result

`npm.cmd run lint` passed without reported warnings or errors.

## 41. Unit Test Result

Passed 106 Product/domain tests, 25 DEV-001 tooling tests, and 18 Product Media foundation tests.

## 42. PostgreSQL Integration Test Result

Passed 35 tests across 8 suites against isolated PostgreSQL 17.

## 43. Build Result

`npm.cmd run build` passed with the optimized Next.js production build and direct sharp 0.35.3.

## 44. Drizzle Check Result

`npm.cmd run db:check` passed. Generated migration metadata is consistent.

## 45. Runtime Audit Result

Reported the accepted 3-vulnerability baseline: 1 moderate and 2 high, exit code 1. The sharp high advisory is confined to Next.js's nested sharp 0.34.5; direct sharp 0.35.3 is outside the affected range. No critical advisory was introduced.

## 46. Development Audit Result

Reported the accepted 7-vulnerability baseline: 5 moderate and 2 high, exit code 1. No audit fix, forced override, or downgrade was applied.

## 47. Architecture Integrity Review

Product Aggregate, Smart Save, optimistic concurrency, Product repository behavior, committed migrations 0000/0001, UI, and existing persistence behavior remain unchanged. Node filesystem and sharp stay in Infrastructure; ports use provider-neutral types.

## 48. Scope Exclusion Review

Task 3.14.8 was not started. No UI, upload handler, Server Action, Route Handler, Smart Save/media orchestration, automatic root creation, Product image mutation, compensation orchestration, reconciliation, permanent deletion, variants, thumbnails, public URL, cloud storage, HEIC, stock, pricing, or branch inventory was added.

## 49. Remaining Risks

V1 local storage supports one application server only and not horizontal scaling. Hosted Windows/Ubuntu evidence awaits a pull request. The local `qsc` development database has pre-existing Drizzle journal drift (only 0000 recorded while later schema exists); it was not reset or modified, while clean `qsc_test` migration-chain verification passed. Existing Next.js/transitive dependency advisories remain under the accepted security baseline.

## 50. Architecture Changes

Accepted ADR-012 adds an independent immutable Product Media registry and provider-neutral media boundary inside Catalog, with PostgreSQL, local filesystem, and sharp infrastructure adapters. Existing Product and Smart Save architecture is unchanged. | يضيف ADR-012 المعتمد حد وسائط مستقل وثابتاً داخل Catalog مع محولات البنية التحتية، من دون تغيير Product أو Smart Save.

## 51. Status

Ready for review.
