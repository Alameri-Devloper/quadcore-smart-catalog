# QSC Task 3.15.1-C Final Report

## Status

ReadyForReview

## Task

3.15.1-C — Owner-Managed Members, Roles, Permissions, Branch Scope and WhatsApp Profiles

## Branch

`feature/identity-member-management`

Baseline HEAD: `3b923cb246ae1d1329c0cf8899eebce7a1754a66`.

## English Summary

Implemented the Owner-managed Workspace member administration backend on the merged Tasks A/B foundation. The result includes transactional member creation, safe profile and WhatsApp changes, Owner/Staff authorization, a fixed permission registry and template, normalized Staff permission and selected-Branch persistence, focused role/scope/lifecycle mutations, concurrency-safe Last Active Owner protection, real authorization-version mutation and session revocation, safe read models, Workspace communication settings, Owner-only HTTP routes, migration `0009`, tests, and bilingual documentation. No UI or external recovery delivery was added.

## Arabic Summary

تم تنفيذ الأساس الخلفي لإدارة أعضاء مساحة العمل بواسطة المالك فوق المهمتين A وB. يشمل التنفيذ إنشاء العضو داخل معاملة، وتحديث الملف وواتساب بأمان، ونموذج المالك/الموظف، وسجل صلاحيات وقالباً ثابتين، وتخزين صلاحيات الموظف والفروع المحددة بصورة مطبعة، وعمليات مركزة للأدوار والنطاق ودورة الحياة، وحماية متزامنة لآخر مالك نشط، وتحديث `authorizationVersion` وإلغاء الجلسات، ونماذج قراءة آمنة، وإعدادات اتصال مساحة العمل، ومسارات HTTP خاصة بالمالك، والهجرة `0009`، والاختبارات، والتوثيق ثنائي اللغة. لم تُضف واجهة مستخدم أو خدمة توصيل خارجية للاستعادة.

## Architecture Review

The implementation remains inside the existing modular monolith and Clean Architecture boundaries. Identity owns Account, credential, profile, Membership, authorization state, recovery invalidation, and session-revocation orchestration. Workspace owns Workspace configuration and the narrow Branch-reference query. Application use cases own transactions and cross-repository coordination; repositories do not call repositories; route handlers only authenticate, map DTOs, invoke Application, and map typed outcomes. Catalog continues to consume `TrustedActorContext` and does not read Identity persistence.

## Architecture Changes

Additive architecture extension only. New Identity domain policies, Application use cases, repository contracts/adapters, runtime composition, and HTTP adapters follow the existing layers. Workspace gained a narrow Branch-reference registry/query needed for selected-scope validation; this is explicitly not a Branch or Inventory aggregate. No existing bounded context was redesigned and no dependency was introduced.

## Role Model Review

V1 roles remain exactly `Owner | Staff`. Owner always uses `AllBranches`, derives full authority from the registry, and has no editable permission rows. Staff has only explicitly stored, Staff-assignable codes. Member administration remains Owner-only in both HTTP and Application layers, including when `workspace.members.manage` appears in Owner effective authority.

## Permission Registry Review

The code-owned registry includes stable codes, module, display/description translation keys, Staff-assignability, and sensitivity. Existing Product Entry codes were preserved verbatim. Unknown, duplicate, and Owner-only Staff assignments are rejected. Database checks also reject unknown persisted Staff codes.

## Permission Template Review

The fixed `standard-catalog-staff` template copies deterministic explicit permissions at create/edit time. It excludes audit/settings administration, media reconciliation, reference-cost management, and inventory adjustment defaults. It is not a role and cannot mutate existing members after later code changes.

## Staff Permission Persistence Review

`identity_membership_permissions` stores one Workspace/actor/code row with a composite primary key and Workspace-scoped Membership foreign key. Only authority codes are stored; no labels or uncontrolled authorization JSON are persisted. Owner effective permissions bypass these rows.

## Branch Scope Review

Only `AllBranches | SelectedBranches` is accepted. Selected scope requires a non-empty unique list. Owner SelectedBranches is rejected. The Branch-reference repository requires trusted `workspaceId` and applies it in persistence before rows are returned. Returned references must be Active; foreign-only and nonexistent IDs both return `BranchNotFound`.

