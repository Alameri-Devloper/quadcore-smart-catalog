import { createHash } from "node:crypto";
import type { ProductRepository } from "../../repositories/product.repository.interface";
import type { Product } from "../../types/product.aggregate";
import { ProductId } from "../../types/product-identity.value-object";
import { DepartmentStorageSegment, ProductMediaFinalKey, ProductMediaStagingKey, ProductMediaTrashKey } from "../domain/product-media-keys";
import { ProductMediaOperationId } from "../domain/product-media-operation-id";
import { ProductMediaRoot } from "../domain/product-media-root";
import { reorderProductMedia, resolveProductMediaCover, type ProductMediaItem, type ProductMediaState } from "../domain/product-media-state";
import {
  claimOperationAttempt,
  deriveProductMediaWorkflowStatus,
  stageOperation,
  ProductMediaWorkflowError,
  type ProductMediaOperationState,
  type ProductMediaWorkflowState,
} from "../domain/product-media-workflow";
import type { ProductEditAuthorizationPort, TrustedActorContext } from "../ports/product-media-authorization.port";
import type { ProductImageProcessor, ProductImageProcessingConfiguration } from "../ports/product-image-processor";
import { ProductMediaStoragePartialOperationError, type ProductMediaStorageFailureCode, type ProductMediaStoragePort, type StagedProductMediaObject } from "../ports/product-media-storage.port";
import type { ProductMediaRootRepository } from "../repositories/product-media-root.repository";
import type { ProductMediaOperationTransition, ProductMediaWorkflowRepository, StageProductMediaOperationTransition } from "../repositories/product-media-workflow.repository";

export interface IncomingMediaSource { readonly bytes: Uint8Array }
export type ProductMediaCommandOperation =
  | { readonly operationId: string; readonly type: "Add"; readonly source?: IncomingMediaSource; readonly sourceSha256?: string; readonly requestedDisplayOrder?: number; readonly selectAsCover?: boolean }
  | { readonly operationId: string; readonly type: "Replace"; readonly targetMediaId: string; readonly source?: IncomingMediaSource; readonly sourceSha256?: string; readonly requestedDisplayOrder?: number; readonly selectAsCover?: boolean }
  | { readonly operationId: string; readonly type: "Remove"; readonly targetMediaId: string }
  | { readonly operationId: string; readonly type: "SetCover"; readonly targetMediaId: string }
  | { readonly operationId: string; readonly type: "Reorder"; readonly orderedMediaIds: readonly string[] };

export interface ExecuteProductMediaWorkflowCommand {
  readonly actorContext: TrustedActorContext;
  readonly workflowId: string;
  readonly productId: string;
  readonly expectedMediaRevision: number;
  readonly idempotencyKey: string;
  readonly operations: readonly ProductMediaCommandOperation[];
  readonly effectiveTime: Date;
}

interface WorkflowDependencies {
  readonly workflows: ProductMediaWorkflowRepository;
  readonly products: ProductRepository;
  readonly roots: ProductMediaRootRepository;
  readonly authorization: ProductEditAuthorizationPort;
  readonly processor: ProductImageProcessor;
  readonly processingConfiguration: ProductImageProcessingConfiguration;
  readonly storage: ProductMediaStoragePort;
}

export type ProductMediaMetadataExecutionEligibility =
  | { readonly type: "Ready" }
  | { readonly type: "WaitingForDependencies"; readonly blockingOperationIds: readonly string[] }
  | { readonly type: "BlockedByTerminalFailure"; readonly blockingOperationIds: readonly string[] };

const sourceMutation = (operation: ProductMediaOperationState): boolean =>
  operation.type === "Add" || operation.type === "Replace" || operation.type === "Remove";

export const resolveProductMediaMetadataExecutionEligibility = (
  operations: readonly ProductMediaOperationState[],
): ProductMediaMetadataExecutionEligibility => {
  const dependencies = operations.filter(sourceMutation).filter((operation) => operation.status !== "Completed");
  const terminal = dependencies.filter((operation) =>
    operation.status === "SourceUnavailable"
    || operation.status === "ReconciliationRequired"
    || operation.status === "Cancelled"
    || (operation.status === "Failed" && !operation.retryAllowed));
  if (terminal.length > 0) {
    return Object.freeze({
      type: "BlockedByTerminalFailure",
      blockingOperationIds: Object.freeze(terminal.map((operation) => operation.operationId)),
    });
  }
  if (dependencies.length > 0) {
    return Object.freeze({
      type: "WaitingForDependencies",
      blockingOperationIds: Object.freeze(dependencies.map((operation) => operation.operationId)),
    });
  }
  return Object.freeze({ type: "Ready" });
};

const copyOperation = (operation: ProductMediaOperationState): ProductMediaOperationState => ({
  ...operation,
  orderedMediaIds: operation.orderedMediaIds ? [...operation.orderedMediaIds] : undefined,
  expiresAt: operation.expiresAt ? new Date(operation.expiresAt) : undefined,
  lastAttemptAt: operation.lastAttemptAt ? new Date(operation.lastAttemptAt) : undefined,
  createdAt: new Date(operation.createdAt),
  completedAt: operation.completedAt ? new Date(operation.completedAt) : undefined,
});

const copyWorkflow = (workflow: ProductMediaWorkflowState): ProductMediaWorkflowState => ({
  ...workflow,
  startedAt: new Date(workflow.startedAt),
  completedAt: workflow.completedAt ? new Date(workflow.completedAt) : undefined,
  operations: workflow.operations.map(copyOperation),
});

const assertActor = async (dependencies: WorkflowDependencies, actor: TrustedActorContext, productId: ProductId): Promise<Product> => {
  if (!actor.actorId.trim() || !(await dependencies.authorization.canEditProduct(actor, productId))) {
    throw new ProductMediaWorkflowError("ProductMediaAuthorizationDenied");
  }
  const product = await dependencies.products.findById(actor.workspaceId, productId);
  if (!product) throw new ProductMediaWorkflowError("ProductNotFound");
  return product;
};

const canonicalOperationId = (value: string): string => {
  try { return ProductMediaOperationId.create(value).value; }
  catch { throw new ProductMediaWorkflowError("ProductMediaValidationFailed"); }
};

const assertCommand = (command: ExecuteProductMediaWorkflowCommand): void => {
  if (command.operations.length === 0 || !command.idempotencyKey.trim() || !command.workflowId.trim() || !Number.isSafeInteger(command.expectedMediaRevision) || command.expectedMediaRevision < 0) throw new ProductMediaWorkflowError("ProductMediaValidationFailed");
  const ids = new Set<string>(); const storageTargets = new Set<string>();
  for (const operation of command.operations) {
    const operationId = canonicalOperationId(operation.operationId);
    if (ids.has(operationId)) throw new ProductMediaWorkflowError("ProductMediaValidationFailed");
    ids.add(operationId);
    if ("requestedDisplayOrder" in operation && operation.requestedDisplayOrder !== undefined && (!Number.isSafeInteger(operation.requestedDisplayOrder) || operation.requestedDisplayOrder < 0)) throw new ProductMediaWorkflowError("ProductMediaValidationFailed");
    if ("targetMediaId" in operation) { if (!operation.targetMediaId.trim()) throw new ProductMediaWorkflowError("ProductMediaValidationFailed"); if (operation.type !== "SetCover" && storageTargets.has(operation.targetMediaId)) throw new ProductMediaWorkflowError("ProductMediaValidationFailed"); if (operation.type !== "SetCover") storageTargets.add(operation.targetMediaId); }
    if (operation.type === "Reorder" && (operation.orderedMediaIds.some((id) => !id.trim()) || new Set(operation.orderedMediaIds).size !== operation.orderedMediaIds.length)) throw new ProductMediaWorkflowError("ProductMediaValidationFailed");
    if (operation.type === "Add" || operation.type === "Replace") {
      const actualSourceSha256 = operation.source
        ? createHash("sha256").update(operation.source.bytes).digest("hex")
        : undefined;
      if (
        (operation.source && operation.source.bytes.byteLength === 0)
        || (!operation.source && !operation.sourceSha256)
        || (operation.sourceSha256 !== undefined && !/^[a-f0-9]{64}$/.test(operation.sourceSha256))
        || (operation.sourceSha256 !== undefined && actualSourceSha256 !== undefined && operation.sourceSha256 !== actualSourceSha256)
      ) throw new ProductMediaWorkflowError("ProductMediaValidationFailed");
    }
  }
};

const requestFingerprint = (command: ExecuteProductMediaWorkflowCommand): string => createHash("sha256").update(JSON.stringify({
  workspaceId: command.actorContext.workspaceId.value, productId: command.productId, expectedMediaRevision: command.expectedMediaRevision,
  operations: command.operations.map((operation) => ({ operationId: operation.operationId, type: operation.type, targetMediaId: "targetMediaId" in operation ? operation.targetMediaId : null, requestedDisplayOrder: "requestedDisplayOrder" in operation ? operation.requestedDisplayOrder ?? null : null, selectAsCover: "selectAsCover" in operation ? operation.selectAsCover === true : false, orderedMediaIds: "orderedMediaIds" in operation ? [...operation.orderedMediaIds] : null, sourceSha256: operation.type === "Add" || operation.type === "Replace" ? operation.sourceSha256 ?? createHash("sha256").update(operation.source!.bytes).digest("hex") : null })),
})).digest("hex");

