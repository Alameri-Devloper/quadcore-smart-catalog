# Sprint 03 — Task 3.14.5
## PostgreSQL Product Persistence Adapter

**Project:** Quadcore Smart Catalog — QSC  
**Task Type:** Infrastructure Persistence Implementation  
**Architecture Status:** Approved  
**Implementation Language:** TypeScript only

Do not continue to Task 3.14.6 or any later task.

---

# 1. Objective

Implement the first production-grade persistence adapter for the canonical Product Aggregate using a provider-neutral PostgreSQL architecture.

This task establishes:

- PostgreSQL as the canonical database engine.
- Drizzle ORM as the Infrastructure query and schema layer.
- `node-postgres` as the PostgreSQL driver.
- Drizzle Kit SQL migrations.
- A local Docker Compose PostgreSQL development environment.
- A Hybrid Relational Product schema.
- Complete Product Aggregate persistence mapping.
- A PostgreSQL implementation of the canonical `ProductRepository`.
- Atomic Product creation.
- Atomic Product update with optimistic concurrency.
- Workspace-wide ProductCode uniqueness.
- Integration tests against real PostgreSQL.
- ADR-009 for provider-neutral PostgreSQL persistence.
- ADR-010 for stable Product media-storage paths.

This task does not implement Product Save orchestration, Product Entry integration, physical image upload, file-system storage, media synchronization, cloud deployment, or Supabase-specific code.

---

# 2. Primary References

Inspect and follow:

- `AGENTS.md`
- `docs/00-Constitution/`
- `docs/01-Architecture/ADR/`
- `docs/01-Architecture/Catalog/Product-Aggregate.md`
- `docs/02-Domain/Product-Invariants.md`
- `docs/03-Application/Product-Use-Cases.md`
- `docs/04-Infrastructure/Persistence-Boundaries.md`
- `docs/05-Development/Acceptance-Criteria.md`
- `domains/catalog/repositories/product.repository.interface.ts`
- `domains/catalog/repositories/product-repository-results.ts`
- `domains/catalog/types/product.aggregate.ts`
- All Product identity, lifecycle, revision, classification, commercial, pricing, specification, and image Value Objects.

Do not duplicate an existing persistence concept.

If the canonical Aggregate cannot be mapped without changing an approved Domain invariant, stop and report:

`Blocked pending architecture decision`

---

# 3. Approved Architecture

Mandatory principles:

- TypeScript only.
- Domain Driven Design.
- Clean Architecture.
- Modular Monolith.
- Multi-Tenant-ready boundaries.
- V1 remains Single-Workspace and Multi-Branch.
- V2 operational Multi-Tenancy remains unimplemented.
- Product remains the Catalog Aggregate Root.
- Domain and Application layers must not import Drizzle, `pg`, database schema types, migrations, or provider-specific SDKs.
- The canonical `ProductRepository` remains the port.
- PostgreSQL implementation remains inside Infrastructure.
- Database connection is supplied through `DATABASE_URL`.
- PostgreSQL hosting must remain provider-neutral.
- Local PostgreSQL and hosted PostgreSQL must use the same mapper and repository implementation.
- Supabase-specific APIs and SDKs are forbidden in Domain, Application, and the canonical PostgreSQL repository.
- No architecture change without prior discussion.

Approved stack:

- PostgreSQL.
- Drizzle ORM.
- `node-postgres`.
- Drizzle Kit.
- Docker Compose for local development.

---

# 4. Provider-Neutral Deployment Decision

The same persistence implementation must support:

- PostgreSQL running locally in the shop.
- PostgreSQL running in Docker during development.
- Supabase PostgreSQL.
- Any compatible managed PostgreSQL provider.

Moving between deployments must require only:

- Applying versioned migrations.
- Migrating or restoring data.
- Updating environment configuration such as `DATABASE_URL`.
- Adjusting Infrastructure connection settings such as SSL or pooling.

It must not require redesigning:

- Product Aggregate.
- Domain policies.
- Application use cases.
- ProductRepository contract.
- Product Entry UI.
- Catalog UI.

Do not create a `SupabaseProductRepository`.

Use a provider-neutral name such as:

`PostgreSqlProductRepository`

Follow the repository's established naming conventions if they differ.

---

# 5. Hybrid Relational Schema Decision

Implement a Hybrid Relational Schema optimized for:

