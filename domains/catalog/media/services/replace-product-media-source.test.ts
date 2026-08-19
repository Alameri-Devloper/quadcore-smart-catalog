import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { ProductRepository } from "../../repositories/product.repository.interface";
import { CatalogId, ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { Product } from "../../types/product.aggregate";
import { DepartmentStorageSegment } from "../domain/product-media-keys";
import { ProductMediaRoot } from "../domain/product-media-root";
import type { ProductMediaState } from "../domain/product-media-state";
import type { ProductMediaWorkflowState } from "../domain/product-media-workflow";
import type { MediaSourceAttemptRepository } from "../repositories/media-source-attempt.repository";
import type { ProductMediaWorkflowRepository } from "../repositories/product-media-workflow.repository";
import { DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION } from "../ports/product-image-processor";
import type { ProductMediaStoragePort } from "../ports/product-media-storage.port";
import { ReplaceProductMediaSourceUseCase } from "./replace-product-media-source";

const workspaceId = WorkspaceId.create("workspace-a");
const foreignWorkspaceId = WorkspaceId.create("workspace-b");
const productId = ProductId.create("product-a");
const operationId = "add-source";
const actor = { workspaceId, actorId: "actor-a" };
const now = new Date("2026-08-19T00:00:00.000Z");
let root: ProductMediaRoot;

before(async () => {
  root = await ProductMediaRoot.createNew({
    workspaceId,
    productId,
    departmentSegment: DepartmentStorageSegment.create("catalog"),
    productName: "Source replacement",
    createdAt: now,
  });
});

const workflow = (): ProductMediaWorkflowState => ({
  workflowId: "workflow-a",
  workspaceId,
  productId,
  status: "Failed",
  expectedMediaRevision: 0,
  idempotencyKey: "entry-key",
  requestFingerprint: "a".repeat(64),
  createdBy: actor.actorId,
  startedAt: now,
  version: 1,
  operations: [{
    operationId,
    workflowId: "workflow-a",
    workspaceId,
    type: "Add",
    status: "SourceUnavailable",
    selectAsCover: false,
    attemptCount: 1,
    retryAllowed: false,
    requiresNewSource: true,
    errorCode: "ProductMediaSourceUnavailable",
    createdAt: now,
  }],
});

const setup = (options: { readonly authorized?: boolean; readonly resumeSucceeds?: boolean } = {}) => {
  const state = workflow();
  let attempt: {
    sourceAttemptId: string;
    sourceFingerprint: string;
    status: "AwaitingUpload" | "Applied";
  } | null = null;
  let stageCalls = 0;
  const attempts: MediaSourceAttemptRepository = {
    async createOrReuse(input) {
      if (state.operations[0].status !== "SourceUnavailable" || !state.operations[0].requiresNewSource) {
        return attempt?.status === "Applied" && attempt.sourceFingerprint === input.sourceFingerprint
          ? { type: "Existing", attempt: { ...attempt, workspaceId, operationId, createdByActorId: actor.actorId, createdAt: now, expiresAt: new Date(now.getTime() + 14 * 86400000) } }
          : { type: "SourceReplacementNotAllowed" };
      }
      if (attempt) return attempt.sourceFingerprint === input.sourceFingerprint
        ? { type: "Existing", attempt: { ...attempt, workspaceId, operationId, createdByActorId: actor.actorId, createdAt: now, expiresAt: input.expiresAt } }
        : { type: "ActiveSourceAttemptConflict" };
      attempt = { sourceAttemptId: input.sourceAttemptId, sourceFingerprint: input.sourceFingerprint, status: "AwaitingUpload" };
      return { type: "Created", attempt: { ...attempt, workspaceId, operationId, createdByActorId: actor.actorId, createdAt: now, expiresAt: input.expiresAt } };
    },
    async apply() {
      if (!attempt) return { type: "SourceAttemptNotFound" };
      attempt.status = "Applied";
      state.operations[0].status = options.resumeSucceeds === false ? "Staged" : "Completed";
      state.operations[0].retryAllowed = options.resumeSucceeds === false;
      state.operations[0].requiresNewSource = false;
      return { type: "Applied" };
    },
    async markFailed() { if (attempt) attempt.status = "Applied"; },
  };
  const mediaState: ProductMediaState = { workspaceId, productId, revision: 0, updatedAt: now, updatedBy: actor.actorId, items: [] };
  const workflows = {
    async findByOperationId(scope: WorkspaceId) { return scope.value === workspaceId.value ? state : null; },
    async findById(scope: WorkspaceId) { return scope.value === workspaceId.value ? state : null; },
    async findByIdempotencyKey() { return state; },
    async create() { return { type: "Created" as const }; },
    async claimOperation() { return { type: "Conflict" as const }; },
    async transitionOperationToStaged() { return { type: "Conflict" as const }; },
    async transitionOperation() { return { type: "Conflict" as const }; },
    async loadMediaState() { return mediaState; },
    async save() { return { type: "Saved" as const }; },
    async listExpired() { return []; },
  } satisfies ProductMediaWorkflowRepository;
  const storage: ProductMediaStoragePort = {
    async stage(input) { stageCalls += 1; return { type: "Staged", object: { key: input.stagingKey, sha256: "c".repeat(64), byteLength: 3, mediaType: "image/webp", width: 10, height: 10 } }; },
    async temporaryExists() { return { type: "Failed", code: "UnsafeKey" }; },
    async publishNew() { throw new Error("not reached"); },
    async publishReplacement() { throw new Error("not reached"); },
    async moveToTrash() { throw new Error("not reached"); },
    async restoreFromTrash() { throw new Error("not reached"); },
    async discardTemporary() { return { type: "Discarded" }; },
    async inspect() { return { type: "Failed", code: "FinalObjectMissing" }; },
    async exists() { return { type: "Exists", exists: false }; },
  };
  const product = Product.rehydrate({ workspaceId, productId, catalogId: CatalogId.create("catalog-a"), lifecycleState: "Draft", revision: 0, createdAt: now, updatedAt: now });
  const products: ProductRepository = {
    async findById(scope, id) { return scope.value === workspaceId.value && id.value === productId.value ? product : null; },
    async create() { throw new Error("not reached"); },
    async update() { throw new Error("not reached"); },
  };
  const useCase = new ReplaceProductMediaSourceUseCase({
    attempts,
    workflows,
    products,
    roots: { async findByProduct(scope, id) { return scope.value === workspaceId.value && id.value === productId.value ? root : null; }, async create() { throw new Error("not reached"); } },
    authorization: { async canEditProduct(context) { return options.authorized !== false && context.workspaceId.value === workspaceId.value && context.actorId === actor.actorId; } },
    processor: {
      async inspect() { return { type: "Inspected", inspection: { format: "png", width: 10, height: 10, hasAlpha: true, animated: false } }; },
      async normalize() { return { type: "Normalized", image: { bytes: new Uint8Array([7, 8, 9]), mediaType: "image/webp", width: 10, height: 10, sha256: "c".repeat(64) } }; },
    },
    processingConfiguration: DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION,
    storage,
    allocateSourceAttemptId: () => "b".repeat(32),
  });
  return { useCase, state, attempts, getAttempt: () => attempt, getStageCalls: () => stageCalls };
};

describe("Product Media source replacement application", () => {
  it("preserves operation identity, accepts a different source, and resumes the existing workflow", async () => {
    const value = setup();
    const result = await value.useCase.execute({ actorContext: actor, operationId, bytes: new Uint8Array([1, 2, 3]), clientMediaType: "image/png", effectiveTime: now });
    assert.deepEqual(result, { type: "MediaWorkflowResumed", sourceAttemptId: "b".repeat(32), workflowId: "workflow-a" });
    assert.equal(value.state.operations[0].operationId, operationId);
    assert.equal(value.state.requestFingerprint, "a".repeat(64));
    assert.equal(value.getStageCalls(), 1);
  });

  it("returns the same applied attempt idempotently without staging or creating a new operation", async () => {
    const value = setup();
    const command = { actorContext: actor, operationId, bytes: new Uint8Array([1, 2, 3]), clientMediaType: "image/png", effectiveTime: now } as const;
    await value.useCase.execute(command);
    const replay = await value.useCase.execute(command);
    assert.equal(replay.type, "MediaWorkflowResumed");
    if (replay.type === "MediaWorkflowResumed") assert.equal(replay.sourceAttemptId, "b".repeat(32));
    assert.equal(value.getStageCalls(), 1);
  });

  it("enforces trusted Workspace authorization before creating an attempt", async () => {
    const denied = setup({ authorized: false });
    assert.equal((await denied.useCase.execute({ actorContext: actor, operationId, bytes: new Uint8Array([1]), clientMediaType: "image/png", effectiveTime: now })).type, "Forbidden");
    assert.equal(denied.getAttempt(), null);
    const foreign = setup();
    assert.equal((await foreign.useCase.execute({ actorContext: { ...actor, workspaceId: foreignWorkspaceId }, operationId, bytes: new Uint8Array([1]), clientMediaType: "image/png", effectiveTime: now })).type, "MediaOperationNotFound");
  });

  it("rejects a different active fingerprint and declared/detected MIME mismatch", async () => {
    const conflict = setup({ resumeSucceeds: false });
    await conflict.attempts.createOrReuse({ workspaceId, operationId, sourceAttemptId: "d".repeat(32), sourceFingerprint: "e".repeat(64), actorId: actor.actorId, createdAt: now, expiresAt: new Date(now.getTime() + 14 * 86400000) });
    assert.equal((await conflict.useCase.execute({ actorContext: actor, operationId, bytes: new Uint8Array([1, 2]), clientMediaType: "image/png", effectiveTime: now })).type, "ActiveSourceAttemptConflict");
    const invalid = setup();
    const rejected = await invalid.useCase.execute({ actorContext: actor, operationId, bytes: new Uint8Array([1, 2]), clientMediaType: "image/jpeg", effectiveTime: now });
    assert.deepEqual(rejected, { type: "SourceValidationFailed", code: "SOURCE_MIME_MISMATCH" });
  });

  it("keeps an applied source retryable when immediate workflow resume is unavailable", async () => {
    const value = setup({ resumeSucceeds: false });
    const result = await value.useCase.execute({ actorContext: actor, operationId, bytes: new Uint8Array([1, 2, 3]), clientMediaType: "image/png", effectiveTime: now });
    assert.equal(result.type, "MediaWorkflowResumeUnavailable");
    assert.equal(value.state.operations[0].status, "Staged");
    assert.equal(value.state.operations[0].retryAllowed, true);
    assert.equal(value.getAttempt()?.status, "Applied");
  });
});
