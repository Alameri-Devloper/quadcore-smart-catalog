# Task 3.14.7-R1 Final Report

## 1. Summary

Corrected Product Media tenant isolation and filesystem safety across key typing, PostgreSQL uniqueness, local publication, image validation, and infrastructure error semantics. The Product Aggregate and Smart Save remain unchanged. | تم تصحيح عزل المستأجر وسلامة نظام الملفات لوسائط المنتج مع الحفاظ على Product وSmart Save دون تغيير.

## 2. Files Created

This corrective final report. Migration `0002_product_media_root_registry.sql` and its snapshot were cleanly regenerated in place; no migration `0003` was created.

## 3. Files Modified

Product Media keys, ports, local filesystem and sharp adapters, focused tests, repository, PostgreSQL schema and integration tests, migration `0002` metadata, ADR-012, persistence/development documentation, and report index.

## 4. Files Deleted

No final-state project file was deleted. The prior undeployed `0002` SQL/snapshot pair was removed only as part of clean regeneration and replaced under the same descriptive name.

## 5. Cross-Workspace Collision Correction

The same physical storage-root key can no longer be registered by different Workspaces. Concurrent and sequential cross-Workspace collision tests cover the correction.

## 6. Provider Namespace Uniqueness

`storage_root_key` now has provider-global uniqueness, matching the shared configured storage namespace rather than treating Workspace scope as a physical namespace.

## 7. Tenant Identity Leakage Prevention

Storage-root conflicts are anonymous and expose no conflicting Workspace or Product identity. A same-Product retry is still reported as `AlreadyExists` after a scoped lookup.

## 8. Product Root Shape

Root keys must have exactly `workspaces/{workspace}/{department}/{product-folder}`. The Product folder must end in `--` plus 16 lowercase hexadecimal characters; arbitrary or nested roots are rejected.

## 9. Staging Key Type

Staging keys have a distinct immutable type and are restricted to `{root}/_staging/{operation-id}.webp`.

## 10. Trash Key Type

Trash keys have a distinct immutable type and are restricted to `{root}/_trash/{operation-id}.webp`.

## 11. Final Key and Root Cohesion

Final keys are slot-derived and carry their root. Publication, replacement, trash, and restore reject keys that do not belong to one Product root. Gallery slot construction is defensively constrained to integers 1–99.

## 12. Leaf Symlink/Junction Protection

The local adapter validates both parent components and existing leaf nodes with `lstat`/containment checks and rejects symbolic links, junctions, and non-regular leaf objects without following them.

## 13. Directory Creation Concurrency

Concurrent `mkdir` `EEXIST` outcomes are re-inspected and accepted only when the resulting component is a safe real directory inside the configured root.

## 14. Publication Verification Order

Publication creates the final hard link, inspects and verifies that final object, and only then removes staging.

## 15. Expected Checksum and Byte Length

Publication carries expected staged SHA-256, byte length, media type, width, and height and compares them with the final object before success.

## 16. Failed Publication Cleanup

On integrity mismatch, only the newly linked final object is removed. The staging object remains available for diagnosis or retry.

## 17. Replacement Restoration

Replacement moves the previous final object to its typed trash key and attempts restoration whenever verified publication fails. Restoration failure has its own typed result.

## 18. Infrastructure Failure Semantics

Unexpected filesystem failures throw a sanitized `ProductMediaStorageInfrastructureError` with an operation label and no physical path leakage. They are not mislabeled as unsafe user keys or missing objects.

## 19. Exists Semantics

`exists` returns false only for expected `ENOENT`, returns a typed unsafe-key failure for path-safety violations, and throws sanitized infrastructure errors for unexpected I/O.

## 20. Deterministic Signature Gate

JPEG, PNG, and WebP are classified from deterministic byte signatures before sharp decoding. Unknown and explicitly unsupported signatures are rejected independently of filenames or claimed MIME types.

## 21. WebP Animation Parsing

WebP RIFF chunks are parsed structurally, including `ANIM` and the `VP8X` animation flag. Arbitrary whole-file text scans are not used.

## 22. Explicit Rejected-Format Tests

Focused tests explicitly reject GIF, BMP, TIFF, HEIC/HEIF-style ISO BMFF, SVG, unknown bytes, corrupt supported signatures, and animated WebP.

## 23. Processing Configuration Validation