- Fast Product retrieval.
- Filtering.
- Sorting.
- Reporting.
- Future search.
- Workspace isolation.
- Relational integrity.
- Dynamic specification values.
- Product image metadata.

Use at minimum:

1. A main Product table.
2. A Product specification-values table.
3. A Product image-metadata table.

Conceptual structure:

```text
catalog_products
├── Product identity
├── Workspace and Catalog scope
├── Lifecycle state
├── Product Revision
├── Classification
├── Commercial details
├── Pricing
└── Timestamps

catalog_product_specification_values
└── Dynamic Product specification values

catalog_product_images
└── Product image references and metadata only
```

Do not persist the complete Product Aggregate as one opaque JSON document.

Do not create unnecessary tables for every scalar Value Object.

Core fields used for filtering, uniqueness, concurrency, reporting, or sorting must be explicit relational columns.

A limited JSONB column may be used only when the existing canonical specification-value model cannot be represented safely through typed relational columns. Any JSONB use must be justified in the final report and must not hide core searchable Product fields.

---

# 6. Main Product Table

Design the main Product table from the current canonical Aggregate.

It must preserve all current Product state, including where applicable:

- `workspace_id`
- `product_id`
- `catalog_id`
- lifecycle state
- Product Revision
- creation timestamp
- update timestamp
- Department reference if currently part of the Aggregate
- Category reference
- Product Type reference
- Device Class reference
- Condition
- Catalog availability status
- Product name
- ProductCode canonical value
- Product model reference
- Brand reference
- highlight flag
- retail price minor units and currency
- wholesale price minor units and currency
- every other current scalar commercial field in the canonical Aggregate

Use the exact canonical model as the source of truth.

Do not invent missing Domain fields.

Do not omit persisted Aggregate fields.

Recommended database conventions:

- `snake_case` database names.
- `timestamptz` for timestamps.
- explicit nullability matching the Domain.
- database checks where stable Domain invariants can be represented safely.
- no ORM entities leaking outside Infrastructure.

---

# 7. Identity and Workspace Isolation

Use a Workspace-scoped Product identity.

Preferred primary key:

```text
PRIMARY KEY (workspace_id, product_id)
```

All Product child tables must include:

- `workspace_id`
- `product_id`

and reference the Product through a composite foreign key.

Rules:

- No Product row may be found without Workspace scope.
- No child row may reference a Product in another Workspace.
- No cross-Workspace Product update.
- No Workspace reassignment.
- `CatalogId` remains Product data but is not the ProductCode uniqueness scope.
- Branch, Warehouse, stock, and quantity must not enter the Product schema.

Use foreign-key behavior consistent with Aggregate ownership. Document the selected delete behavior. No Product delete use case is implemented in this task.

---

# 8. ProductCode Persistence and Uniqueness

ProductCode remains:

- Optional for Draft.
- Canonically trimmed and uppercased by the Domain Value Object.
- Unique across the complete Workspace.
- Independent of Catalog.
- Reserved for Draft, Published, and Archived Products.
- Not released by archiving.

Enforce ProductCode uniqueness atomically in PostgreSQL.

Required uniqueness scope:

```text
(workspace_id, product_code)
```

Multiple Products without ProductCode must remain allowed.

Use a named constraint or named unique index so create and update conflicts can be mapped deterministically to:

- `ProductIdConflict`
- `ProductCodeConflict`

Do not rely on an advisory availability query as the final guarantee.

Do not implement automatic ProductCode generation.

---

# 9. Product Revision and Optimistic Concurrency

Use the approved Product Revision semantics.

Update must compare:

- expected persisted Revision supplied by the caller
- actual stored Revision

An update succeeds only when they match.

Conceptual condition:

```sql
WHERE workspace_id = :workspaceId
  AND product_id = :productId
  AND revision = :expectedPersistedRevision
```

Rules:

- The Product Aggregate may have a higher current Revision after effective mutations.
- The repository persists the Aggregate's current Revision.
- A stale expected Revision must never overwrite newer data.
- No automatic retry.
- No merge behavior.
- No conflict UI.
- A failed update must not partially replace child tables.
- Revision conflict must report the actual persisted Revision.
- Product not found and Revision conflict must be distinguishable.

Use one database transaction for the complete update.

Validate the safe conversion between PostgreSQL numeric storage and the current `ProductRevision` Value Object.

---

# 10. Product Specification Values Table

Persist Product specification values in a separate Aggregate-owned table.

The mapping must preserve the current canonical specification model exactly.

