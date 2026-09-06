import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { securityAuditEvents } from "../../../../shared/audit/infrastructure/persistence/schema";
import { createPlatformDatabaseConnection } from "../../../../shared/infrastructure/persistence/database";
import { catalogProductBranchPriceOverrides, catalogProductReferenceCosts, catalogProducts, workspaceCurrencyAvailability } from "../../../catalog/infrastructure/persistence/schema";
import { ClearBranchPriceOverrideUseCase, ClearWorkspaceBasePriceUseCase, GetBranchPricingManagementUseCase, GetBranchProductPricingUseCase, GetWorkspacePricingManagementUseCase, SetBranchPriceOverrideUseCase, SetWorkspaceBasePriceUseCase } from "../../../catalog/branch-products/application/branch-product.use-cases";
import { PostgreSqlBranchProductUnitOfWork } from "../../../catalog/branch-products/infrastructure/persistence/postgresql-branch-product-unit-of-work";
import { assertSafeIntegrationTestDatabaseUrl } from "../../../catalog/infrastructure/persistence/integration-test-database-safety";
import { workspaceBranchReferences, workspaces } from "../../../workspace/infrastructure/persistence/schema";
import { GetBranchProductInventoryUseCase, GetInventoryReservationUseCase, IssueInventoryUseCase, ListInventoryReservationsUseCase, ReceiveInventoryUseCase, ReserveInventoryUseCase, TransferInventoryUseCase } from "../../application/inventory.use-cases";
import { encodeReservationCursor, reservationQueryFingerprint } from "../../domain/reservation-management-query";
import { inventoryBalances, inventoryMovements, inventoryOperations, inventoryReservations } from "./schema";
import { PostgreSqlInventoryUnitOfWork } from "./postgresql-inventory-unit-of-work";

const connectionUrl = process.env.TEST_DATABASE_URL; assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL); const connection = createPlatformDatabaseConnection(connectionUrl!);
const inventoryUnitOfWork = new PostgreSqlInventoryUnitOfWork(connection.database); const inventoryDependencies = { unitOfWork: inventoryUnitOfWork, clock: { now: () => new Date() }, identifiers: { next: randomUUID }, fingerprint: { create: (value: Readonly<Record<string, string>>) => createHash("sha256").update(JSON.stringify(value)).digest("hex") } };
const receive = new ReceiveInventoryUseCase(inventoryDependencies); const issue = new IssueInventoryUseCase(inventoryDependencies); const reserve = new ReserveInventoryUseCase(inventoryDependencies); const transfer = new TransferInventoryUseCase(inventoryDependencies);
const getInventory = new GetBranchProductInventoryUseCase(inventoryUnitOfWork); const reservations = new ListInventoryReservationsUseCase(inventoryUnitOfWork); const reservationDetails = new GetInventoryReservationUseCase(inventoryUnitOfWork);
const pricingUnitOfWork = new PostgreSqlBranchProductUnitOfWork(connection.database); const pricingDependencies = { unitOfWork: pricingUnitOfWork, clock: { now: () => new Date() } }; const setBase = new SetWorkspaceBasePriceUseCase(pricingDependencies); const clearBase = new ClearWorkspaceBasePriceUseCase(pricingDependencies); const setOverride = new SetBranchPriceOverrideUseCase(pricingDependencies); const clearOverride = new ClearBranchPriceOverrideUseCase(pricingDependencies); const getPricing = new GetBranchProductPricingUseCase(pricingUnitOfWork); const getWorkspacePricingManagement = new GetWorkspacePricingManagementUseCase(pricingUnitOfWork); const getBranchPricingManagement = new GetBranchPricingManagementUseCase(pricingUnitOfWork);
const owner = (workspaceId = "workspace-a"): TrustedActorContext => ({ workspaceId, actorId: `owner-${workspaceId}`, role: "Owner", permissions: [], branchScope: { type: "AllBranches" }, authorizationVersion: 1 });
const inventoryActor = (permissions: readonly string[]): TrustedActorContext => ({ workspaceId: "workspace-a", actorId: "inventory-staff", role: "Staff", permissions, branchScope: { type: "AllBranches" }, authorizationVersion: 2 });
const pricingManager = (workspaceId = "workspace-a", branchIds?: readonly string[]): TrustedActorContext => ({ workspaceId, actorId: `pricing-manager-${workspaceId}`, role: "Staff", permissions: ["pricing.manage", "referenceCost.manage", "pricing.branchOverride.manage", "referenceCost.branchOverride.manage"], branchScope: branchIds ? { type: "SelectedBranches", branchIds } : { type: "AllBranches" }, authorizationVersion: 1 });
const reservationActor = (workspaceId = "workspace-a"): TrustedActorContext => ({ workspaceId, actorId: `staff-${workspaceId}`, role: "Staff", permissions: ["inventory.reserve"], branchScope: { type: "AllBranches" }, authorizationVersion: 1 });
const reservationRow = (reservationId: string, status: "Active" | "PartiallyFulfilled" | "Fulfilled" | "Released", updatedAt: string, overrides: Partial<typeof inventoryReservations.$inferInsert> = {}): typeof inventoryReservations.$inferInsert => ({ workspaceId: "workspace-a", reservationId, branchId: "branch-a", productId: "product-a", quantity: BigInt(8), remainingQuantity: status === "Fulfilled" || status === "Released" ? BigInt(0) : BigInt(5), status, createdByActorId: "generated-test-actor", createdAt: new Date("2026-08-19T10:00:00.000Z"), updatedAt: new Date(updatedAt), ...overrides });

