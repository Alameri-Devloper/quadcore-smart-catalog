# Task Completion

## Before implementation
- Read `AGENTS.md` and relevant authoritative docs; respect the documentation precedence in `mem:core`.
- Reproduce bugs before fixing: identify/explain root cause, apply the smallest safe fix, and verify architecture remains intact.
- Confirm the task is explicitly authorized and scoped. Architecture, dependency, database, migration, permission, and contract changes require prior discussion/approval.

## Verification
- Run focused tests for affected boundaries first.
- Normal broad safe gates when relevant: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check`.
- PostgreSQL integration is a separate gate: run `npm run test:integration` only with explicit authorization and a verified disposable test database; never production.
- Presentation QA must cover representative mobile/tablet/desktop sizes, English LTR and Arabic RTL, and complete touch/mouse/keyboard interaction, including focus, status/error communication, and overflow.
- Review the exact changed files and record any command that could not run. Preserve source byte-exactness when producing evidence; sanitize evidence only.
- For ordinary code modifications, refresh the repository knowledge graph as required by `AGENTS.md`, unless the user explicitly disables Graphify for that task.

## Required handoff for approved implementation tasks
- Write the exact final report under `docs/05-Development/Reports/`.
- Required report sections: `Files Created`, `Files Modified`, `Files Deleted`, `Architecture Changes`, `Summary`, `Next Recommendation`.
- Run all task-required verification, then generate the existing automated review bundle with `npm run review:bundle`.
- Exclude credentials and real environment files. Report repository-local and exported ZIP paths.
- Do not stage, commit, push, merge, reset, restore, stash, switch branches, or delete project/user/prior-review data automatically.
- Stop for independent review; never self-approve or automatically continue to another task.