Requirements:

- Workspace and Product composite ownership.
- Specification Field identity.
- Value type or discriminant where needed.
- Canonical value representation.
- Deterministic reconstruction order.
- No Presentation messages.
- No Template resolution.
- No Specification definition repository.
- No cross-Workspace relationship.

The schema should support future filtering by Specification Field and value.

Do not store all specification values as one opaque Product-level JSON array.

Add only justified indexes needed for identity, ownership, and future field-based filtering.

---

# 11. Product Image Metadata Table

Persist Product image references and metadata in a separate Aggregate-owned table.

Actual image files must not be stored inside PostgreSQL.

Do not use:

- `bytea` for Product image files.
- Base64 image content.
- binary Product image columns.

Persist only the current canonical Product image state and metadata, including where present:

- Image identity.
- Workspace and Product ownership.
- Stable `storage_key`.
- role or main-image state.
- order or slot.
- MIME type.
- byte size.
- width and height.
- checksum.
- image revision or timestamps.
- any other existing canonical image metadata.

Use the existing Product image model as the source of truth.

Do not invent physical upload behavior.

Do not create local folders in this task.

Do not read or write image files in this task.

---

# 12. Stable Product Media Paths — Approved Future Rule

Document, but do not physically implement, the approved Product media-storage rule.

Physical hierarchy:

```text
Workspace → Department storage segment → Product folder → Image files
```

Example:

```text
WS-001/
└── laptops/
    └── QC-LAP-001-lenovo-loq-15/
        ├── main.webp
        ├── gallery-01.webp
        ├── gallery-02.webp
        └── _variants/
```

Approved behavior:

- A Product media folder is created lazily when the first image is uploaded.
- Creating a Product without images creates no physical folder.
- The folder name is generated from Product state at first upload.
- The Department uses a stable storage segment, not a mutable display name.
- The Product folder uses ProductCode when available; otherwise a stable Product identifier may be used.
- The Product name contributes a readable slug.
- After creation, the folder path and existing StorageKeys remain stable.
- Product name changes do not rename the folder.
- ProductCode changes do not rename the folder.
- Department, Category, Product Type, or lifecycle changes do not move the folder.
- Existing image files use predictable names such as:
  - `main.webp`
  - `gallery-01.webp`
  - `gallery-02.webp`
- No random or short image identifier is required in the physical filename.
- Internal ImageId remains stored in PostgreSQL.
- Missing files are detected through expected StorageKeys.
- Manual replacement is detected through checksum and metadata.
- Existing files are not automatically renumbered.
- Future reorganization is an explicit controlled administrative use case.
- Future access URLs may include checksum or image revision for cache invalidation.

ADR-010 must state clearly that these are media-storage architecture rules for a future task, not file-system behavior implemented here.

---

# 13. Initial Index Strategy

Create an intentional initial index set without over-indexing.

Every tenant-facing index must place `workspace_id` first unless a documented PostgreSQL constraint requires otherwise.

At minimum, evaluate indexes for:

- Workspace + Catalog.
- Workspace + Category.
- Workspace + Product Type.
- Workspace + Brand.
- Workspace + lifecycle state.
- Workspace + availability status.
- Workspace + ProductCode uniqueness.
- Specification ownership and Specification Field lookup.
- Image ownership and deterministic ordering.

Do not add speculative indexes for every column.

Do not implement full-text search, trigram search, or a search vector in this task.

Document that advanced search indexes belong to the future Catalog Search task and must be based on real query patterns and `EXPLAIN ANALYZE`.

---

# 14. Persistence Mapper

Implement an Infrastructure-owned mapper such as:

`ProductPersistenceMapper`

Responsibilities:

- Convert the complete canonical Product Aggregate to persistence rows.
- Reconstruct the complete canonical Product Aggregate through `Product.rehydrate`.
- Preserve exact identity.
- Preserve Product Revision.
- Preserve lifecycle.
- Preserve timestamps.
- Preserve classification.
- Preserve commercial details.
- Preserve ProductCode canonical value.
- Preserve Money minor units and currencies.
- Preserve specification values.
- Preserve image metadata.
- Preserve deterministic collection ordering.
- Perform safe conversions for dates and numeric values.

Rules:

- Mapper must not create Domain Events during rehydration.
- Mapper must not pull or clear Domain Events.
- Mapper must not contain publication or lifecycle rules.
- Mapper must not silently default missing persisted Revision.
- Mapper must fail clearly on corrupted or incomplete persisted Aggregate data.
- Mapper types remain inside Infrastructure.
- Domain types must not import mapper types.