before(async () => migrate(connection.database, { migrationsFolder: "drizzle" }));
beforeEach(async () => { await connection.database.execute(sql`TRUNCATE TABLE catalog_products CASCADE`); await connection.database.execute(sql`TRUNCATE TABLE workspaces CASCADE`); const now = new Date(); await connection.database.insert(workspaces).values([{ workspaceId: "workspace-a", companyId: "company-a", workspaceCode: "workspace-a", displayName: "A", passwordRecoveryPolicy: "OwnerManagedOnly", createdAt: now, updatedAt: now }, { workspaceId: "workspace-b", companyId: "company-b", workspaceCode: "workspace-b", displayName: "B", passwordRecoveryPolicy: "OwnerManagedOnly", createdAt: now, updatedAt: now }]); await connection.database.insert(workspaceBranchReferences).values([{ workspaceId: "workspace-a", branchId: "branch-a", code: "branch-a", displayName: "A", status: "Active", sortOrder: 0, revision: 1, createdAt: now, updatedAt: now }, { workspaceId: "workspace-a", branchId: "branch-b", code: "branch-b", displayName: "B", status: "Active", sortOrder: 1, revision: 1, createdAt: now, updatedAt: now }, { workspaceId: "workspace-b", branchId: "branch-foreign", code: "branch-foreign", displayName: "Foreign", status: "Active", sortOrder: 0, revision: 1, createdAt: now, updatedAt: now }]); await connection.database.insert(catalogProducts).values([{ workspaceId: "workspace-a", productId: "product-a", catalogId: "catalog-a", lifecycleState: "Published", archiveReason: null, revision: 0, createdAt: now, updatedAt: now, hasClassification: false, hasCommercialDetails: false, isHighlighted: false }, { workspaceId: "workspace-a", productId: "product-b", catalogId: "catalog-a", lifecycleState: "Published", archiveReason: null, revision: 0, createdAt: now, updatedAt: now, hasClassification: false, hasCommercialDetails: false, isHighlighted: false }, { workspaceId: "workspace-a", productId: "product-empty", catalogId: "catalog-a", lifecycleState: "Published", archiveReason: null, revision: 0, createdAt: now, updatedAt: now, hasClassification: false, hasCommercialDetails: false, isHighlighted: false }, { workspaceId: "workspace-b", productId: "product-foreign", catalogId: "catalog-b", lifecycleState: "Published", archiveReason: null, revision: 0, createdAt: now, updatedAt: now, hasClassification: false, hasCommercialDetails: false, isHighlighted: false }]); await connection.database.insert(workspaceCurrencyAvailability).values({ workspaceId: "workspace-a", currencyCode: "USD", enabled: true, sortOrder: 0 }); });
after(async () => connection.close());

