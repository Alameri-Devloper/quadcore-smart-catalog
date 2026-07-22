# Sprint 03 — Task 3.14.5-R1
## PostgreSQL Product Persistence Deep Hardening

**Project:** Quadcore Smart Catalog — QSC  
**Parent Task:** Sprint 03 — Task 3.14.5  
**Task Type:** Focused Security, Consistency, Constraint, and Test Correction  
**Architecture Status:** Approved corrective scope  
**Implementation Language:** TypeScript only

Do not begin Task 3.14.6.

Do not create a Git commit.

Do not change the approved PostgreSQL, Drizzle, node-postgres, Hybrid Relational Schema, ProductRepository, or media-boundary architecture.

---

# 1. Objective

Correct the focused issues found during the deep architecture and code review of Task 3.14.5.

This correction must:

1. Upgrade the vulnerable runtime Drizzle ORM version.
2. Guarantee consistent-snapshot Product Aggregate reads.
3. Strengthen PostgreSQL constraints for stable Domain invariants.
4. Enforce canonical ProductCode at the database boundary.
5. Guarantee deterministic Specification ordering.
6. Remove redundant indexes.
7. Make migration generation naming reusable.
8. Strengthen mapper corruption detection.
9. Add focused real-PostgreSQL integration coverage.
10. Re-run every Task 3.14.5 verification command.

Do not expand into Smart Save, ArchiveReason, Product Entry, media file I/O, search, or any later task.

---

# 2. Existing Implementation to Preserve

Preserve:

- PostgreSQL as the canonical provider-neutral database.
- Drizzle ORM inside Infrastructure only.
- node-postgres.
- Drizzle Kit versioned SQL migrations.
- `DATABASE_URL`.
- Workspace-scoped composite Product identity.
- Hybrid Relational Schema.
- Main Product table.
- Specification child table.
- Image metadata child table.
- Complete Aggregate transactions.
- ProductCode uniqueness across Workspace.
- Product Revision optimistic concurrency.
- Expected named-constraint error translation.
- Domain Event non-consumption.
- No image binary persistence.
- No Supabase-specific repository.
- Product Entry compatibility.

---

# 3. Runtime Security Correction

Upgrade:

```text
drizzle-orm
```

from the vulnerable version range to a patched stable version:

```text
>= 0.45.2
```

Preferred exact minimum:

```text
drizzle-orm@0.45.2
```

or a newer stable compatible patch only after verification.

Rules:

- Do not run `npm audit fix --force`.
- Do not downgrade Next.js.
- Do not introduce an RC or beta dependency.
- Keep `drizzle-kit` stable unless compatibility requires an approved stable adjustment.
- Update `package-lock.json` consistently.
- Run TypeScript, migrations, unit tests, integration tests, lint, and build after the upgrade.
- Report the final `npm audit --omit=dev` result.
- Separate pre-existing Next/PostCSS findings from dependencies introduced by Task 3.14.5.
- Treat the `drizzle-kit` transitive esbuild advisory as development-only risk unless a stable non-breaking resolution is available and verified.
- Do not add fragile `overrides` merely to silence audit output without compatibility proof.

---

# 4. Consistent Aggregate Read Snapshot

Current Product rehydration requires:

- one main Product row,
- Specification rows,
- Image rows.

These rows must come from one consistent PostgreSQL snapshot.

Update `findById` so the complete Aggregate read runs inside one read-only `REPEATABLE READ` transaction.

Preferred Drizzle transaction configuration:

```typescript
{
  isolationLevel: "repeatable read",
  accessMode: "read only",
}
```

Rules:

- Main and child rows must use the same transaction.
- Do not issue main-row and child-row reads across separate committed snapshots.
- Keep all queries Workspace-scoped.
- Return `null` when the Product is absent.
- Rehydrate no Domain Events.
- Do not use a long-lived transaction outside the method.
- Avoid concurrent `Promise.all` queries if the transaction uses one node-postgres client; sequential child reads are acceptable.

Document why the read transaction is required:

```text
A Product Aggregate must not combine an old main row with newer child rows, or vice versa.
```

---

# 5. Product Table Constraint Hardening

Add named PostgreSQL checks for stable Domain invariants.

## 5.1 Lifecycle State

Allow only:

- `Draft`
- `Published`
- `Archived`

Example conceptual check:

```sql
lifecycle_state IN ('Draft', 'Published', 'Archived')
```

## 5.2 Revision Range

Revision must remain within the JavaScript safe-integer Domain range:

```text
0 <= revision <= 9007199254740991
```

Do not rely only on mapper rejection after reading corrupted data.

## 5.3 Money Range

For each non-null price minor-unit value:

```text
0 <= amount_minor <= 9007199254740991
```

Preserve the existing amount/currency pair checks.

Add separate named checks for:

- wholesale price range,
- retail price range.

## 5.4 ProductCode Canonical Form

When ProductCode is non-null, PostgreSQL must enforce:

- non-empty after trimming,
- no surrounding whitespace,
- canonical uppercase representation.

Conceptual check:

```sql
product_code IS NULL
OR (
  btrim(product_code) <> ''
  AND product_code = upper(btrim(product_code))
)
```

Keep the existing named Workspace-wide partial unique index.

Do not replace canonical Domain ProductCode behavior; this is database defense in depth.

## 5.5 Optional Section Presence Integrity

Preserve the semantic distinction between:

- absent classification,
- present but partially empty classification,
- absent commercial details,
- present but partially empty commercial details.

Add checks that prevent hidden stale columns when the section-presence flag is false.

When:

```text
has_classification = false
```

all classification columns must be null.

When:

```text
has_commercial_details = false
```

all commercial-detail and pricing columns must be null and `is_highlighted` must be false.

Do not require any specific field to be non-null when the presence flag is true, because Draft composition may be partial.

---

# 6. Specification Ordering Integrity

The mapper reconstructs Specification values using `position`.

Deterministic ordering requires unique positions per Product.

Replace the non-unique Specification order index with a named unique index:

```text
(workspace_id, product_id, position)
```

Keep the Specification Field identity primary key.

Do not require contiguous positions.

Do not silently resolve duplicate persisted positions in the mapper.

---

# 7. Remove Redundant Image Index

The existing unique image-position index:

```text
(workspace_id, product_id, position)
```

already supports Product ownership and ordered retrieval.

Remove the redundant non-unique index with the same column sequence.

Keep:

- image primary key,
- unique image position,
- one-main-image partial unique index,
- composite Product foreign key.

The initial index strategy must avoid duplicate equivalent indexes.

---

# 8. Strict Persisted Specification Number Parsing

Strengthen `ProductPersistenceMapper` so persisted numeric Specification values must be in the same canonical representation emitted by the mapper.

Current write behavior uses:

```typescript
String(numberValue)
```

Read behavior must reject non-canonical alternatives rather than silently normalize corrupted values.

Support the actual JavaScript numeric values allowed by the Domain, including where applicable:

- finite numbers,
- `NaN`,
- `Infinity`,
- `-Infinity`.

Examples of non-canonical persisted forms that should be rejected if they are never emitted by `String(number)`:

- `01`
- `.5`
- `1.`
- alternate exponent spelling that does not equal `String(parsedValue)`

Do not change the Domain SpecificationValue model in this correction.

Add focused mapper tests.

---

# 9. Generic Migration Generation Script

Change the fixed script:

```text
drizzle-kit generate --name=product_persistence_foundation
```

to a reusable script:

```text
drizzle-kit generate
```

Future migrations must supply their name explicitly, for example:

```powershell
npm.cmd run db:generate -- --name=product_archive_reason
```

Update bilingual development documentation accordingly.

Do not create misleading future migrations with the foundation name.

---

# 10. Migration Strategy for This Correction

Task 3.14.5 is not committed and has no production deployment.

Prefer a clean final foundation migration.

Approved approach:

1. Update Drizzle schema.
2. Regenerate the initial foundation migration and metadata cleanly.
3. Validate the regenerated migration against a clean dedicated PostgreSQL test database.
4. Confirm schema and generated SQL match.

Do not preserve a known-incomplete migration merely for local history.

Do not delete user data automatically.

Use a dedicated disposable test database or isolated clean environment for destructive migration validation.

Do not commit real credentials.

---

# 11. Integration Test Hardening

Use real PostgreSQL.

Add focused tests for:

## 11.1 Database canonical ProductCode

Prove direct non-canonical database writes are rejected, including:

- lowercase ProductCode,
- surrounding whitespace,
- empty/whitespace-only ProductCode.

Preserve multiple null ProductCodes.

## 11.2 Lifecycle constraint

Prove unsupported lifecycle values are rejected by PostgreSQL.

## 11.3 Revision range

Prove:

- negative Revision rejected,
- Revision above `Number.MAX_SAFE_INTEGER` rejected.

## 11.4 Money range

Prove negative and unsafe wholesale/retail minor-unit values are rejected.

## 11.5 Presence-flag integrity

Prove:

- classification columns cannot remain populated when `has_classification=false`,
- commercial/pricing columns cannot remain populated when `has_commercial_details=false`.

Also prove partial present sections remain allowed.

## 11.6 Specification ordering

Prove duplicate Specification positions for the same Product are rejected.

## 11.7 Composite child ownership

Test cross-Workspace rejection for both:

- Product images,
- Product Specification values.

## 11.8 Create transaction rollback after child failure

Add a deterministic real-PostgreSQL test that forces a child insert failure after the main Product insert has begun.

A test-only PostgreSQL trigger/function using a sentinel Specification Field ID is acceptable when:

- created only in the isolated test database,
- removed in `finally`,
- not added to production migrations.

Verify after the repository throws:

- no main Product row remains,
- no Specification row remains,
- no Image row remains.

This proves complete create rollback beyond a main-table uniqueness failure.