---

# 15. PostgreSQL Product Repository Adapter

Implement the canonical `ProductRepository`.

Required methods:

```typescript
findById(
  workspaceId: WorkspaceId,
  productId: ProductId,
): Promise<Product | null>;

create(
  product: Product,
): Promise<ProductCreateResult>;

update(
  product: Product,
  expectedPersistedRevision: ProductRevision,
): Promise<ProductUpdateResult>;
```

## Find by identity

- Query by WorkspaceId and ProductId.
- Load the main Product row.
- Load specification rows.
- Load image rows.
- Rehydrate one canonical Product Aggregate.
- Return `null` when no Product exists in that Workspace.
- Never return a DTO.
- Never return another Workspace's Product.

## Create

Use one transaction:

1. Insert the main Product row.
2. Insert specification rows.
3. Insert image metadata rows.
4. Commit.

Rules:

- A Product may be created at any valid current Revision.
- ProductId uniqueness must be enforced.
- ProductCode uniqueness must be enforced.
- Expected conflicts must map to canonical typed results.
- Unexpected PostgreSQL failures must remain thrown Infrastructure failures.
- No Product mutation.
- No lifecycle transition.
- No event pulling or dispatch.
- Failed create must leave no partial Product rows.

## Update

Use one transaction:

1. Atomically update the main Product row using WorkspaceId, ProductId, and expected persisted Revision.
2. When no row is updated, determine Product not found versus Revision conflict.
3. Only after successful revision-checked main-row update, replace or synchronize specification rows.
4. Replace or synchronize image metadata rows.
5. Commit.

Rules:

- Do not create a missing Product.
- Do not overwrite newer data.
- ProductCode uniqueness remains atomic.
- Failed update must leave the existing Product unchanged.
- No partial child-table replacement.
- No Product mutation.
- No event pulling or dispatch.

Document the selected child-row synchronization strategy.

A simple delete-and-reinsert strategy inside the same successful transaction is acceptable for Aggregate-owned collections when it preserves identity, order, and atomicity. Do not introduce unnecessary differential synchronization unless required.

---

# 16. Database Error Translation

Translate only expected named PostgreSQL constraint outcomes.

Expected mappings:

- Product primary-key conflict → `ProductIdConflict`.
- Workspace ProductCode unique conflict → `ProductCodeConflict`.
- Missing Product during update → `ProductNotFound`.
- Revision mismatch → `RevisionConflict`.

Do not translate:

- Connection failure.
- Timeout.
- Unknown SQL error.
- Corrupted row.
- Mapper failure.
- Migration failure.

Unexpected failures must remain visible as Infrastructure errors.

Do not use string matching against unstable provider messages when named constraints or PostgreSQL error codes can be used.

---

# 17. Database Connection

Create an Infrastructure database connection module.

Requirements:

- Read connection from `DATABASE_URL`.
- Do not hardcode credentials.
- Use a `pg` connection pool.
- Integrate the pool with Drizzle.
- Support local and hosted PostgreSQL.
- Keep SSL configuration Infrastructure-owned and environment-driven.
- Do not expose the raw pool to Domain or Presentation.
- Provide deterministic lifecycle hooks or test cleanup where required.
- Do not open a new database connection per query.

Add or update `.env.example` with safe placeholder values only.

Do not commit real credentials.

---

# 18. Drizzle Schema and Migrations

Add the required stable dependencies:

Runtime:

- `drizzle-orm`
- `pg`

Development:

- `drizzle-kit`
- `@types/pg`

Use versions compatible with the existing project and current Node.js setup.

Create:

- Drizzle configuration.
- PostgreSQL schema definitions.
- Versioned generated SQL migration.
- Migration scripts consistent with current package conventions.

The SQL migration must be committed and reviewable.

Do not use schema push as the production migration strategy.

Do not manually edit generated migration SQL unless required and documented.

Migration names must describe the Product persistence foundation.

Update the package lock consistently.

---

# 19. Local Docker Compose Development Environment

Add a local PostgreSQL development service through Docker Compose.

Requirements:

- Official stable PostgreSQL image.
- Named persistent volume.
- Health check.
- Database name, user, and password provided through development-safe environment configuration.
- Bind the development database to localhost only where supported.
- Do not expose PostgreSQL publicly.
- Do not include production secrets.
- Document startup, shutdown, migration, reset, backup, and restore commands.
- Do not add the QSC Application container unless already required by existing project conventions.

