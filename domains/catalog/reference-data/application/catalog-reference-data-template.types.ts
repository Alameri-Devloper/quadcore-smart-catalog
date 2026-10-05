import type { PublicSpecificationVisibility } from "../domain/catalog-reference-data";

// Declaration only: P2 integrates this omission-preserving input with live writes.
export interface ConfigureSpecificationTemplateEntryInput {
  readonly specificationDefinitionId: string;
  readonly sortOrder: number;
  readonly required?: boolean;
  readonly publicVisibility?: PublicSpecificationVisibility;
}
