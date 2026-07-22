# Sprint 03 — Task 3.14.6
## Smart Save Product and Archive Reason Orchestration

**Project:** Quadcore Smart Catalog — QSC
**Task Type:** Domain Extension and Application Use Case
**Architecture Status:** Approved
**Implementation Language:** TypeScript only

Do not begin this task until Task 3.14.5 has passed architecture review and has been merged into `feature/product-entry-engine`.

Do not continue to Task 3.14.7 or any later task.

---

# 1. Objective

Implement the integrated Smart Save Product workflow using one primary save action while preserving Product Domain integrity.

This task establishes:

- ProductArchiveReason.
- Archive reason invariants.
- Product archive and restore event enrichment.
- Smart Save Product Application Use Case.
- Trusted Workspace context.
- Publication Requirements resolver port.
- Create-versus-update orchestration.
- Automatic Draft preservation.
- Automatic publication of ready Draft Products.
- Automatic hiding of Published Products that become incomplete.
- Automatic restoration only for Products archived because publication requirements were not met.
- Typed Smart Save results.
- Revision-conflict and ProductCode-conflict propagation.
- Domain Event extraction only after successful persistence.
- ADR-011.
- A PostgreSQL migration for archive reason when Task 3.14.5 persistence exists.
- Focused Domain, Application, and PostgreSQL integration tests.

This task does not implement Product Entry UI integration, physical image storage, media synchronization, event bus, outbox, catalog listing, search, or public Product View.

---

# 2. Approved User Experience

The end user sees one primary action:

`Save Product`

The user does not need to understand:

- Draft.
- Published.
- Archived.
- Publish.
- Restore.
- Publication Policy internals.

The system decides the correct outcome while never losing valid user work.

---

# 3. Approved Smart Save Rules

## New Product or Draft Product

When publication requirements are not met:

```text
Save as Draft
Return all missing publication reasons
```

When publication requirements are met:

```text
Publish
Persist
Return SavedAndPublished
```

## Published Product

When the edited Product still meets publication requirements:

```text
Persist the update
Keep Published
Return SavedPublishedUpdate
```

When the edited Product no longer meets publication requirements:

```text
Archive with PublicationRequirementsNotMet
Persist the update
Hide from public Catalog
Return SavedAndAutoArchived
```

The save must not be rejected merely because the Product became incomplete.

## Automatically Archived Product

When still incomplete:

```text
Persist changes
Remain Archived with PublicationRequirementsNotMet
Return SavedArchivedUpdate
```

When ready again:

```text
Restore
Persist
Return SavedAndAutoRestored
```

## Manually Archived Product

When edited:

```text
Persist changes
Remain Archived with Manual reason
Never auto-restore
Return SavedArchivedUpdate
```

Even when publication requirements are satisfied.

---

# 4. ProductArchiveReason

Introduce a Domain-owned immutable ProductArchiveReason.

Supported reasons:

- `Manual`
- `PublicationRequirementsNotMet`

Do not introduce vague values such as:

- System
- Other
- Unknown

Rules:

- Draft Product must not have an archive reason.
- Published Product must not have an archive reason.
- Archived Product must have exactly one archive reason.
- Archive reason is restored explicitly through Product.rehydrate.
- Restore clears the current archive reason.
- ProductArchiveReason is not user-facing text.
- Presentation translation remains outside Domain.

---

# 5. Product Aggregate Changes

Update the canonical Product Aggregate to expose read-only archive reason state.

Controlled lifecycle behavior:

```typescript
product.archive(reason, effectiveTime);
```

Rules:

- Only Published → Archived.
- Archive reason is mandatory.
- Lifecycle becomes Archived.
- Archive reason becomes the supplied reason.
- UpdatedAt changes.
- Revision increments exactly once.
- ProductArchived records the reason.
- Failure is atomic.

Restore behavior:

```typescript
product.restore(approvedDecision, effectiveTime);
```

Rules:

- Only Archived → Published.
- Current publication decision must be approved, Product-bound, and Revision-current.
- Lifecycle becomes Published.
- Archive reason is cleared.
- UpdatedAt changes.
- Revision increments exactly once.
- ProductRestored records the previous archive reason.
- Failure is atomic.

Do not add a public lifecycle or archive-reason setter.

---

# 6. Domain Event Changes

Enrich:

- ProductArchived
- ProductRestored

ProductArchived must include immutable archive reason.