Preferred development flow:

```text
docker compose up -d postgres
→ wait for health
→ run migrations
→ run integration tests
```

Do not delete persistent data automatically.

Any destructive reset command must be clearly labeled.

---

# 20. Integration Testing

Add real PostgreSQL integration tests for the repository adapter.

Tests must use a dedicated test database or isolated test schema.

Do not use SQLite, browser mocks, or an in-memory fake to claim PostgreSQL constraint coverage.

Test setup must:

- Apply migrations.
- Isolate test data.
- Clean up deterministically.
- Avoid production credentials.
- Close database connections after tests.

Required integration coverage:

## Create

- Creates a complete Product Aggregate.
- Persists a Product at Revision 0.
- Persists a Product at Revision greater than 0.
- Persists a Draft without ProductCode.
- Allows multiple Products without ProductCode.
- Returns ProductIdConflict for duplicate Workspace ProductId.
- Returns ProductCodeConflict for equivalent canonical ProductCode.
- Allows the same ProductCode in a different Workspace.
- Does not partially persist specifications or images on failure.
- Does not pull Domain Events.

## Find

- Rehydrates the complete canonical Aggregate.
- Preserves WorkspaceId, ProductId, and CatalogId.
- Preserves lifecycle and Revision.
- Preserves timestamps.
- Preserves classification.
- Preserves commercial details and ProductCode.
- Preserves Money.
- Preserves specification values.
- Preserves image metadata and order.
- Returns null for a missing Product.
- Does not leak a Product across Workspaces.
- Rehydration records no Domain Event.

## Update

- Updates a Product when expected persisted Revision matches.
- Persists the Product's higher current Revision.
- Replaces or synchronizes specification values atomically.
- Replaces or synchronizes image metadata atomically.
- Returns ProductNotFound for a missing Product.
- Returns RevisionConflict with expected and actual Revision.
- Does not overwrite newer persisted data.
- Returns ProductCodeConflict when changing to another Product's code.
- Allows keeping the same Product's existing ProductCode.
- Allows clearing optional ProductCode when Domain state permits.
- Leaves Product and child rows unchanged after failed update.
- Does not pull Domain Events.

## Workspace and lifecycle rules

- Archived Product retains ProductCode reservation.
- ProductCode uniqueness is not Catalog-scoped.
- Child rows cannot cross Workspace ownership.
- Repository operations contain no Branch, Warehouse, stock, or quantity behavior.

---

# 21. Existing Unit-Test Compatibility

All existing tests must remain passing.

Current baseline before this task:

- 86 tests.
- 21 suites.

The final report must state the new total.

Product Entry and React behavior must remain unchanged.

Do not change unrelated mocks or legacy Product listing behavior unless a compile-safe import adjustment is strictly required.

---

# 22. ADR-009

Create:

`docs/01-Architecture/ADR/ADR-009-Provider-Neutral-PostgreSQL-Product-Persistence.md`

ADR-009 must be bilingual Arabic and English.

Include:

- Status: Accepted.
- Context.
- Decision.
- Alternatives considered.
- Consequences.
- Risks.
- PostgreSQL as canonical engine.
- Drizzle ORM and `node-postgres`.
- Drizzle Kit SQL migrations.
- Provider-neutral `DATABASE_URL`.
- Local and hosted deployment compatibility.
- Supabase as a possible host, not a Domain dependency.
- Hybrid Relational Schema.
- Complete Aggregate transaction boundary.
- Workspace-scoped composite identity.
- Workspace-wide ProductCode uniqueness.
- Optimistic concurrency.
- Infrastructure mapper boundary.
- Initial index strategy.
- Database technology migration implications.
- Explicit statement that moving hosts requires configuration and data migration, not Domain or Application redesign.

Update the ADR register so ADR-011 is next after ADR-010.

---

# 23. ADR-010

Create:

`docs/01-Architecture/ADR/ADR-010-Stable-Product-Media-Storage-Paths.md`

ADR-010 must be bilingual Arabic and English.

Include:

