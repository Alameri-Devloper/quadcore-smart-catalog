import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { test } from "node:test";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPlatformDatabaseConnection } from "../../../../../shared/infrastructure/persistence/database";
import { workspaces } from "../../../../workspace/infrastructure/persistence/schema";
import type { TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import type { CatalogReferenceDataUnitOfWork } from "../../../reference-data/ports/catalog-reference-data-unit-of-work.port";
import { PostgreSqlCatalogReferenceDataUnitOfWork } from "../../../reference-data/infrastructure/persistence/postgresql-catalog-reference-data-unit-of-work";
import { CreateDepartmentUseCase, CreateCategoryUseCase, CreateProductTypeUseCase, CreateSpecificationDefinitionUseCase, ConfigureProductTypeSpecificationTemplateUseCase, GetCatalogReferenceDataUseCase } from "../../../reference-data/application/catalog-reference-data.use-cases";
import { assertSafeIntegrationTestDatabaseUrl } from "../../../infrastructure/persistence/integration-test-database-safety";
import { STAFF_SPECIFICATION_CONFIGURATION as approved } from "../../domain/staff-specification-configuration";
import { parseCatalogSpecificationPresentationProfiles } from "../catalog-specification-presentation-config";
import { PortableSpecificationConfigurationUseCase, type ReferenceConfigurationReader, type IsolatedConfigurationWrites } from "../../application/portable-specification-configuration.use-case";

// Deliberately outside ordinary unit globs; never loads .env.
const url = process.env.PORTABLE_SPEC_TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(url, process.env.DATABASE_URL);
assert.ok(url);
const target = new URL(url);
assert.equal(target.hostname, "127.0.0.1");
assert.match(target.pathname, /^\/qsc_spec_config_test_[a-f0-9]{16}$/);
assert.match(process.env.PORTABLE_SPEC_TEST_CONTAINER_ID ?? "", /^[a-f0-9]{64}$/);
const connection = createPlatformDatabaseConnection(url);
const otherConnection = createPlatformDatabaseConnection(url);
const uow = new PostgreSqlCatalogReferenceDataUnitOfWork(connection.database);
const otherUow = new PostgreSqlCatalogReferenceDataUnitOfWork(otherConnection.database);
const dependencies = (unitOfWork: CatalogReferenceDataUnitOfWork) => ({ unitOfWork, identifiers: { next: randomUUID }, clock: { now: () => new Date() } });
const reader = (unitOfWork: CatalogReferenceDataUnitOfWork = uow) => new GetCatalogReferenceDataUseCase(unitOfWork);
const writes = (unitOfWork: CatalogReferenceDataUnitOfWork = uow): IsolatedConfigurationWrites => ({
  createDefinition: new CreateSpecificationDefinitionUseCase(dependencies(unitOfWork)),
  configureTemplate: new ConfigureProductTypeSpecificationTemplateUseCase(dependencies(unitOfWork)),
});
const ok = <T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string }): T => {
  assert.equal(result.ok, true); if (!result.ok) throw Error("Fixture rejected"); return result.value;
};
async function seed(completeDefinitions = false) {
  const workspaceId = randomUUID(), now = new Date();
  await connection.database.insert(workspaces).values({ workspaceId, companyId: randomUUID(), workspaceCode: "pt-" + randomUUID().slice(0, 16), displayName: "Synthetic portability verification", passwordRecoveryPolicy: "OwnerManagedOnly", createdAt: now, updatedAt: now });
  // Synthetic trusted test context, per existing isolated integration convention.
  // Never authenticates a serving or operational request.
  const context: TrustedActorContext = { workspaceId, actorId: randomUUID(), role: "Owner", permissions: ["catalog.referenceData.view", "catalog.referenceData.manage"], branchScope: { type: "AllBranches" }, authorizationVersion: 1 };
  const command = { context, workspaceId, currentProfiles: [] };
  const create = (code: string) => ({ context, code, displayName: code, sortOrder: 0 });
  const dep = dependencies(uow);
  const department = ok(await new CreateDepartmentUseCase(dep).execute(create("portable-department")));
  const category = ok(await new CreateCategoryUseCase(dep).execute({ ...create("portable-category"), departmentId: department.id }));
  const definitions = new Map<string, string>();
  for (const d of approved.definitions.filter(d => completeDefinitions || d.creation === "require-existing")) {
    const input = { code: d.code, displayName: d.displayName, valueType: d.valueType, unit: d.unit, sortOrder: d.sortOrder };
    definitions.set(d.code, ok(await new CreateSpecificationDefinitionUseCase(dep).execute({ context, ...input })).id);
  }
  for (const t of approved.productTypes) {
    const type = ok(await new CreateProductTypeUseCase(dep).execute({ ...create(t.code), categoryId: category.id }));
    const entries = t.bindings.filter(b => b.creation === "require-existing").map(b => ({ sortOrder: b.sortOrder, required: b.required, publicVisibility: b.publicVisibility, specificationDefinitionId: definitions.get(b.definitionCode)! }));
    ok(await new ConfigureProductTypeSpecificationTemplateUseCase(dep).execute({ context, productTypeId: type.id, entries }));
  }
  return { context, command, workspaceId };
}
async function state(context: TrustedActorContext) {
  const snapshot = ok(await reader().execute({ context, includeInactive: true }));
  const audit = (await connection.database.execute(sql.join([sql.raw("SELECT count(*)::int AS count FROM security_audit_events WHERE workspace_id="), sql.param(context.workspaceId)]))).rows[0].count;
  return { snapshot, audit, hash: createHash("sha256").update(JSON.stringify({ snapshot, audit })).digest("hex") };
}
function barrier() {
  let arrivals = 0; let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  return async () => {
    if (++arrivals === 2) release();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { await Promise.race([ready, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error("QA barrier timeout")), 10000); })]); }
    finally { clearTimeout(timer); }
  };
}
test("isolated PostgreSQL portable configuration qualification", { timeout: 120000 }, async t => {
  try {
    assert.equal((await connection.database.execute(sql.raw("SELECT current_database() AS name"))).rows[0].name, target.pathname.slice(1));
    await migrate(connection.database, { migrationsFolder: "drizzle" });
    const a = await seed(), b = await seed(), protectedB = await state(b.context), before = await state(a.context);
    const useCase = new PortableSpecificationConfigurationUseCase(reader(), writes());
    let profiles = parseCatalogSpecificationPresentationProfiles(undefined);
    await t.test("Dry Run preserves all configuration and audit rows", async () => {
      const r = await useCase.execute(a.command);
      assert.equal(r.blocked, false); assert.equal(r.rows.filter(r => r.action === "CREATE").length, 5);
      assert.equal((await state(a.context)).hash, before.hash);
    });
    await t.test("five definitions/five bindings created, prior IDs retained and unrelated Workspace untouched", async () => {
      const r = await useCase.execute({ ...a.command, mode: "apply-isolated" });
      assert.equal(r.application?.status, "PREPARED_NOT_INSTALLED"); assert.equal(r.application.completed.length, 6);
      const after = await state(a.context);
      assert.equal(after.snapshot.specificationDefinitions.length, 17);
      assert.equal(after.snapshot.specificationTemplates.reduce((n, t) => n + t.entries.length, 0), 26);
      assert.equal(Number(after.audit) - Number(before.audit), 6);
      for (const d of before.snapshot.specificationDefinitions) assert.deepEqual(after.snapshot.specificationDefinitions.find(x => x.id === d.id), d);
      assert.equal((await state(b.context)).hash, protectedB.hash);
      profiles = parseCatalogSpecificationPresentationProfiles(JSON.stringify(r.candidateProfiles));
      assert.equal(profiles.length, 6); assert.ok(profiles.every(p => p.workspaceId === a.workspaceId));
      assert.deepEqual(profiles.map(p => p.fields.filter(f => f.filterable === true).length), [1, 3, 3, 3, 8, 3]);
    });
    await t.test("second apply has zero duplicate/version/audit mutations", async () => {
      const stable = await state(a.context), r = await useCase.execute({ ...a.command, mode: "apply-isolated", currentProfiles: profiles });
      assert.equal(r.application?.status, "PREPARED_NOT_INSTALLED"); assert.deepEqual(r.application.completed, []);
      assert.equal((await state(a.context)).hash, stable.hash);
    });
    await t.test("foreign target/unauthorized actor/runtime filterability conflict cannot write", async () => {
      const stable = await state(a.context);
      assert.equal((await useCase.execute({ ...a.command, mode: "apply-isolated", workspaceId: b.workspaceId })).blocked, true);
      assert.equal((await useCase.execute({ ...a.command, mode: "apply-isolated", context: { ...a.context, permissions: [] } })).blocked, true);
      const bad = profiles.map((p, i) => i ? p : { ...p, fields: p.fields.map(f => ({ ...f, filterable: false })) });
      assert.equal((await useCase.execute({ ...a.command, mode: "apply-isolated", currentProfiles: bad })).blocked, true);
      assert.equal((await state(a.context)).hash, stable.hash);
    });
    await t.test("persisted incompatible definition blocks before writes", async () => {
      const c = await seed();
      ok(await writes().createDefinition.execute({ context: c.context, code: "cpu-generation", displayName: "Conflicting definition", sortOrder: 100, valueType: "Text", unit: null }));
      const stable = await state(c.context), r = await useCase.execute({ ...c.command, mode: "apply-isolated" });
      assert.equal(r.blocked, true); assert.ok(r.rows.some(r => r.status === "CONFLICT"));
      assert.equal((await state(c.context)).hash, stable.hash);
    });
    await t.test("two independent pools: definition race has conservative loser and no duplicates", async () => {
      const c = await seed(), baseline = await state(c.context), wait = barrier();
      const paired = (base: ReferenceConfigurationReader): ReferenceConfigurationReader => {
        let first = true;
        return { execute: async command => { const result = await base.execute(command); if (first) { first = false; await wait(); } return result; } };
      };
      const results = await Promise.all([
        new PortableSpecificationConfigurationUseCase(paired(reader()), writes()).execute({ ...c.command, mode: "apply-isolated" }),
        new PortableSpecificationConfigurationUseCase(paired(reader(otherUow)), writes(otherUow)).execute({ ...c.command, mode: "apply-isolated" }),
      ]);
      assert.ok(results.some(r => r.application?.status === "PREPARED_NOT_INSTALLED"));
      assert.ok(results.some(r => r.application?.status === "STOPPED_REPLAN_REQUIRED"));
      const after = await state(c.context);
      assert.equal(after.snapshot.specificationDefinitions.length, 17);
      assert.equal(new Set(after.snapshot.specificationDefinitions.map(d => d.code)).size, 17);
      assert.equal(Number(after.audit) - Number(baseline.audit), 6);
    });
    await t.test("concurrent template version collision preserves one update/audit", async () => {
      const c = await seed(true), baseline = await state(c.context), wait = barrier();
      const guarded = (unit: CatalogReferenceDataUnitOfWork) => {
        const original = writes(unit);
        return { ...original, configureTemplate: { execute: async (command: Parameters<ConfigureProductTypeSpecificationTemplateUseCase["execute"]>[0]) => { await wait(); return original.configureTemplate.execute(command); } } };
      };
      const results = await Promise.all([
        new PortableSpecificationConfigurationUseCase(reader(), guarded(uow)).execute({ ...c.command, mode: "apply-isolated" }),
        new PortableSpecificationConfigurationUseCase(reader(otherUow), guarded(otherUow)).execute({ ...c.command, mode: "apply-isolated" }),
      ]);
      assert.ok(results.some(r => r.application?.status === "PREPARED_NOT_INSTALLED"));
      assert.ok(results.some(r => r.application?.status === "STOPPED_REPLAN_REQUIRED"));
      const after = await state(c.context);
      assert.equal(after.snapshot.specificationTemplates.reduce((n, t) => n + t.entries.length, 0), 26);
      assert.equal(Number(after.audit) - Number(baseline.audit), 1);
    });
    await t.test("audit failure rolls back its transaction, without retries", async () => {
      const c = await seed(), stable = await state(c.context);
      const failing: CatalogReferenceDataUnitOfWork = { execute: work => uow.execute(tx => work({ ...tx, audit: { append: async () => { throw Error("QA audit failure"); } } })) };
      const r = await new PortableSpecificationConfigurationUseCase(reader(), writes(failing)).execute({ ...c.command, mode: "apply-isolated" });
      assert.equal(r.application?.status, "STOPPED_REPLAN_REQUIRED");
      assert.equal((await state(c.context)).hash, stable.hash);
    });
    await t.test("later failure retains prior commit/audit and unchanged templates", async () => {
      const c = await seed(), stable = await state(c.context), original = writes();
      let calls = 0;
      const partial = { ...original, createDefinition: { execute: async (command: Parameters<CreateSpecificationDefinitionUseCase["execute"]>[0]) => { if (++calls === 2) throw Error("QA later failure"); return original.createDefinition.execute(command); } } };
      const r = await new PortableSpecificationConfigurationUseCase(reader(), partial).execute({ ...c.command, mode: "apply-isolated" });
      assert.equal(r.application?.status, "STOPPED_REPLAN_REQUIRED"); assert.equal(r.application.completed.length, 1);
      const after = await state(c.context);
      assert.equal(after.snapshot.specificationDefinitions.length, 13); assert.equal(Number(after.audit) - Number(stable.audit), 1);
      assert.deepEqual(after.snapshot.specificationTemplates, stable.snapshot.specificationTemplates);
    });
    assert.equal((await state(b.context)).hash, protectedB.hash);
  } finally { await otherConnection.close(); await connection.close(); }
});