ProductRestored must include immutable previous archive reason.

Preserve:

- ProductId.
- WorkspaceId.
- CatalogId.
- Previous lifecycle.
- Current lifecycle.
- Resulting Product Revision.
- OccurredAt.

Do not create an Event Bus, Outbox, publisher implementation, listener, or notification.

---

# 7. Trusted Workspace Context

Introduce an Application port such as:

```typescript
export interface WorkspaceContext {
  getCurrentWorkspaceId(): WorkspaceId;
}
```

Rules:

- V1 returns the single trusted active Workspace.
- WorkspaceId is not accepted from an untrusted user-selectable field.
- V2 may resolve WorkspaceId from authenticated membership later.
- No Workspace selector.
- No company switching.
- No tenant provisioning.

The exact synchronous or asynchronous shape must follow existing Application conventions.

---

# 8. Publication Requirements Resolver

Introduce an Application port such as:

```typescript
export interface ProductPublicationRequirementsResolver {
  resolve(input: {
    readonly workspaceId: WorkspaceId;
    readonly catalogId: CatalogId;
    readonly classification: ProductClassification;
  }): Promise<ProductPublicationRequirements>;
}
```

Responsibilities:

- Resolve current publication requirements for every Smart Save execution.
- Return Domain-owned ProductPublicationRequirements.
- Remain outside the Product Aggregate.
- Remain outside ProductPublicationPolicy.
- Avoid stale long-lived configuration decisions.

Do not implement:

- Template resolver.
- Workspace configuration database.
- admin configuration UI.
- category or Product Type management.
- remote provider.

A minimal V1 adapter may return approved fixed requirements only when required for tests or composition, and must be explicitly named as a V1 fixed adapter rather than hidden inside the use case.

---

# 9. Smart Save Input Boundary

The Smart Save Use Case must not accept a mutable Product Aggregate directly from Presentation.

Inspect the existing Product Entry and Application conventions and define an Application command that can safely express:

- New Product creation.
- Existing Product update.
- Product identity.
- Expected persisted Revision for update.
- Editable classification.
- Editable commercial details.
- Editable pricing.
- Editable specification values.
- Editable image metadata.
- Effective time.

WorkspaceId comes from WorkspaceContext, not the command.

Do not import React or form-state types into Application.

Do not make the Application command a persistence DTO.

Do not bypass Product Aggregate controlled mutation methods.

If a safe command-to-Aggregate update path cannot be implemented without a separate approved task because the Aggregate lacks required controlled mutations, stop and report:

`Blocked pending architecture decision`

Do not silently add broad setters.

---

# 10. Create and Update Orchestration

The use case must explicitly distinguish create and update.

## Create

- Get trusted WorkspaceId.
- Create the canonical Product Aggregate.
- Apply the command through approved Domain construction.
- Resolve current publication requirements.
- Evaluate ProductPublicationPolicy.
- Publish when approved.
- Otherwise preserve Draft.
- Call ProductRepository.create.
- Map expected repository outcomes.
- Pull Domain Events only after successful persistence.

## Update

- Get trusted WorkspaceId.
- Load Product by WorkspaceId and ProductId.
- Return ProductNotFound when absent.
- Verify expected persisted Revision semantics.
- Apply effective command changes through controlled Aggregate methods.
- Resolve current publication requirements.
- Evaluate current Product.
- Apply lifecycle orchestration.
- Call ProductRepository.update with the Revision observed when loaded.
- Map expected repository outcomes.
- Pull Domain Events only after successful persistence.

Do not use nullable expected Revision to decide create versus update.

---

# 11. Lifecycle Orchestration Matrix

Implement and test this matrix:

| Current State | Archive Reason | Ready | Resulting State | Smart Save Outcome |
|---|---|---:|---|---|
| New/Draft | None | No | Draft | SavedAsDraft |
| New/Draft | None | Yes | Published | SavedAndPublished |
| Published | None | Yes | Published | SavedPublishedUpdate |
| Published | None | No | Archived | SavedAndAutoArchived |
| Archived | PublicationRequirementsNotMet | No | Archived | SavedArchivedUpdate |
| Archived | PublicationRequirementsNotMet | Yes | Published | SavedAndAutoRestored |
| Archived | Manual | No | Archived | SavedArchivedUpdate |
| Archived | Manual | Yes | Archived | SavedArchivedUpdate |

Do not auto-restore Manual archives.

---

