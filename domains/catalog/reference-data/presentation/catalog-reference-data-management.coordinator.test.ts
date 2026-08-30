import assert from "node:assert/strict";
import test from "node:test";
import { categoriesForDepartment, dirtyRegistryValues, loadCatalogReferenceAccess, mergeRegistryAvailability, productTypesForCategory, resolveCatalogReferenceSection, templateHasInactiveEntries, templateMutationInput } from "./catalog-reference-data-management.coordinator";
import type { CatalogReferenceManagementSnapshot } from "./catalog-reference-data-management.types";

const empty: CatalogReferenceManagementSnapshot = { departments: [], categories: [], productTypes: [], brands: [], supplyStatuses: [], deviceClasses: [], conditions: [], conditionRegistry: [], currencies: [], currencyRegistry: [], specificationDefinitions: [], specificationTemplates: [] };

test("management mode is established only by successful inactive-inclusive read", async () => {
  const calls: boolean[] = []; const result = await loadCatalogReferenceAccess({ load: async (value) => { calls.push(value); return { ok: true as const, value: empty }; } });
  assert.equal(result.ok && result.value.type, "Management"); assert.deepEqual(calls, [true]);
});

test("view-only mode follows only a management Forbidden then active success", async () => {
  const calls: boolean[] = []; const result = await loadCatalogReferenceAccess({ load: async (value) => { calls.push(value); return value ? { ok: false as const, kind: "Forbidden" as const } : { ok: true as const, value: empty }; } });
  assert.equal(result.ok && result.value.type, "ReadOnly"); assert.deepEqual(calls, [true, false]);
});

test("restricted, expired, unavailable, and Origin failures never trigger read fallback", async () => {
  for (const kind of ["ForbiddenForRestrictedSession", "AuthenticationRequired", "CatalogReferenceDataServiceUnavailable", "OriginNotAllowed"] as const) {
    let calls = 0; const result = await loadCatalogReferenceAccess({ load: async () => { calls += 1; return { ok: false as const, kind }; } });
    assert.deepEqual(result, { ok: false, kind }); assert.equal(calls, 1);
  }
});

test("a second Forbidden remains fully forbidden", async () => {
  let calls = 0; const result = await loadCatalogReferenceAccess({ load: async () => { calls += 1; return { ok: false as const, kind: "Forbidden" }; } });
  assert.deepEqual(result, { ok: false, kind: "Forbidden" }); assert.equal(calls, 2);
});

test("section query is an exact allowlist with safe hierarchy fallback", () => {
  assert.equal(resolveCatalogReferenceSection(["brands"]), "brands"); assert.equal(resolveCatalogReferenceSection(["../../admin"]), "hierarchy"); assert.equal(resolveCatalogReferenceSection(["brands", "currencies"]), "hierarchy"); assert.equal(resolveCatalogReferenceSection([]), "hierarchy");
});

test("hierarchy filtering keeps Department to Category to Product Type only", () => {
  const snapshot = { ...empty, categories: [{ id: "c1", departmentId: "d1" }, { id: "c2", departmentId: "d2" }] as never, productTypes: [{ id: "p1", categoryId: "c1" }, { id: "p2", categoryId: "c2" }] as never };
  assert.deepEqual(categoriesForDepartment(snapshot, "d1").map(({ id }) => id), ["c1"]); assert.deepEqual(productTypesForCategory(snapshot, "c1").map(({ id }) => id), ["p1"]);
});

test("fixed registry merge does not permit arbitrary records", () => {
  const merged = mergeRegistryAvailability([{ code: "new" }, { code: "used" }], [{ code: "new", enabled: true, sortOrder: 4 }, { code: "custom", enabled: true, sortOrder: 5 }]);
  assert.deepEqual(merged, [{ code: "new", enabled: true, sortOrder: 4, configured: true }, { code: "used", enabled: false, sortOrder: 1, configured: false }]);
});

test("dirty registry extraction sends only changed codes", () => {
  const draft = new Map([["new", { code: "new", enabled: true, sortOrder: 0 }], ["used", { code: "used", enabled: false, sortOrder: 1 }]]);
  assert.deepEqual(dirtyRegistryValues(draft, new Set(["used"])), [{ code: "used", enabled: false, sortOrder: 1 }]);
});

test("inactive or missing template Definitions block a newly valid save", () => {
  const entries = [{ specificationDefinitionId: "inactive", sortOrder: 0, required: false }];
  const definitions = [{ id: "inactive", status: "Inactive" }, { id: "active", status: "Active" }] as never;
  assert.equal(templateHasInactiveEntries(entries, definitions), true); assert.equal(templateHasInactiveEntries([{ ...entries[0], specificationDefinitionId: "active" }], definitions), false);
});

test("empty template creation is valid and omits version", () => assert.deepEqual(templateMutationInput([], null), { entries: [] }));
test("existing template update carries the reviewed expectedVersion", () => assert.deepEqual(templateMutationInput([], 8), { entries: [], expectedVersion: 8 }));