describe("PostgreSQL Inventory concurrency and integrity", () => {
  it("projects persisted positive and absent balances with tenant and Branch isolation", async () => { await receive.execute({ context: owner(), branchId: "branch-a", productId: "product-a", quantity: "2", operationId: "receive-read-projection" }); assert.deepEqual(await getInventory.execute({ context: inventoryActor(["inventory.availability.view"]), branchId: "branch-a", productId: "product-a" }), { ok: true, value: { branchId: "branch-a", productId: "product-a", unit: "Piece", availability: "InStock" } }); assert.deepEqual(await getInventory.execute({ context: inventoryActor(["inventory.availability.view"]), branchId: "branch-a", productId: "product-empty" }), { ok: true, value: { branchId: "branch-a", productId: "product-empty", unit: "Piece", availability: "OutOfStock" } }); assert.deepEqual(await getInventory.execute({ context: inventoryActor(["inventory.quantity.view"]), branchId: "branch-a", productId: "product-a" }), { ok: true, value: { branchId: "branch-a", productId: "product-a", unit: "Piece", availability: "InStock", quantities: { available: "2", onHand: "2", reserved: "0", damaged: "0" }, revision: 2, updatedAt: (await connection.database.select().from(inventoryBalances).where(eq(inventoryBalances.productId, "product-a")))[0]!.updatedAt.toISOString() } }); assert.deepEqual(await getInventory.execute({ context: inventoryActor([]), branchId: "branch-a", productId: "product-a" }), { ok: false, error: "Forbidden" }); assert.deepEqual(await getInventory.execute({ context: owner("workspace-b"), branchId: "branch-a", productId: "product-a" }), { ok: false, error: "BranchNotFound" }); });
  it("serializes concurrent issue of the last piece", async () => { assert.ok((await receive.execute({ context: owner(), branchId: "branch-a", productId: "product-a", quantity: "1", operationId: "receive-concurrent-001" })).ok); const outcomes = await Promise.all(["issue-concurrent-001", "issue-concurrent-002"].map((operationId) => issue.execute({ context: owner(), branchId: "branch-a", productId: "product-a", quantity: "1", operationId }))); assert.equal(outcomes.filter((value) => value.ok).length, 1); assert.equal(outcomes.filter((value) => !value.ok && value.error === "InsufficientAvailableStock").length, 1); const rows = await connection.database.select().from(inventoryBalances); assert.equal(rows[0]?.onHandQuantity, BigInt(0)); });
  it("serializes concurrent reservations without oversubscription", async () => { await receive.execute({ context: owner(), branchId: "branch-a", productId: "product-a", quantity: "1", operationId: "receive-reserve-001" }); const outcomes = await Promise.all(["reserve-concurrent-001", "reserve-concurrent-002"].map((operationId) => reserve.execute({ context: owner(), branchId: "branch-a", productId: "product-a", quantity: "1", operationId }))); assert.equal(outcomes.filter((value) => value.ok).length, 1); assert.equal(outcomes.filter((value) => !value.ok && value.error === "InsufficientAvailableStock").length, 1); const [row] = await connection.database.select().from(inventoryBalances); assert.equal(row?.reservedQuantity, BigInt(1)); });
  it("keeps transfer atomic, idempotent, correlated, tenant-safe, and currently projected", async () => { await receive.execute({ context: owner(), branchId: "branch-a", productId: "product-a", quantity: "3", operationId: "receive-transfer-001" }); const command = { context: owner(), sourceBranchId: "branch-a", destinationBranchId: "branch-b", productId: "product-a", quantity: "2", operationId: "transfer-atomic-001" }; const first = await transfer.execute(command); const retry = await transfer.execute({ ...command, context: inventoryActor(["inventory.transfer", "inventory.availability.view"]) }); assert.ok(first.ok && retry.ok); if (first.ok && retry.ok) { assert.ok(first.value.sourceBalance?.quantities); assert.equal(retry.value.transferId, first.value.transferId); assert.equal(retry.value.sourceAvailability, "InStock"); assert.equal(retry.value.destinationAvailability, "InStock"); assert.equal("sourceBalance" in retry.value, false); assert.equal("destinationBalance" in retry.value, false); } const balances = await connection.database.select().from(inventoryBalances); assert.equal(balances.find((value) => value.branchId === "branch-a")?.onHandQuantity, BigInt(1)); assert.equal(balances.find((value) => value.branchId === "branch-b")?.onHandQuantity, BigInt(2)); assert.equal((await connection.database.select().from(inventoryMovements).where(eq(inventoryMovements.operationId, command.operationId))).length, 2); assert.equal((await connection.database.select().from(inventoryOperations).where(eq(inventoryOperations.operationId, command.operationId))).length, 1); const failed = await transfer.execute({ ...command, quantity: "9", operationId: "transfer-atomic-002" }); assert.equal(failed.ok, false); const unchanged = await connection.database.select().from(inventoryBalances); assert.equal(unchanged.find((value) => value.branchId === "branch-b")?.onHandQuantity, BigInt(2)); await assert.rejects(connection.database.insert(inventoryBalances).values({ workspaceId: "workspace-a", branchId: "branch-a", productId: "product-foreign", updatedAt: new Date() })); });

  it("re-projects persisted mutation outcomes through current visibility without duplicate side effects", async () => {
    const command = { branchId: "branch-a", productId: "product-a", quantity: "4", operationId: "receive-persisted-replay-001" };
    const first = await receive.execute({ ...command, context: owner() }); assert.ok(first.ok); if (first.ok) assert.equal(first.value.balance?.quantities.onHand, "4");
    const [persisted] = await connection.database.select().from(inventoryOperations).where(eq(inventoryOperations.operationId, command.operationId)); assert.equal(JSON.stringify(persisted?.result).includes("onHand"), true);
    const semantic = await receive.execute({ ...command, context: inventoryActor(["inventory.receive", "inventory.availability.view"]) }); assert.deepEqual(semantic, { ok: true, value: { operationId: command.operationId, status: "Succeeded", availability: "InStock" } });
    const minimum = await receive.execute({ ...command, context: inventoryActor(["inventory.receive"]) }); assert.deepEqual(minimum, { ok: true, value: { operationId: command.operationId, status: "Succeeded" } });
    const detailed = await receive.execute({ ...command, context: inventoryActor(["inventory.receive", "inventory.quantity.view"]) }); assert.ok(detailed.ok); if (detailed.ok) assert.equal(detailed.value.balance?.quantities.available, "4");
    assert.equal((await connection.database.select().from(inventoryMovements).where(eq(inventoryMovements.operationId, command.operationId))).length, 1);
    assert.equal((await connection.database.select().from(securityAuditEvents).where(eq(securityAuditEvents.eventType, "InventoryReceived"))).length, 1);
    assert.deepEqual(await receive.execute({ ...command, quantity: "5", context: inventoryActor(["inventory.receive"]) }), { ok: false, error: "IdempotencyConflict" });
  });

  it("replays a persisted Reservation outcome without duplicating its row or movement", async () => {
    await receive.execute({ context: owner(), branchId: "branch-a", productId: "product-a", quantity: "2", operationId: "reserve-replay-stock" });
    const command = { branchId: "branch-a", productId: "product-a", quantity: "1", operationId: "reserve-persisted-replay-001" };
    const first = await reserve.execute({ ...command, context: owner() }); assert.ok(first.ok); const replay = await reserve.execute({ ...command, context: inventoryActor(["inventory.reserve"]) }); assert.ok(replay.ok);
    if (first.ok && replay.ok) { assert.equal(replay.value.reservationId, first.value.reservationId); assert.equal(replay.value.reservationStatus, "Active"); assert.equal(replay.value.remainingQuantity, "1"); assert.equal("balance" in replay.value, false); assert.equal("availability" in replay.value, false); }
    assert.equal((await connection.database.select().from(inventoryReservations)).length, 1);
    assert.equal((await connection.database.select().from(inventoryMovements).where(eq(inventoryMovements.operationId, command.operationId))).length, 1);
  });
});

