# QSC Core

## Authority
- Repository: Quadcore Smart Catalog (QSC Platform), a TypeScript SaaS smart-catalog/business platform.
- Documentation precedence: Constitution -> accepted current ADRs -> current Architecture -> Domain/Application docs -> Roadmap/Deferred Decisions -> historical/archive.
- `docs/Architecture.md`, `docs/Vision.md`, and `docs/CHANGELOG.md` are historical/superseded references; use `docs/00-Constitution/**`, `docs/01-Architecture/**`, and `docs/06-Roadmap/Current-Roadmap.md`.
- Architecture changes require explicit prior discussion and documentation.

## Source map
- `app/`: Next.js pages, layouts, and thin Route Handlers/composition.
- `domains/`: bounded contexts and business capabilities: `catalog`, `identity`, `inventory`, `workspace`.
- Catalog submodules include branch-products, media, product-entry, query, reference-data, sharing, repositories/services/types, presentation components, and mocks.
- `shared/`: audit, auth, domain, infrastructure, UI, workflow cross-cutting contracts; no domain-specific business authority.
- `docs/`: bilingual authority, ADRs, implementation contracts, reports, and roadmap.
- `public/`: static assets.

## Durable invariants
- TypeScript-only; DDD; Clean Architecture; Modular Monolith; Multi-Tenant; explicit Domain/Application/Infrastructure/Presentation boundaries.
- Product is the Catalog Aggregate Root. Catalog answers what is sold; Inventory independently answers quantity/location. Workspace owns tenant configuration; Identity owns actors/access.
- All owned data access is Workspace/tenant scoped. Browser identifiers are untrusted; server-resolved `TrustedActorContext` is the only Workspace/actor/role/permission/Branch-scope authority.
- Application owns use-case orchestration, authorization, and transaction coordination; Domain owns business rules; Infrastructure owns persistence/ORM/provider adapters; Presentation renders typed DTOs and coordinates interaction only.
- React and Route Handlers contain no business rules. Components never access databases/repositories. Route Handlers validate transport input, resolve trusted context, call Application, and map typed safe results.
- Repository ports are persistence-agnostic; repositories do not call repositories. PostgreSQL transaction ownership stays in Application through established Unit-of-Work callbacks whose transaction-scoped repositories share one Drizzle transaction.
- No architecture change, new dependency, schema/migration, permission, or persistence boundary without explicit scope and approval.

## Current delivery state (2026-09-14 evidence)
- Tasks 3.14–3.21 and operational remediation A1–A6 are completed/merged per current roadmap.
- Task 3.22 P1 Presentation foundation has `P1CompletionGate: PASS`: shell, strict clients/types, A1 capabilities, URL/coordinator state, General Branch management, A6 Branch selection, and A2 Product selection are implemented.
- P1 stops after Product selection. Independent review and live English/Arabic, LTR/RTL, viewport, touch, mouse, keyboard, focus, and overflow QA remain.
- P2–P8 are unstarted, planned, and separately approval-gated. Roadmap intent is not implementation authority.

## Related memories
- Runtime/tooling and versions: `mem:tech_stack`.
- Architecture, coding, security, and Presentation conventions: `mem:conventions`.
- Supported project commands and safety notes: `mem:suggested_commands`.
- Required implementation completion gates/reporting: `mem:task_completion`.
