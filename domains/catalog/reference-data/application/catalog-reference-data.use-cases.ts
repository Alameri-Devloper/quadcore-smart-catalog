import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import {
  CONDITION_REGISTRY,
  DEVICE_CLASS_REGISTRY,
  ISO_CURRENCY_REGISTRY,
  compareReferences,
  isConditionCode,
  isCurrencyCode,
  normalizeDisplayName,
  normalizeOptionalUnit,
  normalizeReferenceCode,
  validateSortOrder,
  validateSpecificationValueType,
  validateStatus,
  type CatalogReferenceRecord,
  type SpecificationDefinition,
  type WorkspaceRegistryAvailability,
} from "../domain/catalog-reference-data";
import type {
  CatalogReferenceClock,
  CatalogReferenceDataRepository,
  CatalogReferenceDataSnapshot,
  CatalogReferenceDataUnitOfWork,
  CatalogReferenceIdentifierGenerator,
  ReferenceRecordPatch,
} from "../ports/catalog-reference-data-unit-of-work.port";
import { referenceFailure, referenceSuccess, type CatalogReferenceDataResult } from "./catalog-reference-data-result";

export const CATALOG_REFERENCE_PERMISSIONS = Object.freeze({
  view: "catalog.referenceData.view",
  manage: "catalog.referenceData.manage",
});

const can = (context: TrustedActorContext, permission: string): boolean => context.permissions.includes(permission);
const invalid = <T>(work: () => T): CatalogReferenceDataResult<T> => {
  try { return referenceSuccess(work()); }
  catch { return referenceFailure("InvalidInput"); }
};

interface Dependencies {
  readonly unitOfWork: CatalogReferenceDataUnitOfWork;
  readonly identifiers: CatalogReferenceIdentifierGenerator;
  readonly clock: CatalogReferenceClock;
}

export interface CreateReferenceCommand {
  readonly context: TrustedActorContext;
  readonly code: string;
  readonly displayName: string;
  readonly sortOrder: number;
}

export interface UpdateReferenceCommand {
  readonly context: TrustedActorContext;
  readonly id: string;
  readonly expectedVersion: number;
  readonly displayName?: string;
  readonly sortOrder?: number;
  readonly status?: string;
}

type DynamicKind = "Department" | "Category" | "ProductType" | "Brand" | "SupplyStatus" | "SpecificationDefinition";

const newRecord = (dependencies: Dependencies, command: CreateReferenceCommand) => ({
  workspaceId: command.context.workspaceId,
  id: dependencies.identifiers.next(),
  code: normalizeReferenceCode(command.code),
  displayName: normalizeDisplayName(command.displayName),
  sortOrder: validateSortOrder(command.sortOrder),
  createdAt: dependencies.clock.now(),
});

const auditCreated = async (audit: Parameters<CatalogReferenceDataUnitOfWork["execute"]>[0] extends (context: infer C) => unknown ? C : never, kind: DynamicKind, actorId: string, record: CatalogReferenceRecord): Promise<void> => {
  await audit.audit.append({ workspaceId: record.workspaceId, actorId, eventType: `${kind}Created`, referenceId: record.id, code: record.code, occurredAt: record.createdAt });
};

const snapshotRecord = (snapshot: CatalogReferenceDataSnapshot, kind: DynamicKind, id: string): CatalogReferenceRecord | SpecificationDefinition | undefined => {
  const records = kind === "Department" ? snapshot.departments
    : kind === "Category" ? snapshot.categories
    : kind === "ProductType" ? snapshot.productTypes
    : kind === "Brand" ? snapshot.brands
    : kind === "SupplyStatus" ? snapshot.supplyStatuses
    : snapshot.specificationDefinitions;
  return records.find((record) => record.id === id);
};

