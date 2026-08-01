import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DepartmentStorageSegment } from "../../media/domain/product-media-keys";
import { ProductMediaRoot } from "../../media/domain/product-media-root";
import type { ProductMediaState } from "../../media/domain/product-media-state";
import type { ProductMediaWorkflowState } from "../../media/domain/product-media-workflow";
import { CatalogId, ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { ProductRevision } from "../../types/product-revision.value-object";
import { Product } from "../../types/product.aggregate";
import { createCatalogDatabaseConnection } from "./database";
import { assertSafeIntegrationTestDatabaseUrl } from "./integration-test-database-safety";
import { PostgreSqlProductMediaRootRepository } from "./postgresql-product-media-root.repository";
import { PostgreSqlProductMediaWorkflowRepository } from "./postgresql-product-media-workflow.repository";
import { PostgreSqlProductRepository } from "./postgresql-product.repository";

const connectionUrl = process.env.TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL);
const connection = createCatalogDatabaseConnection(connectionUrl!);
const products = new PostgreSqlProductRepository(connection.database);
const roots = new PostgreSqlProductMediaRootRepository(connection.database);
const repository = new PostgreSqlProductMediaWorkflowRepository(connection.database);
const workspaceId = WorkspaceId.create("workflow-workspace"); const productId = ProductId.create("workflow-product");
const now = new Date("2026-03-01T00:00:00Z");
const workflow = (id = "workflow-a", key = "idempotency-a"): ProductMediaWorkflowState => ({ workflowId: id, workspaceId, productId, status: "Pending", expectedMediaRevision: 0, idempotencyKey: key, requestFingerprint: "a".repeat(64), createdBy: "actor-a", startedAt: now, version: 0, operations: [{ operationId: `${id}-add`, workflowId: id, workspaceId, type: "Add", status: "Pending", selectAsCover: true, attemptCount: 0, retryAllowed: false, requiresNewSource: false, createdAt: now }] });
const state = (revision = 1, coverMediaId: string | undefined = "media-a"): ProductMediaState => ({ workspaceId, productId, revision, coverMediaId, updatedAt: now, updatedBy: "actor-a", items: [{ mediaId: "media-a", workspaceId, productId, storageArtifactKey: "workspaces/workflow-workspace/products/product--40498bfda27b581b/gallery-01.webp", checksumSha256: "a".repeat(64), mimeType: "image/webp", displayOrder: 0, createdAt: now, createdBy: "actor-a" }] });

before(async () => migrate(connection.database, { migrationsFolder: "drizzle" }));
beforeEach(async () => {
  await connection.database.execute(sql`TRUNCATE TABLE catalog_products CASCADE`);
  await products.create(Product.create({ workspaceId, productId, catalogId: CatalogId.create("catalog-a"), createdAt: now }));
  const root = await ProductMediaRoot.createNew({ workspaceId, productId, departmentSegment: DepartmentStorageSegment.create("products"), productName: "Product", createdAt: now });
  await roots.create(root);
});
after(async () => connection.close());

