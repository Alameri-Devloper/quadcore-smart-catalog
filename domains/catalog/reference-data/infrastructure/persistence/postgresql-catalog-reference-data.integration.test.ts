import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPlatformDatabaseConnection } from "../../../../../shared/infrastructure/persistence/database";
import type { TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import { workspaces } from "../../../../workspace/infrastructure/persistence/schema";
import { assertSafeIntegrationTestDatabaseUrl } from "../../../infrastructure/persistence/integration-test-database-safety";
import {
  ConfigureProductTypeSpecificationTemplateUseCase,
  ConfigureWorkspaceConditionsUseCase,
  ConfigureWorkspaceCurrenciesUseCase,
  CreateCategoryUseCase,
  CreateDepartmentUseCase,
  CreateProductTypeUseCase,
  CreateSpecificationDefinitionUseCase,
  GetCatalogReferenceDataUseCase,
  UpdateDepartmentUseCase,
} from "../../application/catalog-reference-data.use-cases";
import { catalogCategories } from "../../../infrastructure/persistence/schema";
import { PostgreSqlCatalogReferenceDataUnitOfWork } from "./postgresql-catalog-reference-data-unit-of-work";

const connectionUrl = process.env.TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL);
const connection = createPlatformDatabaseConnection(connectionUrl!);
const unitOfWork = new PostgreSqlCatalogReferenceDataUnitOfWork(connection.database);
let sequence = 0;
const dependencies = { unitOfWork, identifiers: { next: () => `reference-${++sequence}` }, clock: { now: () => new Date("2026-08-19T10:00:00.000Z") } };
const context = (workspaceId: string, permissions = ["catalog.referenceData.view", "catalog.referenceData.manage"]): TrustedActorContext => Object.freeze({ workspaceId, actorId: `actor-${workspaceId}`, role: "Staff", permissions, branchScope: { type: "AllBranches" as const }, authorizationVersion: 1 });
const create = (workspaceId: string, code: string, displayName = code) => ({ context: context(workspaceId), code, displayName, sortOrder: 10 });

before(async () => migrate(connection.database, { migrationsFolder: "drizzle" }));
beforeEach(async () => {
  sequence = 0;
  await connection.database.execute(sql`TRUNCATE TABLE workspaces CASCADE`);
  const now = new Date("2026-08-19T09:00:00.000Z");
  await connection.database.insert(workspaces).values([
    { workspaceId: "workspace-a", companyId: "company-a", workspaceCode: "workspace-a", displayName: "A", passwordRecoveryPolicy: "OwnerManagedOnly", createdAt: now, updatedAt: now },
    { workspaceId: "workspace-b", companyId: "company-b", workspaceCode: "workspace-b", displayName: "B", passwordRecoveryPolicy: "OwnerManagedOnly", createdAt: now, updatedAt: now },
  ]);
});
after(async () => connection.close());

