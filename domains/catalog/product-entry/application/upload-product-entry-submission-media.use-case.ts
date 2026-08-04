import type { ProductEntryMediaOperation } from "../domain/product-entry-media-plan";
import { PRODUCT_ENTRY_SUBMISSION_STATUSES, ProductEntrySubmissionId, type ProductEntrySubmission } from "../domain/product-entry-submission";
import type { ProductEntryClock } from "../ports/product-entry-clock.port";
import {
  PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES,
  type ProductEntryMediaSourceErrorCode,
  type ProductEntryMediaSourceVerifier,
  type VerifiedProductEntryMediaSource,
} from "../ports/product-entry-media-source-verifier.port";
import {
  ProductEntryMediaWorkflowCoordinationError,
  type ProductEntryCoordinatedMediaOperation,
  type ProductEntryMediaWorkflowCoordinator,
  type ProductEntryMediaWorkflowView,
} from "../ports/product-entry-media-workflow-coordinator.port";
import { commitProductEntryTransaction, type ProductEntryUnitOfWork } from "../ports/product-entry-unit-of-work.port";
import { PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext } from "./product-entry-execution-context";
import { ProductEntryMediaIdempotencyKeyService } from "./product-entry-media-idempotency-key";
import { mapProductEntryMediaSources, type ProductEntryMediaUploadPart } from "./product-entry-media-source-mapping";
import { ProductEntryMediaSourceRequirementsResolver } from "./product-entry-media-source-requirements";

export const PRODUCT_ENTRY_MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED_CODE =
  "MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED" as const;

export type UploadProductEntrySubmissionMediaResult =
  | {
      readonly type: "Completed" | "Accepted";
      readonly submissionId: string;
      readonly submissionStatus: "Completed" | "PartiallyCompleted";
      readonly idempotencyKey: string;
      readonly idempotentReplay: boolean;
      readonly resumed: boolean;
      readonly workflow: ProductEntryMediaWorkflowView;
    }
  | { readonly type: "NotFound"; readonly submissionId: string }
  | { readonly type: "Forbidden"; readonly permission: string }
  | { readonly type: "InvalidRequest"; readonly code: ProductEntryMediaSourceErrorCode; readonly operationId: string | null }
  | { readonly type: "PlanMismatch"; readonly code: "MEDIA_PLAN_INVALID" }
  | {
      readonly type: "NewSourceFlowNotImplemented";
      readonly code: typeof PRODUCT_ENTRY_MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED_CODE;
      readonly operationIds: readonly string[];
    }
  | { readonly type: "Conflict"; readonly code: string };

interface UploadProductEntrySubmissionMediaDependencies {
  readonly unitOfWork: ProductEntryUnitOfWork;
  readonly sourceVerifier: ProductEntryMediaSourceVerifier;
  readonly idempotencyKeys: ProductEntryMediaIdempotencyKeyService;
  readonly workflowCoordinator: ProductEntryMediaWorkflowCoordinator;
  readonly clock: ProductEntryClock;
  readonly sourceRequirements?: ProductEntryMediaSourceRequirementsResolver;
}

type ProductEntryMediaSubmissionSnapshot =
  | { readonly type: "NotFound" }
  | {
      readonly type: "Found";
      readonly submission: ProductEntrySubmission;
      readonly plan: readonly ProductEntryMediaOperation[];
    };

const validPlan = (plan: readonly ProductEntryMediaOperation[]): boolean => {
  if (plan.length === 0) return false;
  const ids = new Set<string>();
  return [...plan].sort((left, right) => left.sequence - right.sequence).every((operation, index) => {
    if (operation.sequence !== index || ids.has(operation.operationId)) return false;
    ids.add(operation.operationId);
    return true;
  });
};

