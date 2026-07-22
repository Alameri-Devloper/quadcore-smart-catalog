# Sprint 03 — Task 3.14.5-R2
## Integration-Test Database Safety and Documentation Alignment

**Project:** Quadcore Smart Catalog — QSC  
**Parent Tasks:** Task 3.14.5 and Task 3.14.5-R1  
**Task Type:** Small targeted safety and documentation correction  
**Architecture Status:** No architecture change  
**Implementation Language:** TypeScript only

Do not begin Task 3.14.6.

Do not create a Git commit.

Preserve the approved PostgreSQL, Drizzle, node-postgres, Hybrid Relational Schema, ProductRepository, optimistic concurrency, migration, and media-boundary architecture.

---

# 1. Objective

Close the final review gaps found after Task 3.14.5-R1:

1. Prevent destructive integration tests from running against a non-test database.
2. Make the local PostgreSQL integration-test workflow reproducible from a clean Docker environment.
3. Make the test-only rollback trigger setup resilient after an interrupted prior run.
4. Correct small bilingual documentation and ADR-register metadata inconsistencies.
5. Re-run the complete verification suite.

No Domain, Application, Product Repository contract, schema, production migration, or runtime behavior redesign is allowed.

---

# 2. Destructive Test Database Safety Guard

The integration tests execute:

```sql
TRUNCATE TABLE catalog_products CASCADE
```

Therefore documentation alone is not sufficient protection.

Add a test-only TypeScript safety guard before creating the integration-test database connection or running migrations.

The guard must validate `TEST_DATABASE_URL`.

Required rules:

- `TEST_DATABASE_URL` is required.
- It must be a valid PostgreSQL URL.
- The database name must clearly identify a test database.
- Approved database-name convention: the normalized database name must contain the token `test`, separated by the beginning/end of the name or by `_` / `-`.
- Examples accepted:
  - `qsc_test`
  - `qsc-r1-test`
  - `test_qsc`
- Examples rejected:
  - `qsc`
  - `postgres`
  - `production`
  - `contest`
- When `DATABASE_URL` is present, normalized `TEST_DATABASE_URL` must not identify the same host, port, and database as `DATABASE_URL`.
- Do not log passwords or the complete connection string in errors.
- Run the guard before `migrate`, `TRUNCATE`, trigger creation, or repository construction.
- Keep this guard in test-only Infrastructure support, not Domain or Application.
- Do not add a runtime dependency.

Suggested conceptual API:

```typescript
export interface IntegrationTestDatabaseTarget {
  readonly host: string;
  readonly port: string;
  readonly databaseName: string;
}

export const assertSafeIntegrationTestDatabaseUrl = (
  testDatabaseUrl: string | undefined,
  applicationDatabaseUrl?: string,
): IntegrationTestDatabaseTarget => {
  // test-only safety validation
};
```

Exact naming and location should follow existing test conventions.

---

# 3. Safety Guard Tests

Add dependency-free Node tests covering:

## Accepted

- `postgresql://user:password@127.0.0.1:5432/qsc_test`
- `postgresql://user:password@127.0.0.1:5432/qsc-r1-test`
- `postgresql://user:password@127.0.0.1:5432/test_qsc`

## Rejected

- missing value,
- malformed URL,
- non-PostgreSQL protocol,
- database name `qsc`,
- database name `postgres`,
- database name `contest`,
- same database target as `DATABASE_URL`.

Also verify thrown errors do not contain the supplied password.

Do not connect to PostgreSQL in these guard unit tests.

---

# 4. Integration Test Bootstrap

Update the PostgreSQL repository integration test so:

1. The safety guard runs first.
2. Only after successful validation is `createCatalogDatabaseConnection` called.
3. Migration, truncation, trigger setup, and tests remain unchanged in behavior.
4. Existing real PostgreSQL tests continue to use `TEST_DATABASE_URL`.

Do not allow a bypass flag in this task.

---

# 5. Test Trigger Resilience

The rollback integration test currently creates a test-only PostgreSQL trigger and function.

Before creating them, execute safe cleanup:

```sql
DROP TRIGGER IF EXISTS ... ON catalog_product_specification_values;
DROP FUNCTION IF EXISTS ...;
```

Then create the function and trigger.

Keep the existing `finally` cleanup.

Purpose:

- A previously interrupted test process must not make the next run fail before reaching `finally`.
- No trigger or function belongs in production migrations.

Do not weaken the rollback assertion.

---

# 6. Reproducible Local Test Database Workflow

Update:

`docs/05-Development/PostgreSQL-Development.md`

The documentation must be bilingual Arabic and English and include an explicit clean-machine workflow.