describe("PostgreSQL Reservation management reads", () => {
  it("filters exact tenant, Branch, Product, and actionable status with global tuple order and stable keyset pages", async () => { await connection.database.insert(inventoryReservations).values([
    reservationRow("active-new", "Active", "2026-08-20T10:00:05.000Z"), reservationRow("tie-z", "Active", "2026-08-20T10:00:04.000Z"), reservationRow("tie-a", "PartiallyFulfilled", "2026-08-20T10:00:04.000Z"), reservationRow("partial-old", "PartiallyFulfilled", "2026-08-20T10:00:03.000Z"), reservationRow("fulfilled", "Fulfilled", "2026-08-20T10:00:02.000Z"), reservationRow("released", "Released", "2026-08-20T10:00:01.000Z"), reservationRow("other-product", "Active", "2026-08-20T10:00:09.000Z", { productId: "product-b" }), reservationRow("other-branch", "Active", "2026-08-20T10:00:09.000Z", { branchId: "branch-b" }), reservationRow("foreign-workspace", "Active", "2026-08-20T10:00:09.000Z", { workspaceId: "workspace-b", branchId: "branch-foreign", productId: "product-foreign" }),
  ]); const command = { context: reservationActor(), branchId: "branch-a", productId: "product-a", limit: 2 }; const collected: string[] = []; let cursor: string | undefined; do { const page = await reservations.execute({ ...command, ...(cursor ? { cursor } : {}) }); assert.ok(page.ok); if (!page.ok) return; collected.push(...page.value.items.map((item) => item.reservationId)); cursor = page.value.nextCursor ?? undefined; } while (cursor); assert.deepEqual(collected, ["active-new", "tie-z", "tie-a", "partial-old"]); assert.equal(new Set(collected).size, collected.length); const emptyFirst = await reservations.execute({ ...command, productId: "product-empty" }); assert.deepEqual(emptyFirst, { ok: true, value: { items: [], nextCursor: null } }); const emptyCursor = encodeReservationCursor(reservationQueryFingerprint("branch-a", "product-a"), { updatedAt: new Date("2026-08-20T10:00:03.000Z"), reservationId: "partial-old" }); const emptyLater = await reservations.execute({ ...command, cursor: emptyCursor }); assert.deepEqual(emptyLater, { ok: true, value: { items: [], nextCursor: null } }); });

  it("uses live keyset positions when the source row disappears or a following row becomes terminal", async () => { await connection.database.insert(inventoryReservations).values([reservationRow("r-3", "Active", "2026-08-20T10:00:03.000Z"), reservationRow("r-2", "Active", "2026-08-20T10:00:02.000Z"), reservationRow("r-1", "Active", "2026-08-20T10:00:01.000Z")]); const command = { context: reservationActor(), branchId: "branch-a", productId: "product-a", limit: 1 }; const first = await reservations.execute(command); assert.ok(first.ok); if (!first.ok || !first.value.nextCursor) return; await connection.database.delete(inventoryReservations).where(and(eq(inventoryReservations.workspaceId, "workspace-a"), eq(inventoryReservations.reservationId, "r-3"))); const afterDeletion = await reservations.execute({ ...command, cursor: first.value.nextCursor }); assert.ok(afterDeletion.ok); if (afterDeletion.ok) assert.equal(afterDeletion.value.items[0]?.reservationId, "r-2"); await connection.database.update(inventoryReservations).set({ status: "Fulfilled", remainingQuantity: BigInt(0), updatedAt: new Date("2026-08-20T10:00:02.000Z") }).where(and(eq(inventoryReservations.workspaceId, "workspace-a"), eq(inventoryReservations.reservationId, "r-2"))); const afterTerminal = await reservations.execute({ ...command, cursor: first.value.nextCursor }); assert.ok(afterTerminal.ok); if (afterTerminal.ok) assert.equal(afterTerminal.value.items[0]?.reservationId, "r-1"); });

  it("retrieves all persisted detail states without disclosing foreign tenant, wrong Branch, or missing rows", async () => { await connection.database.insert(inventoryReservations).values([reservationRow("detail-active", "Active", "2026-08-20T10:00:04.000Z"), reservationRow("detail-partial", "PartiallyFulfilled", "2026-08-20T10:00:03.000Z"), reservationRow("detail-fulfilled", "Fulfilled", "2026-08-20T10:00:02.000Z"), reservationRow("detail-released", "Released", "2026-08-20T10:00:01.000Z"), reservationRow("detail-other-branch", "Active", "2026-08-20T10:00:05.000Z", { branchId: "branch-b" }), reservationRow("detail-foreign", "Active", "2026-08-20T10:00:05.000Z", { workspaceId: "workspace-b", branchId: "branch-foreign", productId: "product-foreign" })]); for (const status of ["active", "partial", "fulfilled", "released"] as const) { const result = await reservationDetails.execute({ context: reservationActor(), branchId: "branch-a", reservationId: `detail-${status}` }); assert.ok(result.ok, status); if (result.ok) assert.equal(result.value.status.toLowerCase(), status === "partial" ? "partiallyfulfilled" : status); } for (const command of [{ context: reservationActor(), branchId: "branch-a", reservationId: "missing" }, { context: reservationActor(), branchId: "branch-a", reservationId: "detail-other-branch" }, { context: reservationActor(), branchId: "branch-a", reservationId: "detail-foreign" }]) assert.deepEqual(await reservationDetails.execute(command), { ok: false, error: "ReservationNotFound" }); });
});

