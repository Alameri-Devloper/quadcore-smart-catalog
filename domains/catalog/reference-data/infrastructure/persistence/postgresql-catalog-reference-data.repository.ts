import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { PlatformDatabase } from "../../../../../shared/infrastructure/persistence/database";
import { securityAuditEvents } from "../../../../../shared/audit/infrastructure/persistence/schema";
import {
  catalogBrands,
  catalogCategories,
  catalogDepartments,
  catalogProductTypes,
  catalogSpecificationDefinitions,
  catalogSpecificationTemplateEntries,
  catalogSpecificationTemplates,
  catalogSupplyStatuses,
  workspaceConditionAvailability,
  workspaceCurrencyAvailability,
} from "../../../infrastructure/persistence/schema";
import type {
  Brand,
  Category,
  Department,
  ProductType,
  SpecificationDefinition,
  SpecificationTemplate,
  SupplyStatus,
  WorkspaceRegistryAvailability,
} from "../../domain/catalog-reference-data";
import type {
  CatalogReferenceAuditRecord,
  CatalogReferenceAuditRepository,
  CatalogReferenceDataRepository,
  CatalogReferenceDataSnapshot,
  NewReferenceRecord,
  ReferenceRecordPatch,
} from "../../ports/catalog-reference-data-unit-of-work.port";

const base = <T extends { workspaceId: string; code: string; displayName: string; status: string; sortOrder: number; version: number; createdAt: Date; updatedAt: Date }>(row: T, id: string) => ({
  workspaceId: row.workspaceId, id, code: row.code, displayName: row.displayName,
  status: row.status as "Active" | "Inactive", sortOrder: row.sortOrder, version: row.version,
  createdAt: row.createdAt, updatedAt: row.updatedAt,
});

const mapDepartment = (row: typeof catalogDepartments.$inferSelect): Department => base(row, row.departmentId);
const mapCategory = (row: typeof catalogCategories.$inferSelect): Category => ({ ...base(row, row.categoryId), departmentId: row.departmentId });
const mapProductType = (row: typeof catalogProductTypes.$inferSelect): ProductType => ({ ...base(row, row.productTypeId), categoryId: row.categoryId });
const mapBrand = (row: typeof catalogBrands.$inferSelect): Brand => base(row, row.brandId);
const mapSupplyStatus = (row: typeof catalogSupplyStatuses.$inferSelect): SupplyStatus => base(row, row.supplyStatusId);
const mapDefinition = (row: typeof catalogSpecificationDefinitions.$inferSelect): SpecificationDefinition => ({ ...base(row, row.specificationDefinitionId), valueType: row.valueType as SpecificationDefinition["valueType"], unit: row.unit });
const insertBase = (record: NewReferenceRecord) => ({
  workspaceId: record.workspaceId, code: record.code, displayName: record.displayName, status: "Active" as const,
  sortOrder: record.sortOrder, version: 1, createdAt: record.createdAt, updatedAt: record.createdAt,
});
const patchValues = (patch: ReferenceRecordPatch) => ({
  ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
  ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
  ...(patch.status !== undefined ? { status: patch.status } : {}),
  updatedAt: patch.updatedAt,
});

