import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { ProductEntryMediaOperation } from "../domain/product-entry-media-plan";
import { ProductEntrySubmission, ProductEntrySubmissionId, RequestFingerprint } from "../domain/product-entry-submission";
import type { ProductEntrySubmissionMediaPlanRepository } from "../repositories/product-entry-media-plan.repository";
import type {
  MarkProductEntrySubmissionMediaOutcome,
  ProductEntrySubmissionClaimResult,
  ProductEntrySubmissionRepository,
} from "../repositories/product-entry-submission.repository";
import type { ProductEntryMediaSourceVerifier } from "../ports/product-entry-media-source-verifier.port";
import {
  ProductEntryMediaWorkflowCoordinationError,
  type CoordinateProductEntryMediaWorkflowCommand,
  type ProductEntryMediaWorkflowCoordinator,
  type ProductEntryMediaWorkflowView,
} from "../ports/product-entry-media-workflow-coordinator.port";
import type { ProductEntryTransactionDecision, ProductEntryTransactionalContext, ProductEntryUnitOfWork } from "../ports/product-entry-unit-of-work.port";
import { GetProductEntrySubmissionMediaStatusUseCase } from "./get-product-entry-submission-media-status.use-case";
import { ProductEntryActorId, PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext } from "./product-entry-execution-context";
import { ProductEntryMediaIdempotencyKeyService } from "./product-entry-media-idempotency-key";
import { mapProductEntryMediaSources } from "./product-entry-media-source-mapping";
import { ProductEntryMediaSourceRequirementsResolver } from "./product-entry-media-source-requirements";
import { UploadProductEntrySubmissionMediaUseCase } from "./upload-product-entry-submission-media.use-case";

const now = new Date("2026-08-04T10:00:00.000Z");
const workspaceId = WorkspaceId.create("workspace-a");
const submissionId = ProductEntrySubmissionId.create("submission-a");
const productId = ProductId.create("product-a");
const fingerprint = RequestFingerprint.create("a".repeat(64));
const bytes = new Uint8Array([1, 2, 3]);
const sha256 = createHash("sha256").update(bytes).digest("hex");

const executionContext = (workspace = workspaceId): ProductEntryExecutionContext => ({
  workspaceId: workspace,
  actorId: ProductEntryActorId.create("actor-a"),
  permissions: new Set([
    PRODUCT_ENTRY_PERMISSIONS.read,
    PRODUCT_ENTRY_PERMISSIONS.mediaUpload,
    PRODUCT_ENTRY_PERMISSIONS.mediaSourceReplace,
  ]),
});

const operation = (input: Partial<ConstructorParameters<typeof ProductEntryMediaOperation>[0]> = {}) =>
  new ProductEntryMediaOperation({
    workspaceId,
    submissionId,
    operationId: "add-a",
    operationType: "Add",
    sequence: 0,
    mediaId: null,
    requestedDisplayOrder: 1,
    selectedAsCover: true,
    expectedSourceSha256: sha256,
    expectedSourceByteLength: bytes.byteLength,
    finalOrder: 7,
    createdAt: now,
    ...input,
  });

class MemorySubmissionRepository implements ProductEntrySubmissionRepository {
  writeCount = 0;
  constructor(readonly submission: ProductEntrySubmission) {}
  async findById(workspace: WorkspaceId, id: ProductEntrySubmissionId) {
    return workspace.value === this.submission.workspaceId.value && id.value === this.submission.submissionId.value
      ? this.submission : null;
  }
  async findSaveReceipt() { return null; }
  async claim(): Promise<ProductEntrySubmissionClaimResult> { throw new Error("Smart Save claim must not run in Phase 2."); }
  async markProductSaved() { throw new Error("Smart Save must not run in Phase 2."); }
  async markMediaOutcome(command: MarkProductEntrySubmissionMediaOutcome) {
    if (command.workspaceId.value !== this.submission.workspaceId.value) return { type: "Conflict" as const };
    if (this.submission.mediaWorkflowId === command.mediaWorkflowId && this.submission.status === command.status) {
      return { type: "Existing" as const };
    }
    try {
      this.submission.markMediaOutcome(command.status, command.mediaWorkflowId, command.updatedAt);
      this.writeCount += 1;
      return { type: "Linked" as const };
    } catch { return { type: "Conflict" as const }; }
  }
}

