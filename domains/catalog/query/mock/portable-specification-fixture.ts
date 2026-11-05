import { randomUUID } from "node:crypto";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { CatalogReferenceDataSnapshot } from "../../reference-data/ports/catalog-reference-data-unit-of-work.port";
import { STAFF_SPECIFICATION_CONFIGURATION as approved } from "../domain/staff-specification-configuration";

/** Synthetic, in-memory QA only; never used by runtime composition. */
export function portableConfigurationFixture(complete = false) {
  const workspaceId = randomUUID(), now = new Date("2026-11-03T00:00:00Z");
  const record = (code: string) => ({ workspaceId, id: randomUUID(), code, displayName: code, status: "Active" as const, sortOrder: 0, version: 1, createdAt: now, updatedAt: now });
  const department = record("portable-department"), category = { ...record("portable-category"), departmentId: department.id };
  const definitions = approved.definitions.filter(d => complete || d.creation === "require-existing").map(d => ({ ...record(d.code), code: d.code, displayName: d.displayName, valueType: d.valueType, unit: d.unit, sortOrder: d.sortOrder }));
  const types = approved.productTypes.map(t => ({ ...record(t.code), categoryId: category.id }));
  const snapshot: CatalogReferenceDataSnapshot = {
    departments: [department], categories: [category], productTypes: types, specificationDefinitions: definitions,
    specificationTemplates: types.map(t => ({ workspaceId, id: randomUUID(), productTypeId: t.id, version: 1, createdAt: now, updatedAt: now, entries: approved.productTypes.find(d => d.code === t.code)!.bindings.filter(b => complete || b.creation === "require-existing").map(b => ({ sortOrder: b.sortOrder, required: b.required, publicVisibility: b.publicVisibility, specificationDefinitionId: definitions.find(d => d.code === b.definitionCode)!.id })) })),
    brands: [], supplyStatuses: [], conditions: [], currencies: [],
  };
  const context: TrustedActorContext = { workspaceId, actorId: randomUUID(), role: "Owner", permissions: ["catalog.referenceData.view", "catalog.referenceData.manage"], branchScope: { type: "AllBranches" }, authorizationVersion: 1 };
  return { snapshot, context, workspaceId };
}