- Status: Accepted.
- Context.
- Decision.
- Alternatives considered.
- Consequences.
- Risks.
- Image files outside PostgreSQL.
- PostgreSQL stores StorageKey and metadata only.
- Workspace → Department segment → Product folder hierarchy.
- Lazy folder creation on first image upload.
- No folder creation for image-less Products.
- Human-readable Product folder naming.
- Predictable image names.
- Internal ImageId remains in PostgreSQL.
- Stable path after folder creation.
- No automatic rename or move after Product edits.
- Missing-file detection.
- Checksum-based replacement detection.
- Cache invalidation through checksum or image revision.
- Future explicit media-reorganization use case.
- Explicit statement that physical file storage and synchronization are not implemented in Task 3.14.5.

---

# 24. Documentation

Update only directly relevant bilingual documentation, including where appropriate:

- Product Aggregate.
- Product Invariants.
- Product Use Cases.
- Persistence Boundaries.
- Catalog Ubiquitous Language.
- Development setup.
- Testing strategy.
- ADR register.

Document:

- PostgreSQL provider neutrality.
- Drizzle placement inside Infrastructure.
- Hybrid Relational Schema.
- Complete Aggregate transaction.
- Workspace isolation.
- ProductCode uniqueness.
- Optimistic concurrency.
- Image metadata persistence.
- Stable media-path future rule.
- Local Docker development workflow.
- Migration and integration-test commands.

Do not duplicate the Constitution or entire ADR content.

---

# 25. What Will Be Implemented

Implement only:

- Approved PostgreSQL, Drizzle, and `pg` dependencies.
- Drizzle config.
- Local PostgreSQL Docker Compose service.
- Environment example.
- Hybrid relational Product schema.
- Versioned SQL migration.
- Initial justified indexes.
- Product persistence mapper.
- PostgreSQL ProductRepository adapter.
- Atomic create.
- Atomic update.
- Workspace-scoped find.
- ProductCode conflict translation.
- Revision conflict translation.
- Real PostgreSQL integration tests.
- ADR-009.
- ADR-010.
- Directly relevant bilingual documentation.

---

# 26. What Will NOT Be Implemented

Do not implement:

- Product Save use case.
- Smart Save.
- Product Entry integration.
- API routes.
- Server Actions.
- React changes.
- Catalog listing.
- Search UI.
- Full-text search.
- Trigram search.
- Product filters UI.
- Physical image upload.
- File-system folder creation.
- Local image-storage adapter.
- Image synchronization.
- Image variants generation.
- Image resizing.
- Cloud object storage.
- Supabase SDK.
- Supabase Auth.
- Supabase Storage.
- S3 adapter.
- Cloud deployment.
- Cloudflare Tunnel.
- Production server setup.
- Background jobs.
- Event Bus.
- Outbox.
- Domain Event dispatch.
- Inventory.
- Branch persistence.
- Warehouse.
- Product deletion.
- Product media reorganization.
- New architecture beyond approved ADR-009 and ADR-010.

---

# 27. Acceptance Criteria

The task is accepted only when:

- PostgreSQL is implemented as the canonical provider-neutral persistence engine.
- Drizzle and `pg` remain Infrastructure-only.
- `DATABASE_URL` controls the connection.
- Local and hosted PostgreSQL use the same repository and mapper.
- A Hybrid Relational Product schema exists.
- Core searchable and filterable Product fields are relational columns.
- Specification values and image metadata use Aggregate-owned child tables.
- Actual image files are not stored in PostgreSQL.
- Product identity is Workspace-scoped.
- ProductCode is unique across Workspace.
- Multiple null ProductCodes are allowed.
- Archived ProductCode remains reserved.
- Create is atomic.
- Update is atomic.
- Update enforces expected persisted Revision.
- Revision conflicts never overwrite newer data.
- Expected conflicts map to canonical typed results.
- Unexpected database failures remain Infrastructure failures.
- Find returns a complete rehydrated Product Aggregate.
- Rehydration records no Domain Events.
- Repository never pulls or dispatches Domain Events.
- Versioned SQL migration exists.
- Docker Compose PostgreSQL development service exists.
- Integration tests use real PostgreSQL.
- ADR-009 and ADR-010 are created and registered.
- Documentation remains bilingual.
- Product Entry remains unchanged.
- TypeScript passes.
- Lint passes.
- Existing unit tests pass.
- PostgreSQL integration tests pass.
- Build passes.
- Migration validation passes.
- `git diff --check` passes.
- No unrelated files change.

---

# 28. Verification

Run and report all applicable commands:

```text
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd test
npm.cmd run build
git diff --check
git status --short
git diff --stat
```

