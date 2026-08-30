import { CATALOG_REFERENCE_SECTIONS, type CatalogReferenceAccess, type CatalogReferenceApiResult, type CatalogReferenceManagementSnapshot, type CatalogReferenceSection, type RegistryAvailabilityView, type SpecificationTemplateEntryView, type TemplateMutationInput } from "./catalog-reference-data-management.types";

interface LoadPort {
  load(includeInactive: boolean, signal?: AbortSignal): Promise<CatalogReferenceApiResult<CatalogReferenceManagementSnapshot>>;
}

export const resolveCatalogReferenceSection = (values: readonly string[]): CatalogReferenceSection =>
  values.length === 1 && CATALOG_REFERENCE_SECTIONS.includes(values[0] as CatalogReferenceSection)
    ? values[0] as CatalogReferenceSection
    : "hierarchy";

export const loadCatalogReferenceAccess = async (port: LoadPort, signal?: AbortSignal): Promise<CatalogReferenceApiResult<CatalogReferenceAccess>> => {
  const management = await port.load(true, signal);
  if (management.ok) return { ok: true, value: { type: "Management", snapshot: management.value } };
  if (management.kind !== "Forbidden") return management;
  const active = await port.load(false, signal);
  return active.ok ? { ok: true, value: { type: "ReadOnly", snapshot: active.value } } : active;
};

export const categoriesForDepartment = (snapshot: CatalogReferenceManagementSnapshot, departmentId: string | null) =>
  departmentId ? snapshot.categories.filter((item) => item.departmentId === departmentId) : [];

export const productTypesForCategory = (snapshot: CatalogReferenceManagementSnapshot, categoryId: string | null) =>
  categoryId ? snapshot.productTypes.filter((item) => item.categoryId === categoryId) : [];

export interface MergedRegistryRow extends RegistryAvailabilityView { readonly configured: boolean }
export const mergeRegistryAvailability = (
  registry: readonly { readonly code: string }[],
  configured: readonly RegistryAvailabilityView[],
): readonly MergedRegistryRow[] => {
  const byCode = new Map(configured.map((item) => [item.code, item]));
  return registry.map(({ code }, index) => {
    const current = byCode.get(code);
    return current ? { ...current, configured: true } : { code, enabled: false, sortOrder: index, configured: false };
  });
};

export const templateHasInactiveEntries = (
  entries: readonly SpecificationTemplateEntryView[],
  definitions: CatalogReferenceManagementSnapshot["specificationDefinitions"],
) => {
  const activeIds = new Set(definitions.filter(({ status }) => status === "Active").map(({ id }) => id));
  return entries.some(({ specificationDefinitionId }) => !activeIds.has(specificationDefinitionId));
};

export const templateMutationInput = (
  entries: readonly SpecificationTemplateEntryView[],
  expectedVersion: number | null,
): TemplateMutationInput => expectedVersion === null ? { entries } : { entries, expectedVersion };

export const dirtyRegistryValues = (
  draft: ReadonlyMap<string, RegistryAvailabilityView>,
  dirtyCodes: ReadonlySet<string>,
) => [...dirtyCodes].flatMap((code) => {
  const row = draft.get(code);
  return row ? [row] : [];
});
