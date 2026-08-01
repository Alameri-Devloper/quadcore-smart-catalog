import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { ProductRepository } from "../../repositories/product.repository.interface";
import { CatalogId, ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { Product } from "../../types/product.aggregate";
import { DepartmentStorageSegment } from "../domain/product-media-keys";
import { ProductMediaRoot } from "../domain/product-media-root";
import type { ProductMediaState } from "../domain/product-media-state";
import type { ProductMediaWorkflowState } from "../domain/product-media-workflow";
import type { ProductImageProcessor } from "../ports/product-image-processor";
import { DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION } from "../ports/product-image-processor";
import { ProductMediaStoragePartialOperationError, type ProductMediaStoragePort, type StagedProductMediaObject } from "../ports/product-media-storage.port";
import type { ProductMediaWorkflowRepository } from "../repositories/product-media-workflow.repository";
import { CancelProductMediaOperationUseCase, CleanupExpiredMediaStagingUseCase, ExecuteProductMediaWorkflowUseCase, GetProductMediaStateQuery, RetryProductMediaOperationUseCase } from "./product-media-workflow";

const workspaceId = WorkspaceId.create("workspace-a"); const productId = ProductId.create("product-a");
const actor = { workspaceId, actorId: "actor-a" };
const published = Product.rehydrate({ workspaceId, productId, catalogId: CatalogId.create("catalog-a"), lifecycleState: "Published", revision: 2, createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-02T00:00:00Z") });
let root: ProductMediaRoot;
before(async () => { root = await ProductMediaRoot.createNew({ workspaceId, productId, departmentSegment: DepartmentStorageSegment.create("products"), productName: "Product", createdAt: new Date("2026-01-01T00:00:00Z") }); });
const hash = "a".repeat(64);
const cloneWorkflow = (value: ProductMediaWorkflowState): ProductMediaWorkflowState => ({ ...value, workspaceId: value.workspaceId, productId: value.productId, startedAt: new Date(value.startedAt), completedAt: value.completedAt ? new Date(value.completedAt) : undefined, operations: value.operations.map((operation) => ({ ...operation, workspaceId: operation.workspaceId, createdAt: new Date(operation.createdAt), expiresAt: operation.expiresAt ? new Date(operation.expiresAt) : undefined, lastAttemptAt: operation.lastAttemptAt ? new Date(operation.lastAttemptAt) : undefined, completedAt: operation.completedAt ? new Date(operation.completedAt) : undefined })) });
const cloneState = (value: ProductMediaState): ProductMediaState => ({ ...value, workspaceId: value.workspaceId, productId: value.productId, updatedAt: new Date(value.updatedAt), items: value.items.map((item) => ({ ...item, workspaceId: item.workspaceId, productId: item.productId, createdAt: new Date(item.createdAt) })) });

class MemoryWorkflows implements ProductMediaWorkflowRepository {
  workflow?: ProductMediaWorkflowState; state?: ProductMediaState;
  savedStatuses: string[][] = [];
  failSave = false;
  failSaveStatuses = new Set<string>();
  transitionExpectedVersions: number[] = [];
  stageTransitionExpectedVersions: number[] = [];
  failStageTransitionOnce = false;
  stageTransitionInterception?: { readonly operationId: string; readonly concurrentStatus?: ProductMediaWorkflowState["operations"][number]["status"]; readonly compatible?: boolean };
  transitionInterception?: { readonly operationId: string; readonly advanceOperationId?: string; readonly concurrentStatus?: ProductMediaWorkflowState["operations"][number]["status"] };
  async findById(scope: WorkspaceId, id: string) { return scope.value === workspaceId.value && this.workflow?.workflowId === id ? cloneWorkflow(this.workflow) : null; }
  async findByIdempotencyKey(scope: WorkspaceId, key: string) { return scope.value === workspaceId.value && this.workflow?.idempotencyKey === key ? cloneWorkflow(this.workflow) : null; }
  async create(workflow: ProductMediaWorkflowState) { if (this.workflow) return { type: "IdempotencyConflict" as const }; this.workflow = cloneWorkflow(workflow); return { type: "Created" as const }; }
  async claimOperation(scope: WorkspaceId, workflowId: string, operationId: string, expected: number, now: Date) {
    if (!this.workflow || scope.value !== workspaceId.value || this.workflow.workflowId !== workflowId) return { type: "NotFound" as const };
    const operation = this.workflow.operations.find((value) => value.operationId === operationId); if (!operation) return { type: "NotFound" as const };
    if (operation.status === "Completed") return { type: "Completed" as const }; if (operation.status === "InProgress") return { type: "AlreadyInProgress" as const };
    if (this.workflow.version !== expected) return { type: "Conflict" as const }; this.workflow.version += 1; operation.status = "InProgress"; operation.lastAttemptAt = now; operation.attemptCount += 1; return { type: "Claimed" as const, claimedVersion: this.workflow.version };
  }
  async transitionOperationToStaged(scope: WorkspaceId, workflowId: string, operationId: string, expected: number, transition: Parameters<ProductMediaWorkflowRepository["transitionOperationToStaged"]>[4]) {
    if (!this.workflow || scope.value !== workspaceId.value || this.workflow.workflowId !== workflowId) return { type: "NotFound" as const };
    const operation = this.workflow.operations.find((value) => value.operationId === operationId); if (!operation) return { type: "NotFound" as const };
    this.stageTransitionExpectedVersions.push(expected);
    if (this.failStageTransitionOnce) { this.failStageTransitionOnce = false; throw new Error("database unavailable"); }
    if (this.stageTransitionInterception?.operationId === operationId) {
      const interception = this.stageTransitionInterception; this.stageTransitionInterception = undefined;
      this.workflow.version += 1;
      if (interception.compatible) Object.assign(operation, { status: "Staged", stagedArtifactKey: transition.stagingArtifactKey, stagedSha256: transition.stagedSha256, stagedByteLength: transition.stagedByteLength, stagedWidth: transition.stagedWidth, stagedHeight: transition.stagedHeight, expiresAt: transition.expiresAt, retryAllowed: true, requiresNewSource: false });
      else if (interception.concurrentStatus) operation.status = interception.concurrentStatus;
      return { type: "Conflict" as const };
    }
    if (this.workflow.version !== expected || operation.status !== "Pending") return { type: "Conflict" as const };
    Object.assign(operation, { status: "Staged", stagedArtifactKey: transition.stagingArtifactKey, stagedSha256: transition.stagedSha256, stagedByteLength: transition.stagedByteLength, stagedWidth: transition.stagedWidth, stagedHeight: transition.stagedHeight, expiresAt: new Date(transition.expiresAt), retryAllowed: true, requiresNewSource: false, errorCode: undefined });
    this.workflow.status = transition.workflowStatus; this.workflow.version += 1;
    return { type: "Transitioned" as const, version: this.workflow.version };
  }
  async transitionOperation(scope: WorkspaceId, workflowId: string, operationId: string, expected: number, transition: Parameters<ProductMediaWorkflowRepository["transitionOperation"]>[4]) {
    if (!this.workflow || scope.value !== workspaceId.value || this.workflow.workflowId !== workflowId) return { type: "NotFound" as const };
    const operation = this.workflow.operations.find((value) => value.operationId === operationId); if (!operation) return { type: "NotFound" as const };
    this.transitionExpectedVersions.push(expected);
    if (this.transitionInterception?.operationId === operationId) {
      const interception = this.transitionInterception; this.transitionInterception = undefined;
      const advanced = this.workflow.operations.find((value) => value.operationId === interception.advanceOperationId);
      if (advanced) { advanced.status = "Failed"; advanced.retryAllowed = false; }
      if (interception.concurrentStatus) { operation.status = interception.concurrentStatus; operation.retryAllowed = false; }
      this.workflow.version += 1;
      return { type: "Conflict" as const };
    }
    if (this.workflow.version !== expected || !transition.allowedPreviousStatuses.includes(operation.status)) return { type: "Conflict" as const };
    Object.assign(operation, transition); this.workflow.status = transition.workflowStatus; this.workflow.version += 1;
    return { type: "Transitioned" as const, version: this.workflow.version };
  }
  async loadMediaState(scope: WorkspaceId, id: ProductId) { return scope.value === workspaceId.value && id.value === productId.value && this.state ? cloneState(this.state) : null; }
  async save(workflow: ProductMediaWorkflowState, state: ProductMediaState, expectedWorkflow: number, expectedMedia: number) {
    if ((this.failSave && workflow.operations.some((operation) => operation.status === "Completed")) || workflow.operations.some((operation) => this.failSaveStatuses.has(operation.status))) throw new Error("database unavailable");
    if (!this.workflow || this.workflow.version !== expectedWorkflow) return { type: "WorkflowVersionConflict" as const };
    if ((this.state?.revision ?? 0) !== expectedMedia) return { type: "MediaRevisionConflict" as const };
    this.workflow = cloneWorkflow(workflow); this.state = cloneState(state); this.savedStatuses.push(workflow.operations.map((operation) => operation.status)); return { type: "Saved" as const };
  }
  async listExpired(scope: WorkspaceId, now: Date) { return scope.value === workspaceId.value && this.workflow?.operations.some((value) => value.expiresAt && value.expiresAt <= now) ? [cloneWorkflow(this.workflow)] : []; }
}

class MemoryStorage implements ProductMediaStoragePort {
  staged = new Map<string, StagedProductMediaObject>(); finals = new Map<string, string>(); trash = new Map<string, string>(); fail = new Set<string>(); calls: string[] = []; failCompensation = false;
  moveFailureCode?: "ChecksumMismatch" | "TrashConflict" | "FinalObjectMissing";
  stageCallCount = 0; stagePartial = false; stageFailureCode?: "TargetConflict" | "ChecksumMismatch"; discardFailureCode?: "UnsafeKey"; discardAsMissing = false;
  publicationFailureCode?: "TemporaryObjectMissing" | "FinalObjectMissing" | "TargetConflict" | "TrashConflict" | "ChecksumMismatch" | "ReplacementRestorationFailed";
  partialOperation?: "publish-new" | "publish-replacement" | "move-to-trash";
  temporaryProbeFailure = false; temporaryProbeAmbiguity = false; finalProbeFailure = false; finalProbeAmbiguity = false;
  async stage(input: Parameters<ProductMediaStoragePort["stage"]>[0]) { this.stageCallCount += 1; if (this.stageFailureCode) return { type: "Failed" as const, code: this.stageFailureCode }; const object = { key: input.stagingKey, sha256: input.image.sha256, byteLength: input.image.bytes.length, mediaType: "image/webp" as const, width: input.image.width, height: input.image.height }; this.staged.set(input.stagingKey.value, object); if (this.stagePartial) throw new ProductMediaStoragePartialOperationError("stage"); return { type: "Staged" as const, object }; }
  async publishNew(input: Parameters<ProductMediaStoragePort["publishNew"]>[0]) { this.calls.push(`add:${input.stagedObject.key.value}`); if (this.fail.has(input.stagedObject.key.value) || this.publicationFailureCode) return { type: "Failed" as const, code: this.publicationFailureCode ?? "ChecksumMismatch" as const }; this.finals.set(input.finalKey.value, input.stagedObject.sha256); this.staged.delete(input.stagedObject.key.value); if (this.partialOperation === "publish-new") throw new ProductMediaStoragePartialOperationError("publish-new"); return { type: "Published" as const, object: { ...input.stagedObject, key: input.finalKey } }; }
  async publishReplacement(input: Parameters<ProductMediaStoragePort["publishReplacement"]>[0]) { this.calls.push(`replace:${input.stagedObject.key.value}`); if (this.fail.has(input.stagedObject.key.value) || this.publicationFailureCode) return { type: "Failed" as const, code: this.publicationFailureCode ?? "ChecksumMismatch" as const }; const previous = this.finals.get(input.finalKey.value); if (previous) this.trash.set(input.trashKey.value, previous); this.finals.set(input.finalKey.value, input.stagedObject.sha256); this.staged.delete(input.stagedObject.key.value); if (this.partialOperation === "publish-replacement") throw new ProductMediaStoragePartialOperationError("publish-replacement"); return { type: "Replaced" as const, object: { ...input.stagedObject, key: input.finalKey } }; }
  async moveToTrash(input: Parameters<ProductMediaStoragePort["moveToTrash"]>[0]) { this.calls.push(`remove:${input.finalKey.value}`); if (this.moveFailureCode) return { type: "Failed" as const, code: this.moveFailureCode }; if (this.failCompensation) return { type: "Failed" as const, code: "TrashConflict" as const }; const value = this.finals.get(input.finalKey.value); if (!value) return { type: "Failed" as const, code: "FinalObjectMissing" as const }; this.finals.delete(input.finalKey.value); this.trash.set(input.trashKey.value, value); if (this.partialOperation === "move-to-trash") throw new ProductMediaStoragePartialOperationError("move-to-trash"); return { type: "MovedToTrash" as const }; }
  async restoreFromTrash(input: Parameters<ProductMediaStoragePort["restoreFromTrash"]>[0]) { this.calls.push(`restore:${input.trashKey.value}`); if (this.failCompensation) return { type: "Failed" as const, code: "FinalObjectMissing" as const }; const value = this.trash.get(input.trashKey.value); if (!value) return { type: "Failed" as const, code: "TemporaryObjectMissing" as const }; this.finals.set(input.finalKey.value, value); return { type: "Restored" as const }; }
  async discardTemporary(input: Parameters<ProductMediaStoragePort["discardTemporary"]>[0]) { if (this.discardFailureCode) return { type: "Failed" as const, code: this.discardFailureCode }; if (this.discardAsMissing) { this.staged.delete(input.stagingKey.value); return { type: "Failed" as const, code: "TemporaryObjectMissing" as const }; } const existed = this.staged.delete(input.stagingKey.value); return existed ? { type: "Discarded" as const } : { type: "Failed" as const, code: "TemporaryObjectMissing" as const }; }
  async temporaryExists(key: Parameters<ProductMediaStoragePort["temporaryExists"]>[0]) { if (this.temporaryProbeAmbiguity) throw new ProductMediaStoragePartialOperationError("publish-new"); if (this.temporaryProbeFailure) return { type: "Failed" as const, code: "UnsafeKey" as const }; return { type: "Exists" as const, exists: this.staged.has(key.value) }; }
  async inspect(key: Parameters<ProductMediaStoragePort["inspect"]>[0]) { const value = this.finals.get(key.value); return value ? { type: "Found" as const, object: { key, sha256: value, byteLength: 1, mediaType: "image/webp" as const, width: 1, height: 1 } } : { type: "Failed" as const, code: "FinalObjectMissing" as const }; }
  async exists(key: Parameters<ProductMediaStoragePort["exists"]>[0]) { if (this.finalProbeAmbiguity) throw new ProductMediaStoragePartialOperationError("move-to-trash"); if (this.finalProbeFailure) return { type: "Failed" as const, code: "UnsafeKey" as const }; return { type: "Exists" as const, exists: this.finals.has(key.value) }; }
}

const processor: ProductImageProcessor = { async inspect() { return { type: "Inspected", inspection: { format: "webp", width: 1, height: 1, hasAlpha: false, animated: false } }; }, async normalize(bytes) { return bytes[0] === 0 ? { type: "Rejected", code: "CorruptImage" } : { type: "Normalized", image: { bytes, mediaType: "image/webp", width: 1, height: 1, sha256: hash } }; } };
const products: ProductRepository = { async findById(scope, id) { return scope.value === workspaceId.value && id.value === productId.value ? published : null; }, async create() { throw new Error("unused"); }, async update() { throw new Error("unused"); } };
const setup = (preseedRoot = true) => { const workflows = new MemoryWorkflows(); const storage = new MemoryStorage(); const boundaryCalls = { authorization: 0, products: 0, roots: 0 }; let registeredRoot = preseedRoot ? root : null; const dependencies = { workflows, storage, products: { ...products, async findById(scope: WorkspaceId, id: ProductId) { boundaryCalls.products += 1; return products.findById(scope, id); } }, roots: { async findByProduct(scope: WorkspaceId, id: ProductId) { boundaryCalls.roots += 1; return scope.value === workspaceId.value && id.value === productId.value ? registeredRoot : null; }, async create(created: ProductMediaRoot) { if (registeredRoot) return { type: "AlreadyExists" as const, existingRoot: registeredRoot }; registeredRoot = created; return { type: "Created" as const, root: created }; } }, authorization: { async canEditProduct(context: typeof actor) { boundaryCalls.authorization += 1; return context.actorId === "actor-a"; } }, processor, processingConfiguration: DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION }; return { workflows, storage, dependencies, execute: new ExecuteProductMediaWorkflowUseCase(dependencies), boundaryCalls, getRoot: () => registeredRoot, setRoot: (value: ProductMediaRoot | null) => { registeredRoot = value; } }; };
const command = (operations: Parameters<ExecuteProductMediaWorkflowUseCase["execute"]>[0]["operations"], overrides = {}) => ({ actorContext: actor, workflowId: "workflow-a", productId: productId.value, expectedMediaRevision: 0, idempotencyKey: "key-a", effectiveTime: new Date("2026-02-01T00:00:00Z"), operations, ...overrides });
const seedCanonicalMedia = (workflows: MemoryWorkflows, storage: MemoryStorage, mediaId = "old") => {
  const key = `${root.storageRootKey.value}/gallery-01.webp`;
  workflows.state = { workspaceId, productId, revision: 0, coverMediaId: mediaId, updatedAt: new Date("2026-01-01T00:00:00Z"), updatedBy: "actor-a", items: [{ mediaId, workspaceId, productId, storageArtifactKey: key, checksumSha256: "b".repeat(64), mimeType: "image/webp", displayOrder: 0, createdAt: new Date("2026-01-01T00:00:00Z"), createdBy: "actor-a" }] };
  storage.finals.set(key, "b".repeat(64));
  return key;
};

describe("Product Media workflow application", () => {
  it("preserves Published Product lifecycle while completing independent media", async () => { const { execute } = setup(); const result = await execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) }, selectAsCover: true }])); assert.equal(result.status, "Completed"); assert.equal(published.lifecycleState.value, "Published"); });
  it("preserves partial success and executes Add before Remove", async () => { const { execute, storage } = setup(); const result = await execute.execute(command([{ operationId: "remove-missing", type: "Remove", targetMediaId: "missing" }, { operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])); assert.equal(result.status, "PartiallyCompleted"); assert.match(storage.calls[0], /^add:/); });
  it("reports all failures without creating fake metadata", async () => { const { execute, workflows } = setup(); const result = await execute.execute(command([{ operationId: "bad", type: "Add", source: { bytes: new Uint8Array([0]) } }])); assert.equal(result.status, "Failed"); assert.equal(workflows.state?.items.length, 0); });
  it("preserves the previous image and cover when replacement publication fails", async () => { const { execute, workflows, storage } = setup(); const key = `${root.storageRootKey.value}/gallery-01.webp`; workflows.state = { workspaceId, productId, revision: 0, coverMediaId: "old", updatedAt: new Date(), updatedBy: "actor-a", items: [{ mediaId: "old", workspaceId, productId, storageArtifactKey: key, checksumSha256: "b".repeat(64), mimeType: "image/webp", displayOrder: 0, createdAt: new Date(), createdBy: "actor-a" }] }; storage.finals.set(key, "b".repeat(64)); storage.fail.add(`${root.storageRootKey.value}/_staging/replace-a.webp`); const result = await execute.execute(command([{ operationId: "replace-a", type: "Replace", targetMediaId: "old", source: { bytes: new Uint8Array([1]) } }])); assert.equal(result.status, "Failed"); assert.equal(workflows.state.items[0].checksumSha256, "b".repeat(64)); assert.equal(workflows.state.coverMediaId, "old"); });
  it("uses Trash for removal and selects a deterministic fallback cover", async () => { const { execute, workflows, storage } = setup(); const keys = [1,2].map((n) => `${root.storageRootKey.value}/gallery-0${n}.webp`); workflows.state = { workspaceId, productId, revision: 0, coverMediaId: "one", updatedAt: new Date(), updatedBy: "actor-a", items: keys.map((key,index) => ({ mediaId: index ? "two" : "one", workspaceId, productId, storageArtifactKey: key, checksumSha256: hash, mimeType: "image/webp", displayOrder: index, createdAt: new Date(), createdBy: "actor-a" })) }; keys.forEach((key) => storage.finals.set(key, hash)); await execute.execute(command([{ operationId: "remove-one", type: "Remove", targetMediaId: "one" }])); assert.equal(workflows.state.coverMediaId, "two"); assert.equal(storage.trash.size, 1); });
  it("returns the previous logical workflow for a repeated idempotency key", async () => { const { execute, storage } = setup(); const input = command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]); const first = await execute.execute(input); const second = await execute.execute(input); assert.deepEqual(second, first); assert.equal(storage.calls.length, 1); });
  it("binds an idempotency key to operation descriptors and source content", async () => { const one = setup(); await one.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])); await assert.rejects(one.execute.execute(command([{ operationId: "add-b", type: "Add", source: { bytes: new Uint8Array([1]) } }])), /IdempotencyConflict/); const two = setup(); await two.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])); await assert.rejects(two.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([2]) } }])), /IdempotencyConflict/); });
  it("creates the immutable unclassified root lazily and persists effect boundaries", async () => { const value = setup(false); await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])); assert.match(value.getRoot()!.storageRootKey.value, /\/unclassified\//); assert.equal(value.workflows.stageTransitionExpectedVersions.length, 1); assert.ok(value.workflows.savedStatuses.some(([status]) => status === "InProgress")); assert.ok(value.workflows.savedStatuses.some(([status]) => status === "Completed")); });
  it("accepts exact compatible concurrent Staged truth without re-staging", async () => {
    const value = setup(); value.workflows.stageTransitionInterception = { operationId: "add-a", compatible: true };
    const result = await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    assert.equal(result.operations[0].status, "Completed");
    assert.equal(value.storage.stageCallCount, 1);
    assert.deepEqual(value.workflows.stageTransitionExpectedVersions, [0]);
  });
  it("reloads once and retries only the Staged transition with the reloaded version", async () => {
    const value = setup(); value.workflows.stageTransitionInterception = { operationId: "add-a" };
    await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    assert.equal(value.storage.stageCallCount, 1);
    assert.deepEqual(value.workflows.stageTransitionExpectedVersions, [0, 1]);
  });
  for (const discardAsMissing of [false, true]) {
    it(`establishes SourceUnavailable after a failed Staged write and ${discardAsMissing ? "confirmed missing" : "successful discard of"} the owned file`, async () => {
      const value = setup(); value.workflows.failStageTransitionOnce = true; value.storage.discardAsMissing = discardAsMissing;
      await assert.rejects(value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])), /ProductMediaSourceUnavailable/);
      assert.equal(value.storage.stageCallCount, 1);
      assert.equal(value.storage.staged.size, 0);
      assert.deepEqual({ status: value.workflows.workflow!.operations[0].status, retryAllowed: value.workflows.workflow!.operations[0].retryAllowed, requiresNewSource: value.workflows.workflow!.operations[0].requiresNewSource }, { status: "SourceUnavailable", retryAllowed: false, requiresNewSource: true });
    });
  }
  it("discards exact owned staging and establishes SourceUnavailable when Staged truth cannot be established", async () => {
    const value = setup(); value.workflows.stageTransitionInterception = { operationId: "add-a", concurrentStatus: "Staged" };
    await assert.rejects(value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])), /ProductMediaSourceUnavailable/);
    assert.equal(value.storage.stageCallCount, 1);
    assert.equal(value.storage.staged.size, 0);
    assert.equal(value.workflows.workflow!.operations[0].status, "SourceUnavailable");
  });
  it("establishes ReconciliationRequired when exact staging discard is ambiguous", async () => {
    const value = setup(); value.workflows.stageTransitionInterception = { operationId: "add-a", concurrentStatus: "Staged" }; value.storage.discardFailureCode = "UnsafeKey";
    await assert.rejects(value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])), /ProductMediaReconciliationRequired/);
    assert.equal(value.storage.stageCallCount, 1);
    assert.equal(value.storage.staged.size, 1);
    assert.equal(value.workflows.workflow!.operations[0].status, "ReconciliationRequired");
  });
  it("durably classifies typed staging cleanup ambiguity as ReconciliationRequired", async () => {
    const value = setup(); value.storage.stagePartial = true;
    await assert.rejects(value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])), /ProductMediaReconciliationRequired/);
    assert.equal(value.workflows.workflow!.operations[0].status, "ReconciliationRequired");
    assert.equal(value.workflows.workflow!.operations[0].retryAllowed, false);
  });
  it("classifies a staging TargetConflict as durable ReconciliationRequired", async () => {
    const value = setup(); value.storage.stageFailureCode = "TargetConflict";
    await assert.rejects(value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])), /ProductMediaReconciliationRequired/);
    assert.equal(value.workflows.workflow!.operations[0].status, "ReconciliationRequired");
    assert.equal(value.storage.stageCallCount, 1);
  });
  it("manually retries a staged failure and completed retry remains idempotent", async () => { const { execute, workflows, storage, dependencies } = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`; storage.fail.add(staging); await execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])); storage.fail.delete(staging); const retry = new RetryProductMediaOperationUseCase(dependencies); const first = await retry.execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") }); const second = await retry.execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:01Z") }); assert.equal(first.operations[0].status, "Completed"); assert.equal(second.operations[0].attemptCount, first.operations[0].attemptCount); assert.equal(workflows.state?.items.length, 1); });
  it("maps TemporaryObjectMissing to durable SourceUnavailable in initial and retry publication paths", async () => {
    const initial = setup(); initial.storage.publicationFailureCode = "TemporaryObjectMissing";
    const initialResult = await initial.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    assert.deepEqual({ status: initialResult.operations[0].status, retryAllowed: initialResult.operations[0].retryAllowed, requiresNewSource: initialResult.operations[0].requiresNewSource }, { status: "SourceUnavailable", retryAllowed: false, requiresNewSource: true });
    const retried = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`; retried.storage.fail.add(staging);
    await retried.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    retried.storage.fail.delete(staging); retried.storage.publicationFailureCode = "TemporaryObjectMissing";
    const retryResult = await new RetryProductMediaOperationUseCase(retried.dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") });
    assert.deepEqual({ status: retryResult.operations[0].status, retryAllowed: retryResult.operations[0].retryAllowed, requiresNewSource: retryResult.operations[0].requiresNewSource }, { status: "SourceUnavailable", retryAllowed: false, requiresNewSource: true });
  });
  for (const scenario of [
    { name: "allocated TargetConflict", type: "Add" as const, code: "TargetConflict" as const },
    { name: "Replace FinalObjectMissing", type: "Replace" as const, code: "FinalObjectMissing" as const },
    { name: "TrashConflict", type: "Remove" as const, code: "TrashConflict" as const },
    { name: "ReplacementRestorationFailed", type: "Replace" as const, code: "ReplacementRestorationFailed" as const },
  ]) {
    it(`maps ${scenario.name} to ReconciliationRequired in initial and retry paths`, async () => {
      const operation = scenario.type === "Add"
        ? { operationId: "mapped", type: "Add" as const, source: { bytes: new Uint8Array([1]) } }
        : scenario.type === "Replace"
          ? { operationId: "mapped", type: "Replace" as const, targetMediaId: "old", source: { bytes: new Uint8Array([1]) } }
          : { operationId: "mapped", type: "Remove" as const, targetMediaId: "old" };
      const initial = setup(); if (scenario.type !== "Add") seedCanonicalMedia(initial.workflows, initial.storage);
      if (scenario.type === "Remove") initial.storage.moveFailureCode = "TrashConflict"; else initial.storage.publicationFailureCode = scenario.code;
      const initialResult = await initial.execute.execute(command([operation]));
      assert.equal(initialResult.operations[0].status, "ReconciliationRequired");
      assert.equal(initialResult.operations[0].retryAllowed, false);
      const retried = setup(); if (scenario.type !== "Add") seedCanonicalMedia(retried.workflows, retried.storage);
      const stagingKey = `${root.storageRootKey.value}/_staging/mapped.webp`;
      if (scenario.type === "Remove") retried.storage.moveFailureCode = "ChecksumMismatch"; else retried.storage.fail.add(stagingKey);
      await retried.execute.execute(command([operation]));
      retried.storage.fail.delete(stagingKey);
      if (scenario.type === "Remove") retried.storage.moveFailureCode = "TrashConflict"; else retried.storage.publicationFailureCode = scenario.code;
      const retryResult = await new RetryProductMediaOperationUseCase(retried.dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "mapped", effectiveTime: new Date("2026-02-02T00:00:00Z") });
      assert.equal(retryResult.operations[0].status, "ReconciliationRequired");
      assert.equal(retryResult.operations[0].retryAllowed, false);
    });
  }
  it("allows only one concurrent retry claim", async () => { const { execute, storage, dependencies } = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`; storage.fail.add(staging); await execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])); storage.fail.delete(staging); const retry = new RetryProductMediaOperationUseCase(dependencies); const results = await Promise.allSettled([retry.execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") }), retry.execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") })]); assert.equal(results.filter((result) => result.status === "fulfilled").length, 1); assert.equal(results.filter((result) => result.status === "rejected").length, 1); });
  it("compensates a filesystem success after database failure and reports ambiguity when compensation fails", async () => { const restored = setup(); restored.workflows.failSave = true; await assert.rejects(restored.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])), /ProductMediaStorageFailed/); assert.equal(restored.storage.finals.size, 0); const ambiguous = setup(); ambiguous.workflows.failSave = true; ambiguous.storage.failCompensation = true; await assert.rejects(ambiguous.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])), /ProductMediaReconciliationRequired/); assert.equal(ambiguous.storage.finals.size, 1); });
  for (const scenario of [
    { name: "Add", operation: { operationId: "partial-add", type: "Add" as const, source: { bytes: new Uint8Array([1]) } }, partial: "publish-new" as const },
    { name: "Replace", operation: { operationId: "partial-replace", type: "Replace" as const, targetMediaId: "old", source: { bytes: new Uint8Array([1]) } }, partial: "publish-replacement" as const },
    { name: "Remove", operation: { operationId: "partial-remove", type: "Remove" as const, targetMediaId: "old" }, partial: "move-to-trash" as const },
  ]) {
    it(`preserves initial ${scenario.name} ambiguity through persistence failure without generic compensation`, async () => {
      const value = setup();
      if (scenario.name !== "Add") seedCanonicalMedia(value.workflows, value.storage);
      value.storage.partialOperation = scenario.partial;
      value.workflows.failSaveStatuses.add("ReconciliationRequired");
      await assert.rejects(value.execute.execute(command([scenario.operation])), /ProductMediaReconciliationRequired/);
      const durable = value.workflows.workflow!.operations[0];
      assert.equal(durable.status, "ReconciliationRequired");
      assert.equal(durable.retryAllowed, false);
      assert.equal(durable.requiresNewSource, false);
      assert.equal(value.storage.calls.some((call) => call.startsWith("restore:")), false);
      if (scenario.name === "Add") assert.equal(value.storage.calls.some((call) => call.startsWith("remove:")), false);
    });
  }
  it("classifies confirmed missing temporary Staging as durable SourceUnavailable", async () => {
    const value = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`;
    value.storage.fail.add(staging); await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    value.storage.staged.clear();
    await assert.rejects(new RetryProductMediaOperationUseCase(value.dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") }), /ProductMediaSourceUnavailable/);
    assert.equal(value.workflows.workflow!.operations[0].status, "SourceUnavailable");
    assert.equal(value.workflows.workflow!.operations[0].retryAllowed, false);
    assert.equal(value.workflows.workflow!.operations[0].requiresNewSource, true);
  });
  it("does not invalidate temporary Staging when its probe returns a known failure", async () => {
    const value = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`;
    value.storage.fail.add(staging); await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    value.storage.temporaryProbeFailure = true;
    await assert.rejects(new RetryProductMediaOperationUseCase(value.dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") }), /ProductMediaStorageFailed/);
    assert.equal(value.workflows.workflow!.operations[0].status, "Failed");
    assert.equal(value.workflows.workflow!.operations[0].retryAllowed, true);
    assert.equal(value.storage.staged.has(staging), true);
  });
  it("persists temporary-probe ambiguity as ReconciliationRequired", async () => {
    const value = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`;
    value.storage.fail.add(staging); await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    value.storage.temporaryProbeAmbiguity = true;
    await assert.rejects(new RetryProductMediaOperationUseCase(value.dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") }), /ProductMediaReconciliationRequired/);
    assert.equal(value.workflows.workflow!.operations[0].status, "ReconciliationRequired");
    assert.equal(value.workflows.workflow!.operations[0].retryAllowed, false);
  });
  for (const operationType of ["Replace", "Remove"] as const) {
    it(`persists ${operationType} canonical-final absence as ReconciliationRequired`, async () => {
      const value = setup(); const finalKey = seedCanonicalMedia(value.workflows, value.storage); const staging = `${root.storageRootKey.value}/_staging/media-operation.webp`;
      if (operationType === "Replace") value.storage.fail.add(staging); else value.storage.moveFailureCode = "ChecksumMismatch";
      const operation = operationType === "Replace"
        ? { operationId: "media-operation", type: "Replace" as const, targetMediaId: "old", source: { bytes: new Uint8Array([1]) } }
        : { operationId: "media-operation", type: "Remove" as const, targetMediaId: "old" };
      await value.execute.execute(command([operation]));
      value.storage.fail.delete(staging); value.storage.moveFailureCode = undefined; value.storage.finals.delete(finalKey);
      await assert.rejects(new RetryProductMediaOperationUseCase(value.dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "media-operation", effectiveTime: new Date("2026-02-02T00:00:00Z") }), /ProductMediaReconciliationRequired/);
      assert.equal(value.workflows.workflow!.operations[0].status, "ReconciliationRequired");
      assert.equal(value.workflows.workflow!.operations[0].retryAllowed, false);
    });
    it(`keeps ${operationType} retryable when the canonical-final probe itself fails`, async () => {
      const value = setup(); seedCanonicalMedia(value.workflows, value.storage); const staging = `${root.storageRootKey.value}/_staging/media-operation.webp`;
      if (operationType === "Replace") value.storage.fail.add(staging); else value.storage.moveFailureCode = "ChecksumMismatch";
      const operation = operationType === "Replace"
        ? { operationId: "media-operation", type: "Replace" as const, targetMediaId: "old", source: { bytes: new Uint8Array([1]) } }
        : { operationId: "media-operation", type: "Remove" as const, targetMediaId: "old" };
      await value.execute.execute(command([operation]));
      value.storage.fail.delete(staging); value.storage.moveFailureCode = undefined; value.storage.finalProbeFailure = true;
      await assert.rejects(new RetryProductMediaOperationUseCase(value.dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "media-operation", effectiveTime: new Date("2026-02-02T00:00:00Z") }), /ProductMediaStorageFailed/);
      assert.equal(value.workflows.workflow!.operations[0].status, "Failed");
      assert.equal(value.workflows.workflow!.operations[0].retryAllowed, true);
    });
  }
  it("persists ambiguous canonical-final probe state as ReconciliationRequired", async () => {
    const value = setup(); seedCanonicalMedia(value.workflows, value.storage); value.storage.moveFailureCode = "ChecksumMismatch";
    await value.execute.execute(command([{ operationId: "remove-old", type: "Remove", targetMediaId: "old" }]));
    value.storage.moveFailureCode = undefined; value.storage.finalProbeAmbiguity = true;
    await assert.rejects(new RetryProductMediaOperationUseCase(value.dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "remove-old", effectiveTime: new Date("2026-02-02T00:00:00Z") }), /ProductMediaReconciliationRequired/);
    assert.equal(value.workflows.workflow!.operations[0].status, "ReconciliationRequired");
    assert.equal(value.workflows.workflow!.operations[0].retryAllowed, false);
  });
  it("rejects empty commands before authorization, Product lookup, and root creation", async () => { const value = setup(false); await assert.rejects(value.execute.execute(command([])), /ValidationFailed/); assert.equal(value.getRoot(), null); assert.equal(value.workflows.workflow, undefined); });
  it("rejects every non-canonical operation ID before authorization, Product lookup, root lookup, or storage", async () => {
    for (const operationId of ["Add-A", "_staging", "con", "ends.", "../escape", `a${"b".repeat(80)}`]) {
      const value = setup(false);
      await assert.rejects(value.execute.execute(command([{ operationId, type: "Add", source: { bytes: new Uint8Array([1]) } }])), /ProductMediaValidationFailed/);
      assert.deepEqual(value.boundaryCalls, { authorization: 0, products: 0, roots: 0 });
      assert.equal(value.storage.staged.size, 0);
      assert.equal(value.workflows.workflow, undefined);
    }
  });
  it("rejects authorization, cross-workspace, and media revision conflicts", async () => { const operation = [{ operationId: "add-a", type: "Add" as const, source: { bytes: new Uint8Array([1]) } }]; const one = setup(); await assert.rejects(one.execute.execute(command(operation, { actorContext: { workspaceId, actorId: "denied" } })), /AuthorizationDenied/); const two = setup(); await assert.rejects(two.execute.execute(command(operation, { actorContext: { workspaceId: WorkspaceId.create("workspace-b"), actorId: "actor-a" } })), /ProductNotFound|AuthorizationDenied/); const three = setup(); await assert.rejects(three.execute.execute(command(operation, { expectedMediaRevision: 2 })), /MediaRevisionConflict/); });
  it("cancels owned staging idempotently and cleanup is repeatable and excludes reconciliation", async () => { const { execute, workflows, storage, dependencies } = setup(); await execute.execute(command([{ operationId: "failed", type: "Add", source: { bytes: new Uint8Array([1]) } }])); const operation = workflows.workflow!.operations[0]; operation.status = "Failed"; operation.retryAllowed = true; operation.expiresAt = new Date("2026-02-02T00:00:00Z"); storage.staged.set(`${root.storageRootKey.value}/_staging/failed.webp`, { key: (await import("../domain/product-media-keys")).ProductMediaStagingKey.create(root.storageRootKey, "failed"), sha256: hash, byteLength: 1, mediaType: "image/webp", width: 1, height: 1 }); const cleanup = new CleanupExpiredMediaStagingUseCase(dependencies); const first = await cleanup.execute(workspaceId, new Date("2026-02-20T00:00:00Z")); assert.equal(first.cleanedCount, 1); assert.equal(first.scannedCount, 1); assert.equal(first.outcomes[0].type, "SourceUnavailableEstablished"); const second = await cleanup.execute(workspaceId, new Date("2026-02-20T00:00:00Z")); assert.equal(second.scannedCount, 1); assert.equal(second.cleanedCount, 0); assert.equal(second.outcomes[0].type, "Skipped"); workflows.workflow!.operations[0].status = "ReconciliationRequired"; const cancel = new CancelProductMediaOperationUseCase(dependencies); await assert.rejects(cancel.execute({ actorContext: actor, workflowId: "workflow-a", operationId: "failed", effectiveTime: new Date() }), /RetryNotAllowed/); });
  it("cancels only an incomplete operation and removes its owned staging", async () => { const { execute, workflows, storage, dependencies } = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`; storage.fail.add(staging); await execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])); assert.equal(storage.staged.size, 1); const cancel = new CancelProductMediaOperationUseCase(dependencies); const result = await cancel.execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") }); assert.equal(result.operations[0].status, "Cancelled"); assert.equal(storage.staged.size, 0); assert.equal(workflows.state?.items.length, 0); });
  it("treats missing owned Staging during cancellation idempotently", async () => { const { execute, storage, dependencies } = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`; storage.fail.add(staging); await execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])); storage.staged.clear(); const result = await new CancelProductMediaOperationUseCase(dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") }); assert.equal(result.operations[0].status, "Cancelled"); });
  it("rejects cancellation of InProgress without storage or repository mutation", async () => {
    const value = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`; value.storage.fail.add(staging);
    await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    value.workflows.workflow!.operations[0].status = "InProgress";
    const before = { calls: [...value.storage.calls], staged: value.storage.staged.size, transitions: value.workflows.transitionExpectedVersions.length, saves: value.workflows.savedStatuses.length, rootReads: value.boundaryCalls.roots };
    await assert.rejects(new CancelProductMediaOperationUseCase(value.dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") }), /ProductMediaOperationAlreadyInProgress/);
    assert.deepEqual({ calls: value.storage.calls, staged: value.storage.staged.size, transitions: value.workflows.transitionExpectedVersions.length, saves: value.workflows.savedStatuses.length, rootReads: value.boundaryCalls.roots }, before);
  });
  it("reloads cancellation after another operation advances the Workflow and uses the new version once", async () => {
    const value = setup(); const stagingA = `${root.storageRootKey.value}/_staging/add-a.webp`; const stagingB = `${root.storageRootKey.value}/_staging/add-b.webp`;
    value.storage.fail.add(stagingA); value.storage.fail.add(stagingB);
    await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }, { operationId: "add-b", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    const staleVersion = value.workflows.workflow!.version;
    value.workflows.transitionExpectedVersions = [];
    value.workflows.transitionInterception = { operationId: "add-a", advanceOperationId: "add-b" };
    const result = await new CancelProductMediaOperationUseCase(value.dependencies).execute({ actorContext: actor, workflowId: "workflow-a", operationId: "add-a", effectiveTime: new Date("2026-02-02T00:00:00Z") });
    assert.deepEqual(value.workflows.transitionExpectedVersions, [staleVersion, staleVersion + 1]);
    assert.equal(result.operations.find((operation) => operation.operationId === "add-a")!.status, "Cancelled");
    assert.equal(value.workflows.workflow!.operations.find((operation) => operation.operationId === "add-a")!.retryAllowed, false);
    assert.equal(value.storage.staged.has(stagingA), false);
  });
  it("reloads cleanup after another operation advances the Workflow and counts only durable SourceUnavailable", async () => {
    const value = setup(); const stagingA = `${root.storageRootKey.value}/_staging/add-a.webp`; const stagingB = `${root.storageRootKey.value}/_staging/add-b.webp`;
    value.storage.fail.add(stagingA); value.storage.fail.add(stagingB);
    await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }, { operationId: "add-b", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    for (const operation of value.workflows.workflow!.operations) operation.expiresAt = new Date("2026-02-02T00:00:00Z");
    const staleVersion = value.workflows.workflow!.version;
    value.workflows.transitionExpectedVersions = [];
    value.workflows.transitionInterception = { operationId: "add-a", advanceOperationId: "add-b" };
    const result = await new CleanupExpiredMediaStagingUseCase(value.dependencies).execute(workspaceId, new Date("2026-02-20T00:00:00Z"));
    assert.deepEqual(value.workflows.transitionExpectedVersions, [staleVersion, staleVersion + 1]);
    assert.equal(result.cleanedCount, 1);
    assert.equal(result.reconciliationRequiredCount, 0);
    assert.equal(value.workflows.workflow!.operations.find((operation) => operation.operationId === "add-a")!.status, "SourceUnavailable");
    assert.equal(value.workflows.workflow!.operations.find((operation) => operation.operationId === "add-a")!.retryAllowed, false);
  });
  it("advances the local cleanup Workflow version after every independent operation transition", async () => {
    const value = setup(); const stagingA = `${root.storageRootKey.value}/_staging/add-a.webp`; const stagingB = `${root.storageRootKey.value}/_staging/add-b.webp`;
    value.storage.fail.add(stagingA); value.storage.fail.add(stagingB);
    await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }, { operationId: "add-b", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    for (const operation of value.workflows.workflow!.operations) operation.expiresAt = new Date("2026-02-02T00:00:00Z");
    const initialVersion = value.workflows.workflow!.version; value.workflows.transitionExpectedVersions = [];
    const result = await new CleanupExpiredMediaStagingUseCase(value.dependencies).execute(workspaceId, new Date("2026-02-20T00:00:00Z"));
    assert.deepEqual(value.workflows.transitionExpectedVersions, [initialVersion, initialVersion + 1]);
    assert.equal(result.cleanedCount, 2);
    assert.equal(result.scannedCount, 2);
  });
  it("does not count a compatible concurrent Cancelled cleanup truth as cleaned", async () => {
    const value = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`;
    value.storage.fail.add(staging); await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    value.workflows.workflow!.operations[0].expiresAt = new Date("2026-02-02T00:00:00Z");
    value.workflows.transitionInterception = { operationId: "add-a", concurrentStatus: "Cancelled" };
    const result = await new CleanupExpiredMediaStagingUseCase(value.dependencies).execute(workspaceId, new Date("2026-02-20T00:00:00Z"));
    assert.equal(result.cleanedCount, 0);
    assert.equal(result.skippedCount, 0);
    assert.equal(result.outcomes[0].type, "CompatibleConcurrentTruth");
    assert.equal(value.workflows.workflow!.operations[0].status, "Cancelled");
    assert.equal(value.storage.staged.has(staging), false);
  });
  it("surfaces and durably marks missing immutable roots during cleanup without deriving a path", async () => {
    const value = setup(); const staging = `${root.storageRootKey.value}/_staging/add-a.webp`;
    value.storage.fail.add(staging); await value.execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }]));
    value.workflows.workflow!.operations[0].expiresAt = new Date("2026-02-02T00:00:00Z");
    value.setRoot(null); const storageCallCount = value.storage.calls.length;
    const result = await new CleanupExpiredMediaStagingUseCase(value.dependencies).execute(workspaceId, new Date("2026-02-20T00:00:00Z"));
    assert.equal(result.cleanedCount, 0);
    assert.equal(result.reconciliationRequiredCount, 1);
    assert.deepEqual(result.outcomes.map((item) => item.operationId), ["add-a"]);
    assert.equal(value.workflows.workflow!.operations[0].status, "ReconciliationRequired");
    assert.equal(value.storage.calls.length, storageCallCount);
  });
  it("returns deterministic detailed cleanup outcomes and never reports a foreign Workspace", async () => {
    const value = setup();
    for (const operationId of ["z-last", "a-first"]) value.storage.fail.add(`${root.storageRootKey.value}/_staging/${operationId}.webp`);
    await value.execute.execute(command([
      { operationId: "z-last", type: "Add", source: { bytes: new Uint8Array([1]) } },
      { operationId: "a-first", type: "Add", source: { bytes: new Uint8Array([1]) } },
    ]));
    const local = cloneWorkflow(value.workflows.workflow!);
    const foreignWorkspaceId = WorkspaceId.create("foreign-workspace");
    const foreign = { ...cloneWorkflow(local), workflowId: "foreign-workflow", workspaceId: foreignWorkspaceId, operations: local.operations.map((operation) => ({ ...operation, workflowId: "foreign-workflow", workspaceId: foreignWorkspaceId })) };
    value.workflows.listExpired = async () => [foreign, cloneWorkflow(value.workflows.workflow!)];
    const result = await new CleanupExpiredMediaStagingUseCase(value.dependencies).execute(workspaceId, new Date("2026-02-20T00:00:00Z"));
    assert.deepEqual({ scannedCount: result.scannedCount, cleanedCount: result.cleanedCount, reconciliationRequiredCount: result.reconciliationRequiredCount, skippedCount: result.skippedCount }, { scannedCount: 2, cleanedCount: 2, reconciliationRequiredCount: 0, skippedCount: 0 });
    assert.deepEqual(result.outcomes.map((outcome) => [outcome.workspaceId, outcome.workflowId, outcome.operationId, outcome.type]), [
      [workspaceId.value, "workflow-a", "a-first", "SourceUnavailableEstablished"],
      [workspaceId.value, "workflow-a", "z-last", "SourceUnavailableEstablished"],
    ]);
  });
  it("queries state within trusted Workspace scope", async () => { const { workflows, dependencies } = setup(); workflows.state = { workspaceId, productId, revision: 0, updatedAt: new Date(), updatedBy: "actor-a", items: [] }; const state = await new GetProductMediaStateQuery(dependencies).execute(actor, productId.value); assert.equal(state.workspaceId.value, workspaceId.value); });
  it("normalizes a legacy missing cover and appends at the first free sparse position", async () => { const { execute, workflows } = setup(); workflows.state = { workspaceId, productId, revision: 0, updatedAt: new Date(), updatedBy: "legacy", items: [1,4,9].map((displayOrder, index) => ({ mediaId: `old-${index}`, workspaceId, productId, storageArtifactKey: `${root.storageRootKey.value}/gallery-0${index + 1}.webp`, checksumSha256: hash, mimeType: "image/webp", displayOrder, createdAt: new Date(`2026-01-0${index + 1}T00:00:00Z`), createdBy: "legacy" })) }; await execute.execute(command([{ operationId: "add-a", type: "Add", source: { bytes: new Uint8Array([1]) } }])); assert.equal(workflows.state!.coverMediaId, "old-0"); assert.equal(workflows.state!.items.find((item) => item.mediaId === "add-a")!.displayOrder, 0); });
  it("restores canonical order and cover when metadata-only persistence fails", async () => { const reorderCase = setup(); const keyA = `${root.storageRootKey.value}/gallery-01.webp`; const keyB = `${root.storageRootKey.value}/gallery-02.webp`; reorderCase.workflows.state = { workspaceId, productId, revision: 0, coverMediaId: "a", updatedAt: new Date(), updatedBy: "actor-a", items: [{ mediaId: "a", workspaceId, productId, storageArtifactKey: keyA, displayOrder: 0, createdAt: new Date(), createdBy: "actor-a" }, { mediaId: "b", workspaceId, productId, storageArtifactKey: keyB, displayOrder: 1, createdAt: new Date(), createdBy: "actor-a" }] }; reorderCase.workflows.failSave = true; const reordered = await reorderCase.execute.execute(command([{ operationId: "reorder", type: "Reorder", orderedMediaIds: ["b", "a"] }])); assert.equal(reordered.operations[0].status, "Failed"); assert.deepEqual(reorderCase.workflows.state!.items.map((item) => item.mediaId), ["a", "b"]); const coverCase = setup(); coverCase.workflows.state = cloneState(reorderCase.workflows.state!); coverCase.workflows.failSave = true; const covered = await coverCase.execute.execute(command([{ operationId: "cover", type: "SetCover", targetMediaId: "b" }])); assert.equal(covered.operations[0].status, "Failed"); assert.equal(coverCase.workflows.state!.coverMediaId, "a"); });
});