describe("PostgreSQL Catalog Reference Data", () => {
  it("creates the scoped hierarchy and allows the same code in another Workspace", async () => {
    const departments = new CreateDepartmentUseCase(dependencies);
    const first = await departments.execute(create("workspace-a", "computers", "أجهزة الكمبيوتر"));
    const second = await departments.execute(create("workspace-b", "computers", "Computers"));
    assert.equal(first.ok, true); assert.equal(second.ok, true);
    if (!first.ok) return;
    const category = await new CreateCategoryUseCase(dependencies).execute({ ...create("workspace-a", "laptops", "Laptops"), departmentId: first.value.id });
    assert.equal(category.ok, true);
    if (!category.ok) return;
    const productType = await new CreateProductTypeUseCase(dependencies).execute({ ...create("workspace-a", "gaming-laptops", "Gaming Laptops"), categoryId: category.value.id });
    assert.equal(productType.ok, true);
    const read = await new GetCatalogReferenceDataUseCase(unitOfWork).execute({ context: context("workspace-a") });
    assert.equal(read.ok && read.value.productTypes.length, 1);
    assert.deepEqual(await departments.execute(create("workspace-a", "computers", "Duplicate")), { ok: false, error: "Conflict" });
  });

  it("does not disclose or reference a foreign Workspace parent", async () => {
    const department = await new CreateDepartmentUseCase(dependencies).execute(create("workspace-b", "foreign"));
    assert.equal(department.ok, true);
    if (!department.ok) return;
    assert.deepEqual(await new CreateCategoryUseCase(dependencies).execute({ ...create("workspace-a", "blocked"), departmentId: department.value.id }), { ok: false, error: "NotFound" });
    const snapshot = await new GetCatalogReferenceDataUseCase(unitOfWork).execute({ context: context("workspace-a") });
    assert.equal(snapshot.ok && snapshot.value.categories.length, 0);
    const localDepartment = await new CreateDepartmentUseCase(dependencies).execute(create("workspace-a", "local"));
    const foreignCategory = await new CreateCategoryUseCase(dependencies).execute({ ...create("workspace-b", "foreign-category"), departmentId: department.value.id });
    assert.equal(localDepartment.ok, true); assert.equal(foreignCategory.ok, true);
    if (!foreignCategory.ok) return;
    assert.deepEqual(await new CreateProductTypeUseCase(dependencies).execute({ ...create("workspace-a", "blocked-type"), categoryId: foreignCategory.value.id }), { ok: false, error: "NotFound" });
    assert.deepEqual(await new UpdateDepartmentUseCase(dependencies).execute({ context: context("workspace-a"), id: department.value.id, expectedVersion: 1, displayName: "Blocked" }), { ok: false, error: "NotFound" });
  });

  it("persists inactive values, excludes them from selection, and rejects stale updates", async () => {
    const created = await new CreateDepartmentUseCase(dependencies).execute(create("workspace-a", "computers", "Computers"));
    assert.equal(created.ok, true); if (!created.ok) return;
    const category = await new CreateCategoryUseCase(dependencies).execute({ ...create("workspace-a", "laptops"), departmentId: created.value.id });
    assert.equal(category.ok, true); if (!category.ok) return;
    const productType = await new CreateProductTypeUseCase(dependencies).execute({ ...create("workspace-a", "ultrabook"), categoryId: category.value.id });
    assert.equal(productType.ok, true);
    const updates = new UpdateDepartmentUseCase(dependencies);
    const inactive = await updates.execute({ context: context("workspace-a"), id: created.value.id, expectedVersion: 1, status: "Inactive" });
    assert.equal(inactive.ok && inactive.value.version, 2);
    assert.deepEqual(await updates.execute({ context: context("workspace-a"), id: created.value.id, expectedVersion: 1, displayName: "Stale" }), { ok: false, error: "Conflict" });
    const selection = await new GetCatalogReferenceDataUseCase(unitOfWork).execute({ context: context("workspace-a") });
    const administration = await new GetCatalogReferenceDataUseCase(unitOfWork).execute({ context: context("workspace-a"), includeInactive: true });
    assert.equal(selection.ok && selection.value.departments.length, 0);
    assert.equal(selection.ok && selection.value.categories.length, 0);
    assert.equal(selection.ok && selection.value.productTypes.length, 0);
    assert.equal(administration.ok && administration.value.departments.length, 1);
    assert.equal(administration.ok && administration.value.categories.length, 1);
    assert.equal(administration.ok && administration.value.productTypes.length, 1);
  });

  it("validates fixed registries and persists Workspace availability", async () => {
    const conditions = new ConfigureWorkspaceConditionsUseCase(dependencies);
    const currencies = new ConfigureWorkspaceCurrenciesUseCase(dependencies);
    assert.deepEqual(await conditions.execute({ context: context("workspace-a"), values: [{ code: "invented", enabled: true, sortOrder: 0 }] }), { ok: false, error: "InvalidInput" });
    assert.equal((await conditions.execute({ context: context("workspace-a"), values: [{ code: "new", enabled: true, sortOrder: 0 }, { code: "used", enabled: false, sortOrder: 1 }] })).ok, true);
    assert.equal((await currencies.execute({ context: context("workspace-a"), values: [{ code: "USD", enabled: true, sortOrder: 0 }, { code: "EUR", enabled: true, sortOrder: 1 }] })).ok, true);
    assert.deepEqual(await currencies.execute({ context: context("workspace-a"), values: [{ code: "ZZZ", enabled: true, sortOrder: 0 }] }), { ok: false, error: "InvalidInput" });
    const read = await new GetCatalogReferenceDataUseCase(unitOfWork).execute({ context: context("workspace-a") });
    assert.deepEqual(read.ok && read.value.conditions.map(({ code }) => code), ["new"]);
    assert.deepEqual(read.ok && read.value.currencies.map(({ code }) => code), ["USD", "EUR"]);
  });

  it("configures one ordered template and rejects foreign definitions", async () => {
    const department = await new CreateDepartmentUseCase(dependencies).execute(create("workspace-a", "computers")); assert.equal(department.ok, true); if (!department.ok) return;
    const category = await new CreateCategoryUseCase(dependencies).execute({ ...create("workspace-a", "laptops"), departmentId: department.value.id }); assert.equal(category.ok, true); if (!category.ok) return;
    const productType = await new CreateProductTypeUseCase(dependencies).execute({ ...create("workspace-a", "gaming-laptops"), categoryId: category.value.id }); assert.equal(productType.ok, true); if (!productType.ok) return;
    const localDefinition = await new CreateSpecificationDefinitionUseCase(dependencies).execute({ ...create("workspace-a", "ram", "RAM"), valueType: "Number", unit: "GB" }); assert.equal(localDefinition.ok, true); if (!localDefinition.ok) return;
    const foreignDefinition = await new CreateSpecificationDefinitionUseCase(dependencies).execute({ ...create("workspace-b", "ram", "RAM"), valueType: "Number", unit: "GB" }); assert.equal(foreignDefinition.ok, true); if (!foreignDefinition.ok) return;
    const templates = new ConfigureProductTypeSpecificationTemplateUseCase(dependencies);
    assert.deepEqual(await templates.execute({ context: context("workspace-a"), productTypeId: productType.value.id, entries: [{ specificationDefinitionId: foreignDefinition.value.id, sortOrder: 0 }] }), { ok: false, error: "NotFound" });
    assert.deepEqual(await templates.execute({ context: context("workspace-a"), productTypeId: productType.value.id, entries: [{ specificationDefinitionId: localDefinition.value.id, sortOrder: 0 }, { specificationDefinitionId: localDefinition.value.id, sortOrder: 1 }] }), { ok: false, error: "InvalidInput" });
    assert.deepEqual(await templates.execute({ context: context("workspace-a"), productTypeId: productType.value.id, entries: [{ specificationDefinitionId: localDefinition.value.id, sortOrder: 0 }, { specificationDefinitionId: foreignDefinition.value.id, sortOrder: 0 }] }), { ok: false, error: "InvalidInput" });
    const configured = await templates.execute({ context: context("workspace-a"), productTypeId: productType.value.id, entries: [{ specificationDefinitionId: localDefinition.value.id, sortOrder: 0, required: true }] });
    assert.equal(configured.ok && configured.value.entries[0]?.required, true);
    if (!configured.ok) return;
    const updated = await templates.execute({ context: context("workspace-a"), productTypeId: productType.value.id, expectedVersion: 1, entries: [{ specificationDefinitionId: localDefinition.value.id, sortOrder: 1, required: false }] });
    assert.equal(updated.ok && updated.value.version, 2);
    assert.equal(updated.ok && updated.value.id, configured.value.id);
    assert.deepEqual(await templates.execute({ context: context("workspace-a"), productTypeId: productType.value.id, expectedVersion: 1, entries: [] }), { ok: false, error: "Conflict" });
    const read = await new GetCatalogReferenceDataUseCase(unitOfWork).execute({ context: context("workspace-a") });
    assert.equal(read.ok && read.value.specificationDefinitions.length, 1);
    assert.equal(read.ok && read.value.specificationTemplates.length, 1);
  });

  it("enforces composite Workspace hierarchy ownership and migrated permission codes", async () => {
    const foreignDepartment = await new CreateDepartmentUseCase(dependencies).execute(create("workspace-b", "foreign"));
    assert.equal(foreignDepartment.ok, true); if (!foreignDepartment.ok) return;
    await assert.rejects(() => connection.database.insert(catalogCategories).values({
      workspaceId: "workspace-a", categoryId: "direct-category", departmentId: foreignDepartment.value.id,
      code: "direct", displayName: "Direct", status: "Active", sortOrder: 0, version: 1,
      createdAt: new Date("2026-08-19T10:00:00.000Z"), updatedAt: new Date("2026-08-19T10:00:00.000Z"),
    }));
    const constraint = await connection.database.execute(sql<{ definition: string }>`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conname = 'identity_membership_permissions_known_code'
    `);
    assert.equal(constraint.rows.length, 1);
    assert.match(String(constraint.rows[0]!.definition), /catalog\.referenceData\.view/);
    assert.match(String(constraint.rows[0]!.definition), /catalog\.referenceData\.manage/);
  });

  it("enforces read/use and management permissions independently", async () => {
    assert.deepEqual(await new CreateDepartmentUseCase(dependencies).execute(create("workspace-a", "blocked", "Blocked")), { ok: true, value: await unitOfWork.execute(({ references }) => references.findDepartment("workspace-a", "reference-1")) });
    const readOnly = context("workspace-a", ["catalog.referenceData.view"]);
    const denied = await new CreateDepartmentUseCase(dependencies).execute({ context: readOnly, code: "no", displayName: "No", sortOrder: 0 });
    assert.deepEqual(denied, { ok: false, error: "Forbidden" });
    assert.equal((await new GetCatalogReferenceDataUseCase(unitOfWork).execute({ context: readOnly })).ok, true);
    assert.deepEqual(await new GetCatalogReferenceDataUseCase(unitOfWork).execute({ context: readOnly, includeInactive: true }), { ok: false, error: "Forbidden" });
  });
});