const resolveOrCreateRoot = async (dependencies: WorkflowDependencies, product: Product, now: Date) => {
  const existing = await dependencies.roots.findByProduct(product.identity.workspaceId, product.identity.productId);
  if (existing) return existing;
  const root = await ProductMediaRoot.createNew({ workspaceId: product.identity.workspaceId, productId: product.identity.productId, departmentSegment: DepartmentStorageSegment.unclassified(), productCode: product.commercialDetails?.productCode?.value, productName: product.commercialDetails?.productName, createdAt: now });
  const created = await dependencies.roots.create(root);
  if (created.type === "Created") return created.root;
  if (created.type === "AlreadyExists") return created.existingRoot;
  const concurrent = await dependencies.roots.findByProduct(product.identity.workspaceId, product.identity.productId);
  if (concurrent) return concurrent;
  throw new ProductMediaWorkflowError("ProductMediaStorageFailed");
};

const initialOperation = (workflowId: string, actor: TrustedActorContext, input: ProductMediaCommandOperation, now: Date): ProductMediaOperationState => ({
  operationId: ProductMediaOperationId.create(input.operationId).value,
  workflowId,
  workspaceId: actor.workspaceId,
  type: input.type,
  status: "Pending",
  targetMediaId: "targetMediaId" in input ? input.targetMediaId : undefined,
  requestedDisplayOrder: "requestedDisplayOrder" in input ? input.requestedDisplayOrder : undefined,
  selectAsCover: "selectAsCover" in input ? input.selectAsCover === true : false,
  orderedMediaIds: "orderedMediaIds" in input ? [...input.orderedMediaIds] : undefined,
  attemptCount: 0,
  retryAllowed: false,
  requiresNewSource: false,
  createdAt: new Date(now),
});

const emptyMediaState = (actor: TrustedActorContext, productId: ProductId, now: Date): ProductMediaState => ({
  workspaceId: actor.workspaceId, productId, revision: 0, updatedAt: new Date(now), updatedBy: actor.actorId, items: [],
});
const cloneMediaState = (state: ProductMediaState): ProductMediaState => ({ ...state, updatedAt: new Date(state.updatedAt), items: state.items.map((item) => ({ ...item, createdAt: new Date(item.createdAt) })) });

const transitionOperation = async (
  dependencies: Pick<WorkflowDependencies, "workflows">,
  workflow: ProductMediaWorkflowState,
  operation: ProductMediaOperationState,
  expectedVersion: number,
  allowedPreviousStatuses: readonly ProductMediaOperationState["status"][],
  terminal: Pick<ProductMediaOperationState, "status" | "retryAllowed" | "requiresNewSource"> & { readonly errorCode?: string; readonly completedAt?: Date },
): Promise<void> => {
  const projected = workflow.operations.map((candidate) => candidate.operationId === operation.operationId ? { ...candidate, ...terminal } : candidate);
  const workflowStatus = deriveProductMediaWorkflowStatus(projected);
  const result = await dependencies.workflows.transitionOperation(workflow.workspaceId, workflow.workflowId, operation.operationId, expectedVersion, {
    ...terminal,
    status: terminal.status as "SourceUnavailable" | "Cancelled" | "Failed" | "ReconciliationRequired",
    allowedPreviousStatuses,
    workflowStatus,
  });
  if (result.type === "NotFound") throw new ProductMediaWorkflowError("ProductMediaOperationNotFound");
  if (result.type !== "Transitioned") throw new ProductMediaWorkflowError("ProductMediaOperationAlreadyInProgress");
  Object.assign(operation, terminal);
  workflow.status = workflowStatus;
  workflow.version = result.version;
};

const nextFreeDisplayOrder = (items: readonly ProductMediaItem[]): number => {
  const used = new Set(items.map((item) => item.displayOrder));
  let candidate = 0;
  while (used.has(candidate)) candidate += 1;
  return candidate;
};

const allocateDisplayOrder = (items: ProductMediaItem[], requested?: number): number => {
  if (requested === undefined) return nextFreeDisplayOrder(items);
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].displayOrder >= requested) items[index] = { ...items[index], displayOrder: items[index].displayOrder + 1 };
  }
  return requested;
};

const nextGalleryKey = (root: Awaited<ReturnType<ProductMediaRootRepository["findByProduct"]>>, items: readonly ProductMediaItem[]) => {
  if (!root) throw new ProductMediaWorkflowError("ProductMediaStorageFailed");
  const used = new Set(items.map((item) => /gallery-(\d{2})\.webp$/.exec(item.storageArtifactKey)?.[1]).filter(Boolean).map(Number));
  const slot = Array.from({ length: 99 }, (_, index) => index + 1).find((value) => !used.has(value));
  if (!slot) throw new ProductMediaWorkflowError("ProductMediaStorageFailed");
  return ProductMediaFinalKey.fromSlot(root.storageRootKey, { type: "Gallery", slotNumber: slot });
};

type Compensation = () => Promise<boolean>;

type InitialEffectOutcome =
  | { readonly type: "Succeeded"; readonly compensations: readonly Compensation[] }
  | { readonly type: "KnownFailure"; readonly status: "Failed" | "SourceUnavailable"; readonly retryAllowed: boolean; readonly requiresNewSource: boolean; readonly errorCode: string }
  | { readonly type: "ReconciliationRequired"; readonly errorCode: "ProductMediaReconciliationRequired" };

type KnownStorageFailure = Extract<InitialEffectOutcome, { readonly type: "KnownFailure" }>;