Image-processing configuration is immutable and validates finite safe positive integer limits plus integer WebP quality from 1 through 100 before processing.

## 24. Migration Regeneration

Because `0002` was uncommitted and undeployed, it was cleanly regenerated with the same `product_media_root_registry` descriptive name. Migrations `0000` and `0001` were not modified, and no `0003` exists.

## 25. PostgreSQL Uniqueness

The regenerated migration creates `catalog_product_media_roots_storage_root_uq` globally on `storage_root_key`, retains the Workspace/Product primary key and `ON DELETE RESTRICT`, and adds the strict root-shape check.

## 26. PostgreSQL Integration Tests

Tests cover same-Product retry, anonymous same- and cross-Workspace conflicts, concurrent global collision, strict database root rejection, no backfill, and restricted Product deletion.

## 27. Local Storage Tests

Focused tests cover root validation, concurrent directory creation, parent/leaf link protection, staged integrity, final verification order, tampering, same-root cohesion, cleanup, replacement restoration, and infrastructure failures.

## 28. Image Processor Tests

Focused tests cover accepted signatures, explicit rejected signatures, RIFF animation parsing, corrupt input, configuration validation, source/pixel/dimension limits, normalization, orientation, sRGB, metadata removal, and transparency.

## 29. Windows Local Compatibility

The focused local suite passed 24 of 25 tests; one leaf-link case was explicitly skipped because the local Windows account could not create that link. Parent-junction protection executed and passed. This is not a claim of hosted Windows success.

## 30. Ubuntu Hosted Compatibility Status

Not executed yet; an actual pull-request workflow run is required.

## 31. Windows Hosted Compatibility Status

Not executed yet; an actual pull-request workflow run is required.

## 32. TypeScript Result

`npx.cmd tsc --noEmit` passed.

## 33. Integration TypeScript Result

`npx.cmd tsc --project tsconfig.integration.json` passed.

## 34. Lint Result

`npm.cmd run lint` passed without reported warnings or errors.

## 35. Unit Test Result

Passed 106 Product/domain tests, 25 DEV-001 review-tool tests, and 24 of 25 focused Product Media tests. The sole skip was the explicitly reported local Windows leaf-link privilege case; no test failed.

## 36. PostgreSQL Integration Test Result

The clean `qsc_test` migration sequence passed 36 tests across 8 suites.

## 37. Build Result

`npm.cmd run build` passed with the optimized Next.js production build.

## 38. Drizzle Check Result

`npm.cmd run db:check` passed; regenerated migration metadata is consistent.

## 39. Runtime Audit Result

`npm.cmd audit --omit=dev` remained visible and non-blocking, reporting the accepted baseline of 3 vulnerabilities: 1 moderate and 2 high, exit code 1. The sharp advisory is in Next.js's nested sharp below 0.35.0; the direct dependency remains sharp 0.35.3. No audit fix was applied.

## 40. Development Audit Result

`npm.cmd audit` remained visible and non-blocking, reporting the accepted baseline of 7 vulnerabilities: 5 moderate and 2 high, exit code 1. No forced update, override, downgrade, or unrelated dependency correction was applied.

## 41. Architecture Integrity Review

ProductMediaRoot remains independent from Product Aggregate with find/create only. `ON DELETE RESTRICT`, direct sharp, provider-neutral ports, DDD/Clean Architecture boundaries, optimistic concurrency, PostgreSQL persistence, Smart Save, and migrations `0000`/`0001` are preserved.

## 42. Scope Exclusion Review

Task 3.14.8 was not started. No Product Entry UI, upload handler, Server Action, Route Handler, Smart Save/media integration, reconciliation, permanent deletion, thumbnails, variants, public URLs, cloud storage, HEIC support, stock, pricing, or branch inventory was implemented.

## 43. Remaining Risks

V1 local storage remains single-application-server only. Hosted Ubuntu/Windows evidence awaits a real pull-request workflow run. Local Windows link privileges prevented one leaf-link test from executing, while the test remains enabled for capable environments.

## 44. Architecture Changes

ADR-012 and the Product Media infrastructure boundary were corrected to enforce one provider-global physical namespace, strict rooted key types, verified publication, deterministic format gating, and explicit infrastructure failures. Existing Product and Smart Save architecture is unchanged. | تم تصحيح حدود بنية وسائط المنتج دون تغيير بنية Product أو Smart Save.

## 45. Status

Ready for review.
