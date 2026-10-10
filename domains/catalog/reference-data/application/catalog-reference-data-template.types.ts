import type { PublicSpecificationVisibility } from "../domain/catalog-reference-data";
import { validatePublicSpecificationVisibility, validateSortOrder } from "../domain/catalog-reference-data";

// Optional visibility belongs to the configure compatibility boundary only.
export interface ConfigureSpecificationTemplateEntryInput {
  readonly specificationDefinitionId: string;
  readonly sortOrder: number;
  readonly required?: boolean;
  readonly publicVisibility?: PublicSpecificationVisibility;
}

export const parseConfigureSpecificationTemplateEntries = (value: unknown): readonly ConfigureSpecificationTemplateEntryInput[] => {
  if (!Array.isArray(value)) throw new Error("InvalidTemplateEntries");
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("InvalidTemplateEntry");
    if (Object.keys(entry).some((key) => !["specificationDefinitionId", "sortOrder", "required", "publicVisibility"].includes(key))) throw new Error("InvalidTemplateEntryKey");
    if (!("specificationDefinitionId" in entry) || typeof entry.specificationDefinitionId !== "string" || !entry.specificationDefinitionId.trim()) throw new Error("InvalidDefinitionId");
    if (!("sortOrder" in entry) || typeof entry.sortOrder !== "number") throw new Error("InvalidSortOrder");
    if (Object.hasOwn(entry, "required") && (!("required" in entry) || typeof entry.required !== "boolean")) throw new Error("InvalidRequired");
    return Object.freeze({
      specificationDefinitionId: entry.specificationDefinitionId,
      sortOrder: validateSortOrder(entry.sortOrder),
      required: "required" in entry && typeof entry.required === "boolean" ? entry.required : false,
      ...(Object.hasOwn(entry, "publicVisibility") ? { publicVisibility: validatePublicSpecificationVisibility("publicVisibility" in entry ? entry.publicVisibility : undefined) } : {}),
    });
  });
};
