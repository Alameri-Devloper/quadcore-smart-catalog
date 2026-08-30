import assert from "node:assert/strict";
import test from "node:test";
import { CatalogReferenceDataManagementClient, reconstructCatalogReferenceSnapshot } from "./catalog-reference-data-management.client";

const record = (extra: Record<string, unknown> = {}) => ({ workspaceId: "ws-secret", id: "id-1", code: "phones", displayName: "Phones", status: "Active", sortOrder: 1, version: 2, createdAt: "2026-01-01", updatedAt: "2026-01-02", ...extra });
const rawSnapshot = () => ({
  departments: [record()], categories: [record({ id: "cat-1", departmentId: "id-1" })], productTypes: [record({ id: "type-1", categoryId: "cat-1" })],
  brands: [record({ id: "brand-1" })], supplyStatuses: [], deviceClasses: [{ code: "personal", labels: { en: "Personal", ar: "شخصي" } }],
  conditions: [{ workspaceId: "ws-secret", code: "new", enabled: true, sortOrder: 0 }], conditionRegistry: [{ code: "new", labels: { en: "New", ar: "جديد" } }],
  currencies: [{ workspaceId: "ws-secret", code: "YER", enabled: true, sortOrder: 0 }], currencyRegistry: [{ code: "YER", minorUnitDigits: 2 }, { code: "XAU", minorUnitDigits: null }],
  specificationDefinitions: [record({ id: "def-1", valueType: "Text", unit: null })],
  specificationTemplates: [{ workspaceId: "ws-secret", id: "template-1", productTypeId: "type-1", version: 3, entries: [{ specificationDefinitionId: "def-1", sortOrder: 0, required: true }] }],
});
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
const success = (value: unknown) => response({ type: "Success", value });

test("strict snapshot reconstruction keeps UI fields and drops Workspace metadata", () => {
  const parsed = reconstructCatalogReferenceSnapshot(rawSnapshot());
  assert.ok(parsed); assert.deepEqual(parsed.departments[0], { id: "id-1", code: "phones", displayName: "Phones", status: "Active", sortOrder: 1, version: 2 });
  assert.equal("workspaceId" in parsed.departments[0], false); assert.equal(parsed.currencyRegistry[1].minorUnitDigits, null);
});

test("strict snapshot reconstruction rejects missing aggregate arrays", () => {
  const malformed = rawSnapshot() as Record<string, unknown>; delete malformed.brands;
  assert.equal(reconstructCatalogReferenceSnapshot(malformed), null);
});

test("management read uses only the exact includeInactive query", async () => {
  let request = ""; const client = new CatalogReferenceDataManagementClient(async (input) => { request = String(input); return success(rawSnapshot()); });
  assert.equal((await client.load(true)).ok, true); assert.equal(request, "/api/catalog/reference-data?includeInactive=true");
});

test("active read uses the base endpoint", async () => {
  let request = ""; const client = new CatalogReferenceDataManagementClient(async (input) => { request = String(input); return success(rawSnapshot()); });
  assert.equal((await client.load(false)).ok, true); assert.equal(request, "/api/catalog/reference-data");
});

test("HTTP failures retain each safe server outcome", async (context) => {
  for (const [kind, status] of [["InvalidInput", 400], ["AuthenticationRequired", 401], ["Forbidden", 403], ["ForbiddenForRestrictedSession", 403], ["OriginNotAllowed", 403], ["NotFound", 404], ["Conflict", 409], ["CatalogReferenceDataServiceUnavailable", 503]] as const) {
    await context.test(kind, async () => {
      const client = new CatalogReferenceDataManagementClient(async () => response({ type: kind }, status));
      assert.deepEqual(await client.load(true), { ok: false, kind });
    });
  }
});

test("network and malformed responses become Unavailable without fallback data", async () => {
  const network = new CatalogReferenceDataManagementClient(async () => { throw new Error("offline"); });
  const malformed = new CatalogReferenceDataManagementClient(async () => response({ type: "Success", value: { brands: [] } }));
  assert.deepEqual(await network.load(false), { ok: false, kind: "Unavailable" });
  assert.deepEqual(await malformed.load(false), { ok: false, kind: "Unavailable" });
});

test("Department create uses the exact allow-listed DTO", async () => {
  let capture: RequestInit | undefined; const client = new CatalogReferenceDataManagementClient(async (_input, init) => { capture = init; return success(record()); });
  await client.create("departments", { code: " Mobile ", displayName: "هواتف", sortOrder: 4 });
  assert.equal(capture?.method, "POST"); assert.deepEqual(JSON.parse(String(capture?.body)), { code: " Mobile ", displayName: "هواتف", sortOrder: 4 });
});

