import type {
  Brand,
  Category,
  Department,
  ProductType,
  SpecificationDefinition,
  SpecificationTemplate,
  SupplyStatus,
  WorkspaceRegistryAvailability,
} from "../domain/catalog-reference-data";

export interface CatalogReferenceDataSnapshot {
  readonly departments: readonly Department[];
  readonly categories: readonly Category[];
  readonly productTypes: readonly ProductType[];
  readonly brands: readonly Brand[];
  readonly supplyStatuses: readonly SupplyStatus[];
  readonly conditions: readonly WorkspaceRegistryAvailability[];
  readonly currencies: readonly WorkspaceRegistryAvailability[];
  readonly specificationDefinitions: readonly SpecificationDefinition[];
  readonly specificationTemplates: readonly SpecificationTemplate[];
}

export interface NewReferenceRecord {
  readonly workspaceId: string;
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly sortOrder: number;
  readonly createdAt: Date;
}

export interface ReferenceRecordPatch {
  readonly displayName?: string;
  readonly sortOrder?: number;
  readonly status?: "Active" | "Inactive";
  readonly updatedAt: Date;
  readonly expectedVersion: number;
}

export interface CatalogReferenceDataRepository {
  getSnapshot(workspaceId: string): Promise<CatalogReferenceDataSnapshot>;
  findDepartment(workspaceId: string, id: string): Promise<Department | null>;
  findCategory(workspaceId: string, id: string): Promise<Category | null>;
  findProductType(workspaceId: string, id: string): Promise<ProductType | null>;
  findSpecificationDefinition(workspaceId: string, id: string): Promise<SpecificationDefinition | null>;
  codeExists(workspaceId: string, kind: "Department" | "Category" | "ProductType" | "Brand" | "SupplyStatus" | "SpecificationDefinition", code: string): Promise<boolean>;
  createDepartment(record: NewReferenceRecord): Promise<Department>;
  createCategory(record: NewReferenceRecord & { readonly departmentId: string }): Promise<Category>;
  createProductType(record: NewReferenceRecord & { readonly categoryId: string }): Promise<ProductType>;
  createBrand(record: NewReferenceRecord): Promise<Brand>;
  createSupplyStatus(record: NewReferenceRecord): Promise<SupplyStatus>;
  createSpecificationDefinition(record: NewReferenceRecord & { readonly valueType: "Text" | "Number" | "Boolean"; readonly unit: string | null }): Promise<SpecificationDefinition>;
  updateDepartment(workspaceId: string, id: string, patch: ReferenceRecordPatch): Promise<Department | null>;
  updateCategory(workspaceId: string, id: string, patch: ReferenceRecordPatch): Promise<Category | null>;
  updateProductType(workspaceId: string, id: string, patch: ReferenceRecordPatch): Promise<ProductType | null>;
  updateBrand(workspaceId: string, id: string, patch: ReferenceRecordPatch): Promise<Brand | null>;
  updateSupplyStatus(workspaceId: string, id: string, patch: ReferenceRecordPatch): Promise<SupplyStatus | null>;
  updateSpecificationDefinition(workspaceId: string, id: string, patch: ReferenceRecordPatch & { readonly valueType?: "Text" | "Number" | "Boolean"; readonly unit?: string | null }): Promise<SpecificationDefinition | null>;
  configureConditions(workspaceId: string, values: readonly WorkspaceRegistryAvailability[]): Promise<void>;
  configureCurrencies(workspaceId: string, values: readonly WorkspaceRegistryAvailability[]): Promise<void>;
  configureTemplate(input: { readonly workspaceId: string; readonly id: string; readonly productTypeId: string; readonly entries: SpecificationTemplate["entries"]; readonly expectedVersion?: number; readonly now: Date }): Promise<SpecificationTemplate | null>;
}

export interface CatalogReferenceAuditRecord {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly eventType: string;
  readonly referenceId: string;
  readonly code?: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
  readonly occurredAt: Date;
}

export interface CatalogReferenceAuditRepository {
  append(record: CatalogReferenceAuditRecord): Promise<void>;
}

export interface CatalogReferenceDataTransactionContext {
  readonly references: CatalogReferenceDataRepository;
  readonly audit: CatalogReferenceAuditRepository;
}

export interface CatalogReferenceDataUnitOfWork {
  execute<T>(work: (context: CatalogReferenceDataTransactionContext) => Promise<T>): Promise<T>;
}

export interface CatalogReferenceIdentifierGenerator { next(): string }
export interface CatalogReferenceClock { now(): Date }