export class PostgreSqlCatalogReferenceDataRepository implements CatalogReferenceDataRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async getSnapshot(workspaceId: string): Promise<CatalogReferenceDataSnapshot> {
    const [departments, categories, productTypes, brands, supplyStatuses, conditions, currencies, definitions, templates, entries] = await Promise.all([
      this.database.select().from(catalogDepartments).where(eq(catalogDepartments.workspaceId, workspaceId)).orderBy(asc(catalogDepartments.sortOrder), asc(catalogDepartments.displayName), asc(catalogDepartments.departmentId)),
      this.database.select().from(catalogCategories).where(eq(catalogCategories.workspaceId, workspaceId)).orderBy(asc(catalogCategories.sortOrder), asc(catalogCategories.displayName), asc(catalogCategories.categoryId)),
      this.database.select().from(catalogProductTypes).where(eq(catalogProductTypes.workspaceId, workspaceId)).orderBy(asc(catalogProductTypes.sortOrder), asc(catalogProductTypes.displayName), asc(catalogProductTypes.productTypeId)),
      this.database.select().from(catalogBrands).where(eq(catalogBrands.workspaceId, workspaceId)).orderBy(asc(catalogBrands.sortOrder), asc(catalogBrands.displayName), asc(catalogBrands.brandId)),
      this.database.select().from(catalogSupplyStatuses).where(eq(catalogSupplyStatuses.workspaceId, workspaceId)).orderBy(asc(catalogSupplyStatuses.sortOrder), asc(catalogSupplyStatuses.displayName), asc(catalogSupplyStatuses.supplyStatusId)),
      this.database.select().from(workspaceConditionAvailability).where(eq(workspaceConditionAvailability.workspaceId, workspaceId)).orderBy(asc(workspaceConditionAvailability.sortOrder), asc(workspaceConditionAvailability.conditionCode)),
      this.database.select().from(workspaceCurrencyAvailability).where(eq(workspaceCurrencyAvailability.workspaceId, workspaceId)).orderBy(asc(workspaceCurrencyAvailability.sortOrder), asc(workspaceCurrencyAvailability.currencyCode)),
      this.database.select().from(catalogSpecificationDefinitions).where(eq(catalogSpecificationDefinitions.workspaceId, workspaceId)).orderBy(asc(catalogSpecificationDefinitions.sortOrder), asc(catalogSpecificationDefinitions.displayName), asc(catalogSpecificationDefinitions.specificationDefinitionId)),
      this.database.select().from(catalogSpecificationTemplates).where(eq(catalogSpecificationTemplates.workspaceId, workspaceId)).orderBy(asc(catalogSpecificationTemplates.productTypeId)),
      this.database.select().from(catalogSpecificationTemplateEntries).where(eq(catalogSpecificationTemplateEntries.workspaceId, workspaceId)).orderBy(asc(catalogSpecificationTemplateEntries.sortOrder), asc(catalogSpecificationTemplateEntries.specificationDefinitionId)),
    ]);
    const entriesByTemplate = new Map<string, SpecificationTemplate["entries"]>();
    for (const row of entries) {
      const current = entriesByTemplate.get(row.specificationTemplateId) ?? [];
      entriesByTemplate.set(row.specificationTemplateId, [...current, Object.freeze({ specificationDefinitionId: row.specificationDefinitionId, sortOrder: row.sortOrder, required: row.required })]);
    }
    return Object.freeze({
      departments: departments.map(mapDepartment), categories: categories.map(mapCategory), productTypes: productTypes.map(mapProductType),
      brands: brands.map(mapBrand), supplyStatuses: supplyStatuses.map(mapSupplyStatus),
      conditions: conditions.map((row) => Object.freeze({ workspaceId: row.workspaceId, code: row.conditionCode, enabled: row.enabled, sortOrder: row.sortOrder })),
      currencies: currencies.map((row) => Object.freeze({ workspaceId: row.workspaceId, code: row.currencyCode, enabled: row.enabled, sortOrder: row.sortOrder })),
      specificationDefinitions: definitions.map(mapDefinition),
      specificationTemplates: templates.map((row) => Object.freeze({ workspaceId: row.workspaceId, id: row.specificationTemplateId, productTypeId: row.productTypeId, version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt, entries: entriesByTemplate.get(row.specificationTemplateId) ?? [] })),
    });
  }

  async findDepartment(workspaceId: string, id: string) { const [row] = await this.database.select().from(catalogDepartments).where(and(eq(catalogDepartments.workspaceId, workspaceId), eq(catalogDepartments.departmentId, id))).limit(1); return row ? mapDepartment(row) : null; }
  async findCategory(workspaceId: string, id: string) { const [row] = await this.database.select().from(catalogCategories).where(and(eq(catalogCategories.workspaceId, workspaceId), eq(catalogCategories.categoryId, id))).limit(1); return row ? mapCategory(row) : null; }
  async findProductType(workspaceId: string, id: string) { const [row] = await this.database.select().from(catalogProductTypes).where(and(eq(catalogProductTypes.workspaceId, workspaceId), eq(catalogProductTypes.productTypeId, id))).limit(1); return row ? mapProductType(row) : null; }
  async findSpecificationDefinition(workspaceId: string, id: string) { const [row] = await this.database.select().from(catalogSpecificationDefinitions).where(and(eq(catalogSpecificationDefinitions.workspaceId, workspaceId), eq(catalogSpecificationDefinitions.specificationDefinitionId, id))).limit(1); return row ? mapDefinition(row) : null; }

  async codeExists(workspaceId: string, kind: "Department" | "Category" | "ProductType" | "Brand" | "SupplyStatus" | "SpecificationDefinition", code: string): Promise<boolean> {
    if (kind === "Department") return (await this.database.select({ id: catalogDepartments.departmentId }).from(catalogDepartments).where(and(eq(catalogDepartments.workspaceId, workspaceId), eq(catalogDepartments.code, code))).limit(1)).length > 0;
    if (kind === "Category") return (await this.database.select({ id: catalogCategories.categoryId }).from(catalogCategories).where(and(eq(catalogCategories.workspaceId, workspaceId), eq(catalogCategories.code, code))).limit(1)).length > 0;
    if (kind === "ProductType") return (await this.database.select({ id: catalogProductTypes.productTypeId }).from(catalogProductTypes).where(and(eq(catalogProductTypes.workspaceId, workspaceId), eq(catalogProductTypes.code, code))).limit(1)).length > 0;
    if (kind === "Brand") return (await this.database.select({ id: catalogBrands.brandId }).from(catalogBrands).where(and(eq(catalogBrands.workspaceId, workspaceId), eq(catalogBrands.code, code))).limit(1)).length > 0;
    if (kind === "SupplyStatus") return (await this.database.select({ id: catalogSupplyStatuses.supplyStatusId }).from(catalogSupplyStatuses).where(and(eq(catalogSupplyStatuses.workspaceId, workspaceId), eq(catalogSupplyStatuses.code, code))).limit(1)).length > 0;
    return (await this.database.select({ id: catalogSpecificationDefinitions.specificationDefinitionId }).from(catalogSpecificationDefinitions).where(and(eq(catalogSpecificationDefinitions.workspaceId, workspaceId), eq(catalogSpecificationDefinitions.code, code))).limit(1)).length > 0;
  }

  async createDepartment(record: NewReferenceRecord): Promise<Department> { const [row] = await this.database.insert(catalogDepartments).values({ ...insertBase(record), departmentId: record.id }).returning(); return mapDepartment(row); }
  async createCategory(record: NewReferenceRecord & { readonly departmentId: string }): Promise<Category> { const [row] = await this.database.insert(catalogCategories).values({ ...insertBase(record), categoryId: record.id, departmentId: record.departmentId }).returning(); return mapCategory(row); }
  async createProductType(record: NewReferenceRecord & { readonly categoryId: string }): Promise<ProductType> { const [row] = await this.database.insert(catalogProductTypes).values({ ...insertBase(record), productTypeId: record.id, categoryId: record.categoryId }).returning(); return mapProductType(row); }
  async createBrand(record: NewReferenceRecord): Promise<Brand> { const [row] = await this.database.insert(catalogBrands).values({ ...insertBase(record), brandId: record.id }).returning(); return mapBrand(row); }
  async createSupplyStatus(record: NewReferenceRecord): Promise<SupplyStatus> { const [row] = await this.database.insert(catalogSupplyStatuses).values({ ...insertBase(record), supplyStatusId: record.id }).returning(); return mapSupplyStatus(row); }
  async createSpecificationDefinition(record: NewReferenceRecord & { readonly valueType: "Text" | "Number" | "Boolean"; readonly unit: string | null }): Promise<SpecificationDefinition> { const [row] = await this.database.insert(catalogSpecificationDefinitions).values({ ...insertBase(record), specificationDefinitionId: record.id, valueType: record.valueType, unit: record.unit }).returning(); return mapDefinition(row); }

  async updateDepartment(workspaceId: string, id: string, patch: ReferenceRecordPatch) { const [row] = await this.database.update(catalogDepartments).set({ ...patchValues(patch), version: patch.expectedVersion + 1 }).where(and(eq(catalogDepartments.workspaceId, workspaceId), eq(catalogDepartments.departmentId, id), eq(catalogDepartments.version, patch.expectedVersion))).returning(); return row ? mapDepartment(row) : null; }
  async updateCategory(workspaceId: string, id: string, patch: ReferenceRecordPatch) { const [row] = await this.database.update(catalogCategories).set({ ...patchValues(patch), version: patch.expectedVersion + 1 }).where(and(eq(catalogCategories.workspaceId, workspaceId), eq(catalogCategories.categoryId, id), eq(catalogCategories.version, patch.expectedVersion))).returning(); return row ? mapCategory(row) : null; }
  async updateProductType(workspaceId: string, id: string, patch: ReferenceRecordPatch) { const [row] = await this.database.update(catalogProductTypes).set({ ...patchValues(patch), version: patch.expectedVersion + 1 }).where(and(eq(catalogProductTypes.workspaceId, workspaceId), eq(catalogProductTypes.productTypeId, id), eq(catalogProductTypes.version, patch.expectedVersion))).returning(); return row ? mapProductType(row) : null; }
  async updateBrand(workspaceId: string, id: string, patch: ReferenceRecordPatch) { const [row] = await this.database.update(catalogBrands).set({ ...patchValues(patch), version: patch.expectedVersion + 1 }).where(and(eq(catalogBrands.workspaceId, workspaceId), eq(catalogBrands.brandId, id), eq(catalogBrands.version, patch.expectedVersion))).returning(); return row ? mapBrand(row) : null; }
  async updateSupplyStatus(workspaceId: string, id: string, patch: ReferenceRecordPatch) { const [row] = await this.database.update(catalogSupplyStatuses).set({ ...patchValues(patch), version: patch.expectedVersion + 1 }).where(and(eq(catalogSupplyStatuses.workspaceId, workspaceId), eq(catalogSupplyStatuses.supplyStatusId, id), eq(catalogSupplyStatuses.version, patch.expectedVersion))).returning(); return row ? mapSupplyStatus(row) : null; }
  async updateSpecificationDefinition(workspaceId: string, id: string, patch: ReferenceRecordPatch & { readonly valueType?: "Text" | "Number" | "Boolean"; readonly unit?: string | null }) { const [row] = await this.database.update(catalogSpecificationDefinitions).set({ ...patchValues(patch), ...(patch.valueType !== undefined ? { valueType: patch.valueType } : {}), ...(patch.unit !== undefined ? { unit: patch.unit } : {}), version: patch.expectedVersion + 1 }).where(and(eq(catalogSpecificationDefinitions.workspaceId, workspaceId), eq(catalogSpecificationDefinitions.specificationDefinitionId, id), eq(catalogSpecificationDefinitions.version, patch.expectedVersion))).returning(); return row ? mapDefinition(row) : null; }

  async configureConditions(workspaceId: string, values: readonly WorkspaceRegistryAvailability[]): Promise<void> { for (const value of values) await this.database.insert(workspaceConditionAvailability).values({ workspaceId, conditionCode: value.code, enabled: value.enabled, sortOrder: value.sortOrder }).onConflictDoUpdate({ target: [workspaceConditionAvailability.workspaceId, workspaceConditionAvailability.conditionCode], set: { enabled: value.enabled, sortOrder: value.sortOrder } }); }
  async configureCurrencies(workspaceId: string, values: readonly WorkspaceRegistryAvailability[]): Promise<void> { for (const value of values) await this.database.insert(workspaceCurrencyAvailability).values({ workspaceId, currencyCode: value.code, enabled: value.enabled, sortOrder: value.sortOrder }).onConflictDoUpdate({ target: [workspaceCurrencyAvailability.workspaceId, workspaceCurrencyAvailability.currencyCode], set: { enabled: value.enabled, sortOrder: value.sortOrder } }); }

  async configureTemplate(input: { readonly workspaceId: string; readonly id: string; readonly productTypeId: string; readonly entries: SpecificationTemplate["entries"]; readonly expectedVersion?: number; readonly now: Date }): Promise<SpecificationTemplate | null> {
    const [existing] = await this.database.select().from(catalogSpecificationTemplates).where(and(eq(catalogSpecificationTemplates.workspaceId, input.workspaceId), eq(catalogSpecificationTemplates.productTypeId, input.productTypeId))).limit(1);
    let templateId: string;
    let version: number;
    let createdAt: Date;
    if (existing) {
      if (input.expectedVersion === undefined || input.expectedVersion !== existing.version) return null;
      const [updated] = await this.database.update(catalogSpecificationTemplates).set({ version: existing.version + 1, updatedAt: input.now }).where(and(eq(catalogSpecificationTemplates.workspaceId, input.workspaceId), eq(catalogSpecificationTemplates.specificationTemplateId, existing.specificationTemplateId), eq(catalogSpecificationTemplates.version, existing.version))).returning();
      if (!updated) return null;
      templateId = updated.specificationTemplateId; version = updated.version; createdAt = updated.createdAt;
      await this.database.delete(catalogSpecificationTemplateEntries).where(and(eq(catalogSpecificationTemplateEntries.workspaceId, input.workspaceId), eq(catalogSpecificationTemplateEntries.specificationTemplateId, templateId)));
    } else {
      if (input.expectedVersion !== undefined) return null;
      const [created] = await this.database.insert(catalogSpecificationTemplates).values({ workspaceId: input.workspaceId, specificationTemplateId: input.id, productTypeId: input.productTypeId, version: 1, createdAt: input.now, updatedAt: input.now }).returning();
      templateId = created.specificationTemplateId; version = created.version; createdAt = created.createdAt;
    }
    if (input.entries.length > 0) await this.database.insert(catalogSpecificationTemplateEntries).values(input.entries.map((entry) => ({ workspaceId: input.workspaceId, specificationTemplateId: templateId, specificationDefinitionId: entry.specificationDefinitionId, sortOrder: entry.sortOrder, required: entry.required })));
    return Object.freeze({ workspaceId: input.workspaceId, id: templateId, productTypeId: input.productTypeId, version, entries: input.entries, createdAt, updatedAt: input.now });
  }
}

const FORBIDDEN_AUDIT_KEY = /password|credential|hash|otp|digest|secret|token/i;
export class PostgreSqlCatalogReferenceAuditRepository implements CatalogReferenceAuditRepository {
  constructor(private readonly database: PlatformDatabase) {}
  async append(record: CatalogReferenceAuditRecord): Promise<void> {
    if (Object.keys(record.metadata ?? {}).some((key) => FORBIDDEN_AUDIT_KEY.test(key))) throw new Error("UnsafeCatalogReferenceAuditMetadata");
    await this.database.insert(securityAuditEvents).values({ workspaceId: record.workspaceId, auditId: randomUUID(), eventType: record.eventType, actorId: record.actorId, subjectActorId: null, resultCode: "Succeeded", metadata: { referenceId: record.referenceId, ...(record.code ? { code: record.code } : {}), ...(record.metadata ?? {}) }, occurredAt: record.occurredAt });
  }
}
