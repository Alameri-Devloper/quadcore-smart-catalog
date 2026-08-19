export interface ProductEntryReferenceOption {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
}

export interface ProductEntryCatalogReferenceData {
  readonly departments: readonly ProductEntryReferenceOption[];
  readonly categories: readonly (ProductEntryReferenceOption & { readonly departmentId: string })[];
  readonly productTypes: readonly (ProductEntryReferenceOption & { readonly categoryId: string })[];
  readonly brands: readonly ProductEntryReferenceOption[];
  readonly deviceClasses: readonly { readonly code: string; readonly labels: Readonly<{ en: string; ar: string }> }[];
  readonly conditions: readonly { readonly code: string; readonly sortOrder: number }[];
  readonly supplyStatuses: readonly ProductEntryReferenceOption[];
  readonly currencies: readonly { readonly code: string; readonly sortOrder: number }[];
  readonly specificationDefinitions: readonly (ProductEntryReferenceOption & { readonly valueType: "Text" | "Number" | "Boolean"; readonly unit: string | null })[];
  readonly specificationTemplates: readonly { readonly id: string; readonly productTypeId: string; readonly entries: readonly { readonly specificationDefinitionId: string; readonly sortOrder: number; readonly required: boolean }[] }[];
}

export interface ProductEntryCatalogReferenceDataPort {
  load(signal?: AbortSignal): Promise<{ readonly type: "Available"; readonly value: ProductEntryCatalogReferenceData } | { readonly type: "Unavailable" }>;
}
