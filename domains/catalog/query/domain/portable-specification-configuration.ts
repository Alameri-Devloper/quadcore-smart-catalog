import type { SpecificationDefinition, SpecificationTemplateEntry } from "../../reference-data/domain/catalog-reference-data";
import type { CatalogSpecificationPresentationProfile } from "./catalog-specification-presentation";

export type PortableCreationPolicy = "require-existing" | "approved-missing";
export type PortablePresentation = Omit<CatalogSpecificationPresentationProfile, "workspaceId" | "productTypeId" | "identityModelDefinitionId" | "fields"> & {
  readonly identityModelDefinitionCode?: string;
  readonly fields: readonly (Omit<CatalogSpecificationPresentationProfile["fields"][number], "specificationDefinitionId" | "combineWith"> & {
    readonly definitionCode: string; readonly combineWithCode?: string;
  })[];
};
export interface PortableSpecificationManifest {
  readonly version: 1;
  readonly name: "staff-catalog-specifications-v1";
  readonly definitions: readonly (Pick<SpecificationDefinition, "code" | "displayName" | "valueType" | "unit" | "sortOrder"> & { readonly creation: PortableCreationPolicy })[];
  readonly productTypes: readonly {
    readonly code: string;
    readonly bindings: readonly (Omit<SpecificationTemplateEntry, "specificationDefinitionId"> & { readonly definitionCode: string; readonly creation: PortableCreationPolicy })[];
    readonly presentation: PortablePresentation;
  }[];
}

/** Canonical JSON only. No silent removal of unknown/undefined fields. */
export function configurationJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(configurationJson).join(",") + "]";
  if (typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype)
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + configurationJson((value as Record<string, unknown>)[key])).join(",") + "}";
  throw new Error("InvalidPortableConfiguration");
}
export function freezeConfiguration<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeConfiguration); Object.freeze(value);
  }
  return value;
}