test("Category create sends its selected parent and no authority", async () => {
  let path = ""; let body: Record<string, unknown> = {}; const client = new CatalogReferenceDataManagementClient(async (input, init) => { path = String(input); body = JSON.parse(String(init?.body)); return success(record({ departmentId: "dep-1" })); });
  await client.create("categories", { code: "smartphones", displayName: "Smartphones", sortOrder: 1, departmentId: "dep-1" });
  assert.equal(path, "/api/catalog/reference-data/categories"); assert.equal(body.departmentId, "dep-1"); assert.equal(body.workspaceId, undefined); assert.equal(body.actorId, undefined); assert.equal(body.permissions, undefined);
});

test("Product Type create sends its selected Category", async () => {
  let body: Record<string, unknown> = {}; const client = new CatalogReferenceDataManagementClient(async (_input, init) => { body = JSON.parse(String(init?.body)); return success(record({ categoryId: "cat-1" })); });
  await client.create("product-types", { code: "android", displayName: "Android", sortOrder: 1, categoryId: "cat-1" }); assert.equal(body.categoryId, "cat-1");
});

test("Brand and Supply Status use independent exact routes", async () => {
  const paths: string[] = []; const client = new CatalogReferenceDataManagementClient(async (input) => { paths.push(String(input)); return success(record()); });
  await client.create("brands", { code: "acme", displayName: "Acme", sortOrder: 1 }); await client.create("supply-statuses", { code: "local", displayName: "Local", sortOrder: 2 });
  assert.deepEqual(paths, ["/api/catalog/reference-data/brands", "/api/catalog/reference-data/supply-statuses"]);
});

test("dynamic update sends expectedVersion and never sends code or parent", async () => {
  let body: Record<string, unknown> = {}; const client = new CatalogReferenceDataManagementClient(async (_input, init) => { body = JSON.parse(String(init?.body)); return success(record({ departmentId: "dep-1" })); });
  await client.update("categories", "cat/1", { expectedVersion: 7, displayName: "New", sortOrder: 3, status: "Inactive" });
  assert.deepEqual(body, { expectedVersion: 7, displayName: "New", sortOrder: 3, status: "Inactive" }); assert.equal((body as Record<string, unknown>).code, undefined); assert.equal((body as Record<string, unknown>).departmentId, undefined);
});

test("Specification Definition create and update use only the three-value contract fields", async () => {
  const bodies: unknown[] = []; const client = new CatalogReferenceDataManagementClient(async (_input, init) => { bodies.push(JSON.parse(String(init?.body))); return success(record({ valueType: "Number", unit: "GB" })); });
  await client.create("specification-definitions", { code: "ram", displayName: "RAM", sortOrder: 1, valueType: "Number", unit: "GB" });
  await client.update("specification-definitions", "def-1", { expectedVersion: 2, valueType: "Boolean", unit: null });
  assert.deepEqual(bodies[1], { expectedVersion: 2, valueType: "Boolean", unit: null });
});

test("Condition and Currency PUT send only supplied dirty rows", async () => {
  const calls: { path: string; body: unknown }[] = []; const client = new CatalogReferenceDataManagementClient(async (input, init) => { calls.push({ path: String(input), body: JSON.parse(String(init?.body)) }); return success([]); });
  await client.configureConditions([{ code: "used", enabled: true, sortOrder: 2 }]); await client.configureCurrencies([{ code: "YER", enabled: false, sortOrder: 4 }]);
  assert.deepEqual(calls, [{ path: "/api/catalog/reference-data/conditions", body: { values: [{ code: "used", enabled: true, sortOrder: 2 }] } }, { path: "/api/catalog/reference-data/currencies", body: { values: [{ code: "YER", enabled: false, sortOrder: 4 }] } }]);
});

test("template creation omits expectedVersion while update includes it", async () => {
  const bodies: Record<string, unknown>[] = []; const client = new CatalogReferenceDataManagementClient(async (_input, init) => { bodies.push(JSON.parse(String(init?.body))); return success(rawSnapshot().specificationTemplates[0]); });
  const entries = [{ specificationDefinitionId: "def-1", sortOrder: 0, required: true }];
  await client.configureTemplate("type-1", { entries }); await client.configureTemplate("type-1", { entries, expectedVersion: 3 });
  assert.equal(bodies[0].expectedVersion, undefined); assert.equal(bodies[1].expectedVersion, 3);
});
