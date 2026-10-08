import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
import type { CatalogReferenceDataUnitOfWork } from "../../ports/catalog-reference-data-unit-of-work.port";
import { CatalogReferencePersistenceConflictError, PostgreSqlCatalogReferenceDataUnitOfWork } from "./postgresql-catalog-reference-data-unit-of-work";

const connectionUrl = process.env.TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL);
const connection = createPlatformDatabaseConnection(connectionUrl!);
const unitOfWork = new PostgreSqlCatalogReferenceDataUnitOfWork(connection.database);
let sequence = 0;
const dependencies = { unitOfWork, identifiers: { next: () => `reference-${++sequence}` }, clock: { now: () => new Date("2026-08-19T10:00:00.000Z") } };
const context = (workspaceId: string, permissions = ["catalog.referenceData.view", "catalog.referenceData.manage"]): TrustedActorContext => Object.freeze({ workspaceId, actorId: `actor-${workspaceId}`, role: "Staff", permissions, branchScope: { type: "AllBranches" as const }, authorizationVersion: 1 });
const create = (workspaceId: string, code: string, displayName = code) => ({ context: context(workspaceId), code, displayName, sortOrder: 10 });

const templateFixture = async (workspaceId = "workspace-a") => {
  const department = await new CreateDepartmentUseCase(dependencies).execute(create(workspaceId, "computers"));
  assert.ok(department.ok);
  const category = await new CreateCategoryUseCase(dependencies).execute({ ...create(workspaceId, "laptops"), departmentId: department.value.id });
  assert.ok(category.ok);
  const type = await new CreateProductTypeUseCase(dependencies).execute({ ...create(workspaceId, "type"), categoryId: category.value.id });
  const definition = await new CreateSpecificationDefinitionUseCase(dependencies).execute({ ...create(workspaceId, "spec"), valueType: "Text" });
  assert.ok(type.ok); assert.ok(definition.ok);
  return { productTypeId: type.value.id, specificationDefinitionId: definition.value.id };
};
const auditCount = async () => Number((await connection.database.execute(sql`SELECT count(*) AS count FROM security_audit_events WHERE event_type = 'SpecificationTemplateConfigured'`)).rows[0].count);
const barrier = () => {
  let release!: () => void;
  const reached = new Promise<void>((resolve) => { release = resolve; });
  return { reached, release };
};

