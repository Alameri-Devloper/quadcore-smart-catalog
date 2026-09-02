# QSC Task 3.22-A1 Final Report

## Status

ReadyForReview

## Task

Task 3.22-A1 — Authorization Policies and Semantic Capabilities. This implementation is limited to A1. A2, A3, A4, A5, and Task 3.22 Presentation are outside this change.

## Branch

`feature/task-3.22-a1-authorization-capabilities`

## Baseline

- Required and verified ancestor/HEAD at task start: `3fa5605bb5f17726eae4805ca768cc90b5b0a213`.
- The baseline contains merged PR #27 and the approved Task 3.22-A Reservation Performance Gate.
- The working tree was clean before implementation.

## English Summary

A1 implements a repository-free effective authorization projection in Identity Application. `GetOperationalManagementCapabilitiesUseCase` converts the existing trusted effective permission context into a fixed nested DTO containing semantic booleans only. A typed pure policy module preserves every independent permission and exact composition rule without introducing global manage-implies-view behavior.

The new authenticated `GET /api/operations/capabilities` boundary uses the existing full-session trusted-context resolver, returns `private, no-store`, rejects query parameters including `workspaceId`, and exposes no raw permission, role, tenant, actor, Branch-scope, session, or repository-derived data. The Next.js route delegates only to the Identity HTTP adapter/runtime.

## Arabic Summary | الملخص العربي

تنفذ A1 إسقاطاً بلا مستودع للصلاحيات الفعلية داخل Identity Application. يحول `GetOperationalManagementCapabilitiesUseCase` سياق الصلاحيات الفعلية الموثوق الحالي إلى DTO ثابت ومتداخل يحتوي قيماً منطقية دلالية فقط. وتحفظ وحدة السياسة النقية والمكتوبة بالأنواع استقلال كل صلاحية وقواعد التركيب الدقيقة دون إضافة قاعدة عامة تجعل الإدارة مستلزمة للعرض.

يستخدم المسار الموثق الجديد `GET /api/operations/capabilities` محلل السياق الموثوق الحالي للجلسة الكاملة، ويعيد `private, no-store`، ويرفض جميع معاملات الاستعلام بما فيها `workspaceId`، ولا يكشف الصلاحيات الخام أو الدور أو المستأجر أو الممثل أو نطاق الفروع أو بيانات الجلسة أو الموارد. ويفوض مسار Next.js إلى محول HTTP/وقت التشغيل في Identity فقط.

## Architecture

- DDD, Clean Architecture, Modular Monolith, and Multi-Tenant boundaries remain unchanged.
- Identity Application owns the fixed global semantic capability projection because Identity owns effective permission vocabulary and session authority.
- The use case and policy module depend only on `TrustedActorContext` and the existing `PermissionCode` type.
- The runtime contains only the existing authenticated trusted-context resolver and the repository-free use case.
- The HTTP adapter maps transport/authentication concerns only; the Next.js route is a pure delegate.
- No Catalog, Branch, Inventory, Pricing, Reference Cost, Presentation, React, repository, or persistence dependency is imported by the use case or policy.
- Resource state and mutation-time authorization remain authoritative in their owning Applications.

## Authorization Model

The implementation consumes `TrustedActorContext.permissions` as the current effective authority. It does not inspect or hard-code `role`. Existing session validation already expands Owner authority with `ownerEffectivePermissionCodes()`, and focused tests exercise Owner behavior using that source-owned effective set.

Management and view permissions stay independent. A capability may advise that an operation can be managed while its ordinary view capability remains false. Every future write must continue to reauthorize through its owning Application; the DTO is Presentation guidance, not write authority.

## Capability Ownership

`GetOperationalManagementCapabilitiesUseCase` belongs to `domains/identity/application`. It performs no repository lookup, resource lookup, or database operation. Authentication still uses the existing Identity full-session resolver; A1 introduces no new authentication stack or persistence access.

Pure permission-only action vocabulary is provided inside the owning Catalog Branch Product and Inventory Applications for later resource projection:

- Listing: `SetListed`, `SetUnlisted`.
- Reservation: `Release`, `Fulfill`.
- Workspace pricing/reference cost: `Set`, `Clear`.
- Branch overrides: `SetOverride`, `ClearOverride`.

These helpers make no tenant, Branch, resource-existence, lifecycle, state, or concurrency assumption. Later resource use cases must intersect them with authoritative Domain state.

## Semantic Capability Contract

The fixed response groups are:

- `branches`: `canView`, `canManage`.
- `listing`: `canManage`.
- `inventory`: availability/quantity visibility and receive, issue, reserve, transfer, damage, correction capabilities.
- `pricing`: ordinary/Wholesale view, Workspace management, and Branch override management.
- `referenceCost`: composed ordinary view, Workspace management, and Branch override management.

Only booleans are serialized at the leaves. The response contains no dynamic serialization of the permission registry.

## Permission Composition

| Semantic capability | Exact source rule |
| --- | --- |
| Branch view | `workspace.branches.view` |
| Branch manage | `workspace.branches.manage` independently |
| Listing manage | `catalog.product.edit` OR `catalog.products.edit` |
| Inventory availability | `inventory.availability.view` OR `inventory.quantity.view` |
| Inventory quantity | `inventory.quantity.view` |
| Inventory receive/issue/reserve/damage/transfer | Corresponding exact permission |
| Inventory correction | `inventory.adjust` mapped to semantic `canAdjust`; source truth differs from the planning word “correction” |
| Pricing view | `pricing.view` |
| Wholesale view | `pricing.view` AND `pricing.wholesale.view` |
| Workspace Pricing manage | `pricing.manage` independently |
| Branch Pricing override manage | `pricing.branchOverride.manage` independently |
| Reference Cost view | `pricing.view` AND `referenceCost.view` |
| Workspace Reference Cost manage | `referenceCost.manage` independently |
| Branch Reference Cost override manage | `referenceCost.branchOverride.manage` independently |