class MemoryPlanRepository implements ProductEntrySubmissionMediaPlanRepository {
  constructor(readonly plan: readonly ProductEntryMediaOperation[]) {}
  async save() { throw new Error("Persisted Media Plan must not be changed in Phase 2."); }
  async findBySubmission(workspace: WorkspaceId, id: ProductEntrySubmissionId) {
    return workspace.value === workspaceId.value && id.value === submissionId.value ? this.plan : [];
  }
}

class MemoryUnitOfWork implements ProductEntryUnitOfWork {
  executeCount = 0;
  readonly productMutationCount = { create: 0, update: 0 };
  constructor(
    readonly submissions: MemorySubmissionRepository,
    readonly plans: MemoryPlanRepository,
  ) {}
  async execute<T>(work: (context: ProductEntryTransactionalContext) => Promise<ProductEntryTransactionDecision<T>>): Promise<T> {
    this.executeCount += 1;
    const context = {
      submissionRepository: this.submissions,
      mediaPlanRepository: this.plans,
      productRepository: {
        findById: async () => null,
        create: async () => { this.productMutationCount.create += 1; throw new Error("unexpected Product create"); },
        update: async () => { this.productMutationCount.update += 1; throw new Error("unexpected Product update"); },
      },
      auditRepository: { append: async () => { throw new Error("Phase 1 audit must not be rewritten."); } },
      productIdAllocator: { allocate: async () => productId },
      productCodeAllocator: { allocate: async () => { throw new Error("unexpected Product Code allocation"); } },
    } as unknown as ProductEntryTransactionalContext;
    return (await work(context)).result;
  }
}

const workflow = (status: ProductEntryMediaWorkflowView["status"] = "Completed"): ProductEntryMediaWorkflowView => ({
  workflowId: "workflow-a",
  productId: productId.value,
  status,
  operations: [{
    operationId: "add-a",
    type: "Add",
    status: status === "Completed" ? "Completed" : "Failed",
    attemptCount: 1,
    retryAllowed: status !== "Completed",
    requiresNewSource: false,
    errorCode: status === "Completed" ? null : "ProductMediaStorageFailed",
  }],
  startedAt: now,
  completedAt: now,
});

class MemoryCoordinator implements ProductEntryMediaWorkflowCoordinator {
  coordinateCalls: CoordinateProductEntryMediaWorkflowCommand[] = [];
  replacementCalls: Parameters<ProductEntryMediaWorkflowCoordinator["replaceUnavailableSources"]>[0][] = [];
  queryCount = 0;
  nextWorkflow = workflow();
  existingWorkflow: ProductEntryMediaWorkflowView | null = null;
  idempotentReplay = false;
  resumed = false;
  async coordinate(command: CoordinateProductEntryMediaWorkflowCommand) {
    this.coordinateCalls.push(command);
    return { workflow: this.nextWorkflow, idempotentReplay: this.idempotentReplay, resumed: this.resumed };
  }
  async findByWorkflowId(_context: ProductEntryExecutionContext, id: string) {
    this.queryCount += 1;
    return id === this.nextWorkflow.workflowId ? this.nextWorkflow : null;
  }
  async findByIdempotencyKey() { this.queryCount += 1; return this.nextWorkflow; }
  async resolveExisting(
    _context: ProductEntryExecutionContext,
    linkedWorkflowId: string | undefined,
  ) {
    this.queryCount += 1;
    if (linkedWorkflowId && this.existingWorkflow?.workflowId !== linkedWorkflowId) {
      throw new ProductEntryMediaWorkflowCoordinationError("WorkflowConflict");
    }
    return this.existingWorkflow;
  }
  async replaceUnavailableSources(command: Parameters<ProductEntryMediaWorkflowCoordinator["replaceUnavailableSources"]>[0]) {
    this.replacementCalls.push(command);
    return {
      type: "Replaced" as const,
      workflow: this.nextWorkflow,
      sourceAttempts: command.sources.map((source) => ({ operationId: source.operationId, sourceAttemptId: "b".repeat(32) })),
      resumeUnavailableOperationIds: [],
    };
  }
}

