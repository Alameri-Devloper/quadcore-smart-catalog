# QSC Platform Agent Instructions

## Project Name

QSC Platform - Quadcore Smart Catalog

## Role

You are an implementation engineer working under the project architecture.

Do not change the architecture unless explicitly requested.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase later

## Architecture Rules

- Follow Domain Driven Design.
- Follow Clean Architecture.
- Use TypeScript only.
- Code language must be English.
- Documentation must be English + Arabic.
- Responsive First: Mobile, Tablet, and Desktop are equally first-class.
- Functional QA must verify touch, mouse, and keyboard interaction.
- Multi-Tenant from day one.
- No hardcoded business logic.
- Do not call database directly inside components.
- Business logic belongs to services.
- Data access belongs to repositories.
- Mock data belongs to mock folder.

## Project Structure

app/
domains/
shared/
docs/
public/

## Catalog Domain Structure

domains/catalog/
+-- components/
+-- hooks/
+-- mock/
+-- repositories/
+-- schemas/
+-- services/
+-- types/
\-- utils/

## Current Rules

- Product belongs to Product Model.
- Product Model belongs to Category.
- Category belongs to Department.
- Department belongs to Workspace.
- Workspace belongs to Company.
- WhatsApp public catalog uses store number.
- Employee catalog uses employee WhatsApp number.
- If employee WhatsApp is missing, fallback to store WhatsApp.

## Important

Before modifying code:

1. Read docs.
2. Preserve current architecture.
3. Fix only the requested issue.
4. Do not rename folders unless requested.
5. Do not introduce new libraries without approval.

## Root Cause Analysis

Before fixing any bug:

1. Reproduce the issue.
2. Identify the root cause.
3. Explain the root cause.
4. Apply the smallest safe fix.
5. Verify that the architecture is still respected.

Never apply blind fixes.

## Mandatory Task Report

After every implementation task, always produce a report before stopping.

The report must contain:

### Files Created

### Files Modified

### Files Deleted

### Architecture Changes

### Summary

### Next Recommendation

Then wait for review.

Never continue to another task automatically.

## Approved Task Completion

After every approved implementation task:

1. Write the exact final report to `docs/05-Development/Reports/`.
2. Run all task-required verification commands.
3. Generate the automated review bundle.
4. Preserve exact source files and sanitize evidence only.
5. Never include credentials or real environment files.
6. Never stage, commit, push, merge, or delete files automatically.
7. Report the repository-local and exported ZIP paths.
8. Stop for review.

The review tool may clean temporary artifacts created by its own failed invocation. It must never delete project source, user data, prior review evidence, or Git content.

## Tool Selection Policy

Do not run every tool for every task.

### Tool Selection Order

- Known literal/key/route/file -> rg.
- Semantic symbol/reference -> Serena when available.
- Dependency/architecture relationship -> Graphify.
- JSON/API structured output -> jq.
- Repeatable API scenario -> bru.
- PR/CI/GitHub state -> gh.

### Serena

- When available, use for semantic symbol navigation, references, implementations, callers, and bounded code understanding.
- Do not use for simple known-literal searches when rg is sufficient.
- Never modify `.serena/project.yml` unless explicitly requested.

### rg

- Use for known literals, exact symbols, permission keys, routes, filenames, errors, and bounded directory searches.
- Respect `.gitignore` and avoid unrelated or generated directories.

### Graphify

- Use for cross-module dependencies, caller/callee relationships, architecture exploration, and graph questions.
- Prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, and `graphify explain "<concept>"`.
- Do not use Graphify for simple searches that rg can answer.
- Use `graphify-out/wiki/index.md` for broad navigation when useful.
- Read `graphify-out/GRAPH_REPORT.md` only when scoped Graphify commands are insufficient.
- Run `graphify update .` after code changes when required.
- When the user explicitly types `/graphify`, use the installed Graphify workflow/instructions before other codebase-discovery tools unless the user explicitly asks otherwise.
- Dirty files under `graphify-out/` are expected after hooks or incremental graph updates and are not, by themselves, a reason to skip Graphify.
- `graphify update .` is AST-only and has no API cost.

### jq

- Use for focused JSON, API, and structured-output inspection.
- Extract only needed fields.
- Never expose secrets.

### Bruno / bru

- Bruno Desktop and the bru CLI are available.
- Use for repeatable API reproduction and relevant API regression scenarios.
- Do not create large collections without task justification.
- Keep API tests aligned with existing server contracts.
- Never commit secrets.

### gh

- GitHub CLI is installed and authenticated.
- Use for PR status, CI checks, repository metadata, and GitHub operations when relevant.
- Never push, create a PR, merge, close, or otherwise mutate GitHub state without explicit authorization.
- Never expose credentials.

### Verification Efficiency

- Run targeted tests before broader regression suites.
- Run full suites only when the task's completion gate requires them.

## Windows Execution Fallbacks

- On Windows, if the PowerShell `bru` shim is blocked, use `bru.cmd`.
- If `jq` is installed but execution is denied by the active agent sandbox, use native PowerShell JSON tooling such as `ConvertFrom-Json` / `ConvertTo-Json` instead of repeatedly retrying.
- If `gh` authentication works in the user's Windows terminal but is unavailable inside the active agent sandbox, do not modify, export, replace, or expose GitHub credentials. Report the limitation and leave GitHub mutation operations for an authorized environment.