# 12. Typed Smart Save Results

Use immutable discriminated results.

Required successful outcomes:

- `SavedAsDraft`
- `SavedAndPublished`
- `SavedPublishedUpdate`
- `SavedAndAutoArchived`
- `SavedArchivedUpdate`
- `SavedAndAutoRestored`

Required expected conflict outcomes:

- `ProductNotFound`
- `RevisionConflict`
- `ProductIdConflict`
- `ProductCodeConflict`

Successful results must include, where relevant:

- WorkspaceId.
- ProductId.
- persisted/current Product Revision.
- resulting lifecycle state.
- archive reason.
- all missing publication reasons.

Results must not include Arabic or English Presentation messages.

Do not use unrestricted booleans.

---

# 13. Domain Event Extraction Boundary

Approved rule:

- Do not pull Domain Events before persistence succeeds.
- On expected persistence conflict, leave Domain Events queued on the in-memory Aggregate until the execution ends; do not falsely report them as committed.
- After successful persistence, pull Domain Events exactly once.
- Return committed Domain Events through an Application-owned execution envelope, not inside the user-facing Smart Save result union.

Suggested conceptual shape:

```typescript
export interface SmartSaveProductExecution {
  readonly result: SmartSaveProductResult;
  readonly committedEvents: readonly DomainEvent[];
}
```

Rules:

- Conflict results return an empty committedEvents collection.
- No Event Bus is implemented.
- No no-op dispatcher is introduced.
- Presentation must not interpret Domain Events as user messages.
- A future Application event dispatcher or Outbox task may consume the committedEvents envelope.

Follow existing Domain Event contracts.

---

# 14. PostgreSQL Persistence Extension

Task 3.14.5 must already provide PostgreSQL persistence.

Add a new versioned migration; do not rewrite the accepted Task 3.14.5 migration.

Add archive reason persistence to the main Product table.

Rules:

- Archive reason is nullable for Draft and Published.
- Archive reason is required for Archived.
- Add a named CHECK constraint when safe:

```text
Archived → archive_reason IS NOT NULL
Draft/Published → archive_reason IS NULL
```

- Preserve provider-neutral PostgreSQL.
- Update Drizzle schema.
- Update persistence mapper.
- Update PostgreSqlProductRepository rehydration and persistence.
- Preserve optimistic concurrency.
- Preserve atomic create/update.
- No image-file behavior.

If existing persisted Archived records cannot be migrated safely, report the compatibility strategy. Since no production database exists yet, a deterministic migration is expected.

---

# 15. Application Transaction Semantics

Smart Save performs one repository write per execution.

Rules:

- Domain lifecycle transitions occur before persistence.
- Repository persists the complete final Aggregate atomically.
- Expected Repository conflicts do not trigger automatic retry.
- No second save attempt.
- No merge behavior.
- No Domain Event extraction before success.
- No partial child persistence.
- Effective time must be supplied or obtained from an Application Clock port according to existing conventions.

Do not add a distributed transaction.

---

# 16. User Work Preservation

The use case must preserve the intent of valid user changes.

When Product becomes incomplete:

- Save valid Product changes.
- Auto-archive when previously Published.
- Return all missing requirements.
- Do not reject solely because publication requirements are missing.

When RevisionConflict occurs:

- Do not overwrite the newer Product.
- Do not automatically reapply changes.
- Return structured expected and actual Revision details.
- Product Entry UI recovery is deferred to Task 3.14.8.

---

# 17. Scope Integrity

V1 remains:

- Single trusted Workspace.
- Multi-Branch-ready but without Branch persistence inside Product.

V2 remains unimplemented:

- Operational Multi-Tenancy.
- Workspace switching.
- Tenant provisioning.
- memberships and permissions.

Do not add:

- BranchId to Product.
- Warehouse.
- Inventory.
- stock.
- quantity.

---

# 18. ADR-011

Create:

`docs/01-Architecture/ADR/ADR-011-Smart-Save-and-Product-Archive-Reason.md`

ADR-011 must be bilingual Arabic and English.

Include:

- Status: Accepted.
- Context.
- Decision.
- Alternatives considered.
- Consequences.
- Risks.
- One primary Save Product action.
- Draft preservation.
- Automatic publication.
- Automatic archive when Published Product becomes incomplete.
- ProductArchiveReason.
- Automatic restoration only for PublicationRequirementsNotMet.
- Manual archive never auto-restores.
- Trusted Workspace context.
- Current requirements resolution per save.
- Revision-conflict behavior.
- Domain Event extraction after successful persistence.
- Explicit statement that Product Entry UI integration is deferred.