const acceptingVerifier = (state: { calls: number }): ProductEntryMediaSourceVerifier => ({
  async verify(command) {
    state.calls += 1;
    return {
      type: "Verified",
      source: {
        operationId: command.operationId,
        bytes: command.bytes,
        rawSha256: command.expectedSha256,
        rawByteLength: command.expectedByteLength,
        detectedMediaType: "image/png",
        width: 10,
        height: 10,
      },
    };
  },
});

const setup = (plan: readonly ProductEntryMediaOperation[] = [operation()]) => {
  const submission = ProductEntrySubmission.claim({ workspaceId, submissionId, requestFingerprint: fingerprint, mode: "Create", productId: null, claimedAt: now });
  submission.markProductSaved(productId, 0, now);
  const submissions = new MemorySubmissionRepository(submission);
  const unitOfWork = new MemoryUnitOfWork(submissions, new MemoryPlanRepository(plan));
  const coordinator = new MemoryCoordinator();
  const idempotencyKeys = new ProductEntryMediaIdempotencyKeyService();
  const verifier = { calls: 0 };
  const upload = new UploadProductEntrySubmissionMediaUseCase({
    unitOfWork,
    sourceVerifier: acceptingVerifier(verifier),
    idempotencyKeys,
    workflowCoordinator: coordinator,
    clock: { now: () => new Date(now) },
  });
  return { submission, submissions, unitOfWork, coordinator, idempotencyKeys, upload, verifier };
};

describe("Product Entry Media idempotency key", () => {
  it("is deterministic, field-sensitive, and concatenation-unambiguous", () => {
    const service = new ProductEntryMediaIdempotencyKeyService();
    const base = { workspaceId: "ab", submissionId: "c", productId: "d", requestFingerprint: "e" };
    assert.equal(service.calculate(base), service.calculate({ ...base }));
    assert.notEqual(service.calculate(base), service.calculate({ workspaceId: "a", submissionId: "bc", productId: "d", requestFingerprint: "e" }));
    for (const changed of [
      { ...base, workspaceId: "other" },
      { ...base, submissionId: "other" },
      { ...base, productId: "other" },
      { ...base, requestFingerprint: "other" },
    ]) assert.notEqual(service.calculate(base), service.calculate(changed));
  });
});

