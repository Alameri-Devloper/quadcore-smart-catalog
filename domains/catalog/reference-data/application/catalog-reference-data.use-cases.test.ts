import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { CatalogReferenceDataRepository, CatalogReferenceDataSnapshot, CatalogReferenceDataUnitOfWork } from "../ports/catalog-reference-data-unit-of-work.port";
import { CreateCategoryUseCase, GetCatalogReferenceDataUseCase, UpdateDepartmentUseCase } from "./catalog-reference-data.use-cases";

const now = new Date("2026-08-19T10:00:00.000Z");
const record = (id: string, status: "Active" | "Inactive" = "Active") => ({ workspaceId: "workspace-a", id, code: id, displayName: id, status, sortOrder: 0, version: 1, createdAt: now, updatedAt: now });
const emptySnapshot = (): CatalogReferenceDataSnapshot => ({ departments: [], categories: [], productTypes: [], brands: [], supplyStatuses: [], conditions: [], currencies: [], specificationDefinitions: [], specificationTemplates: [] });
const actor = (permissions: readonly string[]): TrustedActorContext => ({ workspaceId: "workspace-a", actorId: "actor-a", role: "Staff", permissions, branchScope: { type: "AllBranches" }, authorizationVersion: 1 });
const unitOfWork = (references: Partial<CatalogReferenceDataRepository>): CatalogReferenceDataUnitOfWork => ({
  execute: async (work) => work({
    references: references as CatalogReferenceDataRepository,
    audit: { append: async () => undefined },
  }),
});

describe("Catalog Reference Data application", () => {
  it("filters inactive and inactive-parent paths for Product Entry while retaining administrative rows", async () => {
    const snapshot: CatalogReferenceDataSnapshot = {
      ...emptySnapshot(),
      departments: [record("active-department"), record("inactive-department", "Inactive")],
      categories: [
        { ...record("visible-category"), departmentId: "active-department" },
        { ...record("hidden-category"), departmentId: "inactive-department" },
      ],
      productTypes: [
        { ...record("visible-type"), categoryId: "visible-category" },
        { ...record("hidden-type"), categoryId: "hidden-category" },
      ],
    };
    const useCase = new GetCatalogReferenceDataUseCase(unitOfWork({ getSnapshot: async () => snapshot }));
    const selection = await useCase.execute({ context: actor(["catalog.referenceData.view"]) });
    assert.deepEqual(selection.ok && selection.value.productTypes.map(({ id }) => id), ["visible-type"]);
    assert.deepEqual(await useCase.execute({ context: actor(["catalog.referenceData.view"]), includeInactive: true }), { ok: false, error: "Forbidden" });
    const administration = await useCase.execute({ context: actor(["catalog.referenceData.view", "catalog.referenceData.manage"]), includeInactive: true });
    assert.equal(administration.ok && administration.value.productTypes.length, 2);
  });

  it("maps foreign or missing hierarchy parents to scoped NotFound without writing", async () => {
    let writes = 0;
    const dependencies = { unitOfWork: unitOfWork({ codeExists: async () => false, findDepartment: async () => null, createCategory: async () => { writes += 1; throw new Error("unexpected"); } }), identifiers: { next: () => "category-a" }, clock: { now: () => now } };
    const result = await new CreateCategoryUseCase(dependencies).execute({ context: actor(["catalog.referenceData.manage"]), code: "laptops", displayName: "Laptops", sortOrder: 0, departmentId: "foreign" });
    assert.deepEqual(result, { ok: false, error: "NotFound" });
    assert.equal(writes, 0);
  });

  it("renames without changing stable identity/code and detects stale versions", async () => {
    const original = record("computers");
    const snapshot = { ...emptySnapshot(), departments: [original] };
    const repository: Partial<CatalogReferenceDataRepository> = {
      getSnapshot: async () => snapshot,
      updateDepartment: async (_workspaceId, _id, patch) => patch.expectedVersion === 1 ? { ...original, displayName: patch.displayName ?? original.displayName, version: 2, updatedAt: patch.updatedAt } : null,
    };
    const useCase = new UpdateDepartmentUseCase({ unitOfWork: unitOfWork(repository), identifiers: { next: () => "unused" }, clock: { now: () => now } });
    const renamed = await useCase.execute({ context: actor(["catalog.referenceData.manage"]), id: original.id, expectedVersion: 1, displayName: "أجهزة الكمبيوتر" });
    assert.equal(renamed.ok && renamed.value.id, original.id);
    assert.equal(renamed.ok && renamed.value.code, original.code);
    assert.equal(renamed.ok && renamed.value.displayName, "أجهزة الكمبيوتر");
    assert.deepEqual(await useCase.execute({ context: actor(["catalog.referenceData.manage"]), id: original.id, expectedVersion: 2, displayName: "Stale" }), { ok: false, error: "Conflict" });
  });
});
