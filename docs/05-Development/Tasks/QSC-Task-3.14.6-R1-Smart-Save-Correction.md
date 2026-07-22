# Sprint 03 — Task 3.14.6-R1
## Smart Save Contract and Review Integrity Correction

**Project:** Quadcore Smart Catalog — QSC
**Parent Task:** Task 3.14.6
**Task Type:** Focused correctness, migration naming, and review-integrity correction
**Architecture Status:** No architecture redesign
**Implementation Language:** TypeScript only
**Target Branch:** `feature/smart-save-product`

Do not begin Task 3.14.7.

Do not stage, commit, push, or merge.

Do not modify Product Entry UI or implement physical media storage, Event Bus, Outbox, Branch, Inventory, stock, or quantity.

---

# 1. Objective

Correct the focused findings discovered during review of `QSC-Task-3.14.6-Review.zip`.

The correction must:

1. remove all reported whitespace-integrity failures,
2. make the automated review bundle finish with `ReadyForReview`,
3. correct the final report so it matches the bundle manifest and Git integrity evidence,
4. remove the ignored immutable Catalog identity from update input or reject mismatches explicitly,
5. regenerate the uncommitted migration with a descriptive name,
6. add focused tests,
7. rerun the full review bundle.

---

# 2. Review Integrity Correction

The current bundle manifest reports:

```text
overallStatus = VerificationFailed
gitIntegrity.untracked.passed = false
```

Reported files include trailing whitespace in:

```text
docs/01-Architecture/ADR/ADR-011-Smart-Save-and-Product-Archive-Reason.md
docs/05-Development/Tasks/QSC-Task-3.14.6-Smart-Save-Product.md
```

Required actions:

- remove every reported trailing-whitespace occurrence,
- run all staged, unstaged, and untracked integrity checks,
- ensure the generated bundle manifest reports:
  - `overallStatus: ReadyForReview`,
  - all Git integrity checks passed,
- ensure the final report does not claim diff integrity passed when the manifest says otherwise.

Do not weaken or bypass the DEV-001 integrity gate.

---

# 3. Update Command Catalog Identity

The current `UpdateSmartSaveProductCommand` inherits `catalogId`, but the use case ignores the command value and uses the loaded Product CatalogId.

Silently ignoring an immutable identity field is an invalid Application contract.

Preferred correction:

- `CreateSmartSaveProductCommand` includes `catalogId`,
- `UpdateSmartSaveProductCommand` does not include `catalogId`,
- update uses the CatalogId from the loaded Product Aggregate only.

Alternative accepted only with explicit justification:

- retain update `catalogId`,
- reject the command before mutation when it does not equal the loaded Product CatalogId,
- return a typed result rather than silently ignoring it.

Do not allow Catalog transfer in this task.

Add focused tests proving:

- update cannot change Catalog identity,
- requirements resolution receives the loaded Product CatalogId,
- create still receives explicit CatalogId.

---

# 4. Descriptive Migration Name

The current uncommitted migration is:

```text
drizzle/0001_melted_nehzno.sql
```

This name is not suitable for long-term migration history.

Because the migration is uncommitted and not deployed, regenerate it cleanly using:

```powershell
npm.cmd run db:generate -- --name=product_archive_reason
```

Expected descriptive path equivalent to:

```text
drizzle/0001_product_archive_reason.sql
```

The exact numeric prefix follows Drizzle.

Required actions:

- remove the old uncommitted generated migration and matching metadata safely,
- regenerate from the current schema with the explicit descriptive name,
- update journal and snapshot consistently,
- verify `0000 → 0001` migration,
- verify the prior Archived-row compatibility mapping to `Manual`,
- run `npm.cmd run db:check`.

Do not rewrite committed `0000`.

---

# 5. Focused Tests

Add or update tests covering:

- update command contains no ignored CatalogId,
- requirements resolver receives loaded CatalogId during update,
- create resolver receives command CatalogId,
- Catalog identity remains unchanged after update,
- all lifecycle matrix tests remain passing,
- repository conflicts still return no committed events,
- migration applies cleanly from `0000`,
- existing Archived row migrates to `Manual`,
- all Git integrity checks pass.

---

# 6. Scope Protection

Preserve:

- Smart Save lifecycle matrix,
- ProductArchiveReason,
- trusted WorkspaceContext,
- current requirements resolution,
- optimistic concurrency,
- one repository write per execution,
- post-persistence Domain Event extraction,
- PostgreSQL archive reason constraints,
- Product Entry compatibility,
- provider-neutral persistence.

Do not add unrelated features.

---

# 7. Verification

Run:

```powershell
npx.cmd tsc --noEmit
npx.cmd tsc --project tsconfig.integration.json
npm.cmd run lint
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
npm.cmd run db:check
npm.cmd run review:bundle -- --task=3.14.6-R1 --report=docs/05-Development/Reports/Task-3.14.6-R1-Final-Report.md
git diff --check
git status --short
git diff --name-status
git diff --stat
npm.cmd audit --omit=dev
npm.cmd audit
```

The final ZIP and checksum must be exported to Desktop.

---

# 8. Acceptance Criteria

The correction is accepted only when:

- no trailing-whitespace integrity failure remains,
- bundle status is `ReadyForReview`,
- report and manifest agree,
- update input contains no silently ignored CatalogId,
- Product Catalog identity remains immutable,
- migration name is descriptive,
- migration metadata is consistent,
- all existing and new tests pass,
- TypeScript, lint, build, integration tests, and Drizzle check pass,
- no Product Entry or media work is introduced,
- no Git commit is created.

---

# 9. Required Final Report

Return exactly:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Review Integrity Correction
6. Git Integrity Result
7. Report and Manifest Alignment
8. Create Command Catalog Identity
9. Update Command Catalog Identity
10. Catalog Immutability
11. Requirements Resolver Catalog Scope
12. Migration Rename
13. Migration Metadata
14. Migration Compatibility
15. Lifecycle Matrix Compatibility
16. Domain Event Compatibility
17. Conflict Compatibility
18. Domain Tests
19. Application Tests
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

Stop after Task 3.14.6-R1.