describe("PostgreSQL Branch pricing", () => {
  it("persists BIGINT Money, live inheritance, override, and explicit clear", async () => { const actor = owner(); assert.ok((await setBase.execute({ context: actor, productId: "product-a", priceType: "Retail", amountMinor: "9007199254740991", currency: "USD", expectedRevision: 0 })).ok); let read = await getPricing.execute({ context: actor, branchId: "branch-a", productId: "product-a" }); assert.ok(read.ok); const inherited = (read.ok ? read.value.prices : {}) as Record<string, { effective: { amountMinor: string }; source: string }>; assert.equal(inherited.Retail.effective.amountMinor, "9007199254740991"); assert.equal(inherited.Retail.source, "WorkspaceBase"); assert.ok((await setOverride.execute({ context: actor, branchId: "branch-a", productId: "product-a", priceType: "Retail", amountMinor: "0", currency: "USD", expectedRevision: 0 })).ok); assert.ok((await setBase.execute({ context: actor, productId: "product-a", priceType: "Retail", amountMinor: "100", currency: "USD", expectedRevision: 1 })).ok); read = await getPricing.execute({ context: actor, branchId: "branch-a", productId: "product-a" }); assert.equal(((read.ok ? read.value.prices : {}) as Record<string, { effective: { amountMinor: string } }>).Retail.effective.amountMinor, "0"); assert.ok((await clearOverride.execute({ context: actor, branchId: "branch-a", productId: "product-a", priceType: "Retail", expectedRevision: 1 })).ok); read = await getPricing.execute({ context: actor, branchId: "branch-a", productId: "product-a" }); assert.equal(((read.ok ? read.value.prices : {}) as Record<string, { effective: { amountMinor: string } }>).Retail.effective.amountMinor, "100"); assert.equal((await connection.database.select().from(catalogProductBranchPriceOverrides)).length, 0); });
  it("enforces scoped override uniqueness and enabled currency", async () => { const actor = owner(); assert.deepEqual(await setOverride.execute({ context: actor, branchId: "branch-a", productId: "product-a", priceType: "Retail", amountMinor: "1", currency: "EUR", expectedRevision: 0 }), { ok: false, error: "CurrencyNotAllowed" }); assert.ok((await setOverride.execute({ context: actor, branchId: "branch-a", productId: "product-a", priceType: "Retail", amountMinor: "1", currency: "USD", expectedRevision: 0 })).ok); assert.deepEqual(await setOverride.execute({ context: actor, branchId: "branch-a", productId: "product-a", priceType: "Retail", amountMinor: "2", currency: "USD", expectedRevision: 0 }), { ok: false, error: "Conflict" }); const rows = await connection.database.select().from(catalogProductBranchPriceOverrides).where(and(eq(catalogProductBranchPriceOverrides.workspaceId, "workspace-a"), eq(catalogProductBranchPriceOverrides.branchId, "branch-a"))); assert.equal(rows.length, 1); });
});