const coordinatedOperations = (
  plan: readonly ProductEntryMediaOperation[],
  verifiedSources: ReadonlyMap<string, VerifiedProductEntryMediaSource>,
): readonly ProductEntryCoordinatedMediaOperation[] => [...plan]
  .sort((left, right) => left.sequence - right.sequence)
  .map((operation): ProductEntryCoordinatedMediaOperation => {
    const requestedDisplayOrder = operation.finalOrder ?? operation.requestedDisplayOrder ?? undefined;
    if (operation.operationType === "Add") {
      const source = verifiedSources.get(operation.operationId);
      return {
        operationId: operation.operationId,
        type: "Add",
        ...(source ? { source: { bytes: source.bytes } } : {}),
        sourceSha256: operation.expectedSourceSha256!,
        requestedDisplayOrder,
        selectAsCover: operation.selectedAsCover,
      };
    }
    if (operation.operationType === "Replace") {
      const source = verifiedSources.get(operation.operationId);
      return {
        operationId: operation.operationId,
        type: "Replace",
        targetMediaId: operation.mediaId!,
        ...(source ? { source: { bytes: source.bytes } } : {}),
        sourceSha256: operation.expectedSourceSha256!,
        requestedDisplayOrder,
        selectAsCover: operation.selectedAsCover,
      };
    }
    return { operationId: operation.operationId, type: "Remove", targetMediaId: operation.mediaId! };
  });

export class UploadProductEntrySubmissionMediaUseCase {
  constructor(private readonly dependencies: UploadProductEntrySubmissionMediaDependencies) {}