Also run the final project-specific database commands introduced by this task, including:

- Drizzle migration generation validation.
- Migration application against a clean PostgreSQL database.
- PostgreSQL integration tests.

Report exact commands and results.

Validate relative Markdown links.

Inspect for:

- Drizzle imports outside Infrastructure.
- `pg` imports outside Infrastructure.
- Database DTO leakage.
- Domain depending on database schema.
- Opaque Product-level JSON persistence.
- Missing Product Aggregate fields.
- Missing Workspace scope.
- Catalog-scoped ProductCode uniqueness.
- Child rows without composite Workspace ownership.
- Nullable expected Revision used to select create versus update.
- Partial writes.
- String matching against unstable database error messages.
- Repository pulling Domain Events.
- Product image binary data in PostgreSQL.
- Physical image I/O.
- Supabase-specific SDK use.
- Full-text search implemented prematurely.
- Branch, Inventory, Warehouse, stock, or quantity persistence.
- Runtime circular dependencies.
- Unrelated changes.

---

# 29. Required Final Report

Return exactly:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Existing Persistence Conventions Inspected
6. Dependencies Added
7. PostgreSQL Connection Design
8. Provider-Neutral Hosting Design
9. Docker Compose Development Environment
10. Drizzle Configuration
11. Hybrid Relational Schema
12. Main Product Table
13. Specification Values Table
14. Product Image Metadata Table
15. Identity and Workspace Isolation
16. ProductCode Uniqueness
17. Initial Index Strategy
18. SQL Migration
19. Persistence Mapper
20. FindById Implementation
21. Create Implementation
22. Update Implementation
23. Optimistic Concurrency
24. Database Error Translation
25. Transaction Atomicity
26. Domain Events Boundary
27. Media Storage Boundary
28. Product Entry Compatibility
29. Unit Tests Result
30. PostgreSQL Integration Tests
31. TypeScript Result
32. Lint Result
33. Build Result
34. Migration Validation Result
35. Diff Integrity Result
36. Architecture Integrity Review
37. ADR-009 Result
38. ADR-010 Result
39. Documentation Updates
40. Migration or Compatibility Risks
41. Remaining Risks
42. Architecture Changes
43. Status

Status must be one of:

- `Ready for review.`
- `Blocked pending architecture decision.`

---

# 30. What Was Discussed and Approved

The following decisions are approved and must not be reopened during implementation:

- PostgreSQL is the canonical database engine.
- Drizzle ORM is the Infrastructure query and schema layer.
- `node-postgres` is the PostgreSQL driver.
- Drizzle Kit SQL migrations are versioned and committed.
- PostgreSQL persistence is hosting-provider-neutral.
- Connection is configured through `DATABASE_URL`.
- Local PostgreSQL and hosted PostgreSQL use the same repository and mapper.
- Supabase may host PostgreSQL later but is not a Domain dependency.
- Hybrid Relational Schema is required for efficient Product filtering, search preparation, reporting, and data reuse.
- Core Product fields are relational columns.
- Specification values and image metadata are separate child tables.
- Complete Aggregate persistence uses one transaction.
- Product identity is Workspace-scoped.
- ProductCode is unique across Workspace, not Catalog.
- Draft Products may omit ProductCode.
- Archived Products retain ProductCode reservation.
- Optimistic concurrency uses expected persisted Product Revision.
- Actual Product images are stored outside PostgreSQL.
- PostgreSQL stores image StorageKey and metadata only.
- Product media folders are created lazily on first image upload.
- Product media paths remain stable after creation.
- Product edits do not automatically rename or move media folders.
- Predictable image filenames are used.
- Physical media storage and synchronization are deferred to a later task.
- Full-text search and advanced search indexes are deferred to the Catalog Search task.
- No unapproved architecture change is permitted.

---

# 31. Suggestions and Next Step

Do not implement the next task.

After Task 3.14.5 passes architecture review, the proposed next task is:

**Sprint 03 — Task 3.14.6  
Smart Save Product Use Case**

That future task will orchestrate:

- Trusted Workspace context.
- Product creation versus update.
- Current publication-requirements resolution.
- Publication readiness evaluation.
- Draft preservation.
- Smart Save and Publish behavior.
- Repository persistence.
- Revision conflict handling.
- Domain Event consumption after successful persistence.
- User-work preservation.

Do not begin Task 3.14.6 automatically.

Stop after completing Task 3.14.5.