describe("PostgreSQL Pricing management revisions and isolation", () => {
  it("projects the shared Product revision and independent Reference Cost revision", async () => {
    const context = pricingManager();
    const initial = await getWorkspacePricingManagement.execute({ context, productId: "product-a" });
    assert.ok(initial.ok);
    if (initial.ok) {
      assert.equal(initial.value.productRevision, 0);
      assert.equal(initial.value.retail?.state, "NotConfigured");
      assert.equal(initial.value.wholesale?.state, "NotConfigured");
      assert.equal(initial.value.referenceCost?.referenceCostRevision, 0);
    }

    assert.ok((await setBase.execute({ context, productId: "product-a", priceType: "Retail", amountMinor: "0", currency: "USD", expectedRevision: 0 })).ok);
    let read = await getWorkspacePricingManagement.execute({ context, productId: "product-a" });
    assert.ok(read.ok);
    if (read.ok) {
      assert.equal(read.value.productRevision, 1);
      assert.deepEqual(read.value.retail?.value, { amountMinor: "0", currency: "USD" });
      assert.equal(read.value.wholesale?.state, "NotConfigured");
    }

    assert.deepEqual(await setBase.execute({ context, productId: "product-a", priceType: "Wholesale", amountMinor: "80", currency: "USD", expectedRevision: 0 }), { ok: false, error: "Conflict" });
    assert.ok((await setBase.execute({ context, productId: "product-a", priceType: "Wholesale", amountMinor: "80", currency: "USD", expectedRevision: 1 })).ok);
    assert.ok((await setBase.execute({ context, productId: "product-a", priceType: "ReferenceCost", amountMinor: "60", currency: "USD", expectedRevision: 0 })).ok);

    read = await getWorkspacePricingManagement.execute({ context, productId: "product-a" });
    assert.ok(read.ok);
    if (read.ok) {
      assert.equal(read.value.productRevision, 2);
      assert.equal(read.value.referenceCost?.referenceCostRevision, 1);
    }

    assert.ok((await setBase.execute({ context, productId: "product-a", priceType: "Retail", amountMinor: "100", currency: "USD", expectedRevision: 2 })).ok);
    read = await getWorkspacePricingManagement.execute({ context, productId: "product-a" });
    assert.ok(read.ok);
    if (read.ok) {
      assert.equal(read.value.productRevision, 3);
      assert.equal(read.value.referenceCost?.referenceCostRevision, 1);
    }

    assert.ok((await clearBase.execute({ context, productId: "product-a", priceType: "ReferenceCost", expectedRevision: 1 })).ok);
    assert.ok((await clearBase.execute({ context, productId: "product-a", priceType: "Wholesale", expectedRevision: 3 })).ok);
    read = await getWorkspacePricingManagement.execute({ context, productId: "product-a" });
    assert.ok(read.ok);
    if (read.ok) {
      assert.equal(read.value.productRevision, 4);
      assert.equal(read.value.wholesale?.state, "NotConfigured");
      assert.equal(read.value.referenceCost?.referenceCostRevision, 0);
    }
    assert.equal((await connection.database.select().from(catalogProductReferenceCosts)).length, 0);
  });

  it("projects independent Branch override revisions and semantic inheritance", async () => {
    const context = pricingManager();
    assert.ok((await setBase.execute({ context, productId: "product-a", priceType: "Retail", amountMinor: "100", currency: "USD", expectedRevision: 0 })).ok);
    assert.ok((await setBase.execute({ context, productId: "product-a", priceType: "ReferenceCost", amountMinor: "60", currency: "USD", expectedRevision: 0 })).ok);
    assert.ok((await setOverride.execute({ context, branchId: "branch-a", productId: "product-a", priceType: "Wholesale", amountMinor: "0", currency: "USD", expectedRevision: 0 })).ok);
    assert.ok((await setOverride.execute({ context, branchId: "branch-a", productId: "product-a", priceType: "ReferenceCost", amountMinor: "55", currency: "USD", expectedRevision: 0 })).ok);

    let read = await getBranchPricingManagement.execute({ context, branchId: "branch-a", productId: "product-a" });
    assert.ok(read.ok);
    if (!read.ok) return;
    assert.equal(read.value.baseProductRevision, 1);
    assert.equal(read.value.baseReferenceCostRevision, 1);
    assert.equal(read.value.prices.Retail?.source, "WorkspaceBase");
    assert.equal(read.value.prices.Retail?.overrideRevision, 0);
    assert.deepEqual(read.value.prices.Retail?.allowedActions, ["SetOverride"]);
    assert.equal(read.value.prices.Wholesale?.source, "BranchOverride");
    assert.deepEqual(read.value.prices.Wholesale?.effective, { amountMinor: "0", currency: "USD" });
    assert.equal(read.value.prices.Wholesale?.overrideRevision, 1);
    assert.deepEqual(read.value.prices.Wholesale?.allowedActions, ["SetOverride", "ClearOverride"]);
    assert.equal(read.value.prices.ReferenceCost?.source, "BranchOverride");
    assert.equal(read.value.prices.ReferenceCost?.overrideRevision, 1);

    assert.ok((await setOverride.execute({ context, branchId: "branch-a", productId: "product-a", priceType: "Wholesale", amountMinor: "75", currency: "USD", expectedRevision: 1 })).ok);
    read = await getBranchPricingManagement.execute({ context, branchId: "branch-a", productId: "product-a" });
    assert.ok(read.ok);
    if (read.ok) {
      assert.equal(read.value.prices.Wholesale?.overrideRevision, 2);
      assert.equal(read.value.baseProductRevision, 1);
      assert.equal(read.value.baseReferenceCostRevision, 1);
    }
  });

  it("keeps tenant, Branch, and Product persistence scopes isolated", async () => {
    const context = pricingManager();
    assert.ok((await setOverride.execute({ context, branchId: "branch-b", productId: "product-b", priceType: "Retail", amountMinor: "25", currency: "USD", expectedRevision: 0 })).ok);
    const isolated = await getBranchPricingManagement.execute({ context, branchId: "branch-a", productId: "product-a" });
    assert.ok(isolated.ok);
    if (isolated.ok) {
      assert.equal(isolated.value.prices.Retail?.override.state, "NotConfigured");
      assert.equal(isolated.value.prices.Retail?.overrideRevision, 0);
    }
    assert.deepEqual(await getWorkspacePricingManagement.execute({ context, productId: "product-foreign" }), { ok: false, error: "ProductNotFound" });
    assert.deepEqual(await getBranchPricingManagement.execute({ context, branchId: "foreign-branch", productId: "product-a" }), { ok: false, error: "BranchNotFound" });
    assert.deepEqual(await getBranchPricingManagement.execute({ context, branchId: "branch-a", productId: "product-foreign" }), { ok: false, error: "ProductNotFound" });
    assert.deepEqual(await getBranchPricingManagement.execute({ context: pricingManager("workspace-a", ["branch-a"]), branchId: "branch-b", productId: "product-a" }), { ok: false, error: "BranchNotFound" });
  });
});
