# Suggested Commands (Windows / npm)

## Daily development
- `npm run dev` — Next.js development server.
- `npm run build` — production build.
- `npm run start` — run the production build.
- `npm run lint` — ESLint.
- `npx tsc --noEmit` — strict project typecheck.
- `npm test` — broad safe non-PostgreSQL suite defined in `package.json`.

## Focused tests
- `npm run test:task-review`
- `npm run test:product-media`
- `npm run test:product-entry`
- `npm run test:reference-data`
- `npm run test:identity`
- `npm run test:branch`
- `npm run test:inventory`
- `npm run test:pricing`
- `npm run test:catalog-query`
- `npm run test:catalog-presentation`
- `npm run test:direct-sharing`

## Database-sensitive commands
- `npm run test:integration` compiles, prepares, and runs serial PostgreSQL integration tests. Run only with explicit authorization and a verified disposable test database; never production.
- `npm run db:generate`, `npm run db:check`, `npm run db:migrate` are Drizzle operations. Migration/database writes require task scope and approval.
- `npm run workspace:bootstrap` and `npm run owner:reset-password` are operational Identity commands; never run during ordinary verification or store their inputs/results in memories.

## Review and Git inspection
- `npm run review:bundle` — existing automated task-review bundle workflow after required verification.
- `git status --short --branch` — inspect branch/worktree.
- `git diff --check` — whitespace validation.
- `git diff --name-only` and `git diff --stat` — review tracked changes.
- Never stage, commit, push, merge, reset, restore, stash, switch branches, or delete files automatically.

## Project discovery and Serena
- Prefer `rg --files` and `rg -n '<pattern>' <paths>` for targeted Windows-friendly repository searches when symbolic Serena retrieval is not applicable.
- Serena memory reference validation: `serena memories check` from the repository root (CLI capability; use when available).
- Repository rule for ordinary codebase work: use scoped Graphify query/path/explain first when `graphify-out/graph.json` exists, unless the user explicitly disables Graphify; after code modification run `graphify update .`.