Update ADR register so ADR-012 is next.

---

# 19. Documentation

Update only directly relevant bilingual documentation:

- Product Aggregate.
- Product Lifecycle Foundation.
- Product Quality and Readiness.
- Product Invariants.
- Product Lifecycle Policies.
- Product Use Cases.
- Persistence Boundaries.
- Catalog Ubiquitous Language.
- ADR register.

Document:

- Archive reason invariant.
- Smart Save matrix.
- one-button UX.
- current requirements resolution.
- manual versus automatic archive.
- event extraction boundary.
- PostgreSQL archive_reason persistence.

Do not duplicate full ADR content.

---

# 20. Testing Requirements

Use existing dependency-free Domain and Application testing patterns plus real PostgreSQL integration tests where persistence changes are involved.

## ProductArchiveReason

Test:

- Manual accepted.
- PublicationRequirementsNotMet accepted.
- Unsupported reason rejected.
- Immutability.
- equality if applicable.

## Aggregate lifecycle

Test:

- Archived state requires reason.
- Draft and Published reject archive reason on rehydrate.
- archive requires reason.
- ProductArchived includes reason.
- restore clears reason.
- ProductRestored includes previous reason.
- failed transitions remain atomic.
- Revision semantics remain correct.
- old tests remain passing.

## Smart Save create

Test:

- incomplete new Product saved as Draft.
- missing reasons returned.
- ready new Product published and created.
- ProductId conflict mapped.
- ProductCode conflict mapped.
- events extracted only after successful create.
- conflict returns no committed events.

## Smart Save update

Test every lifecycle matrix row.

Also test:

- ProductNotFound.
- RevisionConflict details.
- ProductCodeConflict.
- current requirements resolved on every execution.
- no automatic retry.
- manual archive never auto-restores.
- automatically archived Product restores when ready.
- incomplete Published Product is saved and hidden.
- event extraction after successful update only.
- no Presentation messages.

## PostgreSQL integration

Test:

- archive_reason round-trip.
- CHECK constraint.
- Archived Product requires reason.
- Draft/Published archive_reason null.
- optimistic concurrency remains intact.
- ProductCode uniqueness remains intact.
- complete Aggregate rehydration preserves reason.
- migration applies cleanly after Task 3.14.5 migration.

## Compatibility

- All Task 3.14.5 tests remain passing.
- Product Entry and React remain unchanged.
- No physical media I/O.
- no Event Bus or Outbox.

---

# 21. What Will Be Implemented

Implement only:

- ProductArchiveReason.
- Aggregate archive-reason state and invariants.
- ProductArchived and ProductRestored enrichment.
- Smart Save Product Use Case.
- WorkspaceContext port.
- ProductPublicationRequirementsResolver port.
- Application command boundary.
- typed Smart Save results.
- committed Domain Events execution envelope.
- new PostgreSQL archive_reason migration.
- Drizzle schema and mapper updates.
- focused Domain/Application/PostgreSQL tests.
- ADR-011.
- directly relevant bilingual documentation.

---

# 22. What Will NOT Be Implemented

Do not implement:

- Product Entry UI integration.
- React changes.
- form-state conflict recovery.
- API routes.
- Server Actions.
- physical image upload.
- media folder creation.
- LocalFileImageStorageAdapter.
- media synchronization.
- catalog listing.
- search.
- filters.
- public Product View.
- WhatsApp sharing.
- Event Bus.
- Outbox.
- notifications.
- background jobs.
- Workspace selector.
- tenant provisioning.
- Branch or Inventory persistence.
- automatic conflict merge.
- automatic retry.
- unapproved Aggregate setters.
- new runtime dependencies unless strictly required and approved.

---

# 23. Acceptance Criteria

The task is accepted only when:

- ProductArchiveReason exists and is Domain-owned.
- Archived Products always have a reason.
- Draft and Published Products never have a reason.
- ProductArchived includes reason.
- ProductRestored includes previous reason.
- one Smart Save Application Use Case exists.
- new and Draft Products follow readiness automatically.
- incomplete Published Products are saved and auto-archived.
- automatically archived Products auto-restore only when ready.
- manually archived Products never auto-restore.
- current publication requirements are resolved per save.
- WorkspaceId comes from trusted context.
- create and update remain explicit.
- expected persisted Revision protects updates.
- conflict results are typed.
- no user work is rejected solely because publication data is incomplete.
- Domain Events are pulled only after successful persistence.
- no Event Bus or no-op dispatcher is added.
- PostgreSQL archive reason migration exists.
- mapper and repository preserve archive reason.
- Product Entry remains unchanged.
- documentation is bilingual.
- ADR-011 is created and registered.
- TypeScript passes.
- lint passes.
- unit tests pass.
- Application tests pass.
- PostgreSQL integration tests pass.
- migration validation passes.
- build passes.
- `git diff --check` passes.
- no unrelated files change.

---

# 24. Verification

Run and report:

```text
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd test
npm.cmd run build
git diff --check
git status --short
git diff --stat
```

Also run:

- Task 3.14.5 PostgreSQL integration tests.
- New Smart Save Application tests.
- new migration validation against clean PostgreSQL.
- migration validation from Task 3.14.5 schema to Task 3.14.6 schema.

Inspect for:

- archive reason outside Domain.
- Archived without reason.
- Draft/Published with reason.
- manual archive auto-restoration.
- Presentation text inside Domain/Application.
- WorkspaceId accepted from untrusted UI input.
- stale requirements cached across executions.
- events pulled before persistence.
- no-op event dispatcher.
- automatic conflict retry.
- Product Entry changes.
- physical image I/O.
- Branch/Inventory leakage.
- unrelated changes.

---

# 25. Required Final Report

Return exactly:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Existing Lifecycle and Application Conventions Inspected
6. ProductArchiveReason
7. Aggregate Archive Reason Invariants
8. ProductArchived Event Changes
9. ProductRestored Event Changes
10. WorkspaceContext Port
11. Publication Requirements Resolver Port
12. Smart Save Command Boundary
13. Create Orchestration
14. Update Orchestration
15. Lifecycle Decision Matrix
16. Smart Save Result Model
17. User Work Preservation
18. Revision Conflict Handling
19. ProductCode Conflict Handling
20. Domain Event Extraction Boundary
21. PostgreSQL Migration
22. Drizzle Schema and Mapper Changes
23. Persistence Compatibility
24. Product Entry Compatibility
25. Domain Tests
26. Application Tests
27. PostgreSQL Integration Tests
28. TypeScript Result
29. Lint Result
30. Build Result
31. Migration Validation Result
32. Diff Integrity Result
33. Architecture Integrity Review
34. ADR-011 Result
35. Documentation Updates
36. Migration or Compatibility Risks
37. Remaining Risks
38. Architecture Changes
39. Status

Status must be one of:

- `Ready for review.`
- `Blocked pending architecture decision.`

---

# 26. What Was Discussed and Approved

The following decisions are approved and must not be reopened during implementation:

- One primary Save Product action.
- Valid incomplete Products are preserved as Draft.
- Ready Draft Products are published automatically.
- Published Products that become incomplete are saved and auto-archived.
- Auto-archive reason is PublicationRequirementsNotMet.
- Manually archived Products never auto-restore.
- Automatically archived Products restore automatically when ready.
- Archived Products always have an explicit reason.
- Draft and Published Products have no archive reason.
- Publication requirements are resolved for every save.
- WorkspaceId comes from trusted Application context.
- Smart Save distinguishes create and update explicitly.
- Optimistic concurrency remains required.
- No automatic retry or merge.
- Domain Events are pulled only after successful persistence.
- No Event Bus, Outbox, or no-op dispatcher in this task.
- Product Entry integration is deferred.
- Physical media storage is deferred.
- V1 remains Single-Workspace and Multi-Branch.
- V2 operational Multi-Tenancy remains unimplemented.

---

# 27. Suggestions and Next Step

Do not implement the next task.

After Task 3.14.6 passes review, the proposed next task is:

**Sprint 03 — Task 3.14.7
Product Media Storage Port and Local File Adapter**

It will implement:

- Product media-storage port.
- lazy Product folder creation on first image upload.
- stable folder paths.
- Department storage segments.
- predictable image filenames.
- local file adapter.
- MIME and file-signature validation.
- checksum and metadata extraction.
- missing/orphan/replacement reconciliation foundations.
- cleanup and compensation rules.

Do not begin Task 3.14.7 automatically.

Stop after completing Task 3.14.6.
