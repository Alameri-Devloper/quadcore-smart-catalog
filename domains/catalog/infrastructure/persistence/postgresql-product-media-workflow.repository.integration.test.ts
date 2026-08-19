import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DepartmentStorageSegment } from "../../media/domain/product-media-keys";
import { ProductMediaRoot } from "../../media/domain/product-media-root";
import type { ProductMediaState } from "../../media/domain/product-media-state";
import type { ProductMediaWorkflowState } from "../../media/domain/product-media-workflow";
import { DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION } from "../../media/ports/product-image-processor";
import type { ProductMediaStoragePort } from "../../media/ports/product-media-storage.port";
import { ReplaceProductMediaSourceUseCase } from "../../media/services/replace-product-media-source";
import { CatalogId, ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { ProductRevision } from "../../types/product-revision.value-object";
import { Product } from "../../types/product.aggregate";
import { createCatalogDatabaseConnection } from "./database";
import { assertSafeIntegrationTestDatabaseUrl } from "./integration-test-database-safety";
import { PostgreSqlProductMediaRootRepository } from "./postgresql-product-media-root.repository";
import { PostgreSqlMediaSourceAttemptRepository } from "./postgresql-media-source-attempt.repository";
import { PostgreSqlProductMediaWorkflowRepository } from "./postgresql-product-media-workflow.repository";
import { PostgreSqlProductRepository } from "./postgresql-product.repository";
import { catalogProductMediaSourceAttemptAudits, catalogProductMediaSourceAttempts } from "./schema";

const connectionUrl = process.env.TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL);
const connection = createCatalogDatabaseConnection(connectionUrl!);
const products = new PostgreSqlProductRepository(connection.database);
const roots = new PostgreSqlProductMediaRootRepository(connection.database);
const repository = new PostgreSqlProductMediaWorkflowRepository(connection.database);
const sourceAttempts = new PostgreSqlMediaSourceAttemptRepository(connection.database);
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

