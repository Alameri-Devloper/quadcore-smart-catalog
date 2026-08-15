# QSC Task 3.15.1-D-R1 Final Report

## Status

ReadyForReview

## Task

3.15.1-D-R1 — Stale-Edit Concurrency, Logout Integrity and Presentation Contract Hardening

## Branch

`feature/identity-auth-member-ui`

## Root Cause

Task D protected only races occurring after Application loaded the latest persisted row. The browser did not submit the revision it originally observed, so a stale draft could be rebuilt from the newer row and overwrite it. The member HTTP boundary also serialized the internal administration read model directly. Presentation unconditionally navigated after the logout request, and a latest Session-creation timestamp was labeled as a successful login even though no Login History aggregate exists.

يعالج التصحيح أربعة أسباب جذرية: غياب رمز المراجعة الذي قرأه المتصفح، وتسلسل نموذج قراءة التطبيق مباشرة عبر HTTP، والانتقال غير المشروط بعد طلب تسجيل الخروج، ووصف وقت إصدار الجلسة على أنه سجل دخول ناجح رغم عدم وجود تجميع Login History.

## Stale Authorization Review

Permission, Branch-scope, promotion, and demotion commands now require `expectedAuthorizationRevision`. Application first resolves the trusted Owner from server Session context, locks the target Membership, compares the submitted observation with persisted `authorizationVersion`, and returns `AuthorizationConflict` on mismatch before mutation. Successful changes still increment the server-owned version exactly once, revoke sessions, audit, and commit atomically. React only echoes `authorizationRevision`; it never calculates or increments it.

Proved sequences preserve Owner B's permission and Branch changes and prevent stale promotion/demotion. HTTP maps the conflict to 409. PostgreSQL integration verifies the same behavior against persisted rows.

## Profile Concurrency Review

Member details maps profile `updatedAt` to the read-only `profileRevision`. Profile PATCH requires `expectedProfileRevision`; Application locks the profile and compares the exact observed ISO revision before building or saving a change. A mismatch rolls back as Conflict and preserves the newer display name and locale. No new column or migration was added.

## WhatsApp Concurrency Review

Member details maps `recoveryContactVersion` to `recoveryContactRevision`. WhatsApp PATCH requires `expectedRecoveryContactRevision`; Application compares it with the locked profile before duplicate checks, no-op handling, mutation, challenge invalidation, or success audit. Tests prove a stale request preserves the current phone and does not invalidate a challenge created after the newer successful change. Successful behavior remains unchanged: recovery version increments, open challenges are invalidated, sessions are retained, and authorization version is unchanged.

## Communication Settings Concurrency Review

Communication-settings GET returns `settingsRevision`, derived from the existing settings `updatedAt`. PATCH requires `expectedSettingsRevision`. Application locks Workspace and settings, compares the observed token, and updates Workspace recovery policy plus communication settings in one transaction only on a match. Stale settings tests preserve the newer phone and policy. The settings repository gained a `forUpdate` read option; no schema change was required.

## HTTP DTO Redaction Review

The HTTP boundary now explicitly maps `MemberAdministrationReadModel` into separate `MemberListHttpDto` and `MemberDetailsHttpDto` contracts. The list contains only list fields and excludes permissions, authorization/recovery versions, persistence metadata, and session information. Details adds only permission/Branch edit data plus concurrency-named `authorizationRevision`, `profileRevision`, and `recoveryContactRevision`. Internal names and latest Session issuance are not serialized. Tests assert the exact list payload and absence of internal fields from details.

## Logout Integrity Review

Presentation navigates to `/login` and refreshes only when logout succeeds or the HTTP outcome safely identifies an already-invalid session. Network, 503, forbidden, and unexpected outcomes do not impersonate success; the controlled page displays the bilingual warning that the session may remain active. The server clears the HttpOnly cookie only after the idempotent logout use case succeeds, retaining it after infrastructure failure so revocation can be retried. React never reads or clears the cookie. A single-flight guard disables repeated clicks and suppresses duplicate requests.

## Change Password Expiry Review

A 401 from change-password now enters the established safe session-expiry redirect with a validated internal return path. It is not displayed as password validation failure, and neither the API client nor Presentation replays the password mutation after login.

## Conflict UX Review

Member and communication-settings 409 states retain local drafts, display accurate Arabic/English conflict guidance, and offer an explicit Refresh / Review Current Data action. There is no auto-retry, merge, refresh-and-resubmit, or silent draft replacement. Only explicit refresh loads current data and replaces the observed revisions; a new explicit submission is required.

## Login Timestamp Accuracy Review

The misleading “Last successful login” field was removed from member details and from safe HTTP DTOs. The internal read model now names its source accurately as `lastSessionIssuedAt`, but Presentation does not expose it. A dedicated Login History aggregate remains a future enhancement outside D-R1.

