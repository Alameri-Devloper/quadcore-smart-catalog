# Task 3.14.7-R3 — Final Audit Snapshot Alignment

This is a report-only evidence correction.

Do not modify TypeScript, tests, dependencies, migrations, schema, workflows, architecture, or Task 3.14.8.

## 1. Read current evidence

Run exactly once before editing:

```powershell
npm.cmd audit --omit=dev
npm.cmd audit
```

Record the exact current totals.

The submitted bundle currently shows:

```text
Runtime audit:
3 high

Full audit:
16 total
4 moderate
12 high
```

## 2. Update the Final Report

Update only:

```text
docs/05-Development/Reports/Task-3.14.7-R3-Final-Report.md
```

Correct only these sections:

```text
20. Development Audit Evidence
36. Remaining Risks
```

Section 20 must state the exact full-audit result from the immediately preceding command.

For the submitted evidence snapshot, the correct wording is equivalent to:

```text
npm.cmd audit executed without a skip and exited 1 because it found
16 vulnerabilities: 4 moderate and 12 high.

The findings include brace-expansion and related ESLint dependency chains,
development esbuild through Drizzle tooling, Next.js, PostCSS, and nested Sharp.

No npm audit fix or npm audit fix --force was run.
```

Section 36 must state:

```text
Runtime baseline:
3 high

Full-tree baseline:
16 total
4 moderate
12 high
```

Do not state that the npm endpoint was unavailable.

## 3. Regenerate once

Preserve historical successful bundles.

Archive only an incomplete active output directory when necessary.

Use database URLs only through the transient process environment.

Run exactly once:

```powershell
npm.cmd run review:bundle -- --task=3.14.7-R3 --report=docs/05-Development/Reports/Task-3.14.7-R3-Final-Report.md
```

Do not retry automatically.

## 4. Verify

Read the newly generated manifest and audit evidence from the actual output path.

Required:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

Also prove that:

```text
Final Report runtime count = bundled runtime audit count
Final Report full count = bundled full audit count
Final Report severity split = bundled full audit severity split
```

If the audit snapshot changes during the bundle run, stop and report the exact difference. Do not modify implementation.

## 5. Scope protection

Do not:

- run `npm audit fix`,
- run `npm audit fix --force`,
- modify dependencies,
- modify code or tests,
- modify migrations,
- create a new implementation revision,
- stage,
- commit,
- push,
- merge,
- begin Task 3.14.8.

Stop after creating the corrected Final Report, ZIP, and detached SHA-256.