describe("Product Entry Media source mapping", () => {
  const replace = operation({ operationId: "replace-a", operationType: "Replace", sequence: 1, mediaId: "old", finalOrder: 0 });
  const remove = operation({ operationId: "remove-a", operationType: "Remove", sequence: 2, mediaId: "old-two", requestedDisplayOrder: null, selectedAsCover: false, expectedSourceSha256: null, expectedSourceByteLength: null, finalOrder: null });
  const plan = [operation(), replace, remove];
  const part = (fieldName: string) => ({ fieldName, bytes, clientMediaType: "text/plain" });

  it("accepts Add and Replace by operation ID and preserves persisted sequence", () => {
    const result = mapProductEntryMediaSources(plan, [part("source:replace-a"), part("source:add-a")]);
    assert.equal(result.type, "Mapped");
    if (result.type === "Mapped") assert.deepEqual(result.sources.map((source) => source.operation.operationId), ["add-a", "replace-a"]);
  });
  it("rejects missing, unknown, duplicate, and Remove sources with stable codes", () => {
    assert.equal(mapProductEntryMediaSources(plan, [part("source:add-a")]).type, "Rejected");
    assert.deepEqual(mapProductEntryMediaSources(plan, [part("source:add-a"), part("source:replace-a"), part("source:missing")]), { type: "Rejected", code: "SOURCE_OPERATION_UNKNOWN", operationId: "missing" });
    assert.deepEqual(mapProductEntryMediaSources(plan, [part("source:add-a"), part("source:add-a")]), { type: "Rejected", code: "SOURCE_DUPLICATED", operationId: "add-a" });
    assert.deepEqual(mapProductEntryMediaSources(plan, [part("source:add-a"), part("source:replace-a"), part("source:remove-a")]), { type: "Rejected", code: "SOURCE_UNEXPECTED", operationId: "remove-a" });
  });
  it("rejects sources for zero-file Reorder and SetCover descriptors", () => {
    for (const operationType of ["Reorder", "SetCover"] as const) {
      const metadata = operation({
        operationId: operationType.toLowerCase(), operationType, sequence: 0, mediaId: "existing",
        requestedDisplayOrder: operationType === "Reorder" ? 0 : null,
        finalOrder: operationType === "Reorder" ? 0 : null,
        selectedAsCover: operationType === "SetCover",
        expectedSourceSha256: null, expectedSourceByteLength: null,
      });
      assert.deepEqual(mapProductEntryMediaSources([metadata], [part(`source:${metadata.operationId}`)]), {
        type: "Rejected", code: "SOURCE_UNEXPECTED", operationId: metadata.operationId,
      });
    }
  });
  it("rejects Workspace or Actor transport fields", () => {
    assert.deepEqual(mapProductEntryMediaSources([operation()], [part("workspaceId")]), {
      type: "Rejected", code: "SOURCE_UNEXPECTED", operationId: null,
    });
  });
  it("rejects a source for a valid operation when durable state does not require it", () => {
    assert.deepEqual(mapProductEntryMediaSources([operation()], [{
      fieldName: "source:add-a",
      bytes,
      clientMediaType: null,
    }], []), {
      type: "Rejected",
      code: "SOURCE_UNEXPECTED",
      operationId: "add-a",
    });
  });
  it("derives new, retained, completed, and replacement-source requirements from durable state", () => {
    const resolver = new ProductEntryMediaSourceRequirementsResolver();
    const base = workflow("Failed");
    assert.deepEqual(resolver.resolve([operation()], null), {
      type: "Resolved",
      requirements: [{ operationId: "add-a", state: "RequiredFromPlan", sourceRequired: true }],
      requiredSourceOperationIds: ["add-a"],
      newSourceRequiredOperationIds: [],
    });
    assert.deepEqual(resolver.resolve([operation()], base), {
      type: "Resolved",
      requirements: [{ operationId: "add-a", state: "RetainedSourceAvailable", sourceRequired: false }],
      requiredSourceOperationIds: [],
      newSourceRequiredOperationIds: [],
    });
    assert.deepEqual(resolver.resolve([operation()], workflow()), {
      type: "Resolved",
      requirements: [{ operationId: "add-a", state: "Completed", sourceRequired: false }],
      requiredSourceOperationIds: [],
      newSourceRequiredOperationIds: [],
    });
    const unavailable = {
      ...base,
      operations: [{
        ...base.operations[0],
        status: "SourceUnavailable" as const,
        retryAllowed: false,
        requiresNewSource: true,
      }],
    };
    assert.deepEqual(resolver.resolve([operation()], unavailable), {
      type: "Resolved",
      requirements: [{ operationId: "add-a", state: "NewSourceRequired", sourceRequired: true }],
      requiredSourceOperationIds: ["add-a"],
      newSourceRequiredOperationIds: ["add-a"],
    });
  });
});