## Browser QA Review

The browser-control runtime was initialized and queried, but browser discovery returned an empty registered-backend list (`[]`). Therefore no visual, viewport, touch, mouse, or keyboard result is claimed. The required deterministic matrix remains:

- Arabic RTL and English LTR at 320, 375, 768, 1024, and 1440 pixels.
- Login, Password Change, Members, New Member, Member Details, Permissions, Branches, Lifecycle actions, and Settings.
- Touch, mouse, keyboard, focus visibility, overflow, disclosure controls, loading, conflict, and failure states.

Browser unavailability caused no architecture workaround and no E2E dependency was added.

## Test Results

- Baseline `npm.cmd run test:identity` before correction: passed 74/74, demonstrating that the original suite did not detect stale browser observations.
- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed with zero errors/warnings.
- `npm.cmd test` — passed; Identity is now 84/84, and all Product Aggregate, DEV-001, Product Media, and Product Entry suites passed (one existing platform-permission media-link case remains an explicit skip).
- `npm.cmd run test:integration` — first stopped at the sanitized database-preparation boundary while Docker was unavailable; after starting the repository-local PostgreSQL service, passed 87/87 across 17 suites, including the new persisted stale-observation test.
- `npm.cmd run build` — passed; Next.js compiled, type-checked, and generated all Identity pages and API routes.
- `npm.cmd run db:check` — passed.
- `git diff --check` — passed; informational Git LF/CRLF notices only.
- `git status --short`, `git diff --stat`, and branch inspection were read-only and completed.

No npm audit command, production migration, or new dependency was used.

## Git and Review Integrity

The branch remained `feature/identity-auth-member-ui`. No add, commit, push, merge, rebase, reset, restore, clean, stash, checkout, switch, tag, or branch operation was executed. No migration file was created or edited. DEV-001 generates the repository-local and exported ZIP/checksum from exact source files with sanitized evidence only; the handoff reports the published paths. This task is not self-approved.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.15.1-D-R1-Final-Report.md`

## Files Modified

- `docs/01-Architecture/Identity/README.md`
- `docs/05-Development/Identity-Member-Administration.md`
- `docs/05-Development/Identity-Authentication-and-Member-Presentation.md`
- `docs/05-Development/Reports/QSC-Task-3.15.1-D-Final-Report.md`
- `domains/identity/application/member-administration.use-cases.ts`
- `domains/identity/application/member-administration.test.ts`
- `domains/identity/repositories/identity.repositories.ts`
- `domains/identity/mock/in-memory-identity-unit-of-work.ts`
- `domains/identity/infrastructure/http/identity-auth-route-handlers.ts`
- `domains/identity/infrastructure/http/identity-auth-route-handlers.test.ts`
- `domains/identity/infrastructure/http/identity-member-route-handlers.ts`
- `domains/identity/infrastructure/http/identity-member-route-handlers.test.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.repositories.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.integration.test.ts`
- `domains/workspace/repositories/workspace.repository.ts`
- `domains/workspace/infrastructure/persistence/postgresql-workspace.repository.ts`
- `domains/identity/presentation/identity-api.client.ts`
- `domains/identity/presentation/identity-presentation.types.ts`
- `domains/identity/presentation/identity-presentation.utils.ts`
- `domains/identity/presentation/identity-presentation.test.ts`
- `domains/identity/presentation/identity-i18n.tsx`
- `domains/identity/presentation/components/presentation-shell.tsx`
- `domains/identity/presentation/pages/member-details-page.tsx`
- `domains/identity/presentation/pages/members-page.tsx`
- `domains/identity/presentation/pages/change-password-page.tsx`

## Files Deleted

None.

## Architecture Changes

None. DDD, Clean Architecture, Modular Monolith, Multi-Tenant scoping, server Session authority, Application-owned transactions, repository isolation, Task E recovery boundary, and Task 3.17 Branch boundary are preserved. The changes harden existing contracts without redesign, dependency, or migration.

## Summary

D-R1 closes stale browser-edit overwrite paths for authorization, profile, WhatsApp recovery contact, and Workspace communication settings; redacts member HTTP contracts; requires confirmed logout outcomes; redirects expired password change safely; preserves drafts on conflict; and removes the inaccurate login label. Automated unit, HTTP, Presentation, build, schema, and PostgreSQL integration verification pass. Manual browser QA remains unexecuted because no browser backend was registered.

## Next Recommendation

Submit Task D plus D-R1 for independent review. After approval, commit them together, push `feature/identity-auth-member-ui`, create a PR to `feature/product-entry-engine`, wait for GitHub Actions, merge only after all checks pass, and then begin Task 3.15.1-E. Do not begin Task E before approval and merge.
