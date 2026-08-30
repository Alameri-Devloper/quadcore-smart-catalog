# QSC Task 3.21-R2 Final Report

## Status

ReadyForReview

## Task

Task 3.21-R2 — Exact Deactivation Dialog Focus Restoration

## Branch

`feature/catalog-reference-data-management`

## Baseline

Required ancestor and current HEAD: `b27133090a3fdf7aceb72f8ab0ebcf8659c99472`

## English Summary

Task 3.21-R2 corrects the independent-review focus-restoration finding with a narrow Presentation-layer change. A Deactivate dialog now records its focus origin only from the explicit opening click's `event.currentTarget`; render-time callback refs can no longer replace it with another record's button. Cancel and Escape restore the exact connected opener. After a mutation refresh removes that opener, focus moves deterministically to the same record's replacement status action, then its Edit action, and finally the manager heading. The R1 native modal, edit/status conflict recovery, CI test wiring, bilingual copy, and Task 3.16 contracts remain unchanged.

## Arabic Summary

تُصحح المهمة 3.21-R2 ملاحظة المراجعة المستقلة الخاصة بإعادة التركيز من خلال تغيير محدود داخل طبقة العرض. تحتفظ نافذة تأكيد التعطيل الآن بمصدر التركيز فقط من `event.currentTarget` للنقرة الصريحة التي فتحتها، ولا تستطيع مراجع React التي تعمل أثناء العرض استبداله بزر تابع لسجل آخر. يعيد الإلغاء ومفتاح Escape التركيز إلى زر الفتح المتصل نفسه. وإذا أزال تحديث ما بعد العملية ذلك الزر، ينتقل التركيز بصورة حتمية إلى إجراء الحالة البديل للسجل نفسه، ثم زر التعديل للسجل نفسه، ثم عنوان المدير. لم تتغير نافذة R1 الأصلية، أو معالجة تعارضات التعديل والحالة، أو ربط اختبارات CI، أو النصوص ثنائية اللغة، أو عقود المهمة 3.16.

## Independent Review Finding

The active Deactivate buttons used both an explicit click assignment and a React callback ref to write one shared `actionOrigin`. Callback refs run during mount and re-render, so a later record could overwrite the exact button that opened the dialog. The existing R1 tests proved general restoration but did not distinguish between two active records or reject render-time origin writes.

## Root Cause

Focus origin was partly derived from render lifecycle state rather than exclusively from the user's opening interaction. Because all active records shared one mutable ref, callback-ref order could make Cancel or Escape focus a different Deactivate button.

## Exact Focus-Origin Correction

The render-time button callback ref was removed. The only assignment to `actionOrigin.current` occurs inside the active record's Deactivate `onClick` handler and uses that handler's `event.currentTarget`. Stable, record-specific IDs were added to the Edit and status actions solely for deterministic post-refresh focus lookup.

## Cancel Focus Restoration

Cancel closes the dialog with the confirming record ID. The asynchronous restoration policy first selects the captured opener when it is still connected, so another active record's button cannot receive focus.

## Escape Focus Restoration

The native dialog `cancel` event prevents implicit closure, closes through the same record-aware function as Cancel, and applies the same exact-opener priority. Escape never confirms or retries the status mutation.

## Post-Mutation Focus Fallback

Successful deactivation awaits authoritative reload before closing. If the original Deactivate element was removed by that refresh, the pure selection policy rejects it through `isConnected` and chooses, in order: the same record's replacement status action, the same record's stable Edit action, then the manager heading. Failure paths retain the connected opener when present and use the same safe fallback if a refresh replaced it. Detached elements are never focused.

## Native Dialog Non-Regression

The confirmation remains a native `<dialog role="alertdialog" aria-modal="true">` opened with `showModal()`. Initial focus remains on Cancel, the full-viewport backdrop remains, native focus containment and document inertness remain, and Confirm/Cancel continue to support touch, mouse, and keyboard interaction. English/LTR and Arabic/RTL copy is unchanged.

## Edit Conflict Non-Regression

Edit `409` recovery remains `review-edit`: authoritative state refreshes, the draft remains available for review, and Save requires a separate explicit action. No focus correction changed this flow.

## Status Conflict Non-Regression

Activate/Deactivate `409` recovery remains `retry-status`: authoritative state refreshes, the dedicated localized status-conflict message renders without the edit-only Review action, and no mutation is automatically retried.

## CI Test Wiring Non-Regression

The R1 `test:reference-data` wiring remains in `package.json`, so the Presentation glob continues to run through `npm test` and the existing GitHub Quality Gate. R2 did not change `package.json`.

## Architecture Non-Change

No architecture changed. The focus correction is confined to the existing Catalog Reference Data Presentation component, its pure Presentation behavior helper, and its dependency-free Presentation tests. No business or persistence rule moved into the component.

## Task 3.16 Contract Non-Change

Task 3.16 Domain, Application, HTTP, repository, optimistic-concurrency, audit, and persistence contracts are unchanged. Status mutations still send the server-provided version once per explicit user action.

## Multi-Tenant Non-Change

Workspace and Actor authority remain server-derived through `TrustedActorContext`. No tenant identifier, permission, internal persistence detail, or authority decision was added to browser state, URLs, request DTOs, copy, or tests.

