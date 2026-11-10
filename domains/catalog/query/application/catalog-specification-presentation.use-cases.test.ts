import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { CatalogProductDetailsProjection } from "../domain/catalog-query";
import type { CatalogSpecificationPresentationContext, CatalogSpecificationPresentationProfile } from "../domain/catalog-specification-presentation";
import type { CatalogQueryRepository } from "../ports/catalog-query-repository.port";
import { GetCatalogProductDetailsUseCase, SearchCatalogProductsUseCase } from "./catalog-query.use-cases";

const actor: TrustedActorContext = { workspaceId: "workspace-a", actorId: "actor-a", role: "Staff", permissions: ["catalog.products.view"], branchScope: { type: "SelectedBranches", branchIds: ["branch-a"] }, authorizationVersion: 1 };
const specification = { specificationDefinitionId: "memory", displayName: "Memory / الذاكرة", valueType: "Number" as const, unit: "GB", value: "0", sortOrder: 0 };
const product = (id: string): CatalogProductDetailsProjection => ({
  productId: id, productCode: id, productName: id, lifecycle: "Published", createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-01T00:00:00Z"),
  classification: { department: null, category: null, productType: { id: "type-a", displayName: "Type" }, brand: null, deviceClass: null, condition: null, supplyStatus: null },
  mainMedia: null, listingStatus: "Listed", inventory: { available: BigInt(1), onHand: BigInt(1), reserved: BigInt(0), damaged: BigInt(0) },
  retail: { amountMinor: BigInt(10), currency: "USD", source: "WorkspaceBase" }, wholesale: null, referenceCost: null,
  media: [], specifications: [specification, { ...specification, specificationDefinitionId: "historical", displayName: "History", value: "7" }],
});
const profile: CatalogSpecificationPresentationProfile = { workspaceId: "workspace-a", productTypeId: "type-a", groups: [{ id: "memory", label: { en: "Memory", ar: "الذاكرة" } }], fields: [{ specificationDefinitionId: "memory", groupId: "memory", cardPriority: 1, importantInDetails: true }] };
const setup = () => {
  const calls: { workspaceId: string; productIds: readonly string[] }[] = [];
  let details = product("p1");
  let contextType = "type-a";
  const repo: CatalogQueryRepository = {
    getSpecificationFilterDefinitions:async()=>[],getSpecificationFilterValues:async()=>[],
    branchExists: async () => true, hierarchyIsValid: async () => true,
    search: async () => [product("p1"), product("p2")].map((p) => ({ product: p, cursor: { productId: p.productId, value: p.createdAt.toISOString() } })),
    getDetails: async () => details, getMedia: async () => null,
    getFilterOptions: async () => ({ departments: [], categories: [], productTypes: [], brands: [], supplyStatuses: [], branches: [], enabledConditions: [], enabledCurrencies: [] }),
    getSpecificationPresentation: async (workspaceId, productIds): Promise<readonly CatalogSpecificationPresentationContext[]> => {
      calls.push({ workspaceId, productIds });
      return productIds.map((productId) => ({ productId, productTypeId: contextType, specifications: product(productId).specifications, definitions: [{ specificationDefinitionId: "memory", displayName: "Memory", valueType: "Number", unit: "GB", sortOrder: 0 }] }));
    },
  };
  return { repo, calls, setDetails: (value: CatalogProductDetailsProjection) => { details = value; }, changeType: () => { contextType = "changed"; } };
};

describe("Phase 1 authorized query enrichment", () => {
  it("batches only the selected authorized page and preserves the legacy cursor and disclosure", async () => {
    const { repo, calls } = setup();
    const command = { context: actor, input: { branchId: "branch-a", limit: 1 } };
    const legacy = await new SearchCatalogProductsUseCase(repo).execute(command);
    const result = await new SearchCatalogProductsUseCase(repo, [profile]).execute(command);
    assert.ok(result.ok && legacy.ok);
    if (!result.ok || !legacy.ok) return;
    assert.equal(result.value.nextCursor, legacy.value.nextCursor);
    assert.deepEqual(calls, [{ workspaceId: "workspace-a", productIds: ["p1"] }]);
    assert.deepEqual(result.value.items[0]!.cardSpecifications?.map((v) => v.value), ["0"]);
    assert.equal("retail" in result.value.items[0]!, false);
    assert.equal("inventory" in result.value.items[0]!, false);
    assert.equal("availability" in result.value.items[0]!, false);
    assert.equal("referenceCost" in result.value.items[0]!, false);
  });
  it("does not read specification data before catalog, Branch or stock authorization succeeds", async () => {
    const { repo, calls } = setup(), useCase = new SearchCatalogProductsUseCase(repo, [profile]);
    assert.deepEqual(await useCase.execute({ context: { ...actor, permissions: [] }, input: {} }), { ok: false, error: "Forbidden" });
    assert.deepEqual(await useCase.execute({ context: actor, input: { branchId: "branch-b" } }), { ok: false, error: "BranchNotFound" });
    assert.deepEqual(await useCase.execute({ context: actor, input: { branchId: "branch-a", stock: "InStock" } }), { ok: false, error: "Forbidden" });
    assert.deepEqual(calls, []);
  });
  it("never borrows another Workspace profile even with the same ProductType identity", async () => {
    const { repo, calls } = setup();
    const result = await new SearchCatalogProductsUseCase(repo, [{ ...profile, workspaceId: "workspace-b" }]).execute({ context: actor, input: {} });
    assert.ok(result.ok);
    if (result.ok) assert.equal("cardSpecifications" in result.value.items[0]!, false);
    assert.deepEqual(calls, []);
  });
  it("retains every original Details value and groups off-template history without placeholders", async () => {
    const { repo } = setup();
    const result = await new GetCatalogProductDetailsUseCase(repo, [profile]).execute({ context: actor, productId: "p1" });
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.deepEqual(result.value.specifications, product("p1").specifications);
    assert.deepEqual(result.value.specificationGroups?.flatMap((g) => g.specificationDefinitionIds), ["memory", "historical"]);
    assert.equal(result.value.specificationGroups?.flatMap((g) => g.missingSpecifications).length, 0);
    assert.equal("retail" in result.value, false);
  });
  it("does not enrich forbidden Details or apply a profile after a concurrent type mismatch", async () => {
    const { repo, calls, setDetails, changeType } = setup();
    setDetails({ ...product("p1"), lifecycle: "Draft" });
    assert.deepEqual(await new GetCatalogProductDetailsUseCase(repo, [profile]).execute({ context: actor, productId: "p1" }), { ok: false, error: "ProductNotFound" });
    assert.deepEqual(calls, []);
    changeType();
    const result = await new SearchCatalogProductsUseCase(repo, [profile]).execute({ context: actor, input: {} });
    assert.ok(result.ok);
    if (result.ok) assert.equal("cardSpecifications" in result.value.items[0]!, false);
  });
});