// Each fixture is a new, guarded test database, never the application target.
const migrationFixture = async (work: (fixture: ReturnType<typeof createPlatformDatabaseConnection>) => Promise<void>) => {
  const fixtureUrl = new URL(connectionUrl!);
  const databaseName = `qsc_p2_test_${randomUUID().replaceAll("-", "")}`;
  fixtureUrl.pathname = `/${databaseName}`;
  assertSafeIntegrationTestDatabaseUrl(fixtureUrl.toString(), process.env.DATABASE_URL);
  await connection.database.execute(sql`CREATE DATABASE ${sql.identifier(databaseName)}`);
  const fixture = createPlatformDatabaseConnection(fixtureUrl.toString());
  try { await work(fixture); }
  finally {
    await fixture.close();
    assertSafeIntegrationTestDatabaseUrl(fixtureUrl.toString(), process.env.DATABASE_URL);
    if (!/^qsc_p2_test_[0-9a-f]{32}$/.test(databaseName)) throw new Error("UnsafeFixtureDatabase");
    await connection.database.execute(sql`DROP DATABASE ${sql.identifier(databaseName)}`);
  }
};

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

  it("P2 round-trips canonical visibility, legacy omission, independent templates and safe audit", async () => {
    const f = await templateFixture();
    const save = new ConfigureProductTypeSpecificationTemplateUseCase(dependencies);
    const first = await save.execute({ context: context("workspace-a"), productTypeId: f.productTypeId, entries: [{ specificationDefinitionId: f.specificationDefinitionId, sortOrder: 0, publicVisibility: "public" }] });
    assert.ok(first.ok);
    const second = await save.execute({ context: context("workspace-a"), productTypeId: f.productTypeId, expectedVersion: 1, entries: [{ specificationDefinitionId: f.specificationDefinitionId, sortOrder: 7, required: true }] });
    assert.ok(second.ok); assert.equal(second.value.entries[0].publicVisibility, "public");
    const locked = await unitOfWork.execute(({ references }) => references.lockSpecificationTemplate("workspace-a", f.productTypeId));
    assert.deepEqual(locked?.entries, second.value.entries);
    const read = await new GetCatalogReferenceDataUseCase(unitOfWork).execute({ context: context("workspace-a") });
    assert.ok(read.ok); assert.equal(read.value.specificationTemplates[0].entries[0].publicVisibility, "public");
    assert.equal(await unitOfWork.execute(({ references }) => references.lockSpecificationTemplate("workspace-b", f.productTypeId)), null);
    const type = await new CreateProductTypeUseCase(dependencies).execute({ ...create("workspace-a", "type-two"), categoryId: read.value.productTypes[0].categoryId });
    assert.ok(type.ok);
    const independent = await save.execute({ context: context("workspace-a"), productTypeId: type.value.id, entries: [{ specificationDefinitionId: f.specificationDefinitionId, sortOrder: 0 }] });
    assert.ok(independent.ok); assert.equal(independent.value.entries[0].publicVisibility, "internal");
    const before = await auditCount();
    assert.deepEqual(await save.execute({ context: context("workspace-a"), productTypeId: f.productTypeId, expectedVersion: 1, entries: [] }), { ok: false, error: "Conflict" });
    assert.equal(await auditCount(), before);
    const audit = await connection.database.execute(sql`SELECT metadata FROM security_audit_events WHERE event_type = 'SpecificationTemplateConfigured' AND metadata->>'version' = '2'`);
    assert.deepEqual(audit.rows[0].metadata, { referenceId: first.value.id, productTypeId: f.productTypeId, entryCount: 1, version: 2, toPublicCount: 0, fromPublicCount: 0, visibilityTransitions: "[]" });
    await assert.rejects(() => connection.database.execute(sql`UPDATE catalog_specification_template_entries SET public_visibility = 'Public'`));
    await assert.rejects(() => connection.database.execute(sql`UPDATE catalog_specification_template_entries SET public_visibility = NULL`));
  });

  it("P2 audit persistence failure rolls back entry replacement and version", async () => {
    const f = await templateFixture();
    const command = { context: context("workspace-a"), productTypeId: f.productTypeId, entries: [{ specificationDefinitionId: f.specificationDefinitionId, sortOrder: 0, publicVisibility: "public" as const }] };
    assert.ok((await new ConfigureProductTypeSpecificationTemplateUseCase(dependencies).execute(command)).ok);
    const before = await auditCount();
    const failing: CatalogReferenceDataUnitOfWork = { execute: (work) => unitOfWork.execute(({ references }) => work({ references, audit: { append: async () => { throw new Error("SyntheticAuditFailure"); } } })) };
    await assert.rejects(() => new ConfigureProductTypeSpecificationTemplateUseCase({ ...dependencies, unitOfWork: failing }).execute({ ...command, expectedVersion: 1, entries: [] }), /SyntheticAuditFailure/);
    const persisted = await unitOfWork.execute(({ references }) => references.lockSpecificationTemplate("workspace-a", f.productTypeId));
    assert.equal(persisted?.version, 1); assert.equal(persisted?.entries[0].publicVisibility, "public"); assert.equal(await auditCount(), before);
  });

  it("P2 locked preimage serializes concurrent legacy omission against an explicit update", async () => {
    const f = await templateFixture();
    const save = new ConfigureProductTypeSpecificationTemplateUseCase(dependencies);
    const baseCommand = { context: context("workspace-a"), productTypeId: f.productTypeId, entries: [{ specificationDefinitionId: f.specificationDefinitionId, sortOrder: 0 }] };
    assert.ok((await save.execute({ ...baseCommand, entries: [{ ...baseCommand.entries[0], publicVisibility: "public" }] })).ok);
    const other = createPlatformDatabaseConnection(connectionUrl!);
    const held = barrier(); const unlock = barrier();
    let settled = false;
    const holder = unitOfWork.execute(async (transaction) => {
      await transaction.references.lockSpecificationTemplate("workspace-a", f.productTypeId);
      held.release(); await unlock.reached;
      return new ConfigureProductTypeSpecificationTemplateUseCase({ ...dependencies, unitOfWork: { execute: (work) => work(transaction) } }).execute({ ...baseCommand, expectedVersion: 1, entries: [{ ...baseCommand.entries[0], publicVisibility: "internal" }] });
    });
    await held.reached;
    const contender = new ConfigureProductTypeSpecificationTemplateUseCase({ ...dependencies, unitOfWork: new PostgreSqlCatalogReferenceDataUnitOfWork(other.database) }).execute({ ...baseCommand, expectedVersion: 1 }).finally(() => { settled = true; });
    try {
      let blocked = false;
      for (let attempt = 0; attempt < 100 && !blocked; attempt++) {
        const waiters = await connection.database.execute(sql`SELECT count(*) AS count FROM pg_stat_activity WHERE datname = current_database() AND cardinality(pg_blocking_pids(pid)) > 0 AND query LIKE '%catalog_specification_templates%'`);
        blocked = Number(waiters.rows[0].count) > 0;
        if (!blocked) await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(blocked, true); assert.equal(settled, false);
      unlock.release();
      assert.ok((await holder).ok);
      assert.deepEqual(await contender, { ok: false, error: "Conflict" });
      assert.equal(await auditCount(), 2);
      const retry = await save.execute({ ...baseCommand, expectedVersion: 2 });
      assert.ok(retry.ok); assert.equal(retry.value.entries[0].publicVisibility, "internal");
    } finally {
      unlock.release();
      await Promise.allSettled([holder, contender]);
      await other.close();
    }
  });

  it("P2 concurrent creates have one uniqueness winner and no loser success audit", async () => {
    const f = await templateFixture();
    const bothRead = barrier(); let arrived = 0;
    const racing: CatalogReferenceDataUnitOfWork = { execute: (work) => unitOfWork.execute(({ references, audit }) => work({ audit, references: new Proxy(references, { get(target, key) {
      if (key === "lockSpecificationTemplate") return async (workspace: string, type: string) => { const current = await target.lockSpecificationTemplate(workspace, type); assert.equal(current, null); arrived++; if (arrived === 2) bothRead.release(); await bothRead.reached; return current; };
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } }) })) };
    const save = new ConfigureProductTypeSpecificationTemplateUseCase({ ...dependencies, unitOfWork: racing });
    const results = await Promise.allSettled(["internal", "public"].map((visibility) => save.execute({ context: context("workspace-a"), productTypeId: f.productTypeId, entries: [{ specificationDefinitionId: f.specificationDefinitionId, sortOrder: 0, publicVisibility: visibility === "public" ? "public" : "internal" }] })));
    assert.equal(results.filter((result) => result.status === "fulfilled" && result.value.ok).length, 1);
    assert.equal(results.filter((result) => result.status === "rejected"
      ? result.reason instanceof CatalogReferencePersistenceConflictError
      : !result.value.ok && result.value.error === "Conflict").length, 1, JSON.stringify(results.map((result) => result.status === "rejected" ? { name: result.reason?.name, code: result.reason?.code, causeCode: result.reason?.cause?.code } : { status: result.status })));
    assert.equal(await auditCount(), 1);
  });

  it("P2 migrates a genuinely clean guarded database and preserves entry constraints", async () => migrationFixture(async (fixture) => {
    await migrate(fixture.database, { migrationsFolder: "drizzle" });
    const columns = await fixture.database.execute(sql`SELECT is_nullable, column_default FROM information_schema.columns WHERE table_name = 'catalog_specification_template_entries' AND column_name = 'public_visibility'`);
    assert.equal(columns.rows[0].is_nullable, "NO"); assert.match(String(columns.rows[0].column_default), /internal/);
    const constraints = await fixture.database.execute(sql`SELECT conname FROM pg_constraint WHERE conrelid = 'catalog_specification_template_entries'::regclass`);
    const names = constraints.rows.map((row) => row.conname);
    for (const name of ["catalog_specification_template_entries_pk", "catalog_specification_template_entries_template_fk", "catalog_specification_template_entries_definition_fk", "catalog_specification_template_entries_sort", "catalog_specification_template_entries_public_visibility"]) assert.ok(names.includes(name));
    const indexes = await fixture.database.execute(sql`SELECT indexname FROM pg_indexes WHERE tablename = 'catalog_specification_template_entries'`);
    assert.ok(indexes.rows.some((row) => row.indexname === "catalog_specification_template_entries_order_uq"));
  }));

  it("P2 upgrades populated pre-P2 rows to internal using the actual migration", async () => migrationFixture(async (fixture) => {
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: { tag: string }[] };
    const migrationIndex = journal.entries.findIndex((entry) => entry.tag === "0016_specification_template_public_visibility");
    assert.ok(migrationIndex >= 0);
    const previous = { ...journal, entries: journal.entries.slice(0, migrationIndex) };
    const oldFolder = mkdtempSync(join(tmpdir(), "qsc-p2-pre-migrations-"));
    mkdirSync(join(oldFolder, "meta")); writeFileSync(join(oldFolder, "meta/_journal.json"), JSON.stringify(previous));
    for (const migration of previous.entries) copyFileSync(join("drizzle", `${migration.tag}.sql`), join(oldFolder, `${migration.tag}.sql`));
    // Preserve fixture SQL evidence in the system temporary directory; no source deletion.
    await migrate(fixture.database, { migrationsFolder: oldFolder });
    await fixture.database.execute(sql`INSERT INTO workspaces (workspace_id, company_id, workspace_code, display_name, password_recovery_policy, created_at, updated_at) VALUES ('w', 'c', 'fixture', 'Fixture', 'OwnerManagedOnly', now(), now())`);
    await fixture.database.execute(sql`INSERT INTO catalog_departments (workspace_id, department_id, code, display_name, status, sort_order, version, created_at, updated_at) VALUES ('w','d','d','D','Active',0,1,now(),now())`);
    await fixture.database.execute(sql`INSERT INTO catalog_categories (workspace_id, category_id, department_id, code, display_name, status, sort_order, version, created_at, updated_at) VALUES ('w','c','d','c','C','Active',0,1,now(),now())`);
    await fixture.database.execute(sql`INSERT INTO catalog_product_types (workspace_id, product_type_id, category_id, code, display_name, status, sort_order, version, created_at, updated_at) VALUES ('w','p','c','p','P','Active',0,1,now(),now())`);
    await fixture.database.execute(sql`INSERT INTO catalog_specification_definitions (workspace_id, specification_definition_id, code, display_name, status, sort_order, version, value_type, created_at, updated_at) VALUES ('w','a','a','A','Active',0,1,'Text',now(),now()), ('w','b','b','B','Active',1,1,'Text',now(),now())`);
    await fixture.database.execute(sql`INSERT INTO catalog_specification_templates (workspace_id, specification_template_id, product_type_id, version, created_at, updated_at) VALUES ('w','t','p',1,now(),now())`);
    await fixture.database.execute(sql`INSERT INTO catalog_specification_template_entries (workspace_id, specification_template_id, specification_definition_id, sort_order, required) VALUES ('w','t','a',0,false)`);
    await migrate(fixture.database, { migrationsFolder: "drizzle" });
    const rows = await fixture.database.execute(sql`SELECT public_visibility FROM catalog_specification_template_entries`);
    assert.deepEqual(rows.rows, [{ public_visibility: "internal" }]);
    await fixture.database.execute(sql`INSERT INTO catalog_specification_template_entries (workspace_id, specification_template_id, specification_definition_id, sort_order, required) VALUES ('w','t','b',1,false)`);
    assert.deepEqual((await fixture.database.execute(sql`SELECT public_visibility FROM catalog_specification_template_entries ORDER BY sort_order`)).rows, [{ public_visibility: "internal" }, { public_visibility: "internal" }]);
    await assert.rejects(() => fixture.database.execute(sql`UPDATE catalog_specification_template_entries SET public_visibility = 'PUBLIC'`));
    await assert.rejects(() => fixture.database.execute(sql`UPDATE catalog_specification_template_entries SET public_visibility = NULL`));
  }));
});