## Selected Branch Persistence Review

`identity_membership_branches` persists unique Workspace/actor/Branch rows with composite Membership and Branch-reference foreign keys. `workspace_branch_references` is a minimal Workspace-owned integration registry pending the Task 3.17 Branch aggregate; no Inventory behavior was created.

## Member Profile Review

Profiles contain bounded required display name, E.164 WhatsApp/recovery contact, `ar | en` locale, recovery-contact version, and timestamps. Username remains immutable Account authority and is not mixed with profile changes.

## WhatsApp Security Review

WhatsApp is required, validated as E.164, and unique inside a Workspace across retained/non-deleted profiles. Suspended profiles are retained, so their numbers remain reserved; cross-Workspace reuse and equality with Workspace default WhatsApp are allowed. A phone change increments only `recoveryContactVersion`, invalidates open recovery challenges, and audits the operation. It does not change `authorizationVersion` or revoke sessions.

## Member Creation Review

The Owner-only use case validates trusted scope, username, profile, role, permission selection/template, Branch scope/references, and Temporary password. It atomically creates PendingActivation Account, Temporary credential, protection state, profile, Membership, normalized Staff authority, and audit. Password plaintext and hashes are never returned or audited.

## Authorization Version Review

Effective role, permission, and branch-scope changes lock the Membership and increment `authorizationVersion` exactly once through an optimistic expected-version update. Profile, locale, WhatsApp, and Workspace communication-setting changes do not alter the authorization version.

## Session Revocation Review

Permission, branch, promotion, demotion, suspension, reactivation, and Owner reset paths use the real Task B session repository/revocation implementation from Application orchestration. Authorization mutations proactively revoke target sessions with `AuthorizationChanged`; session resolution independently rejects stale versions as defense in depth.

## Promotion/Demotion Review

Promotion changes Staff to Owner, clears stored Staff authorization, forces AllBranches, increments the version, revokes sessions, and audits. Demotion requires explicit validated Staff permissions and Branch scope; it never copies Owner authority into Staff rows. Active-Owner demotion is protected by the Last Active Owner invariant.

## Last Active Owner Review

Suspend/demote operations lock the Workspace row before loading/counting Active Owners. All removal paths use the same lock order. PostgreSQL integration tests run concurrent suspension/demotion against two Active Owners and prove one succeeds, one returns `LastActiveOwnerProtected`, and one Active Owner remains. Rejections are audited.

## Suspension Review

Suspension is Owner-managed, preserves actor/profile/Membership/history and username ownership, invalidates open recovery challenges, revokes all sessions, and sets Account to Suspended without deletion. The last Active Owner cannot be suspended.

## Reactivation Review

Reactivation requires a new validated Temporary password and a retained valid profile/WhatsApp. It changes Suspended to Active, replaces the credential with Temporary, increments `passwordVersion`, clears protection, invalidates recovery, revokes residual sessions, and preserves actorId/username.

## Owner Password Reset Review

The existing Owner reset path is exposed through member management. It issues a new Temporary credential, increments `passwordVersion`, clears protection, invalidates recovery, revokes target sessions, and audits without returning an existing password or hash.

## Workspace Communication Settings Review

Owners can read/update `defaultWhatsAppPhoneE164` and `OwnerManagedOnly | WhatsAppOtpWithOwnerFallback`. Updates are optimistic and atomic with audit. They do not rewrite member WhatsApp contacts or invalidate member challenges whose destination remains the member profile.

## TrustedActorContext Review

Full session resolution now supplies real role, registry-derived Owner permissions or persisted Staff permissions, persisted Branch IDs, scope, and authorization version. The Task B Owner-only Product Entry fallback was removed; the adapter filters the real trusted permission set to its existing contract. Browser permission arrays remain non-authoritative.

## Multi-Tenant Review