## Database / Migration Non-Change

No schema, migration, seed, repository, or PostgreSQL implementation changed. The migration chain remains `0000` through `0015`; no migration `0016` exists. Verification used only the guarded local `qsc_test` integration database. No Production database or Production migration was accessed.

## Dependency Non-Change

No runtime or development dependency was added, removed, installed, or updated. `package.json` was not changed by R2. `npm audit` was not run, as required.

## package-lock Equality

`package-lock.json` remained byte-for-byte unchanged. Initial and final SHA-256:

`C3E1F979A358FEE2A206B8889C4018A6DA58EE5DB6EEA12D4B7EA7A8B7D5B741`

## Focused Tests

- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --project tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed with no warnings or errors.
- `npx.cmd tsx --test domains/catalog/reference-data/presentation/*.test.ts` — passed 58/58.
- `npm.cmd run test:reference-data` — passed 73/73 and visibly included all 58 Presentation tests.

The strengthened dependency-free regressions prove that only the opening click captures the origin, no button callback ref can overwrite it, the exact captured opener outranks another connected record action, Cancel and Escape share record-aware restoration, initial focus remains Cancel, detached origins are rejected, same-record status fallback is selected, authoritative reload precedes successful deactivation closure, and native modal/status-conflict behavior remains covered.

## Full Regression

`npm.cmd test` passed 692 assertions with one existing platform-permission Product Media skip across 693 tests. Output visibly included Reference Data 73/73 and the final Presentation 58/58.

## PostgreSQL Integration

`npm.cmd run test:integration` passed 128/128 across 24 suites, including PostgreSQL Catalog Reference Data 7/7. The existing guarded local PostgreSQL test service was healthy. No Production resource was accessed.

## Build

`npm.cmd run build` passed. Next.js compiled, completed TypeScript validation, generated 41 static pages, and included `/catalog/reference-data` in the route manifest.

## db:check

`npm.cmd run db:check` passed with `Everything's fine` from Drizzle.

## git diff --check

`git diff --check` passed. Git emitted only normal Windows LF-to-CRLF working-copy notices and no whitespace error.

## Manual QA

The required in-app browser workflow was initialized for `http://localhost:3000/catalog/reference-data`. Port 3000 was already occupied, but the managed browser runtime reported no available browser instances (`[]`) after the prescribed troubleshooting check. Therefore live two-record Cancel/Escape focus verification and English/Arabic browser QA are not claimed. No alternate browser automation was substituted. Automated source and pure-policy tests cover the exact clicked-origin and detached-origin behaviors; independent review must repeat the live workflow with a safe authenticated local account.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.21-R2-Final-Report.md`

## Files Modified

- `domains/catalog/reference-data/presentation/catalog-reference-dynamic-manager.behavior.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-dynamic-manager.tsx`
- `domains/catalog/reference-data/presentation/catalog-reference-data-management.presentation.test.ts`

The pre-existing uncommitted Task 3.21 and R1 implementation remains preserved in the same working tree and is not reclassified as new R2 work.

## Files Deleted

None.

## Architecture Changes

None.

## Summary

Deactivation dialog focus now returns to the exact clicked opener for Cancel and Escape. When an authoritative refresh removes that element, focus follows a safe, deterministic same-record fallback. Stronger tests close the render-ref coverage gap while preserving every R1 behavior.

## Git Integrity

The branch remained `feature/catalog-reference-data-management`, HEAD remained `b27133090a3fdf7aceb72f8ab0ebcf8659c99472`, and the required baseline remained an ancestor. No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion was performed. Original Task 3.21 and R1 working-tree changes and artifacts were preserved.

## DEV-001 Integrity

DEV-001 is run with baseline `b27133090a3fdf7aceb72f8ab0ebcf8659c99472`, exact-source capture, sanitized evidence, all required verification commands, and explicit skips for the two optional forbidden audit commands. The fresh R2 artifacts are:

- Repository evidence directory: `artifacts/task-reviews/3.21-R2/`
- Repository ZIP: `artifacts/task-reviews/QSC-Task-3.21-R2-Review.zip`
- Repository checksum: `artifacts/task-reviews/QSC-Task-3.21-R2-Review.zip.sha256`
- Exported report: `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.21-R2-Final-Report.md`
- Exported ZIP: `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.21-R2-Review.zip`
- Exported checksum: `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.21-R2-Review.zip.sha256`

Original Task 3.21 and R1 evidence, ZIPs, checksums, and reports remain untouched.

## Known Limitations

- Live authenticated browser QA remains pending because the managed browser runtime had no available target.
- The native dialog solution continues to rely on standards-based browser `showModal()` behavior supported by the project browser baseline.
- The existing Task 3.16 Condition/Currency no-version limitation and the original Task 3.21 documented limitations are unchanged.

## Next Recommendation

Perform independent source, artifact, accessibility, and live authenticated browser review. With two active records, verify that Cancel and Escape each return focus to the exact first Deactivate opener, then verify post-deactivation same-record fallback in English/LTR and Arabic/RTL. Do not commit, push, or begin Task 3.22 until R2 is independently approved.