const classifyStorageFailure = (
  operationType: ProductMediaOperationState["type"],
  code: ProductMediaStorageFailureCode,
  phase: "Stage" | "Publication",
): KnownStorageFailure | Extract<InitialEffectOutcome, { readonly type: "ReconciliationRequired" }> => {
  if (
    code === "UnsafeKey"
    || code === "TargetConflict"
    || code === "TrashConflict"
    || code === "ReplacementRestorationFailed"
    || (code === "FinalObjectMissing" && (operationType === "Replace" || operationType === "Remove"))
  ) return { type: "ReconciliationRequired", errorCode: "ProductMediaReconciliationRequired" };
  if (code === "TemporaryObjectMissing" && (operationType === "Add" || operationType === "Replace")) {
    return { type: "KnownFailure", status: "SourceUnavailable", retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaSourceUnavailable" };
  }
  if (phase === "Stage") {
    return { type: "KnownFailure", status: "Failed", retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaStorageFailed" };
  }
  return { type: "KnownFailure", status: "Failed", retryAllowed: true, requiresNewSource: false, errorCode: "ProductMediaStorageFailed" };
};

type TerminalAfterExternalEffect = Omit<ProductMediaOperationTransition, "allowedPreviousStatuses" | "workflowStatus">;

interface EstablishTerminalAfterExternalEffectInput {
  readonly workflow: ProductMediaWorkflowState;
  readonly operationId: string;
  readonly initialExpectedVersion: number;
  readonly allowedPreviousStatuses: readonly ProductMediaOperationState["status"][];
  readonly terminal: TerminalAfterExternalEffect;
  readonly compatibleConcurrentStatuses: readonly ProductMediaOperationState["status"][];
}

type EstablishTerminalAfterExternalEffectResult =
  | { readonly type: "Established"; readonly workflow: ProductMediaWorkflowState; readonly operation: ProductMediaOperationState }
  | { readonly type: "CompatibleConcurrentTruth"; readonly workflow: ProductMediaWorkflowState; readonly operation: ProductMediaOperationState }
  | { readonly type: "ReconciliationRequired"; readonly workflow: ProductMediaWorkflowState }
  | { readonly type: "NotFound"; readonly workflow: ProductMediaWorkflowState };

const projectTerminalWorkflow = (
  workflow: ProductMediaWorkflowState,
  operationId: string,
  terminal: TerminalAfterExternalEffect,
  version: number,
): { readonly workflow: ProductMediaWorkflowState; readonly operation: ProductMediaOperationState } | null => {
  const projected = copyWorkflow(workflow);
  const operation = projected.operations.find((candidate) => candidate.operationId === operationId);
  if (!operation) return null;
  Object.assign(operation, terminal);
  projected.status = deriveProductMediaWorkflowStatus(projected.operations);
  projected.version = version;
  return { workflow: projected, operation };
};

const establishTerminalAfterExternalEffect = async (
  dependencies: Pick<WorkflowDependencies, "workflows">,
  input: EstablishTerminalAfterExternalEffectInput,
): Promise<EstablishTerminalAfterExternalEffectResult> => {
  const initialProjection = projectTerminalWorkflow(input.workflow, input.operationId, input.terminal, input.initialExpectedVersion + 1);
  if (!initialProjection) return { type: "NotFound", workflow: input.workflow };
  let first;
  try {
    first = await dependencies.workflows.transitionOperation(
      input.workflow.workspaceId,
      input.workflow.workflowId,
      input.operationId,
      input.initialExpectedVersion,
      { ...input.terminal, allowedPreviousStatuses: input.allowedPreviousStatuses, workflowStatus: initialProjection.workflow.status },
    );
  } catch {
    return { type: "ReconciliationRequired", workflow: input.workflow };
  }
  if (first.type === "Transitioned") {
    const established = projectTerminalWorkflow(input.workflow, input.operationId, input.terminal, first.version);
    return established ? { type: "Established", ...established } : { type: "NotFound", workflow: input.workflow };
  }
  if (first.type === "NotFound") return { type: "NotFound", workflow: input.workflow };

  let reloaded: ProductMediaWorkflowState | null;
  try {
    reloaded = await dependencies.workflows.findById(input.workflow.workspaceId, input.workflow.workflowId);
  } catch {
    return { type: "ReconciliationRequired", workflow: input.workflow };
  }
  if (!reloaded) return { type: "NotFound", workflow: input.workflow };
  const concurrentOperation = reloaded.operations.find((candidate) => candidate.operationId === input.operationId);
  if (!concurrentOperation) return { type: "NotFound", workflow: reloaded };
  if (input.compatibleConcurrentStatuses.includes(concurrentOperation.status)) {
    return { type: "CompatibleConcurrentTruth", workflow: reloaded, operation: concurrentOperation };
  }
  if (!input.allowedPreviousStatuses.includes(concurrentOperation.status)) {
    return { type: "ReconciliationRequired", workflow: reloaded };
  }

  const reloadedProjection = projectTerminalWorkflow(reloaded, input.operationId, input.terminal, reloaded.version + 1);
  if (!reloadedProjection) return { type: "NotFound", workflow: reloaded };
  let second;
  try {
    second = await dependencies.workflows.transitionOperation(
      reloaded.workspaceId,
      reloaded.workflowId,
      input.operationId,
      reloaded.version,
      { ...input.terminal, allowedPreviousStatuses: input.allowedPreviousStatuses, workflowStatus: reloadedProjection.workflow.status },
    );
  } catch {
    return { type: "ReconciliationRequired", workflow: reloaded };
  }
  if (second.type === "NotFound") return { type: "NotFound", workflow: reloaded };
  if (second.type !== "Transitioned") return { type: "ReconciliationRequired", workflow: reloaded };
  const established = projectTerminalWorkflow(reloaded, input.operationId, input.terminal, second.version);
  return established ? { type: "Established", ...established } : { type: "NotFound", workflow: reloaded };
};

interface EstablishStagedAfterExternalEffectInput {
  readonly workflow: ProductMediaWorkflowState;
  readonly operationId: string;
  readonly initialExpectedVersion: number;
  readonly stagedObject: StagedProductMediaObject;
  readonly stagedAt: Date;
}

type EstablishStagedAfterExternalEffectResult =
  | { readonly type: "Established" | "CompatibleConcurrentTruth"; readonly workflow: ProductMediaWorkflowState; readonly operation: ProductMediaOperationState }
  | { readonly type: "ReconciliationRequired" | "NotFound"; readonly workflow: ProductMediaWorkflowState };

const projectStagedWorkflow = (
  workflow: ProductMediaWorkflowState,
  operationId: string,
  stagedObject: StagedProductMediaObject,
  stagedAt: Date,
  version: number,
): { readonly workflow: ProductMediaWorkflowState; readonly operation: ProductMediaOperationState; readonly transition: StageProductMediaOperationTransition } | null => {
  const projected = copyWorkflow(workflow);
  const operation = projected.operations.find((candidate) => candidate.operationId === operationId);
  if (!operation || operation.status !== "Pending") return null;
  stageOperation(operation, { ...stagedObject, key: stagedObject.key.value }, stagedAt);
  projected.status = deriveProductMediaWorkflowStatus(projected.operations);
  projected.version = version;
  return {
    workflow: projected,
    operation,
    transition: {
      stagingArtifactKey: operation.stagedArtifactKey!,
      stagedSha256: operation.stagedSha256!,
      stagedByteLength: operation.stagedByteLength!,
      stagedWidth: operation.stagedWidth!,
      stagedHeight: operation.stagedHeight!,
      expiresAt: operation.expiresAt!,
      workflowStatus: projected.status,
    },
  };
};

const isCompatibleStagedTruth = (
  operation: ProductMediaOperationState,
  projection: NonNullable<ReturnType<typeof projectStagedWorkflow>>,
): boolean => operation.status === "Staged"
  && operation.stagedArtifactKey === projection.operation.stagedArtifactKey
  && operation.stagedSha256 === projection.operation.stagedSha256
  && operation.stagedByteLength === projection.operation.stagedByteLength
  && operation.stagedWidth === projection.operation.stagedWidth
  && operation.stagedHeight === projection.operation.stagedHeight
  && operation.expiresAt?.getTime() === projection.operation.expiresAt?.getTime()
  && operation.retryAllowed === true
  && operation.requiresNewSource === false;

const establishStagedAfterExternalEffect = async (
  dependencies: Pick<WorkflowDependencies, "workflows">,
  input: EstablishStagedAfterExternalEffectInput,
): Promise<EstablishStagedAfterExternalEffectResult> => {
  const initialProjection = projectStagedWorkflow(input.workflow, input.operationId, input.stagedObject, input.stagedAt, input.initialExpectedVersion + 1);
  if (!initialProjection) return { type: "ReconciliationRequired", workflow: input.workflow };
  let first;
  try {
    first = await dependencies.workflows.transitionOperationToStaged(
      input.workflow.workspaceId,
      input.workflow.workflowId,
      input.operationId,
      input.initialExpectedVersion,
      initialProjection.transition,
    );
  } catch {
    return { type: "ReconciliationRequired", workflow: input.workflow };
  }
  if (first.type === "Transitioned") {
    const established = projectStagedWorkflow(input.workflow, input.operationId, input.stagedObject, input.stagedAt, first.version);
    return established ? { type: "Established", workflow: established.workflow, operation: established.operation } : { type: "ReconciliationRequired", workflow: input.workflow };
  }
  if (first.type === "NotFound") return { type: "NotFound", workflow: input.workflow };
  let reloaded: ProductMediaWorkflowState | null;
  try { reloaded = await dependencies.workflows.findById(input.workflow.workspaceId, input.workflow.workflowId); }
  catch { return { type: "ReconciliationRequired", workflow: input.workflow }; }
  if (!reloaded) return { type: "NotFound", workflow: input.workflow };
  const concurrent = reloaded.operations.find((candidate) => candidate.operationId === input.operationId);
  if (!concurrent) return { type: "NotFound", workflow: reloaded };
  if (isCompatibleStagedTruth(concurrent, initialProjection)) return { type: "CompatibleConcurrentTruth", workflow: reloaded, operation: concurrent };
  if (concurrent.status !== "Pending") return { type: "ReconciliationRequired", workflow: reloaded };
  const reloadedProjection = projectStagedWorkflow(reloaded, input.operationId, input.stagedObject, input.stagedAt, reloaded.version + 1);
  if (!reloadedProjection) return { type: "ReconciliationRequired", workflow: reloaded };
  let second;
  try {
    second = await dependencies.workflows.transitionOperationToStaged(
      reloaded.workspaceId,
      reloaded.workflowId,
      input.operationId,
      reloaded.version,
      reloadedProjection.transition,
    );
  } catch {
    return { type: "ReconciliationRequired", workflow: reloaded };
  }
  if (second.type === "NotFound") return { type: "NotFound", workflow: reloaded };
  if (second.type !== "Transitioned") return { type: "ReconciliationRequired", workflow: reloaded };
  const established = projectStagedWorkflow(reloaded, input.operationId, input.stagedObject, input.stagedAt, second.version);
  return established ? { type: "Established", workflow: established.workflow, operation: established.operation } : { type: "ReconciliationRequired", workflow: reloaded };
};

const synchronizeWorkflow = (target: ProductMediaWorkflowState, source: ProductMediaWorkflowState): void => {
  target.status = source.status;
  target.version = source.version;
  target.completedAt = source.completedAt ? new Date(source.completedAt) : undefined;
  for (const targetOperation of target.operations) {
    const sourceOperation = source.operations.find((candidate) => candidate.operationId === targetOperation.operationId);
    if (sourceOperation) Object.assign(targetOperation, copyOperation(sourceOperation));
  }
};

interface ExecutePendingProductMediaMetadataResult {
  readonly eligibility: ProductMediaMetadataExecutionEligibility;
  readonly workflowVersion: number;
  readonly mediaRevision: number;
}

const executePendingProductMediaMetadata = async (input: {
  readonly dependencies: Pick<WorkflowDependencies, "workflows">;
  readonly workflow: ProductMediaWorkflowState;
  readonly mediaState: ProductMediaState;
  readonly actor: TrustedActorContext;
  readonly effectiveTime: Date;
  readonly workflowVersion: number;
  readonly mediaRevision: number;
}): Promise<ExecutePendingProductMediaMetadataResult> => {
  const eligibility = resolveProductMediaMetadataExecutionEligibility(input.workflow.operations);
  if (eligibility.type !== "Ready") {
    return { eligibility, workflowVersion: input.workflowVersion, mediaRevision: input.mediaRevision };
  }

  let workflowVersion = input.workflowVersion;
  let mediaRevision = input.mediaRevision;
  const execute = async (operation: ProductMediaOperationState, mutate: () => void): Promise<void> => {
    const beforeState = cloneMediaState(input.mediaState);
    const beforeOperation = copyOperation(operation);
    try {
      mutate();
      operation.status = "Completed";
      operation.retryAllowed = false;
      operation.requiresNewSource = false;
      operation.errorCode = undefined;
      operation.completedAt = new Date(input.effectiveTime);
      input.mediaState.revision = mediaRevision + 1;
      input.mediaState.updatedAt = new Date(input.effectiveTime);
      input.mediaState.updatedBy = input.actor.actorId;
      input.workflow.status = deriveProductMediaWorkflowStatus(input.workflow.operations);
      input.workflow.completedAt = input.workflow.status === "Completed"
        ? new Date(input.effectiveTime)
        : undefined;
      input.workflow.version = workflowVersion + 1;
      const saved = await input.dependencies.workflows.save(
        input.workflow,
        input.mediaState,
        workflowVersion,
        mediaRevision,
      );
      if (saved.type !== "Saved") {
        throw new ProductMediaWorkflowError(saved.type === "MediaRevisionConflict"
          ? "MediaRevisionConflict"
          : "ProductMediaOperationAlreadyInProgress");
      }
      workflowVersion = input.workflow.version;
      mediaRevision = input.mediaState.revision;
    } catch (error) {
      Object.assign(input.mediaState, beforeState, { items: beforeState.items });
      Object.assign(operation, beforeOperation);
      input.workflow.version = workflowVersion;
      const code = error instanceof ProductMediaWorkflowError
        ? error.code
        : "ProductMediaValidationFailed";
      try {
        await transitionOperation(
          input.dependencies,
          input.workflow,
          operation,
          workflowVersion,
          ["Pending"],
          { status: "Failed", retryAllowed: false, requiresNewSource: false, errorCode: code },
        );
      } catch {
        throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
      }
      workflowVersion = input.workflow.version;
      if (code === "MediaRevisionConflict") throw new ProductMediaWorkflowError("MediaRevisionConflict");
    }
  };

  for (const operation of input.workflow.operations.filter((candidate) =>
    candidate.type === "Reorder" && candidate.status === "Pending")) {
    await execute(operation, () => {
      input.mediaState.items = reorderProductMedia(input.mediaState.items, operation.orderedMediaIds ?? []);
    });
  }
  for (const operation of input.workflow.operations.filter((candidate) =>
    candidate.type === "SetCover" && candidate.status === "Pending")) {
    await execute(operation, () => {
      if (!operation.targetMediaId || !input.mediaState.items.some((item) => item.mediaId === operation.targetMediaId)) {
        throw new ProductMediaWorkflowError("ProductMediaValidationFailed");
      }
      input.mediaState.coverMediaId = operation.targetMediaId;
    });
  }
  return { eligibility, workflowVersion, mediaRevision };
};

export class ExecuteProductMediaWorkflowUseCase {
  constructor(private readonly dependencies: WorkflowDependencies) {}

  async execute(command: ExecuteProductMediaWorkflowCommand): Promise<ProductMediaWorkflowState> {
    assertCommand(command);
    const productId = ProductId.create(command.productId);
    const product = await assertActor(this.dependencies, command.actorContext, productId);
    const fingerprint = requestFingerprint(command);
    const existing = await this.dependencies.workflows.findByIdempotencyKey(command.actorContext.workspaceId, command.idempotencyKey);
    if (existing) {
      if (existing.requestFingerprint !== fingerprint) {
        throw new ProductMediaWorkflowError("ProductMediaIdempotencyConflict");
      }
      if (!existing.operations.some((operation) => operation.status === "Pending")) return copyWorkflow(existing);
    }
    if (!existing && command.operations.some((operation) =>
      (operation.type === "Add" || operation.type === "Replace") && !operation.source,
    )) throw new ProductMediaWorkflowError("ProductMediaValidationFailed");
    const mediaState = (await this.dependencies.workflows.loadMediaState(command.actorContext.workspaceId, productId)) ?? emptyMediaState(command.actorContext, productId, command.effectiveTime);
    if (!existing && mediaState.revision !== command.expectedMediaRevision) throw new ProductMediaWorkflowError("MediaRevisionConflict");
    const root = await resolveOrCreateRoot(this.dependencies, product, command.effectiveTime);
    let workflow: ProductMediaWorkflowState = existing ? copyWorkflow(existing) : {
      workflowId: command.workflowId, workspaceId: command.actorContext.workspaceId, productId, status: "Pending",
      expectedMediaRevision: command.expectedMediaRevision, idempotencyKey: command.idempotencyKey,
      requestFingerprint: fingerprint,
      createdBy: command.actorContext.actorId, startedAt: new Date(command.effectiveTime), version: 0,
      operations: command.operations.map((operation) => initialOperation(command.workflowId, command.actorContext, operation, command.effectiveTime)),
    };
    if (!existing) {
      const created = await this.dependencies.workflows.create(workflow);
      if (created.type === "Existing") {
        if (created.workflow.requestFingerprint !== fingerprint) throw new ProductMediaWorkflowError("ProductMediaIdempotencyConflict");
        if (!created.workflow.operations.some((operation) => operation.status === "Pending")) return copyWorkflow(created.workflow);
        workflow = copyWorkflow(created.workflow);
      }
      if (created.type === "IdempotencyConflict") throw new ProductMediaWorkflowError("ProductMediaIdempotencyConflict");
    }
    const inputById = new Map(command.operations.map((operation) => [operation.operationId, operation]));
    let selectedCover: string | undefined;
    const previousCover = mediaState.coverMediaId;
    let persistedWorkflowVersion = workflow.version;
    let persistedMediaRevision = mediaState.revision;
    const persist = async (mediaChanged: boolean): Promise<void> => {
      workflow.status = deriveProductMediaWorkflowStatus(workflow.operations);
      workflow.version = persistedWorkflowVersion + 1;
      const saved = await this.dependencies.workflows.save(workflow, mediaState, persistedWorkflowVersion, persistedMediaRevision);
      if (saved.type !== "Saved") throw new ProductMediaWorkflowError(saved.type === "MediaRevisionConflict" ? "MediaRevisionConflict" : "ProductMediaOperationAlreadyInProgress");
      persistedWorkflowVersion = workflow.version;
      if (mediaChanged) persistedMediaRevision = mediaState.revision;
    };
    const normalizedCover = resolveProductMediaCover(mediaState.items, undefined, mediaState.coverMediaId);
    if (normalizedCover !== mediaState.coverMediaId) {
      mediaState.coverMediaId = normalizedCover; mediaState.revision += 1; mediaState.updatedAt = new Date(command.effectiveTime); mediaState.updatedBy = command.actorContext.actorId;
      await persist(true);
    }
    for (const type of ["Add", "Replace", "Remove"] as const) {
      for (const operation of workflow.operations.filter((candidate) => candidate.type === type && candidate.status === "Pending")) {
        const input = inputById.get(operation.operationId)!;
        if (type === "Add" || type === "Replace") {
          const source = "source" in input ? input.source : undefined;
          if (!source) {
            this.fail(operation, "ProductMediaValidationFailed", false, true);
            await persist(false);
            continue;
          }
          const prepared = await this.prepare(workflow, operation, root.storageRootKey, source, command.effectiveTime, persistedWorkflowVersion);
          if (prepared.type === "Failed") {
            this.applyKnownFailure(operation, prepared.failure);
            await persist(false);
            continue;
          }
          synchronizeWorkflow(workflow, prepared.workflow);
          persistedWorkflowVersion = prepared.workflow.version;
        }
        operation.attemptCount += 1;
        operation.lastAttemptAt = new Date(command.effectiveTime);
        operation.status = "InProgress";
        await persist(false);
        const before = cloneMediaState(mediaState);
        const outcome = await this.executeInitialEffect(operation, mediaState, root.storageRootKey, command.actorContext, command.effectiveTime);
        const completed = outcome.type === "Succeeded";
        if (outcome.type === "Succeeded") this.complete(operation, command.effectiveTime);
        else if (outcome.type === "ReconciliationRequired") {
          operation.status = "ReconciliationRequired";
          operation.retryAllowed = false;
          operation.requiresNewSource = false;
          operation.errorCode = outcome.errorCode;
        } else {
          this.applyKnownFailure(operation, outcome);
        }
        if (completed && operation.selectAsCover) selectedCover = operation.type === "Add" ? operation.operationId : operation.targetMediaId;
        if (completed) {
          mediaState.coverMediaId = resolveProductMediaCover(mediaState.items, selectedCover, mediaState.coverMediaId);
          mediaState.revision = persistedMediaRevision + 1; mediaState.updatedAt = new Date(command.effectiveTime); mediaState.updatedBy = command.actorContext.actorId;
        }
        try { await persist(completed); }
        catch (error) {
          Object.assign(mediaState, before, { items: before.items });
          if (outcome.type === "ReconciliationRequired") {
            const established = await establishTerminalAfterExternalEffect(this.dependencies, {
              workflow,
              operationId: operation.operationId,
              initialExpectedVersion: persistedWorkflowVersion,
              allowedPreviousStatuses: ["InProgress"],
              terminal: { status: "ReconciliationRequired", retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired" },
              compatibleConcurrentStatuses: ["ReconciliationRequired"],
            });
            if (established.type === "Established" || established.type === "CompatibleConcurrentTruth") persistedWorkflowVersion = established.workflow.version;
            throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
          }
          const restored = outcome.type === "Succeeded" ? await this.compensate(outcome.compensations) : true;
          const terminal = !restored
            ? { status: "ReconciliationRequired" as const, retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired" }
            : outcome.type === "KnownFailure"
              ? { status: outcome.status, retryAllowed: outcome.retryAllowed, requiresNewSource: outcome.requiresNewSource, errorCode: outcome.errorCode }
              : operation.type === "Add" || operation.type === "Replace"
                ? { status: "SourceUnavailable" as const, retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaSourceUnavailable" }
                : { status: "Failed" as const, retryAllowed: true, requiresNewSource: false, errorCode: "ProductMediaStorageFailed" };
          const established = await establishTerminalAfterExternalEffect(this.dependencies, {
            workflow,
            operationId: operation.operationId,
            initialExpectedVersion: persistedWorkflowVersion,
            allowedPreviousStatuses: ["InProgress"],
            terminal,
            compatibleConcurrentStatuses: [terminal.status, "ReconciliationRequired"],
          });
          if (established.type !== "Established" && established.type !== "CompatibleConcurrentTruth") throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
          persistedWorkflowVersion = established.workflow.version;
          if (!restored) throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
          if (error instanceof ProductMediaWorkflowError) throw error;
          throw new ProductMediaWorkflowError("ProductMediaStorageFailed");
        }
      }
    }
    const metadata = await executePendingProductMediaMetadata({
      dependencies: this.dependencies,
      workflow,
      mediaState,
      actor: command.actorContext,
      effectiveTime: command.effectiveTime,
      workflowVersion: persistedWorkflowVersion,
      mediaRevision: persistedMediaRevision,
    });
    persistedWorkflowVersion = metadata.workflowVersion;
    persistedMediaRevision = metadata.mediaRevision;
    const completedCover = workflow.operations.find((operation) =>
      operation.type === "SetCover" && operation.status === "Completed");
    if (completedCover?.targetMediaId) selectedCover = completedCover.targetMediaId;
    mediaState.coverMediaId = resolveProductMediaCover(mediaState.items, selectedCover, mediaState.coverMediaId ?? previousCover);
    workflow.status = deriveProductMediaWorkflowStatus(workflow.operations);
    workflow.completedAt = workflow.operations.some((operation) => operation.status === "Pending")
      ? undefined
      : workflow.status !== "Pending" && workflow.status !== "InProgress"
        ? new Date(command.effectiveTime)
        : undefined;
    await persist(false);
    return copyWorkflow(workflow);
  }

  private async prepare(
    workflow: ProductMediaWorkflowState,
    operation: ProductMediaOperationState,
    root: Parameters<typeof ProductMediaStagingKey.create>[0],
    source: IncomingMediaSource,
    now: Date,
    expectedVersion: number,
  ): Promise<{ readonly type: "Staged"; readonly workflow: ProductMediaWorkflowState } | { readonly type: "Failed"; readonly failure: KnownStorageFailure }> {
    const normalized = await this.dependencies.processor.normalize(source.bytes, this.dependencies.processingConfiguration);
    if (normalized.type === "Rejected") return { type: "Failed", failure: { type: "KnownFailure", status: "Failed", retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaValidationFailed" } };
    const stagingKey = ProductMediaStagingKey.create(root, operation.operationId);
    let staged;
    try { staged = await this.dependencies.storage.stage({ stagingKey, image: normalized.image }); }
    catch (error) {
      if (error instanceof ProductMediaStoragePartialOperationError) {
        await this.establishPreparationTerminal(workflow, operation, expectedVersion, {
          status: "ReconciliationRequired", retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired",
        }, ["Pending"]);
        throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
      }
      return { type: "Failed", failure: { type: "KnownFailure", status: "Failed", retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaStorageFailed" } };
    }
    if (staged.type === "Failed") {
      const classified = classifyStorageFailure(operation.type, staged.code, "Stage");
      if (classified.type === "ReconciliationRequired") {
        await this.establishPreparationTerminal(workflow, operation, expectedVersion, {
          status: "ReconciliationRequired", retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired",
        }, ["Pending"]);
        throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
      }
      return { type: "Failed", failure: classified };
    }
    const established = await establishStagedAfterExternalEffect(this.dependencies, {
      workflow,
      operationId: operation.operationId,
      initialExpectedVersion: expectedVersion,
      stagedObject: staged.object,
      stagedAt: now,
    });
    if (established.type === "Established" || established.type === "CompatibleConcurrentTruth") return { type: "Staged", workflow: established.workflow };

    let discarded;
    try { discarded = await this.dependencies.storage.discardTemporary({ stagingKey }); }
    catch { discarded = { type: "Failed" as const, code: "UnsafeKey" as const }; }
    const knownAbsent = discarded.type === "Discarded" || discarded.code === "TemporaryObjectMissing";
    const terminal = knownAbsent
      ? { status: "SourceUnavailable" as const, retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaSourceUnavailable" }
      : { status: "ReconciliationRequired" as const, retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired" };
    await this.establishPreparationTerminal(established.workflow, operation, established.workflow.version, terminal, ["Pending", "Staged"]);
    throw new ProductMediaWorkflowError(knownAbsent ? "ProductMediaSourceUnavailable" : "ProductMediaReconciliationRequired");
  }

  private async establishPreparationTerminal(
    workflow: ProductMediaWorkflowState,
    operation: ProductMediaOperationState,
    expectedVersion: number,
    terminal: TerminalAfterExternalEffect,
    allowedPreviousStatuses: readonly ProductMediaOperationState["status"][],
  ): Promise<void> {
    const established = await establishTerminalAfterExternalEffect(this.dependencies, {
      workflow,
      operationId: operation.operationId,
      initialExpectedVersion: expectedVersion,
      allowedPreviousStatuses,
      terminal,
      compatibleConcurrentStatuses: [terminal.status, "ReconciliationRequired"],
    });
    if (established.type !== "Established" && established.type !== "CompatibleConcurrentTruth") throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
    synchronizeWorkflow(workflow, established.workflow);
  }

  private staged(operation: ProductMediaOperationState, root: Parameters<typeof ProductMediaStagingKey.create>[0]): StagedProductMediaObject {
    return { key: ProductMediaStagingKey.create(root, operation.operationId), sha256: operation.stagedSha256!, byteLength: operation.stagedByteLength!, mediaType: "image/webp", width: operation.stagedWidth!, height: operation.stagedHeight! };
  }

  private async executeInitialEffect(operation: ProductMediaOperationState, state: ProductMediaState, root: Parameters<typeof ProductMediaStagingKey.create>[0], actor: TrustedActorContext, now: Date): Promise<InitialEffectOutcome> {
    try {
      if (operation.type === "Add") return await this.add(operation, state, root, actor, now);
      if (operation.type === "Replace") return await this.replace(operation, state, root, actor);
      return await this.remove(operation, state, root);
    } catch (error) {
      return error instanceof ProductMediaStoragePartialOperationError
        ? { type: "ReconciliationRequired", errorCode: "ProductMediaReconciliationRequired" }
        : { type: "KnownFailure", status: "Failed", retryAllowed: true, requiresNewSource: false, errorCode: "ProductMediaStorageFailed" };
    }
  }

  private async add(operation: ProductMediaOperationState, state: ProductMediaState, root: Parameters<typeof ProductMediaStagingKey.create>[0], actor: TrustedActorContext, now: Date): Promise<InitialEffectOutcome> {
    const finalKey = nextGalleryKey({ storageRootKey: root } as never, state.items);
    operation.finalArtifactKey = finalKey.value;
    const result = await this.dependencies.storage.publishNew({ stagedObject: this.staged(operation, root), finalKey });
    if (result.type === "Failed") return classifyStorageFailure(operation.type, result.code, "Publication");
    state.items.push(Object.freeze({ mediaId: operation.operationId, workspaceId: actor.workspaceId, productId: state.productId, storageArtifactKey: finalKey.value, checksumSha256: result.object.sha256, mimeType: "image/webp", displayOrder: allocateDisplayOrder(state.items, operation.requestedDisplayOrder), createdAt: new Date(now), createdBy: actor.actorId }));
    const trashKey = ProductMediaTrashKey.create(root, operation.operationId);
    return { type: "Succeeded", compensations: [async () => (await this.dependencies.storage.moveToTrash({ finalKey, trashKey })).type === "MovedToTrash"] };
  }

  private async replace(operation: ProductMediaOperationState, state: ProductMediaState, root: Parameters<typeof ProductMediaStagingKey.create>[0], actor: TrustedActorContext): Promise<InitialEffectOutcome> {
    const index = state.items.findIndex((item) => item.mediaId === operation.targetMediaId);
    if (index < 0) return { type: "KnownFailure", status: "Failed", retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaValidationFailed" };
    const previous = state.items[index];
    const finalKey = ProductMediaFinalKey.rehydrate(root, previous.storageArtifactKey);
    const trashKey = ProductMediaTrashKey.create(root, operation.operationId);
    operation.finalArtifactKey = finalKey.value;
    const result = await this.dependencies.storage.publishReplacement({ stagedObject: this.staged(operation, root), finalKey, trashKey });
    if (result.type === "Failed") return classifyStorageFailure(operation.type, result.code, "Publication");
    const replacement = Object.freeze({ ...previous, checksumSha256: result.object.sha256, createdBy: actor.actorId });
    if (operation.requestedDisplayOrder === undefined) state.items[index] = replacement;
    else {
      const remaining = state.items.filter((item) => item.mediaId !== previous.mediaId);
      const displayOrder = allocateDisplayOrder(remaining, operation.requestedDisplayOrder);
      state.items = [...remaining, { ...replacement, displayOrder }];
    }
    return { type: "Succeeded", compensations: [async () => (await this.dependencies.storage.restoreFromTrash({ finalKey, trashKey })).type === "Restored"] };
  }

  private async remove(operation: ProductMediaOperationState, state: ProductMediaState, root: Parameters<typeof ProductMediaStagingKey.create>[0]): Promise<InitialEffectOutcome> {
    const index = state.items.findIndex((item) => item.mediaId === operation.targetMediaId);
    if (index < 0) return { type: "KnownFailure", status: "Failed", retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaValidationFailed" };
    const finalKey = ProductMediaFinalKey.rehydrate(root, state.items[index].storageArtifactKey);
    const trashKey = ProductMediaTrashKey.create(root, operation.operationId);
    const result = await this.dependencies.storage.moveToTrash({ finalKey, trashKey });
    if (result.type === "Failed") return classifyStorageFailure(operation.type, result.code, "Publication");
    state.items.splice(index, 1);
    return { type: "Succeeded", compensations: [async () => (await this.dependencies.storage.restoreFromTrash({ finalKey, trashKey })).type === "Restored"] };
  }

  private complete(operation: ProductMediaOperationState, now: Date): void { operation.status = "Completed"; operation.retryAllowed = false; operation.requiresNewSource = false; operation.errorCode = undefined; operation.completedAt = new Date(now); }
  private fail(operation: ProductMediaOperationState, code: string, retryAllowed: boolean, requiresNewSource = false): void { operation.status = "Failed"; operation.errorCode = code; operation.retryAllowed = retryAllowed; operation.requiresNewSource = requiresNewSource; }
  private applyKnownFailure(operation: ProductMediaOperationState, failure: KnownStorageFailure): void {
    operation.status = failure.status;
    operation.errorCode = failure.errorCode;
    operation.retryAllowed = failure.retryAllowed;
    operation.requiresNewSource = failure.requiresNewSource;
  }
  private async compensate(compensations: readonly Compensation[]): Promise<boolean> { let restored = true; for (const compensation of [...compensations].reverse()) { try { if (!(await compensation())) restored = false; } catch { restored = false; } } return restored; }
}

export class GetProductMediaWorkflowQuery {
  constructor(private readonly dependencies: Pick<WorkflowDependencies, "workflows" | "authorization">) {}
  async execute(actor: TrustedActorContext, workflowId: string): Promise<ProductMediaWorkflowState> {
    const workflow = await this.dependencies.workflows.findById(actor.workspaceId, workflowId);
    if (!workflow) throw new ProductMediaWorkflowError("ProductMediaWorkflowNotFound");
    if (!(await this.dependencies.authorization.canEditProduct(actor, workflow.productId))) throw new ProductMediaWorkflowError("ProductMediaAuthorizationDenied");
    return copyWorkflow(workflow);
  }
}

export class GetProductMediaWorkflowByIdempotencyKeyQuery {
  constructor(private readonly dependencies: Pick<WorkflowDependencies, "workflows" | "authorization">) {}
  async execute(actor: TrustedActorContext, idempotencyKey: string): Promise<ProductMediaWorkflowState | null> {
    if (!idempotencyKey.trim()) throw new ProductMediaWorkflowError("ProductMediaValidationFailed");
    const workflow = await this.dependencies.workflows.findByIdempotencyKey(actor.workspaceId, idempotencyKey);
    if (!workflow) return null;
    if (!(await this.dependencies.authorization.canEditProduct(actor, workflow.productId))) throw new ProductMediaWorkflowError("ProductMediaAuthorizationDenied");
    return copyWorkflow(workflow);
  }
}

export class GetProductMediaStateQuery {
  constructor(private readonly dependencies: Pick<WorkflowDependencies, "workflows" | "authorization">) {}
  async execute(actor: TrustedActorContext, productIdValue: string): Promise<ProductMediaState> {
    const productId = ProductId.create(productIdValue);
    if (!(await this.dependencies.authorization.canEditProduct(actor, productId))) throw new ProductMediaWorkflowError("ProductMediaAuthorizationDenied");
    const state = await this.dependencies.workflows.loadMediaState(actor.workspaceId, productId);
    return state ? { ...state, items: [...state.items] } : emptyMediaState(actor, productId, new Date(0));
  }
}

export interface RetryProductMediaOperationCommand {
  readonly actorContext: TrustedActorContext;
  readonly workflowId: string;
  readonly operationId: string;
  readonly effectiveTime: Date;
}

export class RetryProductMediaOperationUseCase {
  constructor(private readonly dependencies: WorkflowDependencies) {}

  async execute(command: RetryProductMediaOperationCommand): Promise<ProductMediaWorkflowState> {
    const operationId = canonicalOperationId(command.operationId);
    const workflow = await this.dependencies.workflows.findById(command.actorContext.workspaceId, command.workflowId);
    if (!workflow) throw new ProductMediaWorkflowError("ProductMediaWorkflowNotFound");
    await assertActor(this.dependencies, command.actorContext, workflow.productId);
    const operation = workflow.operations.find((candidate) => candidate.operationId === operationId);
    if (!operation) throw new ProductMediaWorkflowError("ProductMediaOperationNotFound");
    if (operation.status === "Completed") return copyWorkflow(workflow);
    if (["Cancelled", "SourceUnavailable", "ReconciliationRequired"].includes(operation.status) || !operation.retryAllowed || !["Add", "Replace", "Remove"].includes(operation.type)) throw new ProductMediaWorkflowError("ProductMediaRetryNotAllowed");
    const root = await this.dependencies.roots.findByProduct(command.actorContext.workspaceId, workflow.productId);
    if (!root) throw new ProductMediaWorkflowError("ProductMediaStorageFailed");
    const state = (await this.dependencies.workflows.loadMediaState(command.actorContext.workspaceId, workflow.productId)) ?? emptyMediaState(command.actorContext, workflow.productId, command.effectiveTime);
    const normalizedCover = resolveProductMediaCover(state.items, undefined, state.coverMediaId);
    if (normalizedCover !== state.coverMediaId) {
      const expectedWorkflow = workflow.version; const expectedMedia = state.revision;
      state.coverMediaId = normalizedCover; state.revision += 1; state.updatedAt = new Date(command.effectiveTime); state.updatedBy = command.actorContext.actorId; workflow.version += 1;
      const normalized = await this.dependencies.workflows.save(workflow, state, expectedWorkflow, expectedMedia);
      if (normalized.type !== "Saved") throw new ProductMediaWorkflowError(normalized.type === "MediaRevisionConflict" ? "MediaRevisionConflict" : "ProductMediaOperationAlreadyInProgress");
    }
    if ((operation.type === "Replace" || operation.type === "Remove") && (!operation.targetMediaId || !state.items.some((item) => item.mediaId === operation.targetMediaId))) throw new ProductMediaWorkflowError("ProductMediaValidationFailed");
    if (operation.type === "Add" || operation.type === "Replace") {
      if (!operation.expiresAt || operation.expiresAt.getTime() <= command.effectiveTime.getTime() || !operation.stagedArtifactKey) {
        const status = await this.persistSourceUnavailable(workflow, operation);
        if (status === "Cancelled") throw new ProductMediaWorkflowError("ProductMediaRetryNotAllowed");
        if (status !== "SourceUnavailable") throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
        throw new ProductMediaWorkflowError("ProductMediaSourceUnavailable");
      }
      const stagingKey = ProductMediaStagingKey.create(root.storageRootKey, operation.operationId);
      let exists;
      try { exists = await this.dependencies.storage.temporaryExists(stagingKey); }
      catch (error) {
        if (error instanceof ProductMediaStoragePartialOperationError) {
          await this.persistReconciliationRequired(workflow, operation);
          throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
        }
        throw new ProductMediaWorkflowError("ProductMediaStorageFailed");
      }
      if (exists.type === "Failed") throw new ProductMediaWorkflowError("ProductMediaStorageFailed");
      if (!exists.exists) {
        const status = await this.persistSourceUnavailable(workflow, operation);
        if (status === "Cancelled") throw new ProductMediaWorkflowError("ProductMediaRetryNotAllowed");
        if (status !== "SourceUnavailable") throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
        throw new ProductMediaWorkflowError("ProductMediaSourceUnavailable");
      }
    }
    const target = operation.targetMediaId ? state.items.find((item) => item.mediaId === operation.targetMediaId) : undefined;
    if (target) {
      const finalKey = ProductMediaFinalKey.rehydrate(root.storageRootKey, target.storageArtifactKey);
      let exists;
      try { exists = await this.dependencies.storage.exists(finalKey); }
      catch (error) {
        if (error instanceof ProductMediaStoragePartialOperationError) {
          await this.persistReconciliationRequired(workflow, operation);
          throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
        }
        throw new ProductMediaWorkflowError("ProductMediaStorageFailed");
      }
      if (exists.type === "Failed") throw new ProductMediaWorkflowError("ProductMediaStorageFailed");
      if (!exists.exists) {
        await this.persistReconciliationRequired(workflow, operation);
        throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
      }
    }
    const loadedVersion = workflow.version;
    const claim = await this.dependencies.workflows.claimOperation(command.actorContext.workspaceId, workflow.workflowId, operation.operationId, workflow.version, command.effectiveTime);
    if (claim.type === "Completed") return copyWorkflow((await this.dependencies.workflows.findById(command.actorContext.workspaceId, workflow.workflowId)) ?? workflow);
    if (claim.type === "AlreadyInProgress" || claim.type === "Conflict") throw new ProductMediaWorkflowError("ProductMediaOperationAlreadyInProgress");
    if (claim.type === "NotFound") throw new ProductMediaWorkflowError("ProductMediaOperationNotFound");
    claimOperationAttempt(operation, command.effectiveTime);
    const claimedVersion = claim.claimedVersion;
    if (claimedVersion !== loadedVersion + 1) throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
    workflow.version = claimedVersion;
    const before = cloneMediaState(state);
    type RetryEffectOutcome = { readonly type: "Succeeded"; readonly compensation: Compensation } | KnownStorageFailure | Extract<InitialEffectOutcome, { readonly type: "ReconciliationRequired" }>;
    let outcome: RetryEffectOutcome = { type: "KnownFailure", status: "Failed", retryAllowed: true, requiresNewSource: false, errorCode: "ProductMediaStorageFailed" };
    try { if (operation.type === "Add") {
      const finalKey = operation.finalArtifactKey ? ProductMediaFinalKey.rehydrate(root.storageRootKey, operation.finalArtifactKey) : nextGalleryKey(root, state.items);
      operation.finalArtifactKey = finalKey.value;
      const result = await this.dependencies.storage.publishNew({ stagedObject: this.staged(operation, root.storageRootKey), finalKey });
      if (result.type === "Published") {
        state.items.push({ mediaId: operation.operationId, workspaceId: workflow.workspaceId, productId: workflow.productId, storageArtifactKey: finalKey.value, checksumSha256: result.object.sha256, mimeType: "image/webp", displayOrder: allocateDisplayOrder(state.items, operation.requestedDisplayOrder), createdAt: operation.createdAt, createdBy: command.actorContext.actorId });
        const trashKey = ProductMediaTrashKey.create(root.storageRootKey, operation.operationId);
        outcome = { type: "Succeeded", compensation: async () => (await this.dependencies.storage.moveToTrash({ finalKey, trashKey })).type === "MovedToTrash" };
      } else outcome = classifyStorageFailure(operation.type, result.code, "Publication");
    } else if (operation.type === "Replace" && operation.targetMediaId) {
      const item = state.items.find((candidate) => candidate.mediaId === operation.targetMediaId);
      if (item) {
        const finalKey = ProductMediaFinalKey.rehydrate(root.storageRootKey, item.storageArtifactKey); const trashKey = ProductMediaTrashKey.create(root.storageRootKey, operation.operationId);
        const result = await this.dependencies.storage.publishReplacement({ stagedObject: this.staged(operation, root.storageRootKey), finalKey, trashKey });
        if (result.type === "Replaced") {
          const replacement = { ...item, checksumSha256: result.object.sha256 };
          if (operation.requestedDisplayOrder === undefined) {
            state.items = state.items.map((candidate) => candidate.mediaId === item.mediaId ? replacement : candidate);
          } else {
            const remaining = state.items.filter((candidate) => candidate.mediaId !== item.mediaId);
            const displayOrder = allocateDisplayOrder(remaining, operation.requestedDisplayOrder);
            state.items = [...remaining, { ...replacement, displayOrder }];
          }
          outcome = { type: "Succeeded", compensation: async () => (await this.dependencies.storage.restoreFromTrash({ finalKey, trashKey })).type === "Restored" };
        }
        else outcome = classifyStorageFailure(operation.type, result.code, "Publication");
      }
    } else if (operation.type === "Remove" && operation.targetMediaId) {
      const item = state.items.find((candidate) => candidate.mediaId === operation.targetMediaId);
      if (item) {
        const finalKey = ProductMediaFinalKey.rehydrate(root.storageRootKey, item.storageArtifactKey); const trashKey = ProductMediaTrashKey.create(root.storageRootKey, operation.operationId);
        const result = await this.dependencies.storage.moveToTrash({ finalKey, trashKey });
        if (result.type === "MovedToTrash") { state.items = state.items.filter((candidate) => candidate.mediaId !== item.mediaId); outcome = { type: "Succeeded", compensation: async () => (await this.dependencies.storage.restoreFromTrash({ finalKey, trashKey })).type === "Restored" }; }
        else outcome = classifyStorageFailure(operation.type, result.code, "Publication");
      }
    } } catch (error) { outcome = error instanceof ProductMediaStoragePartialOperationError ? { type: "ReconciliationRequired", errorCode: "ProductMediaReconciliationRequired" } : { type: "KnownFailure", status: "Failed", retryAllowed: true, requiresNewSource: false, errorCode: "ProductMediaStorageFailed" }; }
    if (outcome.type === "Succeeded") {
      operation.status = "Completed"; operation.completedAt = new Date(command.effectiveTime); operation.retryAllowed = false; operation.errorCode = undefined;
      state.revision += 1; state.updatedAt = new Date(command.effectiveTime); state.updatedBy = command.actorContext.actorId;
      state.coverMediaId = resolveProductMediaCover(state.items, operation.selectAsCover ? operation.targetMediaId ?? operation.operationId : undefined, state.coverMediaId);
    } else if (outcome.type === "ReconciliationRequired") { operation.status = "ReconciliationRequired"; operation.retryAllowed = false; operation.requiresNewSource = false; operation.errorCode = outcome.errorCode; }
    else { operation.status = outcome.status; operation.retryAllowed = outcome.retryAllowed; operation.requiresNewSource = outcome.requiresNewSource; operation.errorCode = outcome.errorCode; }
    workflow.status = deriveProductMediaWorkflowStatus(workflow.operations);
    workflow.version = claimedVersion + 1;
    workflow.completedAt = workflow.operations.some((candidate) => candidate.status === "Pending")
      ? undefined
      : new Date(command.effectiveTime);
    let saved;
    try { saved = await this.dependencies.workflows.save(workflow, state, claimedVersion, before.revision); }
    catch { saved = { type: "WorkflowVersionConflict" as const }; }
    if (saved.type !== "Saved") {
      if (outcome.type === "ReconciliationRequired") {
        await establishTerminalAfterExternalEffect(this.dependencies, {
          workflow,
          operationId: operation.operationId,
          initialExpectedVersion: claimedVersion,
          allowedPreviousStatuses: ["InProgress"],
          terminal: { status: "ReconciliationRequired", retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired" },
          compatibleConcurrentStatuses: ["ReconciliationRequired"],
        });
        throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
      }
      const restored = outcome.type === "Succeeded" ? await this.safeCompensate(outcome.compensation) : true;
      Object.assign(state, before, { items: before.items });
      const terminal = !restored
        ? { status: "ReconciliationRequired" as const, retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired" }
        : outcome.type === "Succeeded" && (operation.type === "Add" || operation.type === "Replace")
          ? { status: "SourceUnavailable" as const, retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaSourceUnavailable" }
          : outcome.type === "KnownFailure"
            ? { status: outcome.status, retryAllowed: outcome.retryAllowed, requiresNewSource: outcome.requiresNewSource, errorCode: outcome.errorCode }
            : { status: "Failed" as const, retryAllowed: true, requiresNewSource: false, errorCode: "ProductMediaStorageFailed" };
      const established = await establishTerminalAfterExternalEffect(this.dependencies, {
        workflow,
        operationId: operation.operationId,
        initialExpectedVersion: claimedVersion,
        allowedPreviousStatuses: ["InProgress"],
        terminal,
        compatibleConcurrentStatuses: [terminal.status, "ReconciliationRequired"],
      });
      if (established.type !== "Established" && established.type !== "CompatibleConcurrentTruth") throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
      if (!restored) throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
      throw new ProductMediaWorkflowError(saved.type === "MediaRevisionConflict" ? "MediaRevisionConflict" : "ProductMediaStorageFailed");
    }
    if (outcome.type === "Succeeded") {
      await executePendingProductMediaMetadata({
        dependencies: this.dependencies,
        workflow,
        mediaState: state,
        actor: command.actorContext,
        effectiveTime: command.effectiveTime,
        workflowVersion: workflow.version,
        mediaRevision: state.revision,
      });
    }
    return copyWorkflow(workflow);
  }

  private staged(operation: ProductMediaOperationState, root: Parameters<typeof ProductMediaStagingKey.create>[0]): StagedProductMediaObject {
    return { key: ProductMediaStagingKey.create(root, operation.operationId), sha256: operation.stagedSha256!, byteLength: operation.stagedByteLength!, mediaType: "image/webp", width: operation.stagedWidth!, height: operation.stagedHeight! };
  }
  private async safeCompensate(compensation: Compensation): Promise<boolean> { try { return await compensation(); } catch { return false; } }

  private async persistSourceUnavailable(workflow: ProductMediaWorkflowState, operation: ProductMediaOperationState): Promise<ProductMediaOperationState["status"]> {
    const established = await establishTerminalAfterExternalEffect(this.dependencies, {
      workflow,
      operationId: operation.operationId,
      initialExpectedVersion: workflow.version,
      allowedPreviousStatuses: ["Failed", "Staged"],
      terminal: { status: "SourceUnavailable", retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaSourceUnavailable" },
      compatibleConcurrentStatuses: ["SourceUnavailable", "Cancelled", "ReconciliationRequired"],
    });
    if (established.type === "NotFound") throw new ProductMediaWorkflowError("ProductMediaOperationNotFound");
    if (established.type === "ReconciliationRequired") throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
    return established.operation.status;
  }

  private async persistReconciliationRequired(workflow: ProductMediaWorkflowState, operation: ProductMediaOperationState): Promise<void> {
    const established = await establishTerminalAfterExternalEffect(this.dependencies, {
      workflow,
      operationId: operation.operationId,
      initialExpectedVersion: workflow.version,
      allowedPreviousStatuses: ["Failed", "Staged"],
      terminal: { status: "ReconciliationRequired", retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired" },
      compatibleConcurrentStatuses: ["ReconciliationRequired"],
    });
    if (established.type === "NotFound") throw new ProductMediaWorkflowError("ProductMediaOperationNotFound");
    if (established.type === "ReconciliationRequired") throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
  }
}

export class CancelProductMediaOperationUseCase {
  constructor(private readonly dependencies: WorkflowDependencies) {}
  async execute(command: RetryProductMediaOperationCommand): Promise<ProductMediaWorkflowState> {
    const operationId = canonicalOperationId(command.operationId);
    const workflow = await this.dependencies.workflows.findById(command.actorContext.workspaceId, command.workflowId);
    if (!workflow) throw new ProductMediaWorkflowError("ProductMediaWorkflowNotFound");
    await assertActor(this.dependencies, command.actorContext, workflow.productId);
    const operation = workflow.operations.find((candidate) => candidate.operationId === operationId);
    if (!operation) throw new ProductMediaWorkflowError("ProductMediaOperationNotFound");
    if (operation.status === "InProgress") throw new ProductMediaWorkflowError("ProductMediaOperationAlreadyInProgress");
    if (operation.status === "Completed" || operation.status === "Cancelled") return copyWorkflow(workflow);
    if (operation.status === "ReconciliationRequired") throw new ProductMediaWorkflowError("ProductMediaRetryNotAllowed");
    if (operation.stagedArtifactKey) {
      const root = await this.dependencies.roots.findByProduct(command.actorContext.workspaceId, workflow.productId);
      if (!root) throw new ProductMediaWorkflowError("ProductMediaStorageFailed");
      let discarded;
      try { discarded = await this.dependencies.storage.discardTemporary({ stagingKey: ProductMediaStagingKey.create(root.storageRootKey, operation.operationId) }); }
      catch { discarded = { type: "Failed" as const, code: "UnsafeKey" as const }; }
      if (discarded.type === "Failed" && discarded.code !== "TemporaryObjectMissing") {
        await establishTerminalAfterExternalEffect(this.dependencies, {
          workflow,
          operationId: operation.operationId,
          initialExpectedVersion: workflow.version,
          allowedPreviousStatuses: [operation.status],
          terminal: { status: "ReconciliationRequired", retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired" },
          compatibleConcurrentStatuses: ["ReconciliationRequired"],
        });
        throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
      }
    }
    const previousStatus = operation.status;
    const established = await establishTerminalAfterExternalEffect(this.dependencies, {
      workflow,
      operationId: operation.operationId,
      initialExpectedVersion: workflow.version,
      allowedPreviousStatuses: [previousStatus],
      terminal: { status: "Cancelled", retryAllowed: false, requiresNewSource: false, completedAt: new Date(command.effectiveTime) },
      compatibleConcurrentStatuses: ["Cancelled", "SourceUnavailable", "ReconciliationRequired"],
    });
    if (established.type === "NotFound") throw new ProductMediaWorkflowError("ProductMediaOperationNotFound");
    if (established.type === "ReconciliationRequired") throw new ProductMediaWorkflowError("ProductMediaReconciliationRequired");
    return copyWorkflow(established.workflow);
  }
}

interface CleanupExpiredMediaStagingIdentity {
  readonly workspaceId: string;
  readonly workflowId: string;
  readonly operationId: string;
}

export type CleanupExpiredMediaStagingOutcome =
  | (CleanupExpiredMediaStagingIdentity & {
      readonly type: "SourceUnavailableEstablished";
      readonly reasonCode: "ExpiredStagingDiscarded" | "ExpiredStagingAlreadyAbsent";
      readonly statusCode: "SourceUnavailable";
    })
  | (CleanupExpiredMediaStagingIdentity & {
      readonly type: "CompatibleConcurrentTruth";
      readonly reasonCode: "ConcurrentTerminalTruth";
      readonly statusCode: Extract<ProductMediaOperationState["status"], "Cancelled" | "SourceUnavailable" | "ReconciliationRequired">;
    })
  | (CleanupExpiredMediaStagingIdentity & {
      readonly type: "ReconciliationRequired";
      readonly reasonCode: "ImmutableRootMissing" | "StagingDiscardAmbiguous" | "TerminalTransitionUnresolved" | "OperationNotFound";
      readonly statusCode: "ReconciliationRequired" | "TransitionUnresolved";
    })
  | (CleanupExpiredMediaStagingIdentity & {
      readonly type: "Skipped";
      readonly reasonCode: "NotExpired" | "StatusNotEligible" | "ReconciliationExcluded";
      readonly statusCode: ProductMediaOperationState["status"];
    });

export interface CleanupExpiredMediaStagingResult {
  readonly scannedCount: number;
  readonly cleanedCount: number;
  readonly reconciliationRequiredCount: number;
  readonly skippedCount: number;
  readonly outcomes: readonly CleanupExpiredMediaStagingOutcome[];
}

export class CleanupExpiredMediaStagingUseCase {
  constructor(private readonly dependencies: Pick<WorkflowDependencies, "workflows" | "roots" | "storage">) {}
  async execute(workspaceId: TrustedActorContext["workspaceId"], now: Date): Promise<CleanupExpiredMediaStagingResult> {
    let cleanedCount = 0;
    let reconciliationRequiredCount = 0;
    let skippedCount = 0;
    const outcomes: CleanupExpiredMediaStagingOutcome[] = [];
    const identity = (workflowId: string, operationId: string): CleanupExpiredMediaStagingIdentity => ({ workspaceId: workspaceId.value, workflowId, operationId });
    const workflows = [...await this.dependencies.workflows.listExpired(workspaceId, now)]
      .filter((workflow) => workflow.workspaceId.value === workspaceId.value)
      .sort((left, right) => left.workflowId.localeCompare(right.workflowId));
    for (const listedWorkflow of workflows) {
      let workflow = listedWorkflow;
      let root: Awaited<ReturnType<ProductMediaRootRepository["findByProduct"]>> | undefined;
      let rootLoaded = false;
      const operations = [...listedWorkflow.operations].sort((left, right) => left.operationId.localeCompare(right.operationId));
      for (const listedOperation of operations) {
        const operation = workflow.operations.find((candidate) => candidate.operationId === listedOperation.operationId) ?? listedOperation;
        const operationIdentity = identity(workflow.workflowId, operation.operationId);
        if (operation.status === "ReconciliationRequired") {
          outcomes.push({ ...operationIdentity, type: "Skipped", reasonCode: "ReconciliationExcluded", statusCode: operation.status });
          skippedCount += 1;
          continue;
        }
        if (!operation.expiresAt || operation.expiresAt.getTime() > now.getTime()) {
          outcomes.push({ ...operationIdentity, type: "Skipped", reasonCode: "NotExpired", statusCode: operation.status });
          skippedCount += 1;
          continue;
        }
        if (operation.status !== "Staged" && !(operation.status === "Failed" && operation.retryAllowed)) {
          outcomes.push({ ...operationIdentity, type: "Skipped", reasonCode: "StatusNotEligible", statusCode: operation.status });
          skippedCount += 1;
          continue;
        }
        const previousStatus = operation.status;
        if (!rootLoaded) {
          rootLoaded = true;
          try { root = await this.dependencies.roots.findByProduct(workspaceId, workflow.productId) ?? undefined; }
          catch { root = undefined; }
        }
        if (!root) {
          const established = await establishTerminalAfterExternalEffect(this.dependencies, {
            workflow,
            operationId: operation.operationId,
            initialExpectedVersion: workflow.version,
            allowedPreviousStatuses: [previousStatus],
            terminal: { status: "ReconciliationRequired", retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired" },
            compatibleConcurrentStatuses: ["ReconciliationRequired"],
          });
          workflow = established.workflow;
          const resolved = established.type === "Established" || established.type === "CompatibleConcurrentTruth";
          outcomes.push({ ...operationIdentity, type: "ReconciliationRequired", reasonCode: "ImmutableRootMissing", statusCode: resolved ? "ReconciliationRequired" : "TransitionUnresolved" });
          reconciliationRequiredCount += 1;
          continue;
        }
        let discarded;
        try { discarded = await this.dependencies.storage.discardTemporary({ stagingKey: ProductMediaStagingKey.create(root.storageRootKey, operation.operationId) }); }
        catch { discarded = { type: "Failed" as const, code: "UnsafeKey" as const }; }
        const knownAbsent = discarded.type === "Discarded" || discarded.code === "TemporaryObjectMissing";
        const established = await establishTerminalAfterExternalEffect(this.dependencies, {
          workflow,
          operationId: operation.operationId,
          initialExpectedVersion: workflow.version,
          allowedPreviousStatuses: [previousStatus],
          terminal: knownAbsent
            ? { status: "SourceUnavailable", retryAllowed: false, requiresNewSource: true, errorCode: "ProductMediaSourceUnavailable" }
            : { status: "ReconciliationRequired", retryAllowed: false, requiresNewSource: false, errorCode: "ProductMediaReconciliationRequired" },
          compatibleConcurrentStatuses: knownAbsent
            ? ["Cancelled", "SourceUnavailable", "ReconciliationRequired"]
            : ["ReconciliationRequired"],
        });
        workflow = established.workflow;
        if (established.type === "Established" || established.type === "CompatibleConcurrentTruth") {
          if (established.type === "Established" && established.operation.status === "SourceUnavailable") {
            outcomes.push({
              ...operationIdentity,
              type: "SourceUnavailableEstablished",
              reasonCode: discarded.type === "Discarded" ? "ExpiredStagingDiscarded" : "ExpiredStagingAlreadyAbsent",
              statusCode: "SourceUnavailable",
            });
            cleanedCount += 1;
          } else if (established.type === "CompatibleConcurrentTruth") {
            outcomes.push({ ...operationIdentity, type: "CompatibleConcurrentTruth", reasonCode: "ConcurrentTerminalTruth", statusCode: established.operation.status as "Cancelled" | "SourceUnavailable" | "ReconciliationRequired" });
            if (established.operation.status === "SourceUnavailable") cleanedCount += 1;
          } else {
            outcomes.push({ ...operationIdentity, type: "ReconciliationRequired", reasonCode: "StagingDiscardAmbiguous", statusCode: "ReconciliationRequired" });
            reconciliationRequiredCount += 1;
          }
        } else {
          outcomes.push({ ...operationIdentity, type: "ReconciliationRequired", reasonCode: established.type === "NotFound" ? "OperationNotFound" : "TerminalTransitionUnresolved", statusCode: "TransitionUnresolved" });
          reconciliationRequiredCount += 1;
        }
      }
    }
    return {
      scannedCount: outcomes.length,
      cleanedCount,
      reconciliationRequiredCount,
      skippedCount,
      outcomes,
    };
  }
}
