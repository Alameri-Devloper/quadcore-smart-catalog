# Sprint 03 — Task 3.14.5-R3
## Final Test-Database Alias Hardening and Dependency Security Closure

**Project:** Quadcore Smart Catalog — QSC  
**Parent Tasks:** Task 3.14.5, Task 3.14.5-R1, Task 3.14.5-R2  
**Task Type:** Final focused safety and dependency-security correction  
**Architecture Status:** No architecture change  
**Implementation Language:** TypeScript only

Do not begin Task 3.14.6.

Do not create a Git commit.

Preserve the approved PostgreSQL, Drizzle, node-postgres, Hybrid Relational Schema, ProductRepository, optimistic concurrency, migration, and media-boundary architecture.

---

# 1. Objective

Close the final review findings after Task 3.14.5-R2:

1. Prevent destructive integration tests from bypassing same-database detection through loopback-host aliases.
2. Strengthen same-database protection conservatively without DNS dependence.
3. Investigate and, when safely possible, remediate the current runtime `sharp` and `postcss` audit findings.
4. Correct audit reporting so the final report exactly matches command output.
5. Correct the remaining persistence-documentation wording.
6. Re-run the complete verification suite.

No Product Domain, Application, repository-contract, production schema, foundation migration, Smart Save, ArchiveReason, Product Entry, media-file, search, or transport work is allowed.

---

# 2. Current Verified Findings

The current safety guard compares host names as normalized strings.

This can treat these loopback aliases as different:

```text
localhost
127.0.0.1
::1
0:0:0:0:0:0:0:1
```

The integration suite performs destructive operations including:

```sql
TRUNCATE TABLE catalog_products CASCADE;
```

The current actual audit output reports:

```text
npm audit --omit=dev
3 vulnerabilities:
- 1 moderate
- 2 high
```

The two high findings are currently reported through `sharp`.

The complete audit currently reports:

```text
7 vulnerabilities:
- 5 moderate
- 2 high
```

The final report must not replace these actual numbers with older or estimated counts.

---

# 3. Canonical Host Normalization

Strengthen the test-only database safety helper.

Introduce a pure internal host-normalization function following existing naming conventions.

Normalize:

- lower case,
- one trailing dot removed from DNS host names,
- IPv6 brackets removed when present,
- canonical loopback aliases mapped to one internal token such as `loopback`.

At minimum, treat the following as equivalent loopback targets:

```text
localhost
localhost.
127.0.0.1
127.0.0.2
any address in 127.0.0.0/8
::1
0:0:0:0:0:0:0:1
::ffff:127.0.0.1
IPv4-mapped loopback addresses in ::ffff:127.0.0.0/104
```

Use Node built-ins only.

Do not:

- perform DNS resolution,
- contact the network,
- add a dependency,
- expose credentials,
- add a bypass flag.

For non-loopback hosts, compare the normalized host string.

---

# 4. Conservative Same-Database Protection

When `DATABASE_URL` is present, apply both protections:

## 4.1 Same database name protection

Reject when the normalized `TEST_DATABASE_URL` database name equals the normalized `DATABASE_URL` database name, regardless of host alias or credentials.

Rationale:

```text
A destructive integration-test database must use a distinctly named database.
```

This intentionally favors data safety over allowing the same database name on separate hosts.

## 4.2 Canonical target protection

Also reject when:

```text
canonical host
+ normalized/default port
+ normalized database name
```

identify the same target.

Credentials must remain irrelevant to target comparison.

Keep the existing test-token naming rule.

---

# 5. Safety Guard Tests

Extend dependency-free unit tests.

## Accepted

- existing accepted names remain accepted,
- a distinct test database name remains accepted when the application URL uses a loopback alias.

Example:

```text
DATABASE_URL:
postgresql://app:secret@localhost:5432/qsc

TEST_DATABASE_URL:
postgresql://test:secret@127.0.0.1:5432/qsc_test
```

## Rejected loopback aliases

Test at least:

- `localhost` versus `127.0.0.1`,
- `localhost.` versus `127.0.0.2`,
- `127.0.0.1` versus `::1`,
- `::1` versus expanded IPv6 loopback,
- IPv4 loopback versus IPv4-mapped IPv6 loopback.

## Rejected same database name

Reject the same normalized database name even when:

- hosts differ,
- credentials differ,
- one URL omits port `5432`,
- host casing differs.

## Credential safety

Continue proving that no error includes:

- test password,
- application password,
- full connection URL.

Do not connect to PostgreSQL in these unit tests.

---

# 6. Integration Bootstrap Safety

Keep the verified bootstrap order:

```text
Read URLs
→ run safety guard
→ create connection
→ construct repository
→ migrate
→ destructive setup
→ tests
```

Add or retain a focused structural test proving the guard is executed before connection creation and destructive database actions.

Do not add a bypass environment variable.

---

# 7. Runtime Dependency Security Investigation

Inspect the actual installed dependency tree:

```powershell
npm.cmd ls next sharp postcss
npm.cmd explain sharp
npm.cmd explain postcss
npm.cmd audit --omit=dev
npm.cmd audit
```

Use current stable package-registry information during implementation.

## 7.1 Safe remediation gate

A dependency update is allowed only when all conditions are true:

- stable release,
- no beta, RC, or canary,
- no Next.js major downgrade,
- no unrelated architecture change,
- Next.js and `eslint-config-next` remain version-aligned,
- React and React DOM compatibility is preserved,
- TypeScript, lint, tests, integration tests, build, and audit are re-run,
- generated lockfile changes are reviewed.

