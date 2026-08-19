import assert from "node:assert/strict";
import test from "node:test";
import { referenceFailure, referenceSuccess, type CatalogReferenceDataResult } from "../../application/catalog-reference-data-result";
import { AuthenticatedContextUnavailableError, RestrictedSessionContextError, type TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import type { CatalogReferenceDataServerApplication } from "../catalog-reference-data-server-runtime";
import { CatalogReferencePersistenceConflictError } from "../persistence/postgresql-catalog-reference-data-unit-of-work";
import { createCatalogReferenceDataRouteHandlers } from "./catalog-reference-data-route-handlers";

const context: TrustedActorContext = {
  workspaceId: "workspace-a",
  actorId: "actor-a",
  role: "Owner",
  permissions: ["catalog.referenceData.view", "catalog.referenceData.manage"],
  branchScope: { type: "AllBranches" },
  authorizationVersion: 1,
};

type Execute = (command: unknown) => Promise<CatalogReferenceDataResult<unknown>>;

const application = (options: {
  readonly execute?: Execute;
  readonly resolve?: () => Promise<TrustedActorContext>;
  readonly origin?: boolean;
  readonly capture?: (command: unknown) => void;
} = {}): CatalogReferenceDataServerApplication => {
  const execute: Execute = async (command) => {
    options.capture?.(command);
    return options.execute ? options.execute(command) : referenceSuccess({ id: "reference-1", version: 1 });
  };
  const useCase = { execute };
  return {
    context: { resolve: options.resolve ?? (async () => context) },
    origin: { allows: () => options.origin ?? true },
    get: useCase,
    createDepartment: useCase,
    updateDepartment: useCase,
    createCategory: useCase,
    updateCategory: useCase,
    createProductType: useCase,
    updateProductType: useCase,
    createBrand: useCase,
    updateBrand: useCase,
    createSupplyStatus: useCase,
    updateSupplyStatus: useCase,
    createSpecificationDefinition: useCase,
    updateSpecificationDefinition: useCase,
    configureConditions: useCase,
    configureCurrencies: useCase,
    configureTemplate: useCase,
    close: async () => undefined,
  } as unknown as CatalogReferenceDataServerApplication;
};

const body = (response: Response) => response.json() as Promise<Record<string, unknown>>;
const post = (value: unknown) => new Request("http://localhost/api/catalog/reference-data/departments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });

test("unauthenticated and restricted sessions map to safe HTTP authorization responses", async () => {
  const unauthenticated = createCatalogReferenceDataRouteHandlers(() => application({ resolve: async () => { throw new AuthenticatedContextUnavailableError(); } }));
  const restricted = createCatalogReferenceDataRouteHandlers(() => application({ resolve: async () => { throw new RestrictedSessionContextError(); } }));
  assert.equal((await unauthenticated.get(new Request("http://localhost/api/catalog/reference-data"))).status, 401);
  assert.equal((await restricted.get(new Request("http://localhost/api/catalog/reference-data"))).status, 403);
});

test("view and manage permission failures map to 403, including includeInactive", async () => {
  const handlers = createCatalogReferenceDataRouteHandlers(() => application({ execute: async () => referenceFailure("Forbidden") }));
  assert.equal((await handlers.get(new Request("http://localhost/api/catalog/reference-data"))).status, 403);
  assert.equal((await handlers.get(new Request("http://localhost/api/catalog/reference-data?includeInactive=true"))).status, 403);
  assert.equal((await handlers.createDepartment(post({ code: "laptops", displayName: "Laptops", sortOrder: 0 }))).status, 403);
});

test("mutations reject disallowed origins before resolving trusted context", async () => {
  let resolved = false;
  const handlers = createCatalogReferenceDataRouteHandlers(() => application({ origin: false, resolve: async () => { resolved = true; return context; } }));
  const response = await handlers.createDepartment(post({ code: "laptops", displayName: "Laptops", sortOrder: 0 }));
  assert.equal(response.status, 403);
  assert.equal(resolved, false);
});

test("malformed DTOs return 400 without invoking the use case", async () => {
  let invoked = false;
  const handlers = createCatalogReferenceDataRouteHandlers(() => application({ capture: () => { invoked = true; } }));
  const response = await handlers.createDepartment(post({ code: "missing-fields" }));
  assert.equal(response.status, 400);
  assert.equal(invoked, false);
});

test("foreign parents map to 404 and stale updates map to 409", async () => {
  const foreign = createCatalogReferenceDataRouteHandlers(() => application({ execute: async () => referenceFailure("NotFound") }));
  const stale = createCatalogReferenceDataRouteHandlers(() => application({ execute: async () => referenceFailure("Conflict") }));
  assert.equal((await foreign.createCategory(post({ code: "laptops", displayName: "Laptops", sortOrder: 0, departmentId: "foreign" }))).status, 404);
  assert.equal((await stale.updateDepartment(post({ expectedVersion: 1, displayName: "Changed" }), "department-1")).status, 409);
});

test("unique persistence conflicts map to 409", async () => {
  const handlers = createCatalogReferenceDataRouteHandlers(() => application({ execute: async () => { throw new CatalogReferencePersistenceConflictError(); } }));
  const response = await handlers.createDepartment(post({ code: "laptops", displayName: "Laptops", sortOrder: 0 }));
  assert.equal(response.status, 409);
});

test("successful create, update, read, and configuration results preserve status mappings", async () => {
  const commands: unknown[] = [];
  const handlers = createCatalogReferenceDataRouteHandlers(() => application({ capture: (command) => commands.push(command) }));
  const created = await handlers.createDepartment(post({ code: "laptops", displayName: "Laptops", sortOrder: 0 }));
  const updated = await handlers.updateDepartment(post({ expectedVersion: 1, displayName: "Portable Computers" }), "department-1");
  const configured = await handlers.configureCurrencies(post({ values: [{ code: "EUR", enabled: true, sortOrder: 0 }] }));
  const read = await handlers.get(new Request("http://localhost/api/catalog/reference-data"));
  assert.deepEqual([created.status, updated.status, configured.status, read.status], [201, 200, 200, 200]);
  assert.equal((await body(created)).type, "Success");
  assert.equal(commands.length, 4);
});