## 11.9 Existing update rollback

Retain and strengthen the ProductCode-conflict test proving:

- the main row remains unchanged,
- previous Specification rows remain unchanged,
- previous Image rows remain unchanged.

## 11.10 Read transaction

Add a focused structural or integration test consistent with project conventions that verifies `findById` uses one repeatable-read transaction.

Do not add flaky timing-loop concurrency tests.

---

# 12. Audit Classification

After correction, run:

```powershell
npm.cmd audit --omit=dev
npm.cmd audit
```

Final report must classify findings:

## Runtime / production

- introduced by this task,
- pre-existing in the project,
- resolved,
- unresolved with explicit reason.

## Development-only

- introduced by Drizzle Kit or build tooling,
- exposure context,
- stable remediation availability,
- whether accepted temporarily.

Do not claim zero vulnerabilities unless audit proves it.

Do not apply unrelated breaking upgrades to Next.js or other application packages inside this correction.

---

# 13. Diff and Documentation Review

Review and include:

- `package-lock.json`
- ADR-009
- ADR-010
- PostgreSQL development documentation
- `.env.example`
- Docker Compose
- Drizzle migration metadata

Confirm:

- no real secrets,
- no task-specification modifications,
- no unrelated files,
- bilingual documentation remains correct,
- ADR register still identifies ADR-011 as next.

The pre-existing Task specification file under `docs/05-Development/Tasks/` must not be accidentally modified.

Report whether it is intended to be committed as project process documentation or excluded before Git staging.

Do not decide silently.

---

# 14. Verification

Run and report exact results:

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
git diff --stat
npm.cmd audit --omit=dev
npm.cmd audit
```

Also validate:

- migration generation with an explicit temporary descriptive name or schema check without leaving an unwanted migration,
- clean migration application,
- regenerated migration metadata consistency,
- all Markdown relative links.

Do not create a Git commit.

---

# 15. Acceptance Criteria

The correction is accepted only when:

- `drizzle-orm` is on patched stable `0.45.2` or newer compatible stable version.
- Complete Product reads use one read-only repeatable-read transaction.
- lifecycle values are database-constrained.
- Revision is database-constrained to the safe integer range.
- Money values are database-constrained to the non-negative safe integer range.
- ProductCode canonical form is database-constrained.
- Workspace-wide ProductCode uniqueness remains intact.
- optional section presence flags cannot hide stale populated columns.
- Specification positions are unique per Product.
- redundant equivalent image ordering index is removed.
- persisted Specification numbers are parsed canonically.
- migration generation script is reusable.
- the final foundation migration is clean and validated.
- child failure proves create rollback.
- both child tables prove cross-Workspace protection.
- update conflict proves complete rollback.
- all old tests remain passing.
- all new tests pass against real PostgreSQL.
- no Domain/Application database dependency is introduced.
- no Product Entry or media-file behavior is added.
- security findings are accurately classified.
- no unrelated files change.
- no Git commit is created.

---

# 16. Required Final Report

Return exactly:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Drizzle ORM Security Upgrade
6. Runtime Audit Result
7. Development Audit Result
8. Consistent Read Snapshot
9. Product Lifecycle Constraint
10. Revision Range Constraint
11. Money Range Constraints
12. ProductCode Canonical Constraint
13. Presence Flag Integrity
14. Specification Position Integrity
15. Index Deduplication
16. Specification Number Corruption Detection
17. Migration Script Correction
18. Migration Regeneration and Validation
19. Create Rollback Test
20. Update Rollback Test
21. Cross-Workspace Child Tests
22. ProductCode Direct SQL Tests
23. Mapper Tests
24. Existing Unit Tests
25. PostgreSQL Integration Tests
26. TypeScript Result
27. Integration TypeScript Result
28. Lint Result
29. Build Result
30. Drizzle Check Result
31. Diff Integrity Result
32. Documentation Review
33. Task Specification File Decision
34. Architecture Integrity Review
35. Remaining Risks
36. Architecture Changes
37. Status

Status must be:

- `Ready for review.`
- `Blocked pending architecture decision.`

---

# 17. What Was Discussed and Approved

The following are approved correction decisions:

- Fix the runtime Drizzle advisory before Git commit.
- Do not use `npm audit fix --force`.
- Do not make unrelated breaking framework upgrades.
- Read the complete Aggregate from one repeatable-read snapshot.
- Add database defense-in-depth for stable Domain invariants.
- Preserve Draft partiality.
- Enforce canonical ProductCode in PostgreSQL.
- Preserve Workspace-wide ProductCode uniqueness.
- Guarantee deterministic Specification ordering.
- Remove equivalent duplicate indexes.
- Make migration naming reusable.
- Regenerate the uncommitted initial migration cleanly.
- Prove child-insert rollback against real PostgreSQL.
- Keep Task 3.14.6 out of scope.
- Do not create a Git commit.

Stop after Task 3.14.5-R1.