Preferred remediation order:

1. Safe stable patch/minor update within the current Next.js major.
2. Officially compatible stable resolution documented by the package maintainers.
3. If no safe compatible remediation exists, document and accept the temporary risk explicitly.

Do not:

- run `npm audit fix --force`,
- downgrade Next.js to an older major,
- add a direct `sharp` version override merely to silence audit,
- add an npm `overrides` entry without verified official compatibility,
- remove Next image functionality merely to hide the dependency,
- claim the vulnerability is resolved unless the final audit proves it.

## 7.2 Runtime finding classification

For every remaining runtime finding, report:

- package,
- severity,
- dependency path,
- whether introduced by Task 3.14.5,
- whether the vulnerable code path is used or potentially reachable,
- safe stable remediation availability,
- decision,
- review trigger.

High-severity runtime findings must not be summarized as moderate.

---

# 8. Development Dependency Classification

Classify the Drizzle Kit / esbuild finding accurately.

Do not apply a breaking downgrade.

Document:

- development-only exposure,
- affected command context,
- why it does not ship as application runtime code,
- available stable remediation status,
- future review trigger.

Do not claim it is resolved unless the audit proves it.

---

# 9. Dependency Security Risk Record

Inspect the existing documentation structure.

If a dependency-security risk register already exists, update it.

Otherwise create a bilingual document following project conventions, suggested path:

```text
docs/05-Development/Dependency-Security-Risks.md
```

Document at minimum:

- date,
- affected package,
- severity,
- runtime or development scope,
- dependency path,
- remediation attempted,
- why `--force` was rejected,
- current mitigation,
- accepted temporary risk owner/context,
- next review trigger.

Do not include credentials.

Do not duplicate the entire npm audit output.

Link the document from the most relevant development index when such an index exists.

---

# 10. Persistence Documentation Wording

Update:

```text
docs/04-Infrastructure/Persistence-Boundaries.md
```

Replace wording equivalent to:

```text
Future adapters map the complete Product Aggregate
```

with wording equivalent to:

```text
Infrastructure adapters map the complete Product Aggregate
```

The document must reflect that a PostgreSQL adapter now exists while preserving technology-neutral repository contracts.

Maintain bilingual parity.

---

# 11. Scope Protection

Do not modify unless required by a safe dependency remediation:

- Product Aggregate,
- Product Value Objects,
- ProductRepository contract,
- ProductRepository result types,
- PostgreSQL production schema,
- foundation SQL migration,
- Drizzle snapshot,
- Drizzle journal,
- PostgreSqlProductRepository production logic,
- ProductPersistenceMapper production logic,
- Docker Compose database model,
- Product Entry,
- Smart Save,
- ArchiveReason,
- media behavior,
- search,
- filters,
- API routes,
- Server Actions.

No migration may be generated.

Any package change must be limited to the verified safe security remediation and must be explicitly reported.

---

# 12. Verification

Run and report exact outputs:

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
npm.cmd ls next sharp postcss
npm.cmd explain sharp
npm.cmd explain postcss
npm.cmd audit --omit=dev
npm.cmd audit
```

Also verify:

- all specified loopback aliases,
- same database name rejection across different hosts,
- distinct application/test database names remain accepted,
- no password or URL leakage,
- guard remains before database connection,
- integration suite still passes against real PostgreSQL,
- no production schema or migration change,
- audit report counts exactly match command output,
- documentation is bilingual,
- no unrelated files change.

Do not create a Git commit.

---

# 13. Acceptance Criteria

The task is accepted only when:

- loopback aliases cannot bypass same-target protection,
- all `127.0.0.0/8` addresses are handled safely,
- IPv6 loopback and IPv4-mapped loopback are handled safely,
- same normalized database name as `DATABASE_URL` is rejected,
- distinct `qsc` and `qsc_test` databases remain usable,
- credentials never appear in safety errors,
- no DNS or external dependency is used by the guard,
- the integration bootstrap order remains safe,
- actual audit counts are reported exactly,
- high runtime findings are either safely resolved or explicitly risk-accepted with evidence,
- no force fix, unsafe override, or major downgrade is used,
- dependency-security risks are documented bilingually,
- persistence wording reflects the implemented adapter,
- production schema and migrations remain unchanged,
- all tests and verification commands pass,
- no unrelated files change,
- no Git commit is created.

---

# 14. Required Final Report

Return exactly:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Host Canonicalization
6. Loopback Alias Coverage
7. Same Database Name Protection
8. Canonical Target Protection
9. Credential Redaction
10. Integration Bootstrap Order
11. Safety Guard Tests
12. Runtime Dependency Tree
13. Sharp Security Finding
14. PostCSS Security Finding
15. Runtime Remediation Decision
16. Development Esbuild Finding
17. Dependency Security Risk Record
18. Persistence Documentation Correction
19. Production Schema Compatibility
20. Production Migration Compatibility
21. Existing Unit Tests
22. Safety Tests
23. PostgreSQL Integration Tests
24. TypeScript Result
25. Integration TypeScript Result
26. Lint Result
27. Build Result
28. Drizzle Check Result
29. Runtime Audit Exact Result
30. Development Audit Exact Result
31. Diff Integrity Result
32. Architecture Integrity Review
33. Remaining Risks
34. Architecture Changes
35. Status

Status must be one of:

- `Ready for review.`
- `Blocked pending architecture decision.`

Stop after Task 3.14.5-R3.