const patchFrom = (clock: CatalogReferenceClock, command: UpdateReferenceCommand): CatalogReferenceDataResult<ReferenceRecordPatch> => invalid(() => ({
  ...(command.displayName !== undefined ? { displayName: normalizeDisplayName(command.displayName) } : {}),
  ...(command.sortOrder !== undefined ? { sortOrder: validateSortOrder(command.sortOrder) } : {}),
  ...(command.status !== undefined ? { status: validateStatus(command.status) } : {}),
  expectedVersion: Number.isSafeInteger(command.expectedVersion) && command.expectedVersion > 0 ? command.expectedVersion : (() => { throw new Error("InvalidVersion"); })(),
  updatedAt: clock.now(),
}));

const updateReference = async <T extends CatalogReferenceRecord>(
  dependencies: Dependencies,
  kind: DynamicKind,
  command: UpdateReferenceCommand,
  update: (repository: CatalogReferenceDataRepository, workspaceId: string, id: string, patch: ReferenceRecordPatch) => Promise<T | null>,
): Promise<CatalogReferenceDataResult<T>> => {
  if (!can(command.context, CATALOG_REFERENCE_PERMISSIONS.manage)) return referenceFailure("Forbidden");
  const parsed = patchFrom(dependencies.clock, command);
  if (!parsed.ok) return parsed;
  return dependencies.unitOfWork.execute(async ({ references, audit }) => {
    const before = snapshotRecord(await references.getSnapshot(command.context.workspaceId), kind, command.id);
    if (!before) return referenceFailure("NotFound");
    const updated = await update(references, command.context.workspaceId, command.id, parsed.value);
    if (!updated) return referenceFailure("Conflict");
    const statusChanged = before.status !== updated.status;
    const eventType = statusChanged ? `${kind}${updated.status === "Active" ? "Activated" : "Deactivated"}` : `${kind}Updated`;
    await audit.append({
      workspaceId: command.context.workspaceId,
      actorId: command.context.actorId,
      eventType,
      referenceId: updated.id,
      code: updated.code,
      metadata: statusChanged ? { from: before.status, to: updated.status } : { version: updated.version },
      occurredAt: updated.updatedAt,
    });
    return referenceSuccess(updated);
  });
};

export class GetCatalogReferenceDataUseCase {
  constructor(private readonly unitOfWork: CatalogReferenceDataUnitOfWork) {}

  async execute(command: { readonly context: TrustedActorContext; readonly includeInactive?: boolean }) {
    if (!can(command.context, CATALOG_REFERENCE_PERMISSIONS.view)) return referenceFailure("Forbidden");
    if (command.includeInactive && !can(command.context, CATALOG_REFERENCE_PERMISSIONS.manage)) return referenceFailure("Forbidden");
    return this.unitOfWork.execute(async ({ references }) => {
      const snapshot = await references.getSnapshot(command.context.workspaceId);
      if (command.includeInactive) return referenceSuccess({ ...snapshot, deviceClasses: DEVICE_CLASS_REGISTRY, conditionRegistry: CONDITION_REGISTRY, currencyRegistry: ISO_CURRENCY_REGISTRY });
      const departments = snapshot.departments.filter(({ status }) => status === "Active").sort(compareReferences);
      const departmentIds = new Set(departments.map(({ id }) => id));
      const categories = snapshot.categories.filter((item) => item.status === "Active" && departmentIds.has(item.departmentId)).sort(compareReferences);
      const categoryIds = new Set(categories.map(({ id }) => id));
      const productTypes = snapshot.productTypes.filter((item) => item.status === "Active" && categoryIds.has(item.categoryId)).sort(compareReferences);
      const productTypeIds = new Set(productTypes.map(({ id }) => id));
      const specificationDefinitions = snapshot.specificationDefinitions.filter(({ status }) => status === "Active").sort(compareReferences);
      const definitionIds = new Set(specificationDefinitions.map(({ id }) => id));
      return referenceSuccess({
        departments,
        categories,
        productTypes,
        brands: snapshot.brands.filter(({ status }) => status === "Active").sort(compareReferences),
        supplyStatuses: snapshot.supplyStatuses.filter(({ status }) => status === "Active").sort(compareReferences),
        deviceClasses: DEVICE_CLASS_REGISTRY,
        conditions: snapshot.conditions.filter(({ enabled }) => enabled).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)),
        conditionRegistry: CONDITION_REGISTRY,
        currencies: snapshot.currencies.filter(({ enabled }) => enabled).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)),
        currencyRegistry: ISO_CURRENCY_REGISTRY,
        specificationDefinitions,
        specificationTemplates: snapshot.specificationTemplates
          .filter(({ productTypeId }) => productTypeIds.has(productTypeId))
          .map((template) => ({ ...template, entries: template.entries.filter(({ specificationDefinitionId }) => definitionIds.has(specificationDefinitionId)) })),
      });
    });
  }
}

