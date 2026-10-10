import { CATALOG_REFERENCE_SECTIONS, type CatalogReferenceAccess, type CatalogReferenceApiResult, type CatalogReferenceManagementSnapshot, type CatalogReferenceSection, type RegistryAvailabilityView, type SpecificationTemplateEntryView, type SpecificationTemplateView, type TemplateMutationInput } from "./catalog-reference-data-management.types";

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

export interface TemplateConflictReview {
  readonly latestVersion: number | null;
  readonly conflicts: readonly {
    readonly specificationDefinitionId: string;
    readonly draftVisibility: SpecificationTemplateEntryView["publicVisibility"];
    readonly latestVisibility: SpecificationTemplateEntryView["publicVisibility"];
    readonly decision: "latest" | "draft" | null;
  }[];
}

export const beginTemplateConflictReview = (draft: readonly SpecificationTemplateEntryView[], latest: SpecificationTemplateView | null): TemplateConflictReview => {
  const latestById = new Map(latest?.entries.map((entry) => [entry.specificationDefinitionId, entry]) ?? []);
  return { latestVersion: latest?.version ?? null, conflicts: draft.flatMap((entry) => {
    const retained = latestById.get(entry.specificationDefinitionId);
    return retained && retained.publicVisibility !== entry.publicVisibility ? [{ specificationDefinitionId: entry.specificationDefinitionId, draftVisibility: entry.publicVisibility, latestVisibility: retained.publicVisibility, decision: null }] : [];
  }) };
};

export const completeTemplateConflictReview = (review: TemplateConflictReview): { readonly expectedVersion: number | null } | null =>
  review.conflicts.some(({ decision }) => decision === null) ? null : { expectedVersion: review.latestVersion };

export const resolveTemplateVisibilityConflict = (entries: readonly SpecificationTemplateEntryView[], review: TemplateConflictReview, definitionId: string, decision: "latest" | "draft"): { readonly entries: readonly SpecificationTemplateEntryView[]; readonly review: TemplateConflictReview } => {
  const conflict = review.conflicts.find((item) => item.specificationDefinitionId === definitionId);
  if (!conflict) return { entries, review };
  return {
    entries: entries.map((entry) => entry.specificationDefinitionId === definitionId ? { ...entry, publicVisibility: decision === "latest" ? conflict.latestVisibility : conflict.draftVisibility } : entry),
    review: { ...review, conflicts: review.conflicts.map((item) => item.specificationDefinitionId === definitionId ? { ...item, decision } : item) },
  };
};

export const dirtyRegistryValues = (
  draft: ReadonlyMap<string, RegistryAvailabilityView>,
  dirtyCodes: ReadonlySet<string>,
) => [...dirtyCodes].flatMap((code) => {
  const row = draft.get(code);
  return row ? [row] : [];
});
