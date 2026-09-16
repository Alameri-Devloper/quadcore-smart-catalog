# QSC Conventions and Boundaries

## Language and naming
- Source code is English only. Authoritative project documentation is English + Arabic with equivalent meaning.
- Components: PascalCase; functions/variables: camelCase; folders: lowercase.
- Keep changes small, focused, and within the requested issue. Do not rename folders or add libraries without approval.
- Mock data belongs in `mock` folders; shared cross-cutting code belongs in `shared`; domain-specific code belongs in `domains`.

## Layer ownership
- Domain: aggregates, entities/value objects, invariants, lifecycle, policies; no persistence concerns.
- Application: focused use cases, authorization, orchestration, typed outcomes, transaction/UoW ownership. Avoid God services and generic cross-domain Operations/BFF authority.
- Infrastructure: repository implementations, Drizzle/PostgreSQL, HTTP/provider/browser adapters, runtime composition.
- Presentation: typed clients, coordinators, reducers/state, React rendering and interaction. React delegates; it does not own Product, pricing, listing, Inventory, sharing, permission, or tenant rules.
- `app/` routes/pages are composition edges. Route Handlers parse/validate transport input, resolve trusted context, invoke Application, and serialize/map safe typed results.
- Components must not import repositories, Domain entities as client authority, server runtimes, or direct database code.

## Persistence and transactions
- Repository contracts are persistence-agnostic and Workspace-scoped; return canonical aggregates/typed outcomes rather than ORM models or persistence DTOs.
- Repositories do not call other repositories. Application composes repositories through focused ports.
- Application-owned Unit of Work controls each PostgreSQL transaction; transaction-scoped repositories share the same Drizzle transaction handle. Expected conflicts are typed outcomes with explicit rollback semantics; unexpected failures propagate and roll back.
- Product persistence uses optimistic Revision checks and Workspace-wide canonical Product Code uniqueness. Do not move event dispatch/persistence into repositories.

## Security and tenancy
- `TrustedActorContext`, resolved server-side, is the only authority for Workspace, actor, role, permissions, and Branch scope.
- Browser body/query/route/header identifiers are untrusted requested input, never authority. Revalidate Workspace ownership, scope, resource state, and mutation permission server-side.
- Foreign/out-of-scope resources use non-disclosing typed not-found/error outcomes. React visibility and server-projected `allowedActions` are usability hints, not authorization guarantees.
- Never record credentials, passwords, recovery contacts, session keys, environment contents, database URLs, or temporary QA identities in docs, reports, evidence, or Serena memories.

## Presentation contract
- Mobile First while tablet and desktop remain first-class. English/LTR and Arabic/RTL are required.
- Every workflow must work with touch, mouse, and keyboard. Use semantic controls, visible focus, accessible names/status, appropriate live regions, disabled/busy duplicate-submit protection, and touch-friendly targets.
- Operations composition remains Domain-aligned: Identity owns capability projection; Workspace Branch Presentation owns route coordination/Branch selection; Catalog Query owns Product selection; Catalog Branch Product owns Listing/Pricing; Inventory owns Inventory workflows.
- Typed browser clients use bounded allow-listed DTOs, strict envelope/field validation, same-origin credentials, no-store requests where specified, injected fetch ports, and normalized failures.
- Presentation URL/state may represent allow-listed selection context only; it must not serialize actor/workspace/role/permissions/revisions as authority.

## Stable domain relationships
- Product belongs to Product Model; Product Model to Category; Category to Department; Department to Workspace; Workspace to Company.
- Public catalog communication uses the store WhatsApp number. Employee catalog uses employee WhatsApp with store-number fallback when absent.