abstract class CreateUseCase<T extends CatalogReferenceRecord> {
  protected constructor(protected readonly dependencies: Dependencies, private readonly kind: DynamicKind) {}
  protected async create(command: CreateReferenceCommand, write: (repository: CatalogReferenceDataRepository, record: ReturnType<typeof newRecord>) => Promise<T>): Promise<CatalogReferenceDataResult<T>> {
    if (!can(command.context, CATALOG_REFERENCE_PERMISSIONS.manage)) return referenceFailure("Forbidden");
    const parsed = invalid(() => newRecord(this.dependencies, command));
    if (!parsed.ok) return parsed;
    return this.dependencies.unitOfWork.execute(async (transaction) => {
      if (await transaction.references.codeExists(command.context.workspaceId, this.kind, parsed.value.code)) return referenceFailure("Conflict");
      const created = await write(transaction.references, parsed.value);
      await auditCreated(transaction, this.kind, command.context.actorId, created);
      return referenceSuccess(created);
    });
  }
}

export class CreateDepartmentUseCase extends CreateUseCase<CatalogReferenceRecord> {
  constructor(dependencies: Dependencies) { super(dependencies, "Department"); }
  execute(command: CreateReferenceCommand) { return this.create(command, (repository, record) => repository.createDepartment(record)); }
}

export class CreateBrandUseCase extends CreateUseCase<CatalogReferenceRecord> {
  constructor(dependencies: Dependencies) { super(dependencies, "Brand"); }
  execute(command: CreateReferenceCommand) { return this.create(command, (repository, record) => repository.createBrand(record)); }
}

export class CreateSupplyStatusUseCase extends CreateUseCase<CatalogReferenceRecord> {
  constructor(dependencies: Dependencies) { super(dependencies, "SupplyStatus"); }
  execute(command: CreateReferenceCommand) { return this.create(command, (repository, record) => repository.createSupplyStatus(record)); }
}

export class CreateCategoryUseCase extends CreateUseCase<CatalogReferenceRecord> {
  constructor(dependencies: Dependencies) { super(dependencies, "Category"); }
  async execute(command: CreateReferenceCommand & { readonly departmentId: string }) {
    return this.create(command, async (repository, record) => {
      const parent = await repository.findDepartment(command.context.workspaceId, command.departmentId);
      if (!parent || parent.status !== "Active") throw new Error("ParentNotFound");
      return repository.createCategory({ ...record, departmentId: parent.id });
    }).catch((error: unknown) => error instanceof Error && error.message === "ParentNotFound" ? referenceFailure("NotFound") : Promise.reject(error));
  }
}

export class CreateProductTypeUseCase extends CreateUseCase<CatalogReferenceRecord> {
  constructor(dependencies: Dependencies) { super(dependencies, "ProductType"); }
  async execute(command: CreateReferenceCommand & { readonly categoryId: string }) {
    return this.create(command, async (repository, record) => {
      const parent = await repository.findCategory(command.context.workspaceId, command.categoryId);
      if (!parent || parent.status !== "Active") throw new Error("ParentNotFound");
      return repository.createProductType({ ...record, categoryId: parent.id });
    }).catch((error: unknown) => error instanceof Error && error.message === "ParentNotFound" ? referenceFailure("NotFound") : Promise.reject(error));
  }
}

