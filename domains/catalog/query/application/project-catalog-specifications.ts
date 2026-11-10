import type { CatalogSpecificationProjection } from "../domain/catalog-query";
import type { CatalogSpecificationDefinitionProjection, CatalogSpecificationGroupProjection, CatalogSpecificationPresentationProfile } from "../domain/catalog-specification-presentation";

export const projectCatalogSpecifications = (input: {
  readonly workspaceId: string;
  readonly productTypeId: string | null;
  readonly specifications: readonly CatalogSpecificationProjection[];
  readonly definitions: readonly CatalogSpecificationDefinitionProjection[];
  readonly profiles: readonly CatalogSpecificationPresentationProfile[];
}): { readonly modelName?: string; readonly specifications: readonly CatalogSpecificationProjection[]; readonly cardSpecifications: readonly CatalogSpecificationProjection[]; readonly specificationGroups: readonly CatalogSpecificationGroupProjection[] } | null => {
  const profile = input.profiles.find((item) => item.workspaceId === input.workspaceId && item.productTypeId === input.productTypeId);
  if (!profile) return null;
  const definitions = new Map(input.definitions.map((item) => [item.specificationDefinitionId, item]));
  const stored = new Map(input.specifications.map((item) => [item.specificationDefinitionId, item]));
  const eligible = profile.fields.filter((field) => definitions.has(field.specificationDefinitionId));
  const labels = new Map(eligible.filter((field) => field.displayLabel).map((field) => [field.specificationDefinitionId, field.displayLabel!]));
  const present = <T extends CatalogSpecificationDefinitionProjection>(value: T): T => {
    const label = labels.get(value.specificationDefinitionId);
    return label ? Object.freeze({ ...value, displayName: label.en + " / " + label.ar }) : value;
  };
  const hasValue = (value: CatalogSpecificationProjection | undefined): value is CatalogSpecificationProjection => !!value && !(typeof value.value === "string" && value.value.trim() === "");
  const compatible = (id: string): CatalogSpecificationProjection | undefined => {
    const v=stored.get(id), d=definitions.get(id);
    return d && hasValue(v) && v.valueType === d.valueType ? v : undefined;
  };
  const decorate = (value: CatalogSpecificationProjection): CatalogSpecificationProjection => {
    const field=eligible.find(f=>f.specificationDefinitionId===value.specificationDefinitionId), primary=present(value);
    if (!field || !compatible(value.specificationDefinitionId)) return primary;
    const component=field.combineWith ? compatible(field.combineWith) : undefined;
    const format=field.format === "generation" && value.valueType === "Number" && value.unit === null ? "generation" as const : undefined;
    return component || format ? Object.freeze({...primary,presentation:Object.freeze({...(component ? {component,separator:field.combineSeparator ?? " "} : {}),...(format ? {format}: {})})}) : primary;
  };
  const candidates = eligible.filter((field) => field.cardPriority !== undefined).sort((a, b) => a.cardPriority! - b.cardPriority!);
  const cardSpecifications: CatalogSpecificationProjection[] = [];
  for (const field of candidates) {
    const value = stored.get(field.specificationDefinitionId), definition = definitions.get(field.specificationDefinitionId)!;
    if (!hasValue(value) || value.valueType !== definition.valueType) {
      const fallback=field.combineWith ? compatible(field.combineWith) : undefined;
      if (!fallback) continue;
      cardSpecifications.push(Object.freeze({...fallback,displayName:field.displayLabel ? field.displayLabel.en+" / "+field.displayLabel.ar : definition.displayName}));
    } else cardSpecifications.push(decorate(value));
    if (cardSpecifications.length === 3) break;
  }
  const groups: CatalogSpecificationGroupProjection[] = [];
  const assigned = new Set<string>();
  let missingCount = 0;
  for (const group of profile.groups) {
    const fields = eligible.filter((field) => field.groupId === group.id);
    const ids = new Set(fields.map((field) => field.specificationDefinitionId));
    const actual = input.specifications.filter((value) => ids.has(value.specificationDefinitionId));
    actual.forEach((value) => assigned.add(value.specificationDefinitionId));
    const missing: CatalogSpecificationDefinitionProjection[] = [];
    for (const field of fields) {
      if (!field.importantInDetails || stored.has(field.specificationDefinitionId) || missingCount === 4) continue;
      missing.push(present(definitions.get(field.specificationDefinitionId)!));
      missingCount++;
    }
    if (actual.length || missing.length) groups.push(Object.freeze({ id: group.id, label: group.label, specificationDefinitionIds: Object.freeze(actual.map((value) => value.specificationDefinitionId)), missingSpecifications: Object.freeze(missing) }));
  }
  const historical = input.specifications.filter((value) => !assigned.has(value.specificationDefinitionId));
  if (historical.length) groups.push(Object.freeze({ id: "additional-stored", label: Object.freeze({ en: "Additional stored specifications", ar: "مواصفات محفوظة إضافية" }), specificationDefinitionIds: Object.freeze(historical.map((value) => value.specificationDefinitionId)), missingSpecifications: Object.freeze([]) }));
  const model=profile.identityModelDefinitionId ? compatible(profile.identityModelDefinitionId) : undefined;
  return Object.freeze({ ...(model?.valueType === "Text" && typeof model.value === "string" ? {modelName:model.value} : {}), specifications: Object.freeze(input.specifications.map(decorate)), cardSpecifications: Object.freeze(cardSpecifications), specificationGroups: Object.freeze(groups) });
};