Every command/read uses Workspace and acting actor from `TrustedActorContext`. Target lookups, permission rows, Branch rows, phone uniqueness, audits, and sessions are Workspace-scoped. Branch-reference lookup includes `workspace_id = trusted workspaceId` at the database boundary; foreign-only Branch IDs are not loaded and map to the same `BranchNotFound` outcome as nonexistent IDs. Tests cover same Branch IDs across Workspaces, foreign-only Branch nondisclosure, same usernames/phones across Workspaces, foreign HTTP targets, and same-Workspace uniqueness.

## Security Review

Full sessions and Owner are required; restricted sessions receive 403 and missing/stale sessions receive 401. Writes enforce same-origin policy. Passwords, hashes, session tokens/digests, OTP/recovery digests, HMAC keys, environment files, and database URLs are absent from responses, audit metadata, documentation evidence, and this report. No npm audit command was run because explicit per-run consent was not provided.

## Audit Review

Added typed security events for member create/profile/WhatsApp/permissions/branch/role/lifecycle, Workspace settings, and rejected last-owner operations. Metadata contains only safe codes, counts, scopes, and versions; no credential or recovery secret is recorded.

## Migration Review

Added only `0009_identity_member_administration.sql` plus its Drizzle snapshot/journal entry. Migrations `0000`–`0008` were not edited. The clean chain adds locale, Workspace phone uniqueness, normalized permission/Branch tables, Branch references, scoped foreign keys, indexes, and checks. Locale is safely backfilled to `ar` before the temporary default is removed. The migration fails closed if legacy SelectedBranches rows lack explicit IDs. No production/external migration was run.

## HTTP Boundary Review

Added backend-only routes under `/api/workspace` for member list/create/details, profile, WhatsApp, permissions, Branch scope, promotion/demotion, suspension/reactivation/reset, registry/templates, and communication settings. Handlers remain thin and return typed/sanitized status mappings. No React/member-management UI was implemented.

## Test Results

- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed with zero warnings/errors after final cleanup.
- `npm.cmd test` — passed; Identity 65/65, Product Entry 132/132, task-review 45/45, Product aggregate 106/106, and Product Media 103 passed with one platform-permission skip. The final Identity count includes the C-R1 scoped Branch nondisclosure regression.
- `npm.cmd run test:integration` — passed 86/86 across 17 suites using the guarded isolated database, including direct PostgreSQL verification of the C-R1 Workspace predicate.
- `npm.cmd run build` — passed; the final Next.js route manifest includes every new member-management route.
- `npm.cmd run db:check` — passed.
- `git diff --check` — passed (informational Windows LF/CRLF conversion warnings only).
- `git status --short`, `git diff --stat`, branch, HEAD, environment-variable presence, disk, Desktop ACL/writability, and review-export preflight were inspected without printing secrets.
- `npm.cmd audit`, `npm.cmd audit --omit=dev`, and `npm.cmd audit fix` were not run.

## Files Created

- `app/api/workspace/communication-settings/route.ts`
- `app/api/workspace/members/route.ts`
- `app/api/workspace/members/[actorId]/route.ts`
- `app/api/workspace/members/[actorId]/branch-scope/route.ts`
- `app/api/workspace/members/[actorId]/demote/route.ts`
- `app/api/workspace/members/[actorId]/permissions/route.ts`
- `app/api/workspace/members/[actorId]/profile/route.ts`
- `app/api/workspace/members/[actorId]/promote/route.ts`
- `app/api/workspace/members/[actorId]/reactivate/route.ts`
- `app/api/workspace/members/[actorId]/reset-password/route.ts`
- `app/api/workspace/members/[actorId]/suspend/route.ts`
- `app/api/workspace/members/[actorId]/whatsapp/route.ts`
- `app/api/workspace/permission-templates/route.ts`
- `app/api/workspace/permissions/route.ts`
- `docs/05-Development/Identity-Member-Administration.md`
- `docs/05-Development/Reports/QSC-Task-3.15.1-C-Final-Report.md`
- `domains/identity/application/member-administration.test.ts`
- `domains/identity/application/member-administration.use-cases.ts`
- `domains/identity/domain/permission.test.ts`
- `domains/identity/domain/permission.ts`
- `domains/identity/infrastructure/http/identity-member-route-handlers.test.ts`
- `domains/identity/infrastructure/http/identity-member-route-handlers.ts`
- `domains/identity/infrastructure/identity-member-server-runtime.ts`
- `drizzle/0009_identity_member_administration.sql`
- `drizzle/meta/0009_snapshot.json`

