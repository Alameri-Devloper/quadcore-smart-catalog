# DEV-002 — GitHub CI Quality Gate

**Project:** Quadcore Smart Catalog — QSC
**Task Type:** Development infrastructure and automated quality enforcement
**Architecture:** Preserve the existing DDD, Clean Architecture, Modular Monolith, and Multi-Tenant-ready structure
**Implementation Language:** TypeScript for helper scripts; GitHub Actions workflow configuration is YAML
**Documentation:** English and Arabic
**Target Branch:** `chore/github-ci-quality-gate`
**Base Branch:** `feature/product-entry-engine`

Do not begin Task 3.14.7.

Do not modify Product Domain behavior, Smart Save behavior, Product Media architecture, UI, database schema, or existing committed migrations.

Do not stage, commit, push, merge, configure production deployment, or change GitHub repository settings automatically.

---

# 1. Objective

Create an independent GitHub Actions quality gate for every relevant push and pull request.

The workflow must prove in a clean Ubuntu environment that the project:

1. installs dependencies deterministically,
2. passes TypeScript validation,
3. passes lint,
4. passes unit tests,
5. builds successfully,
6. validates Drizzle migration metadata,
7. applies the committed PostgreSQL migrations to a clean database,
8. passes PostgreSQL integration tests,
9. records dependency audit findings without blocking the workflow against the currently accepted baseline.

The workflow must not replace the local DEV-001 Automated Task Review Bundle.

---

# 2. Workflow File

Create:

```text
.github/workflows/quality-gate.yml
```

Use one workflow with exactly two blocking jobs:

```text
Quality
PostgreSQL Integration
```

Recommended job identifiers:

```text
quality
postgresql-integration
```

Keep the design simple. Do not split the workflow into unnecessary jobs.

---

# 3. Triggers

Run the workflow for:

```text
push:
  main
  feature/product-entry-engine

pull_request:
  main
  feature/product-entry-engine

workflow_dispatch:
```

Do not add path filters.

Add concurrency cancellation so a newer run for the same workflow and Git reference cancels the older run.

---

# 4. Permissions

Apply least privilege at workflow level:

```text
contents: read
```

Do not grant write permissions.

The workflow must not:

- commit,
- push,
- merge,
- publish a package,
- create a release,
- deploy,
- modify repository settings,
- use production secrets.

---

# 5. Node.js Version Contract

Inspect the existing repository before changing Node.js configuration.

Rules:

- use one explicitly pinned Node.js LTS version supported by the current project dependencies,
- preserve an existing authoritative Node version declaration when present,
- if no authoritative declaration exists, add exactly one source such as `.nvmrc`,
- do not create conflicting Node version declarations,
- configure GitHub Actions to consume the repository-owned version declaration,
- document the exact selected version and the compatibility rationale in the final report.

Do not select an unpinned floating `latest` version.

---

# 6. Dependency Installation

Both jobs must use:

```text
npm ci
```

Do not use:

```text
npm install
```

Enable npm dependency caching through the official Node setup action.

Do not modify `package-lock.json` unless a repository-owned configuration change genuinely requires it.

---

# 7. Quality Job

The `Quality` job must run on Ubuntu and execute the existing project commands for:

```text
npm ci
TypeScript validation
Lint
Unit tests
Next.js production build
Drizzle metadata check
Runtime dependency audit
Full dependency audit
```

Reuse the existing repository scripts and commands wherever possible.

Expected blocking checks:

```text
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run db:check
```

Use the existing Windows `.cmd` form only in local documentation. GitHub Actions on Ubuntu must use platform-neutral commands.

## Audit policy

Run:

```text
npm audit --omit=dev
npm audit
```

Both audit steps are non-blocking for DEV-002 because the current dependency-risk baseline has already been accepted temporarily.

Requirements:

- the audit output must remain visible in the workflow log,
- the steps must be clearly named as non-blocking baseline observations,
- do not suppress output,
- do not use `npm audit fix`,
- do not use `npm audit fix --force`,
- do not introduce dependency overrides or downgrades as part of this task.

A future `SEC-001` task will implement a baseline-aware blocking security gate.

---

# 8. PostgreSQL Integration Job

The `PostgreSQL Integration` job must run on Ubuntu with an ephemeral PostgreSQL 17 service.

Use test-only credentials and databases:

```text
Application migration database: qsc_ci
Integration test database: qsc_ci_test
```

Use loopback connectivity, for example:

```text
127.0.0.1
```

The workflow must not use a real customer, development, staging, or production database.

Required sequence:

1. start PostgreSQL with a health check,
2. install dependencies using `npm ci`,
3. create both CI databases explicitly,
4. set `DATABASE_URL` for `qsc_ci`,
5. set `TEST_DATABASE_URL` for `qsc_ci_test`,
6. run integration TypeScript validation,
7. apply all committed migrations to the clean application database using the repository-approved migration mechanism,
8. run the PostgreSQL integration test suite,
9. leave database cleanup to the ephemeral GitHub service lifecycle.

Expected commands include the existing equivalents of:

```text
npx tsc --project tsconfig.integration.json
npm run test:integration
```

Do not use schema synchronization as a substitute for committed migrations.

In particular, do not replace migration execution with an unsafe development-only database push command.

---

# 9. Database Safety

Preserve the existing database safety guard.

The workflow must prove that:

- `DATABASE_URL` and `TEST_DATABASE_URL` refer to different database names,
- both database names are explicitly CI/test-oriented,
- both targets are loopback/local service targets,
- no destructive command can reach an external database,
- no database URL is printed with credentials exposed.

Do not weaken the safety guard to make CI pass.

---

# 10. Drizzle Migration Integrity

DEV-002 must not change the database schema or rewrite migrations.

The workflow must validate the existing migration chain, currently including:

```text
0000 product persistence foundation
0001 product archive reason
```

The integration job must apply the migration chain to a clean database.

The Quality job must run the repository's Drizzle metadata validation command.

Do not generate a new migration for DEV-002.

---

# 11. Local and CI Command Separation

Local Windows documentation may use:

```powershell
npm.cmd
npx.cmd
```

GitHub Actions must use:

```text
npm
npx
```

Do not add OS-specific shell commands to the shared package scripts when a platform-neutral alternative exists.

Any new helper script must be implemented in TypeScript.

Do not add JavaScript helper files.

---

# 12. Review Bundle Separation

Do not run:

```text
review:bundle
```

inside GitHub Actions.

The responsibilities remain separate:

```text
DEV-001 review bundle
→ task handoff, source evidence, integrity verification

DEV-002 GitHub CI
→ independent clean-environment push and pull-request validation
```

The DEV-002 task itself must still produce a local DEV-001 review bundle at the end.

---

# 13. GitHub Repository Settings

Do not attempt to modify GitHub branch protection from code or automation.

Create bilingual documentation describing the manual post-merge settings:

```text
Require status check: Quality
Require status check: PostgreSQL Integration
Block force pushes on protected branches
```

Do not require another reviewer while the project has only one active developer.

Document that reviewer requirements should be enabled when another developer joins.

---

# 14. Documentation

Create or update bilingual English/Arabic documentation under the existing project documentation structure.

At minimum document:

- purpose of the CI quality gate,
- workflow triggers,
- blocking jobs,
- local versus CI command syntax,
- PostgreSQL service behavior,
- database safety,
- non-blocking audit policy,
- manual branch protection steps,
- known limitations,
- future Windows/Ubuntu media compatibility matrix after Task 3.14.7,
- future `SEC-001` baseline-aware audit gate,
- future `DEV-003` architecture dependency guard.

Follow the existing documentation index structure and update relevant README/index files.

---

# 15. Tests and Validation

No Product Domain tests should need behavioral changes.

Add focused tests only when a new TypeScript helper or configuration parser is introduced.