export class CreateSpecificationDefinitionUseCase extends CreateUseCase<SpecificationDefinition> {
  constructor(dependencies: Dependencies) { super(dependencies, "SpecificationDefinition"); }
  execute(command: CreateReferenceCommand & { readonly valueType: string; readonly unit?: string | null }) {
    const specific = invalid(() => ({ valueType: validateSpecificationValueType(command.valueType), unit: normalizeOptionalUnit(command.unit) }));
    if (!specific.ok) return Promise.resolve(specific);
    return this.create(command, (repository, record) => repository.createSpecificationDefinition({ ...record, ...specific.value }));
  }
}

export class UpdateDepartmentUseCase { constructor(private readonly dependencies: Dependencies) {} execute(command: UpdateReferenceCommand) { return updateReference(this.dependencies, "Department", command, (repo, ws, id, patch) => repo.updateDepartment(ws, id, patch)); } }
export class UpdateCategoryUseCase { constructor(private readonly dependencies: Dependencies) {} execute(command: UpdateReferenceCommand) { return updateReference(this.dependencies, "Category", command, (repo, ws, id, patch) => repo.updateCategory(ws, id, patch)); } }
export class UpdateProductTypeUseCase { constructor(private readonly dependencies: Dependencies) {} execute(command: UpdateReferenceCommand) { return updateReference(this.dependencies, "ProductType", command, (repo, ws, id, patch) => repo.updateProductType(ws, id, patch)); } }
export class UpdateBrandUseCase { constructor(private readonly dependencies: Dependencies) {} execute(command: UpdateReferenceCommand) { return updateReference(this.dependencies, "Brand", command, (repo, ws, id, patch) => repo.updateBrand(ws, id, patch)); } }
export class UpdateSupplyStatusUseCase { constructor(private readonly dependencies: Dependencies) {} execute(command: UpdateReferenceCommand) { return updateReference(this.dependencies, "SupplyStatus", command, (repo, ws, id, patch) => repo.updateSupplyStatus(ws, id, patch)); } }

export class UpdateSpecificationDefinitionUseCase {
  constructor(private readonly dependencies: Dependencies) {}
  execute(command: UpdateReferenceCommand & { readonly valueType?: string; readonly unit?: string | null }) {
    const specific = invalid(() => ({
      ...(command.valueType !== undefined ? { valueType: validateSpecificationValueType(command.valueType) } : {}),
      ...(command.unit !== undefined ? { unit: normalizeOptionalUnit(command.unit) } : {}),
    }));
    if (!specific.ok) return Promise.resolve(specific);
    return updateReference(this.dependencies, "SpecificationDefinition", command, (repo, ws, id, patch) => repo.updateSpecificationDefinition(ws, id, { ...patch, ...specific.value }));
  }
}

const parseAvailability = (workspaceId: string, values: readonly { readonly code: string; readonly enabled: boolean; readonly sortOrder: number }[], validCode: (code: string) => boolean): CatalogReferenceDataResult<readonly WorkspaceRegistryAvailability[]> => invalid(() => {
  if (new Set(values.map(({ code }) => code)).size !== values.length) throw new Error("DuplicateRegistryCode");
  return values.map((value) => {
    if (!validCode(value.code) || typeof value.enabled !== "boolean") throw new Error("InvalidRegistryCode");
    return Object.freeze({ workspaceId, code: value.code, enabled: value.enabled, sortOrder: validateSortOrder(value.sortOrder) });
  });
});