  async execute(
    context: ProductEntryExecutionContext,
    submissionIdValue: string,
    parts: readonly ProductEntryMediaUploadPart[],
  ): Promise<UploadProductEntrySubmissionMediaResult> {
    if (!context.permissions.has(PRODUCT_ENTRY_PERMISSIONS.mediaUpload)) {
      return { type: "Forbidden", permission: PRODUCT_ENTRY_PERMISSIONS.mediaUpload };
    }
    let submissionId: ProductEntrySubmissionId;
    try {
      submissionId = ProductEntrySubmissionId.create(submissionIdValue);
    } catch {
      return { type: "InvalidRequest", code: PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.unexpected, operationId: null };
    }
    const snapshot = await this.dependencies.unitOfWork.execute<ProductEntryMediaSubmissionSnapshot>(async (transaction) => {
      const submission = await transaction.submissionRepository.findById(context.workspaceId, submissionId);
      if (!submission) return commitProductEntryTransaction({ type: "NotFound" as const });
      const plan = await transaction.mediaPlanRepository.findBySubmission(context.workspaceId, submissionId);
      return commitProductEntryTransaction({ type: "Found" as const, submission, plan });
    });
    if (snapshot.type === "NotFound") return { type: "NotFound", submissionId: submissionId.value };
    if (
      snapshot.submission.status === PRODUCT_ENTRY_SUBMISSION_STATUSES.claimed
      || snapshot.submission.productId === null
      || snapshot.submission.productRevision === null
    ) {
      return { type: "Conflict", code: "PHASE_ONE_NOT_SAVED" };
    }
    if (!validPlan(snapshot.plan)) return { type: "PlanMismatch", code: "MEDIA_PLAN_INVALID" };

    const productId = snapshot.submission.productId.value;
    const idempotencyKey = this.dependencies.idempotencyKeys.calculate({
      workspaceId: context.workspaceId.value,
      submissionId: submissionId.value,
      productId,
      requestFingerprint: snapshot.submission.requestFingerprint.value,
    });
    let existingWorkflow: ProductEntryMediaWorkflowView | null;
    try {
      existingWorkflow = await this.dependencies.workflowCoordinator.resolveExisting(
        context,
        snapshot.submission.mediaWorkflowId ?? undefined,
        idempotencyKey,
      );
    } catch (error) {
      if (!(error instanceof ProductEntryMediaWorkflowCoordinationError)) throw error;
      if (error.code === "AuthorizationDenied") {
        return { type: "Forbidden", permission: PRODUCT_ENTRY_PERMISSIONS.mediaUpload };
      }
      return { type: "Conflict", code: error.code };
    }
    if (existingWorkflow && existingWorkflow.productId !== productId) {
      return { type: "Conflict", code: "WorkflowConflict" };
    }
    const sourceRequirements = (this.dependencies.sourceRequirements
      ?? new ProductEntryMediaSourceRequirementsResolver()).resolve(snapshot.plan, existingWorkflow);
    if (sourceRequirements.type === "WorkflowMismatch") {
      return { type: "Conflict", code: "WorkflowConflict" };
    }

    const mapped = mapProductEntryMediaSources(
      snapshot.plan,
      parts,
      sourceRequirements.requiredSourceOperationIds,
    );
    if (mapped.type === "Rejected") return { type: "InvalidRequest", code: mapped.code, operationId: mapped.operationId };
    const verified = new Map<string, VerifiedProductEntryMediaSource>();
    for (const source of mapped.sources) {
      const expectedSha256 = source.operation.expectedSourceSha256;
      const expectedByteLength = source.operation.expectedSourceByteLength;
      if (expectedSha256 === null || expectedByteLength === null) {
        return { type: "PlanMismatch", code: "MEDIA_PLAN_INVALID" };
      }
      const result = await this.dependencies.sourceVerifier.verify({
        operationId: source.operation.operationId,
        bytes: source.bytes,
        clientMediaType: source.clientMediaType,
        expectedSha256,
        expectedByteLength,
      });
      if (result.type === "Rejected") {
        return { type: "InvalidRequest", code: result.code, operationId: result.operationId };
      }
      verified.set(result.source.operationId, result.source);
    }

    if (sourceRequirements.newSourceRequiredOperationIds.length > 0) {
      return {
        type: "NewSourceFlowNotImplemented",
        code: PRODUCT_ENTRY_MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED_CODE,
        operationIds: sourceRequirements.newSourceRequiredOperationIds,
      };
    }
    let coordinated;
    if (existingWorkflow?.status === "Completed") {
      coordinated = {
        workflow: existingWorkflow,
        idempotentReplay: true,
        resumed: false,
      };
    } else {
      try {
        coordinated = await this.dependencies.workflowCoordinator.coordinate({
          context,
          productId,
          idempotencyKey,
          linkedWorkflowId: snapshot.submission.mediaWorkflowId ?? undefined,
          operations: coordinatedOperations(snapshot.plan, verified),
          effectiveTime: this.dependencies.clock.now(),
        });
      } catch (error) {
        if (!(error instanceof ProductEntryMediaWorkflowCoordinationError)) throw error;
        if (error.code === "AuthorizationDenied") {
          return { type: "Forbidden", permission: PRODUCT_ENTRY_PERMISSIONS.mediaUpload };
        }
        if (error.code === "ProductNotFound") return { type: "Conflict", code: "SUBMISSION_PRODUCT_NOT_FOUND" };
        return { type: "Conflict", code: error.code };
      }
    }

    const submissionStatus = coordinated.workflow.status === "Completed" ? "Completed" : "PartiallyCompleted";
    const linked = await this.dependencies.unitOfWork.execute(async (transaction) => commitProductEntryTransaction(
      await transaction.submissionRepository.markMediaOutcome({
        workspaceId: context.workspaceId,
        submissionId,
        mediaWorkflowId: coordinated.workflow.workflowId,
        status: submissionStatus,
        updatedAt: this.dependencies.clock.now(),
      }),
    ));
    if (linked.type === "Conflict") return { type: "Conflict", code: "SUBMISSION_MEDIA_LINK_CONFLICT" };
    return {
      type: coordinated.workflow.status === "Completed" ? "Completed" : "Accepted",
      submissionId: submissionId.value,
      submissionStatus,
      idempotencyKey,
      idempotentReplay: coordinated.idempotentReplay,
      resumed: coordinated.resumed,
      workflow: coordinated.workflow,
    };
  }
}
