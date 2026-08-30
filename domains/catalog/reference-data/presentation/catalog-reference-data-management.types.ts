export const CATALOG_REFERENCE_SECTIONS = [
  "hierarchy",
  "brands",
  "supply-statuses",
  "device-classes",
  "conditions",
  "currencies",
  "specification-definitions",
  "specification-templates",
] as const;

export type CatalogReferenceSection = (typeof CATALOG_REFERENCE_SECTIONS)[number];
export type CatalogReferenceStatusView = "Active" | "Inactive";
export type SpecificationValueTypeView = "Text" | "Number" | "Boolean";

export interface DynamicReferenceView {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly status: CatalogReferenceStatusView;
  readonly sortOrder: number;
  readonly version: number;
}

export interface CategoryView extends DynamicReferenceView { readonly departmentId: string }
export interface ProductTypeView extends DynamicReferenceView { readonly categoryId: string }
export interface SpecificationDefinitionView extends DynamicReferenceView {
  readonly valueType: SpecificationValueTypeView;
  readonly unit: string | null;
}

export interface RegistryAvailabilityView {
  readonly code: string;
  readonly enabled: boolean;
  readonly sortOrder: number;
}

export interface SpecificationTemplateEntryView {
  readonly specificationDefinitionId: string;
  readonly sortOrder: number;
  readonly required: boolean;
}

export interface SpecificationTemplateView {
  readonly id: string;
  readonly productTypeId: string;
  readonly version: number;
  readonly entries: readonly SpecificationTemplateEntryView[];
}

export interface CatalogReferenceManagementSnapshot {
  readonly departments: readonly DynamicReferenceView[];
  readonly categories: readonly CategoryView[];
  readonly productTypes: readonly ProductTypeView[];
  readonly brands: readonly DynamicReferenceView[];
  readonly supplyStatuses: readonly DynamicReferenceView[];
  readonly deviceClasses: readonly { readonly code: string; readonly labels: Readonly<{ en: string; ar: string }> }[];
  readonly conditions: readonly RegistryAvailabilityView[];
  readonly conditionRegistry: readonly { readonly code: string; readonly labels: Readonly<{ en: string; ar: string }> }[];
  readonly currencies: readonly RegistryAvailabilityView[];
  readonly currencyRegistry: readonly { readonly code: string; readonly minorUnitDigits: 0 | 2 | 3 | 4 | null }[];
  readonly specificationDefinitions: readonly SpecificationDefinitionView[];
  readonly specificationTemplates: readonly SpecificationTemplateView[];
}

export type CatalogReferenceApiFailure =
  | "InvalidInput"
  | "AuthenticationRequired"
  | "Forbidden"
  | "ForbiddenForRestrictedSession"
  | "OriginNotAllowed"
  | "NotFound"
  | "Conflict"
  | "CatalogReferenceDataServiceUnavailable"
  | "Unavailable";

export type CatalogReferenceApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly kind: CatalogReferenceApiFailure };

export type CatalogReferenceAccess =
  | { readonly type: "Management"; readonly snapshot: CatalogReferenceManagementSnapshot }
  | { readonly type: "ReadOnly"; readonly snapshot: CatalogReferenceManagementSnapshot };

export type DynamicReferenceKind =
  | "departments"
  | "categories"
  | "product-types"
  | "brands"
  | "supply-statuses"
  | "specification-definitions";

export interface CreateDynamicReferenceInput {
  readonly code: string;
  readonly displayName: string;
  readonly sortOrder: number;
  readonly departmentId?: string;
  readonly categoryId?: string;
  readonly valueType?: SpecificationValueTypeView;
  readonly unit?: string | null;
}

export interface UpdateDynamicReferenceInput {
  readonly expectedVersion: number;
  readonly displayName?: string;
  readonly sortOrder?: number;
  readonly status?: CatalogReferenceStatusView;
  readonly valueType?: SpecificationValueTypeView;
  readonly unit?: string | null;
}

export interface TemplateMutationInput {
  readonly entries: readonly SpecificationTemplateEntryView[];
  readonly expectedVersion?: number;
}