describe("PostgreSQL Product Media Source Attempt persistence", () => {
  const unavailableWorkflow = async () => {
    const value = workflow();
    value.status = "Failed";
    value.operations[0].status = "SourceUnavailable";
    value.operations[0].retryAllowed = false;
    value.operations[0].requiresNewSource = true;
    value.operations[0].errorCode = "ProductMediaSourceUnavailable";
    assert.equal((await repository.create(value)).type, "Created");
    return value;
  };
  const createInput = (overrides: Partial<Parameters<typeof sourceAttempts.createOrReuse>[0]> = {}) => ({
    workspaceId,
    operationId: "workflow-a-add",
    sourceAttemptId: "b".repeat(32),
    sourceFingerprint: "c".repeat(64),
    actorId: "actor-a",
    createdAt: now,
    expiresAt: new Date(now.getTime() + 14 * 86400000),
    ...overrides,
  });
  const replacementStorage = (resume: { available: boolean; stageCalls: number }): ProductMediaStoragePort => ({
    async stage(input) {
      resume.stageCalls += 1;
      return { type: "Staged", object: { key: input.stagingKey, sha256: "d".repeat(64), byteLength: 3, mediaType: "image/webp", width: 80, height: 60 } };
    },
    async temporaryExists() {
      if (!resume.available) throw new Error("Injected temporary resume unavailability.");
      return { type: "Exists", exists: true };
    },
    async publishNew(input) {
      return { type: "Published", object: { ...input.stagedObject, key: input.finalKey } };
    },
    async publishReplacement(input) {
      return { type: "Replaced", object: { ...input.stagedObject, key: input.finalKey } };
    },
    async moveToTrash() { return { type: "MovedToTrash" }; },
    async restoreFromTrash() { return { type: "Restored" }; },
    async discardTemporary() { return { type: "Discarded" }; },
    async inspect() { return { type: "Failed", code: "FinalObjectMissing" }; },
    async exists() { return { type: "Exists", exists: true }; },
  });
  const replacementUseCase = (storage: ProductMediaStoragePort) => new ReplaceProductMediaSourceUseCase({
    attempts: sourceAttempts,
    workflows: repository,
    products,
    roots,
    authorization: { async canEditProduct(actor, targetProductId) {
      return actor.workspaceId.value === workspaceId.value && targetProductId.value === productId.value;
    } },
    processor: {
      async inspect() { return { type: "Inspected", inspection: { format: "png", width: 80, height: 60, hasAlpha: true, animated: false } }; },
      async normalize() { return { type: "Normalized", image: { bytes: new Uint8Array([7, 8, 9]), mediaType: "image/webp", width: 80, height: 60, sha256: "d".repeat(64) } }; },
    },
    processingConfiguration: DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION,
    storage,
    allocateSourceAttemptId: () => "b".repeat(32),
  });

  it("atomically reuses the same active fingerprint and conflicts a different active source", async () => {
    await unavailableWorkflow();
    const [first, second] = await Promise.all([
      sourceAttempts.createOrReuse(createInput()),
      sourceAttempts.createOrReuse(createInput({ sourceAttemptId: "d".repeat(32) })),
    ]);
    assert.equal([first.type, second.type].filter((type) => type === "Created").length, 1);
    assert.equal([first.type, second.type].filter((type) => type === "Existing").length, 1);
    const conflict = await sourceAttempts.createOrReuse(createInput({
      sourceAttemptId: "e".repeat(32),
      sourceFingerprint: "f".repeat(64),
    }));
    assert.equal(conflict.type, "ActiveSourceAttemptConflict");
    assert.equal((await connection.database.select().from(catalogProductMediaSourceAttempts)).length, 1);
  });

  it("expires active attempts by the server clock and permits a new attempt", async () => {
    await unavailableWorkflow();
    await sourceAttempts.createOrReuse(createInput());
    const later = new Date(now.getTime() + 15 * 86400000);
    const next = await sourceAttempts.createOrReuse(createInput({
      sourceAttemptId: "d".repeat(32),
      sourceFingerprint: "e".repeat(64),
      createdAt: later,
      expiresAt: new Date(later.getTime() + 14 * 86400000),
    }));
    assert.equal(next.type, "Created");
    const rows = await connection.database.select().from(catalogProductMediaSourceAttempts);
    assert.deepEqual(rows.map((row) => row.status).sort(), ["AwaitingUpload", "Expired"]);
  });

  it("permits a new attempt after terminal failure and enforces the scoped operation foreign key", async () => {
    await unavailableWorkflow();
    await sourceAttempts.createOrReuse(createInput());
    await sourceAttempts.markFailed({
      workspaceId,
      operationId: "workflow-a-add",
      sourceAttemptId: "b".repeat(32),
      actorId: "actor-a",
      failureCode: "SOURCE_IMAGE_INVALID",
      failedAt: now,
    });
    const next = await sourceAttempts.createOrReuse(createInput({
      sourceAttemptId: "d".repeat(32),
      sourceFingerprint: "e".repeat(64),
    }));
    assert.equal(next.type, "Created");
    assert.deepEqual(
      (await connection.database.select().from(catalogProductMediaSourceAttempts)).map((row) => row.status).sort(),
      ["AwaitingUpload", "Failed"],
    );
    await assert.rejects(connection.database.insert(catalogProductMediaSourceAttempts).values({
      workspaceId: "foreign-workspace",
      operationId: "workflow-a-add",
      sourceAttemptId: "f".repeat(32),
      sourceFingerprint: "a".repeat(64),
      status: "AwaitingUpload",
      createdByActorId: "actor-a",
      createdAt: now,
      expiresAt: new Date(now.getTime() + 14 * 86400000),
    }));
  });

  it("atomically applies verified source metadata to the same operation without changing the workflow fingerprint", async () => {
    const original = await unavailableWorkflow();
    await sourceAttempts.createOrReuse(createInput());
    const stagingArtifactKey = "workspaces/workflow-workspace/products/product--40498bfda27b581b/_staging/workflow-a-add--bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp";
    const applied = await sourceAttempts.apply({
      workspaceId,
      operationId: original.operations[0].operationId,
      sourceAttemptId: "b".repeat(32),
      sourceFingerprint: "c".repeat(64),
      stagingArtifactKey,
      stagedSha256: "d".repeat(64),
      stagedByteLength: 100,
      stagedWidth: 80,
      stagedHeight: 60,
      verifiedMetadata: { sha256: "e".repeat(64), sizeBytes: 120, detectedMimeType: "image/png", width: 80, height: 60 },
      actorId: "actor-a",
      appliedAt: now,
    });
    assert.equal(applied.type, "Applied");
    const reloaded = await repository.findById(workspaceId, original.workflowId);
    assert.equal(reloaded?.requestFingerprint, original.requestFingerprint);
    assert.equal(reloaded?.operations[0].operationId, original.operations[0].operationId);
    assert.equal(reloaded?.operations[0].status, "Staged");
    assert.equal(reloaded?.operations[0].stagedArtifactKey, stagingArtifactKey);
    assert.equal(reloaded?.operations[0].requiresNewSource, false);
    const [attempt] = await connection.database.select().from(catalogProductMediaSourceAttempts).where(and(
      eq(catalogProductMediaSourceAttempts.workspaceId, workspaceId.value),
      eq(catalogProductMediaSourceAttempts.sourceAttemptId, "b".repeat(32)),
    ));
    assert.equal(attempt.status, "Applied");
    assert.equal(attempt.verifiedSha256, "e".repeat(64));
    const audits = await connection.database.select().from(catalogProductMediaSourceAttemptAudits);
    assert.deepEqual(audits.map((audit) => audit.eventType).sort(), ["SourceAttemptApplied", "SourceAttemptCreated"]);
    assert.ok(audits.every((audit) => !audit.resultCode.includes("workspaces/")));
  });

  it("does not disclose or mutate a foreign Workspace operation", async () => {
    await unavailableWorkflow();
    const result = await sourceAttempts.createOrReuse(createInput({ workspaceId: WorkspaceId.create("foreign-workspace") }));
    assert.equal(result.type, "MediaOperationNotFound");
    assert.equal((await connection.database.select().from(catalogProductMediaSourceAttempts)).length, 0);
  });

  it("applies and resumes through the existing workflow using the same operation identity", async () => {
    const original = await unavailableWorkflow();
    const resume = { available: true, stageCalls: 0 };
    const result = await replacementUseCase(replacementStorage(resume)).execute({
      actorContext: { workspaceId, actorId: "actor-a" },
      operationId: original.operations[0].operationId,
      bytes: new Uint8Array([1, 2, 3]),
      clientMediaType: "image/png",
      effectiveTime: now,
    });
    const reloaded = await repository.findById(workspaceId, original.workflowId);
    assert.equal(result.type, "MediaWorkflowResumed");
    assert.equal(reloaded?.requestFingerprint, original.requestFingerprint);
    assert.equal(reloaded?.operations[0].operationId, original.operations[0].operationId);
    assert.equal(reloaded?.operations[0].status, "Completed");
    assert.equal(resume.stageCalls, 1);
    assert.deepEqual((await repository.loadMediaState(workspaceId, productId))?.items.map((item) => item.mediaId), [original.operations[0].operationId]);
  });

  it("keeps an applied replacement after resume failure and later retries without restaging", async () => {
    const original = await unavailableWorkflow();
    const resume = { available: false, stageCalls: 0 };
    const useCase = replacementUseCase(replacementStorage(resume));
    const command = {
      actorContext: { workspaceId, actorId: "actor-a" },
      operationId: original.operations[0].operationId,
      bytes: new Uint8Array([1, 2, 3]),
      clientMediaType: "image/png",
      effectiveTime: now,
    } as const;
    assert.equal((await useCase.execute(command)).type, "MediaWorkflowResumeUnavailable");
    const retained = await repository.findById(workspaceId, original.workflowId);
    assert.equal(retained?.operations[0].status, "Staged");
    assert.equal(retained?.operations[0].retryAllowed, true);
    assert.equal(retained?.operations[0].requiresNewSource, false);
    assert.equal((await connection.database.select().from(catalogProductMediaSourceAttempts))[0]?.status, "Applied");
    resume.available = true;
    assert.equal((await useCase.execute(command)).type, "MediaWorkflowResumed");
    assert.equal((await repository.findById(workspaceId, original.workflowId))?.operations[0].status, "Completed");
    assert.equal(resume.stageCalls, 1);
  });
});