No new permission identifier or implication was added.

## HTTP/API Impact

- Added authenticated `GET /api/operations/capabilities`.
- Request body: none.
- Query parameters: none; any query string returns `400 { type: "InvalidQuery" }`.
- Success: `200` with the fixed semantic capability DTO.
- Missing/invalid full-session authority: `401 AuthenticationRequired`.
- Restricted session: `403 ForbiddenForRestrictedSession`.
- Unexpected trusted-context/projection failure: `503 OperationalManagementCapabilityServiceUnavailable`.
- Every response uses `cache-control: private, no-store`.

## Security

Focused negative-disclosure tests prove that the response excludes:

- permission arrays and permission-code values;
- `role`;
- `workspaceId` and `actorId`;
- Branch scope and allowed Branch identifiers;
- session and authorization-version internals;
- Product, Branch, Inventory, Pricing, Reference Cost, Reservation, and Listing resource data.

The endpoint fails closed and derives every semantic value server-side.

## Multi-Tenant

The endpoint accepts no Workspace or Branch identifier. Workspace/actor identity is obtained only from the trusted authenticated context and is not serialized. A1 performs no resource persistence read, so it creates no cross-Workspace query surface.

## Files Created

- `domains/identity/application/operational-management-authorization-policy.ts`
- `domains/identity/application/get-operational-management-capabilities.use-case.ts`
- `domains/identity/application/get-operational-management-capabilities.use-case.test.ts`
- `domains/identity/infrastructure/operational-management-capability-server-runtime.ts`
- `domains/identity/infrastructure/http/operational-management-capability-route-handler.ts`
- `domains/identity/infrastructure/http/operational-management-capability-route-handler.test.ts`
- `domains/catalog/branch-products/application/operational-management-authorization-policy.ts`
- `domains/catalog/branch-products/application/operational-management-authorization-policy.test.ts`
- `domains/inventory/application/operational-management-authorization-policy.ts`
- `domains/inventory/application/operational-management-authorization-policy.test.ts`
- `app/api/operations/capabilities/route.ts`
- `docs/05-Development/Reports/QSC-Task-3.22-A1-Final-Report.md`

## Files Modified

- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`
- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`

## Files Deleted

None.

## Architecture Changes

None. A1 implements the approved Identity Application ownership and bounded hybrid authorization composition without changing architecture.

## Database/Migration Decision

- No schema change.
- No repository migration.
- Migration `0016` remains not required and not approved.
- No Drizzle or schema file changed.
- The capability projection performs no database or resource-persistence operation.
- The HTTP boundary reuses the existing Identity session resolver solely to establish authenticated trusted context.

## Dependency Decision

No runtime or development dependency was added or changed. `package.json` and `package-lock.json` are unchanged.

## Tests

Focused A1 tests cover:

- unauthenticated and restricted requests;
- authenticated fixed capability response and private/no-store behavior;
- singular-only, plural-only, and absent Listing edit;
- independent Pricing view/manage and Branch override management;
- complete and incomplete Wholesale composition;
- complete and incomplete Reference Cost ordinary view;
- Reference Cost management without ordinary view;
- availability-only, quantity-implies-availability, and mutation-without-disclosure Inventory cases;
- Owner behavior through existing effective permissions;
- permission-only resource action identifiers;
- tenant query rejection and negative raw-authority/resource disclosure;
- fail-closed service behavior.

## Verification

- Focused A1 tests: PASS — 17/17.
- Identity regression suite: PASS — 124/124.
- Catalog Branch Product/Pricing regression suite: PASS — 10/10.
- Inventory regression suite: PASS — 10/10.
- TypeScript `tsc --noEmit`: PASS.
- ESLint: PASS.
- Next.js production build: PASS.
- `git diff --check`: required in the final artifact pass.
- No PostgreSQL integration suite was run because A1 adds no persistence behavior.
- `npm audit` was not run, as required.

## Git Integrity

- No Git write command was run.
- No add, commit, push, merge, rebase, reset, restore, clean, stash, tag, branch switch, or branch deletion was performed.
- Branch and baseline ancestry remained unchanged throughout implementation.

## DEV-001 Integrity

The final review bundle is generated after final verification. It contains exact changed source/tests/docs, focused verification and architecture evidence, Git status/diff evidence, and a manifest with payload hashes/sizes. Credentials, connection strings, `.env` files, Production data, Git internals, and unrelated generated output are excluded.

## Risks

- Capabilities are advisory and can become stale after an authorization change; every resource read/write must use current trusted context and reauthorize.
- Permission-only action helpers cannot decide lifecycle, resource state, Branch scope, existence, or concurrency; later Domain use cases must apply those checks.

## Known Limitations

- A1 does not enumerate accessible Branches or resources.
- A1 does not guarantee that any specific resource is currently mutable.
- A1 does not implement operational Product discovery, Listing state, Reservation reads, Pricing management reads, or Inventory disclosure hardening.
- A2 is **NOT automatically approved**.
- A3 is **NOT started**.
- A4 is **NOT started**.
- A5 is **NOT started**.
- Task 3.22 Presentation is **BLOCKED**.

## Summary

A1 is implemented within its approved boundary: typed effective authorization policies, a fixed semantic capability projection, an authenticated private HTTP adapter, and a thin route. It adds no raw authority disclosure, permission implication, resource read, repository, database behavior, schema, migration, dependency, or UI.

## Next Recommendation

Perform independent A1 review and merge. Do not begin or approve A2 automatically; consider the next bounded slice only after A1 review is complete.