Document:

1. Start PostgreSQL:

```powershell
docker compose up -d postgres
docker compose ps
```

2. Create the dedicated test database once:

```powershell
docker compose exec postgres createdb -U qsc qsc_test
```

Explain that PostgreSQL may report that the database already exists on later runs.

3. Set the integration-test URL in the current PowerShell session:

```powershell
$env:TEST_DATABASE_URL="postgresql://qsc:qsc_dev_password@127.0.0.1:5432/qsc_test"
```

4. Run:

```powershell
npm.cmd run test:integration
```

5. State explicitly:

- The current integration-test script reads `TEST_DATABASE_URL` from the process environment.
- Merely copying `.env.example` does not automatically inject this value into the standalone Node integration-test process.
- Never point `TEST_DATABASE_URL` to the application or production database.
- The safety guard refuses suspicious database names and the same target as `DATABASE_URL`.

Do not add dotenv or another dependency.

---

# 7. Documentation Metadata Alignment

## ADR Register

Update:

`docs/01-Architecture/ADR/README.md`

Change `Last Updated` to the actual Task 3.14.5 completion date:

```text
2026-07-21
```

Keep ADR-011 as the next identifier.

## Persistence Boundaries

Update:

`docs/04-Infrastructure/Persistence-Boundaries.md`

The current header says:

```text
technology deferred
```

This is no longer accurate after Accepted ADR-009 and the implemented PostgreSQL adapter.

Use a status meaning equivalent to:

```text
Accepted boundary; PostgreSQL adapter implemented
```

Preserve the important architectural statement that the repository contract itself remains technology-neutral.

## PostgreSQL Development Structure

Remove the duplicated Arabic paragraph currently placed inside the English section.

Place all Arabic guidance under `## العربية`.

Preserve complete bilingual coverage.

---

# 8. Scope Protection

Do not modify:

- Product Aggregate.
- Product Value Objects.
- ProductRepository contract.
- ProductRepository result types.
- PostgreSQL production schema.
- foundation SQL migration.
- Drizzle snapshot or journal, unless a tool proves an unintended existing inconsistency.
- PostgreSqlProductRepository production behavior.
- ProductPersistenceMapper production behavior.
- Product Entry.
- Smart Save.
- ArchiveReason.
- media file behavior.
- Next.js transport.
- search or filtering.
- package dependencies, unless strictly required to fix an unexpected verification failure and reported before changing.

No new migration should be generated.

---

# 9. Verification

Run and report:

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

Also verify manually or through focused tests:

- application database names are rejected,
- `contest` is rejected,
- accepted test-name examples pass,
- same target as `DATABASE_URL` is rejected,
- passwords are absent from errors,
- integration tests still run against real PostgreSQL,
- interrupted-trigger cleanup is idempotent,
- no production migration changed,
- ADR-011 remains next,
- documentation is bilingual.

Do not create a Git commit.

---

# 10. Acceptance Criteria

The correction is accepted only when:

- destructive integration tests cannot start against an unsafe database target,
- the guard runs before connection, migration, truncation, or trigger operations,
- the database name convention is tested,
- same-target protection is tested,
- errors never reveal credentials,
- the rollback trigger setup survives leftovers from an interrupted prior run,
- a clean local developer can create and run the dedicated test database using documented commands,
- documentation accurately explains process-environment loading,
- ADR register date is current,
- Persistence Boundaries no longer says technology is deferred,
- bilingual document structure is corrected,
- no production schema or migration changes,
- all existing and new tests pass,
- TypeScript, lint, build, Drizzle check, audit review, and diff checks complete,
- no unrelated files change,
- no Git commit is created.

---

# 11. Required Final Report

Return exactly:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Test Database Safety Guard
6. Accepted Database Name Tests
7. Rejected Database Name Tests
8. Same-Target Protection
9. Credential Redaction
10. Integration Bootstrap Order
11. Trigger Cleanup Resilience
12. Local Test Database Workflow
13. ADR Register Correction
14. Persistence Boundaries Correction
15. Bilingual Documentation Correction
16. Production Schema Compatibility
17. Production Migration Compatibility
18. Existing Unit Tests
19. Safety Guard Tests
20. PostgreSQL Integration Tests
21. TypeScript Result
22. Integration TypeScript Result
23. Lint Result
24. Build Result
25. Drizzle Check Result
26. Runtime Audit Result
27. Development Audit Result
28. Diff Integrity Result
29. Architecture Integrity Review
30. Remaining Risks
31. Architecture Changes
32. Status

Status must be one of:

- `Ready for review.`
- `Blocked pending architecture decision.`

Stop after Task 3.14.5-R2.