abstract class ConfigureAvailabilityUseCase {
  protected constructor(private readonly dependencies: Dependencies, private readonly kind: "Condition" | "Currency") {}
  async configure(command: { readonly context: TrustedActorContext; readonly values: readonly { readonly code: string; readonly enabled: boolean; readonly sortOrder: number }[] }) {
    if (!can(command.context, CATALOG_REFERENCE_PERMISSIONS.manage)) return referenceFailure("Forbidden");
    const parsed = parseAvailability(command.context.workspaceId, command.values, this.kind === "Condition" ? isConditionCode : isCurrencyCode);
    if (!parsed.ok) return parsed;
    return this.dependencies.unitOfWork.execute(async ({ references, audit }) => {
      if (this.kind === "Condition") await references.configureConditions(command.context.workspaceId, parsed.value);
      else await references.configureCurrencies(command.context.workspaceId, parsed.value);
      const now = this.dependencies.clock.now();
      await audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: `${this.kind}AvailabilityChanged`, referenceId: command.context.workspaceId, metadata: { configuredCount: parsed.value.length }, occurredAt: now });
      return referenceSuccess(parsed.value);
    });
  }
}

export class ConfigureWorkspaceConditionsUseCase extends ConfigureAvailabilityUseCase { constructor(dependencies: Dependencies) { super(dependencies, "Condition"); } execute(command: Parameters<ConfigureAvailabilityUseCase["configure"]>[0]) { return this.configure(command); } }
export class ConfigureWorkspaceCurrenciesUseCase extends ConfigureAvailabilityUseCase { constructor(dependencies: Dependencies) { super(dependencies, "Currency"); } execute(command: Parameters<ConfigureAvailabilityUseCase["configure"]>[0]) { return this.configure(command); } }

export class ConfigureProductTypeSpecificationTemplateUseCase {
  constructor(private readonly dependencies: Dependencies) {}
  async execute(command: { readonly context: TrustedActorContext; readonly productTypeId: string; readonly expectedVersion?: number; readonly entries: readonly { readonly specificationDefinitionId: string; readonly sortOrder: number; readonly required?: boolean }[] }) {
    if (!can(command.context, CATALOG_REFERENCE_PERMISSIONS.manage)) return referenceFailure("Forbidden");
    const parsed = invalid(() => {
      if (new Set(command.entries.map(({ specificationDefinitionId }) => specificationDefinitionId)).size !== command.entries.length) throw new Error("DuplicateDefinition");
      if (new Set(command.entries.map(({ sortOrder }) => sortOrder)).size !== command.entries.length) throw new Error("DuplicateSortOrder");
      if (command.expectedVersion !== undefined && (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 1)) throw new Error("InvalidVersion");
      return command.entries.map((entry) => Object.freeze({ specificationDefinitionId: entry.specificationDefinitionId, sortOrder: validateSortOrder(entry.sortOrder), required: entry.required ?? false }));
    });
    if (!parsed.ok) return parsed;
    return this.dependencies.unitOfWork.execute(async ({ references, audit }) => {
      const productType = await references.findProductType(command.context.workspaceId, command.productTypeId);
      if (!productType || productType.status !== "Active") return referenceFailure("NotFound");
      for (const entry of parsed.value) {
        const definition = await references.findSpecificationDefinition(command.context.workspaceId, entry.specificationDefinitionId);
        if (!definition || definition.status !== "Active") return referenceFailure("NotFound");
      }
      const now = this.dependencies.clock.now();
      const configured = await references.configureTemplate({ workspaceId: command.context.workspaceId, id: this.dependencies.identifiers.next(), productTypeId: productType.id, entries: parsed.value, expectedVersion: command.expectedVersion, now });
      if (!configured) return referenceFailure("Conflict");
      await audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: "SpecificationTemplateConfigured", referenceId: configured.id, metadata: { productTypeId: productType.id, entryCount: configured.entries.length, version: configured.version }, occurredAt: now });
      return referenceSuccess(configured);
    });
  }
}