Before generating the review bundle, run locally:

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
git diff --name-status
git diff --stat
npm.cmd audit --omit=dev
npm.cmd audit
```

Also validate the workflow syntax and inspect it manually for:

- correct triggers,
- read-only permissions,
- concurrency cancellation,
- deterministic dependency installation,
- explicit Node version,
- PostgreSQL health check,
- separate databases,
- no production secrets,
- non-blocking audits only,
- no accidental deployment or write actions.

Do not claim that GitHub-hosted execution passed unless an actual GitHub Actions run exists.

Local validation of the YAML is not equivalent to a hosted workflow run. State this distinction explicitly in the final report.

---

# 16. Scope Exclusions

Do not implement:

- Task 3.14.7 media storage,
- Windows media test matrix,
- image processing dependencies,
- `sharp`,
- Product Entry UI,
- deployment,
- Docker image publishing,
- package publishing,
- release automation,
- CodeQL,
- Dependabot configuration,
- architecture dependency enforcement,
- security-baseline comparison,
- automatic branch-protection configuration,
- cloud database integration,
- production secrets,
- performance benchmarking.

---

# 17. Acceptance Criteria

DEV-002 is accepted only when:

1. `.github/workflows/quality-gate.yml` exists,
2. the workflow has exactly two blocking jobs,
3. both jobs use Ubuntu,
4. dependencies are installed with `npm ci`,
5. Node.js is explicitly pinned through one repository-owned declaration,
6. Quality runs TypeScript, lint, unit tests, build, and Drizzle check,
7. PostgreSQL Integration uses an ephemeral PostgreSQL 17 service,
8. both CI databases are created explicitly and remain separate,
9. committed migrations are applied to a clean database,
10. integration TypeScript and PostgreSQL tests run,
11. audit findings are visible but non-blocking,
12. workflow permissions are read-only,
13. concurrency cancellation is enabled,
14. no path filters are present,
15. no production secrets or external databases are used,
16. no review bundle runs inside GitHub Actions,
17. bilingual documentation is complete,
18. no Product, Smart Save, media, UI, or schema behavior changes,
19. all local verification commands pass,
20. the DEV-001 review bundle reports `ReadyForReview`,
21. no Git commit is created.

---

# 18. Required Final Report

Create:

```text
docs/05-Development/Reports/DEV-002-Final-Report.md
```

Return exactly these sections:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Workflow Name
6. Trigger Policy
7. Permission Policy
8. Concurrency Policy
9. Node Version Contract
10. Dependency Installation
11. Quality Job
12. PostgreSQL Integration Job
13. PostgreSQL Service Configuration
14. Database Creation
15. Database Safety
16. Migration Execution
17. Drizzle Integrity
18. Unit Test Result
19. PostgreSQL Integration Test Result
20. TypeScript Result
21. Integration TypeScript Result
22. Lint Result
23. Build Result
24. Runtime Audit Result
25. Development Audit Result
26. Audit Blocking Policy
27. Review Bundle Separation
28. Branch Protection Documentation
29. Hosted Workflow Validation Status
30. Local Workflow Validation
31. Architecture Integrity Review
32. Scope Exclusion Review
33. Remaining Risks
34. Architecture Changes
35. Status

`Hosted Workflow Validation Status` must state one of:

```text
Not executed yet; requires push or pull request after review.
Executed successfully with GitHub Actions run evidence.
Executed with failure; details documented.
```

`Status` must be one of:

```text
Ready for review.
Blocked pending architecture decision.
```

---

# 19. Review Bundle

Generate:

```powershell
npm.cmd run review:bundle -- --task=DEV-002 --report=docs/05-Development/Reports/DEV-002-Final-Report.md
```

Export the generated ZIP and detached `.sha256` to Desktop.

The bundle must report:

```text
overallStatus: ReadyForReview
```

Do not stage, commit, push, or merge.

Stop after DEV-002.