## Files Modified

- `docs/01-Architecture/Identity/README.md`
- `docs/01-Architecture/Workspace/README.md`
- `domains/catalog/product-entry/infrastructure/product-entry-context-adapters.test.ts`
- `domains/catalog/product-entry/infrastructure/trusted-actor-product-entry-context.adapter.ts`
- `domains/identity/application/account-lifecycle.use-cases.ts`
- `domains/identity/application/identity-application.test.ts`
- `domains/identity/application/identity-results.ts`
- `domains/identity/application/session-validation.ts`
- `domains/identity/domain/identity-domain.test.ts`
- `domains/identity/domain/member.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity-unit-of-work.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.integration.test.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.repositories.ts`
- `domains/identity/infrastructure/persistence/schema.ts`
- `domains/identity/mock/in-memory-identity-unit-of-work.ts`
- `domains/identity/repositories/identity.repositories.ts`
- `domains/workspace/domain/workspace.ts`
- `domains/workspace/infrastructure/persistence/postgresql-workspace.repository.ts`
- `domains/workspace/infrastructure/persistence/schema.ts`
- `domains/workspace/repositories/workspace.repository.ts`
- `drizzle/meta/_journal.json`
- `shared/audit/audit.port.ts`

## Files Deleted

None.

## Files Intentionally Unchanged

- `drizzle/0000_product_persistence_foundation.sql` through `drizzle/0008_supreme_vector.sql`.
- Existing Product, Product Media, Product Entry, Inventory, Pricing, and public Catalog domain architecture.
- `package.json` and dependency lockfiles; no library was added.
- Existing Account/credential/profile/Membership/session separation and Task A/B public authentication contracts.
- React pages/components and all Task D UI scope.
- WhatsApp provider/OTP delivery and Task E recovery-channel scope.

## Known Limitations

- The Task C Branch-reference registry must be populated by the future Task 3.17 Branch lifecycle; Task C intentionally provides no Branch management UI/API or Inventory behavior.
- Migration `0009` deliberately refuses legacy SelectedBranches memberships without explicit IDs; such data requires an approved reconciliation before a production migration.
- Suspended members retain WhatsApp ownership because there is no hard delete and their security/history record remains reserved.
- “Last successful login” is represented by the latest successfully created server session because no separate login-history aggregate exists.
- No final UI, invitation workflow, WhatsApp delivery provider, dynamic roles, dynamic templates, or self-registration exists in this task.

## Required Confirmations

Independent review should confirm the exact permission registry/default-template set, Owner-only `workspace.members.manage` policy, normalized persistence and `0009` fail-safe migration, narrow Branch-reference ownership, Workspace-scoped WhatsApp policy, Workspace lock ordering for last-owner safety, real Product Entry context mapping, redacted HTTP/read models, and Task D/E/3.17 boundaries. This implementation is not self-approved.

## Summary

Task C is implemented and verified as an additive Identity/Workspace backend foundation. The authorization source of truth is now real and persisted for Staff, derived for Owner, carried by full server sessions, and invalidated safely on every effective change. The working tree remains intentionally uncommitted for independent review.

## Next Recommendation

Perform independent architecture, security, migration, and concurrency review of this Task C bundle. After approval and merge, begin Task 3.15.1-D for the responsive bilingual UI. Do not begin Task E delivery integration or Task 3.17 Branch implementation as part of this review.

## Git and Review Integrity

No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion was performed. Branch remained `feature/identity-member-management`. Source files are preserved byte-for-byte in the review evidence while command output is sanitized. The DEV-001 tool is required to generate the repository-local ZIP/checksum and export the report/ZIP/checksum to `C:\Users\dell\Desktop\QSC-Reviews` without overwriting prior evidence.