describe("PostgreSQL Product Media workflow persistence", () => {
  it("persists and rehydrates Workspace-scoped workflow, operations, Media revision, and cover", async () => {
    const value = workflow(); assert.equal((await repository.create(value)).type, "Created");
    value.status = "Completed"; value.version = 1; value.operations[0].status = "Completed"; value.operations[0].completedAt = now;
    assert.equal((await repository.save(value, state(), 0, 0)).type, "Saved");
    const found = await repository.findById(workspaceId, value.workflowId); const media = await repository.loadMediaState(workspaceId, productId);
    assert.equal(found?.operations[0].status, "Completed"); assert.equal(media?.revision, 1); assert.equal(media?.coverMediaId, "media-a");
    const canonicalProduct = await products.findById(workspaceId, productId); assert.equal(canonicalProduct?.images[0]?.productImageId, media?.items[0]?.mediaId); assert.equal(canonicalProduct?.images[0]?.isMain, true);
    assert.equal((await products.update(canonicalProduct!, ProductRevision.initial())).outcome, "Updated"); assert.equal((await repository.loadMediaState(workspaceId, productId))?.items[0]?.mediaId, "media-a");
    assert.equal(await repository.findById(WorkspaceId.create("other-workspace"), value.workflowId), null);
  });

  it("enforces Workspace idempotency and operation uniqueness", async () => {
    assert.equal((await repository.create(workflow())).type, "Created");
    assert.equal((await repository.create(workflow("workflow-b", "idempotency-a"))).type, "Existing");
    const crossWorkspaceProduct = Product.create({ workspaceId: WorkspaceId.create("other-workspace"), productId, catalogId: CatalogId.create("catalog-a"), createdAt: now });
    await products.create(crossWorkspaceProduct);
    const base = workflow("workflow-a", "idempotency-a"); const otherWorkspaceId = WorkspaceId.create("other-workspace");
    const other: ProductMediaWorkflowState = { ...base, workspaceId: otherWorkspaceId, operations: base.operations.map((operation) => ({ ...operation, workspaceId: otherWorkspaceId })) };
    assert.equal((await repository.create(other)).type, "Created");
  });

  it("enforces optimistic workflow and Media revisions", async () => {
    const value = workflow(); await repository.create(value); value.version = 1;
    assert.equal((await repository.save(value, state(), 9, 0)).type, "WorkflowVersionConflict");
    assert.equal((await repository.save(value, state(), 0, 0)).type, "Saved");
    value.version = 2;
    assert.equal((await repository.save(value, state(2), 1, 0)).type, "MediaRevisionConflict");
  });

  it("atomically allows one active attempt claim", async () => {
    const retryable = workflow(); retryable.operations[0].status = "Staged"; retryable.operations[0].retryAllowed = true; await repository.create(retryable);
    const results = await Promise.all([repository.claimOperation(workspaceId, "workflow-a", "workflow-a-add", 0, now), repository.claimOperation(workspaceId, "workflow-a", "workflow-a-add", 0, now)]);
    assert.equal(results.filter((result) => result.type === "Claimed").length, 1);
    assert.ok(results.some((result) => result.type === "Conflict" || result.type === "AlreadyInProgress"));
  });

  it("atomically establishes exact Staged metadata without rewriting canonical Media or its revision", async () => {
    const value = workflow(); await repository.create(value); value.version = 1;
    assert.equal((await repository.save(value, state(), 0, 0)).type, "Saved");
    const before = await repository.loadMediaState(workspaceId, productId);
    const expiresAt = new Date("2026-03-15T00:00:00Z");
    const transition = {
      stagingArtifactKey: "workspaces/workflow-workspace/products/product--40498bfda27b581b/_staging/workflow-a-add.webp",
      stagedSha256: "b".repeat(64), stagedByteLength: 123, stagedWidth: 80, stagedHeight: 60, expiresAt, workflowStatus: "InProgress" as const,
    };
    assert.deepEqual(await repository.transitionOperationToStaged(workspaceId, value.workflowId, value.operations[0].operationId, 1, transition), { type: "Transitioned", version: 2 });
    assert.deepEqual(await repository.loadMediaState(workspaceId, productId), before);
    const reloaded = await repository.findById(workspaceId, value.workflowId); const operation = reloaded?.operations[0];
    assert.deepEqual({ status: operation?.status, key: operation?.stagedArtifactKey, sha256: operation?.stagedSha256, byteLength: operation?.stagedByteLength, width: operation?.stagedWidth, height: operation?.stagedHeight, expiresAt: operation?.expiresAt, retryAllowed: operation?.retryAllowed, requiresNewSource: operation?.requiresNewSource }, { status: "Staged", key: transition.stagingArtifactKey, sha256: transition.stagedSha256, byteLength: 123, width: 80, height: 60, expiresAt, retryAllowed: true, requiresNewSource: false });
    assert.equal((await repository.transitionOperationToStaged(workspaceId, value.workflowId, value.operations[0].operationId, 2, transition)).type, "Conflict");
    assert.equal((await repository.transitionOperationToStaged(workspaceId, value.workflowId, "missing", 2, transition)).type, "NotFound");
    assert.equal((await repository.transitionOperationToStaged(WorkspaceId.create("other-workspace"), value.workflowId, value.operations[0].operationId, 2, transition)).type, "NotFound");
  });

  it("rejects non-canonical persisted operation IDs during rehydration", async () => {
    const value = workflow(); await repository.create(value);
    await connection.database.execute(sql`UPDATE catalog_product_media_operations SET operation_id = 'Uppercase' WHERE workspace_id = ${workspaceId.value} AND workflow_id = ${value.workflowId}`);
    await assert.rejects(repository.findById(workspaceId, value.workflowId), /ProductMediaOperationId/);
  });

  it("persists focused terminal transitions without rewriting canonical Media or changing its revision", async () => {
    const value = workflow(); value.operations[0].status = "Staged"; value.operations[0].retryAllowed = true;
    await repository.create(value);
    value.version = 1;
    assert.equal((await repository.save(value, state(), 0, 0)).type, "Saved");
    const before = await repository.loadMediaState(workspaceId, productId);
    const result = await repository.transitionOperation(workspaceId, value.workflowId, value.operations[0].operationId, 1, {
      status: "SourceUnavailable", allowedPreviousStatuses: ["Staged"], workflowStatus: "Failed",
      retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaSourceUnavailable",
    });
    assert.deepEqual(result, { type: "Transitioned", version: 2 });
    const after = await repository.loadMediaState(workspaceId, productId);
    const reloaded = await repository.findById(workspaceId, value.workflowId);
    assert.deepEqual(after, before);
    assert.equal(reloaded?.operations[0].status, "SourceUnavailable");
    assert.equal(reloaded?.operations[0].requiresNewSource, true);
    assert.equal((await repository.transitionOperation(workspaceId, value.workflowId, value.operations[0].operationId, 1, { status: "Failed", allowedPreviousStatuses: ["SourceUnavailable"], workflowStatus: "Failed", retryAllowed: true, requiresNewSource: false })).type, "Conflict");
    assert.equal((await repository.transitionOperation(workspaceId, value.workflowId, "missing", 2, { status: "Cancelled", allowedPreviousStatuses: ["Staged"], workflowStatus: "Cancelled", retryAllowed: false, requiresNewSource: false })).type, "NotFound");
  });

  it("recovers an exact operation after another operation advances the Workflow without rewriting canonical Media", async () => {
    const value = workflow();
    value.operations[0].status = "Staged"; value.operations[0].retryAllowed = true;
    value.operations.push({ ...value.operations[0], operationId: "workflow-a-other", status: "Staged" });
    await repository.create(value);
    value.version = 1;
    assert.equal((await repository.save(value, state(), 0, 0)).type, "Saved");
    const before = await repository.loadMediaState(workspaceId, productId);
    assert.deepEqual(await repository.transitionOperation(workspaceId, value.workflowId, "workflow-a-other", 1, {
      status: "Failed", allowedPreviousStatuses: ["Staged"], workflowStatus: "InProgress",
      retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaStorageFailed",
    }), { type: "Transitioned", version: 2 });
    assert.equal((await repository.transitionOperation(workspaceId, value.workflowId, "workflow-a-add", 1, {
      status: "SourceUnavailable", allowedPreviousStatuses: ["Staged"], workflowStatus: "Failed",
      retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaSourceUnavailable",
    })).type, "Conflict");
    const reloaded = await repository.findById(workspaceId, value.workflowId);
    assert.equal(reloaded?.version, 2);
    assert.equal(reloaded?.operations.find((operation) => operation.operationId === "workflow-a-add")?.status, "Staged");
    assert.deepEqual(await repository.transitionOperation(workspaceId, value.workflowId, "workflow-a-add", reloaded!.version, {
      status: "SourceUnavailable", allowedPreviousStatuses: ["Staged"], workflowStatus: "Failed",
      retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaSourceUnavailable",
    }), { type: "Transitioned", version: 3 });
    assert.deepEqual(await repository.loadMediaState(workspaceId, productId), before);
  });

  it("rejects an invalid canonical cover and rolls back workflow changes", async () => {
    const value = workflow(); await repository.create(value); value.version = 1; value.status = "Completed";
    const invalid = state(); invalid.coverMediaId = "missing";
    await assert.rejects(repository.save(value, invalid, 0, 0));
    assert.equal((await repository.findById(workspaceId, "workflow-a"))?.version, 0);
  });
});