describe("Product Entry Media coordinator use cases", () => {
  it("coordinates Reorder and SetCover as real zero-file Product Media operations", async () => {
    const reorder = operation({
      operationId: "reorder-a", operationType: "Reorder", mediaId: "existing-a", sequence: 0,
      requestedDisplayOrder: 1, finalOrder: 1, selectedAsCover: false,
      expectedSourceSha256: null, expectedSourceByteLength: null,
    });
    const setCover = operation({
      operationId: "cover-b", operationType: "SetCover", mediaId: "existing-b", sequence: 1,
      requestedDisplayOrder: null, finalOrder: null, selectedAsCover: true,
      expectedSourceSha256: null, expectedSourceByteLength: null,
    });
    const value = setup([reorder, setCover]);
    value.coordinator.nextWorkflow = {
      ...workflow(),
      operations: [
        { ...workflow().operations[0], operationId: "reorder-a", type: "Reorder" },
        { ...workflow().operations[0], operationId: "cover-b", type: "SetCover" },
      ],
    };
    const result = await value.upload.execute(executionContext(), submissionId.value, []);
    assert.equal(result.type, "Completed");
    assert.deepEqual(value.coordinator.coordinateCalls[0].operations, [
      { operationId: "reorder-a", type: "Reorder", targetMediaId: "existing-a", requestedDisplayOrder: 1 },
      { operationId: "cover-b", type: "SetCover", targetMediaId: "existing-b" },
    ]);
    assert.equal(value.verifier.calls, 0);
  });

  it("uses persisted sequence and finalOrder, never multipart order or requested order", async () => {
    const replace = operation({ operationId: "replace-a", operationType: "Replace", sequence: 1, mediaId: "old", requestedDisplayOrder: 2, finalOrder: 4 });
    const value = setup([operation(), replace]);
    const result = await value.upload.execute(executionContext(), submissionId.value, [
      { fieldName: "source:replace-a", bytes, clientMediaType: "application/octet-stream" },
      { fieldName: "source:add-a", bytes, clientMediaType: "image/gif" },
    ]);
    assert.equal(result.type, "Completed");
    assert.deepEqual(value.coordinator.coordinateCalls[0].operations.map((item) => [item.operationId, "requestedDisplayOrder" in item ? item.requestedDisplayOrder : null]), [["add-a", 7], ["replace-a", 4]]);
    assert.deepEqual(value.unitOfWork.productMutationCount, { create: 0, update: 0 });
  });
  it("links partial failure without rolling back the saved Product", async () => {
    const value = setup(); value.coordinator.nextWorkflow = workflow("Failed");
    const result = await value.upload.execute(executionContext(), submissionId.value, [{ fieldName: "source:add-a", bytes, clientMediaType: null }]);
    assert.equal(result.type, "Accepted");
    assert.equal(value.submission.status, "PartiallyCompleted");
    assert.equal(value.submission.productId?.value, productId.value);
    assert.deepEqual(value.unitOfWork.productMutationCount, { create: 0, update: 0 });
  });
  it("completes a zero-file replay without verifying or coordinating Media again", async () => {
    const value = setup();
    await value.upload.execute(executionContext(), submissionId.value, [{ fieldName: "source:add-a", bytes, clientMediaType: null }]);
    value.coordinator.existingWorkflow = value.coordinator.nextWorkflow;
    value.coordinator.idempotentReplay = true;
    const replay = await value.upload.execute(executionContext(), submissionId.value, []);
    assert.equal(replay.type, "Completed");
    if (replay.type === "Completed") assert.equal(replay.idempotentReplay, true);
    assert.equal(value.submissions.writeCount, 1);
    assert.equal(value.verifier.calls, 1);
    assert.equal(value.coordinator.coordinateCalls.length, 1);
  });
  it("resumes retained Staging with zero files and without invoking the Source Verifier", async () => {
    const retryable = setup();
    retryable.coordinator.existingWorkflow = workflow("Failed");
    retryable.coordinator.nextWorkflow = workflow();
    retryable.coordinator.idempotentReplay = true;
    retryable.coordinator.resumed = true;
    const resumed = await retryable.upload.execute(executionContext(), submissionId.value, []);
    assert.equal(resumed.type, "Completed");
    if (resumed.type === "Completed") assert.equal(resumed.resumed, true);
    assert.equal(retryable.verifier.calls, 0);
    assert.equal(retryable.coordinator.coordinateCalls.length, 1);
    assert.equal("source" in retryable.coordinator.coordinateCalls[0].operations[0], false);
  });
  it("rejects unexpected completed files and verifies only a genuinely required replacement source", async () => {
    const completed = setup();
    completed.coordinator.existingWorkflow = workflow();
    const unexpected = await completed.upload.execute(executionContext(), submissionId.value, [{
      fieldName: "source:add-a",
      bytes,
      clientMediaType: null,
    }]);
    assert.deepEqual(unexpected, { type: "InvalidRequest", code: "SOURCE_UNEXPECTED", operationId: "add-a" });
    assert.equal(completed.verifier.calls, 0);
    assert.equal(completed.coordinator.coordinateCalls.length, 0);

    const replacementOperation = operation({
      operationId: "replace-a",
      operationType: "Replace",
      sequence: 1,
      mediaId: "old-media",
    });
    const replacement = setup([operation(), replacementOperation]);
    const failed = workflow("Failed");
    replacement.coordinator.existingWorkflow = {
      ...failed,
      operations: [
        { ...workflow().operations[0] },
        {
          ...failed.operations[0],
          operationId: "replace-a",
          type: "Replace",
          status: "SourceUnavailable",
          retryAllowed: false,
          requiresNewSource: true,
        },
      ],
    };
    const status = await new GetProductEntrySubmissionMediaStatusUseCase(
      replacement.unitOfWork,
      replacement.coordinator,
      replacement.idempotencyKeys,
    ).execute(executionContext(), submissionId.value);
    assert.equal(status.type, "Found");
    if (status.type === "Found") {
      assert.deepEqual(status.status.requiredSourceOperationIds, ["replace-a"]);
      assert.deepEqual(status.status.requiresNewSourceOperationIds, ["replace-a"]);
    }
    const missing = await replacement.upload.execute(executionContext(), submissionId.value, []);
    assert.deepEqual(missing, { type: "InvalidRequest", code: "SOURCE_REQUIRED", operationId: "replace-a" });
    const nonRequired = await replacement.upload.execute(executionContext(), submissionId.value, [{
      fieldName: "source:add-a",
      bytes,
      clientMediaType: null,
    }]);
    assert.deepEqual(nonRequired, { type: "InvalidRequest", code: "SOURCE_UNEXPECTED", operationId: "add-a" });
    const supplied = await replacement.upload.execute(executionContext(), submissionId.value, [{
      fieldName: "source:replace-a",
      bytes,
      clientMediaType: null,
    }]);
    assert.equal(supplied.type, "Completed");
    if (supplied.type === "Completed") {
      assert.deepEqual(supplied.sourceAttempts, [{ operationId: "replace-a", sourceAttemptId: "b".repeat(32) }]);
    }
    assert.equal(replacement.verifier.calls, 0);
    assert.equal(replacement.coordinator.coordinateCalls.length, 0);
    assert.equal(replacement.coordinator.replacementCalls.length, 1);
  });
  it("hides a foreign Workspace submission and enforces upload permission", async () => {
    const value = setup();
    assert.equal((await value.upload.execute(executionContext(WorkspaceId.create("workspace-b")), submissionId.value, [{ fieldName: "source:add-a", bytes, clientMediaType: null }])).type, "NotFound");
    const denied = { ...executionContext(), permissions: new Set([PRODUCT_ENTRY_PERMISSIONS.read]) } as ProductEntryExecutionContext;
    assert.equal((await value.upload.execute(denied, submissionId.value, [])).type, "Forbidden");
  });
  it("keeps GET status read-only and exposes resume fields without retrying", async () => {
    const value = setup();
    value.coordinator.nextWorkflow = workflow("Failed");
    value.coordinator.existingWorkflow = value.coordinator.nextWorkflow;
    const readsBefore = value.submissions.writeCount;
    const result = await new GetProductEntrySubmissionMediaStatusUseCase(value.unitOfWork, value.coordinator, value.idempotencyKeys)
      .execute(executionContext(), submissionId.value);
    assert.equal(result.type, "Found");
    if (result.type === "Found") {
      assert.deepEqual(result.status.retryableOperationIds, ["add-a"]);
      assert.deepEqual(result.status.plannedOperationIds, ["add-a"]);
      assert.deepEqual(result.status.requiredSourceOperationIds, []);
    }
    assert.equal(value.submissions.writeCount, readsBefore);
    assert.equal(value.coordinator.coordinateCalls.length, 0);
    assert.equal(value.coordinator.queryCount, 1);
  });
});
