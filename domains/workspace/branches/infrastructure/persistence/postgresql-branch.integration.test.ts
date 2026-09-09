import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import { createPlatformDatabaseConnection } from "../../../../../shared/infrastructure/persistence/database";
import { assertSafeIntegrationTestDatabaseUrl } from "../../../../catalog/infrastructure/persistence/integration-test-database-safety";
import { workspaces } from "../../../infrastructure/persistence/schema";
import { CreateBranchUseCase, GetBranchUseCase, ListBranchesUseCase, UpdateBranchUseCase } from "../../application/branch.use-cases";
import { Branch } from "../../domain/branch";
import { PostgreSqlBranchUnitOfWork } from "./postgresql-branch-unit-of-work";

const connectionUrl = process.env.TEST_DATABASE_URL; assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL); const connection = createPlatformDatabaseConnection(connectionUrl!); const unitOfWork = new PostgreSqlBranchUnitOfWork(connection.database); let sequence = 0; const dependencies = { unitOfWork, clock: { now: () => new Date() }, identifiers: { next: () => `branch-${++sequence}` } }; const create = new CreateBranchUseCase(dependencies); const update = new UpdateBranchUseCase(dependencies); const get = new GetBranchUseCase(unitOfWork); const list = new ListBranchesUseCase(unitOfWork);
const owner = (workspaceId: string): TrustedActorContext => ({ workspaceId, actorId: `owner-${workspaceId}`, role: "Owner", permissions: [], branchScope: { type: "AllBranches" }, authorizationVersion: 1 });
before(async () => migrate(connection.database, { migrationsFolder: "drizzle" })); beforeEach(async () => { sequence = 0; await connection.database.execute(sql`TRUNCATE TABLE workspaces CASCADE`); const now = new Date(); await connection.database.insert(workspaces).values([{ workspaceId: "workspace-a", companyId: "company-a", workspaceCode: "workspace-a", displayName: "A", passwordRecoveryPolicy: "OwnerManagedOnly", createdAt: now, updatedAt: now }, { workspaceId: "workspace-b", companyId: "company-b", workspaceCode: "workspace-b", displayName: "B", passwordRecoveryPolicy: "OwnerManagedOnly", createdAt: now, updatedAt: now }]); }); after(async () => connection.close());

describe("PostgreSQL Branch lifecycle", () => {
  it("lists only the trusted Workspace in current PostgreSQL three-key order with both lifecycle states", async () => {
    const now = new Date();
    const rows = [
      { workspaceId: "workspace-a", branchId: "tie-z", displayName: "Alpha", sortOrder: 2, status: "Active" },
      { workspaceId: "workspace-a", branchId: "last", displayName: "Aardvark", sortOrder: 3, status: "Active" },
      { workspaceId: "workspace-b", branchId: "foreign", displayName: "Alpha", sortOrder: 0, status: "Inactive" },
      { workspaceId: "workspace-a", branchId: "label-last", displayName: "Zulu", sortOrder: 2, status: "Active" },
      { workspaceId: "workspace-a", branchId: "tie-a", displayName: "Alpha", sortOrder: 2, status: "Inactive" },
      { workspaceId: "workspace-a", branchId: "first", displayName: "Zulu", sortOrder: 1, status: "Inactive" },
    ] as const;
    await unitOfWork.execute(async ({ branches }) => {
      for (const row of rows) {
        const value = Branch.rehydrate({ ...row, code: row.branchId === "foreign" ? "tie-a" : row.branchId, revision: 1, createdAt: now, updatedAt: now });
        assert.equal(await branches.create(value), "Created");
      }
      const listed = await branches.list("workspace-a");
      assert.deepEqual(listed.map((value) => [value.value.branchId, value.value.status]), [
        ["first", "Inactive"], ["tie-a", "Inactive"], ["tie-z", "Active"], ["label-last", "Active"], ["last", "Active"],
      ]);
      assert.ok(listed.every((value) => value.value.workspaceId === "workspace-a"));
      assert.deepEqual((await branches.list("workspace-b")).map((value) => value.value.branchId), ["foreign"]);
    });
  });
  it("enforces Workspace code uniqueness while allowing the same code in another Workspace", async () => { assert.ok((await create.execute({ context: owner("workspace-a"), code: "main", displayName: "Main", sortOrder: 0 })).ok); assert.deepEqual(await create.execute({ context: owner("workspace-a"), code: "MAIN", displayName: "Duplicate", sortOrder: 1 }), { ok: false, error: "CodeConflict" }); assert.ok((await create.execute({ context: owner("workspace-b"), code: "main", displayName: "Other Workspace", sortOrder: 0 })).ok); });
  it("preserves stable identity/code and resolves inactive history", async () => { const created = await create.execute({ context: owner("workspace-a"), code: "main", displayName: "Main", sortOrder: 0 }); assert.ok(created.ok); if (!created.ok) return; const changed = await update.execute({ context: owner("workspace-a"), branchId: created.value.branchId, expectedRevision: created.value.revision, displayName: "Renamed", status: "Inactive" }); assert.ok(changed.ok); if (!changed.ok) return; assert.equal(changed.value.branchId, created.value.branchId); assert.equal(changed.value.code, created.value.code); const historical = await get.execute({ context: owner("workspace-a"), branchId: created.value.branchId }); assert.ok(historical.ok); assert.equal(historical.ok ? historical.value.status : null, "Inactive"); });
  it("filters selected-Branch staff reads", async () => { const created = await create.execute({ context: owner("workspace-a"), code: "main", displayName: "Main", sortOrder: 0 }); assert.ok(created.ok); if (!created.ok) return; const selected: TrustedActorContext = { workspaceId: "workspace-a", actorId: "staff", role: "Staff", permissions: ["workspace.branches.view"], branchScope: { type: "SelectedBranches", branchIds: [created.value.branchId] }, authorizationVersion: 1 }; assert.equal((await list.execute({ context: selected })).ok, true); assert.deepEqual(await get.execute({ context: { ...selected, branchScope: { type: "SelectedBranches", branchIds: [] } }, branchId: created.value.branchId }), { ok: false, error: "NotFound" }); });
});
