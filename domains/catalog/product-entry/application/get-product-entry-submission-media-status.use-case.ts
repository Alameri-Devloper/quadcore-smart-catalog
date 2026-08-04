import type { ProductEntryMediaOperation } from "../domain/product-entry-media-plan";
import { ProductEntrySubmissionId, type ProductEntrySubmission } from "../domain/product-entry-submission";
import {
  ProductEntryMediaWorkflowCoordinationError,
  type ProductEntryMediaWorkflowCoordinator,
  type ProductEntryMediaWorkflowView,
} from "../ports/product-entry-media-workflow-coordinator.port";
import { commitProductEntryTransaction, type ProductEntryUnitOfWork } from "../ports/product-entry-unit-of-work.port";
import { PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext } from "./product-entry-execution-context";
import { ProductEntryMediaIdempotencyKeyService } from "./product-entry-media-idempotency-key";
import { ProductEntryMediaSourceRequirementsResolver } from "./product-entry-media-source-requirements";

export interface ProductEntrySubmissionMediaStatusView {
  readonly submissionId: string;
  readonly submissionStatus: string;
  readonly productId: string | null;
  readonly mediaWorkflowId: string | null;
  readonly mediaIdempotencyKey: string | null;
  readonly workflow: ProductEntryMediaWorkflowView | null;
  readonly plannedOperationIds: readonly string[];
  readonly requiredSourceOperationIds: readonly string[];
  readonly retryableOperationIds: readonly string[];
  readonly requiresNewSourceOperationIds: readonly string[];
}

export type GetProductEntrySubmissionMediaStatusResult =
  | { readonly type: "Found"; readonly status: ProductEntrySubmissionMediaStatusView }
  | { readonly type: "NotFound"; readonly submissionId: string }
  | { readonly type: "Forbidden"; readonly permission: string }
  | { readonly type: "Conflict"; readonly code: "WorkflowConflict" }
  | { readonly type: "InvalidRequest" };

type ProductEntryMediaStatusSnapshot =
  | { readonly type: "NotFound" }
  | {
      readonly type: "Found";
      readonly submission: ProductEntrySubmission;
      readonly plan: readonly ProductEntryMediaOperation[];
    };

export class GetProductEntrySubmissionMediaStatusUseCase {
  constructor(
    private readonly unitOfWork: ProductEntryUnitOfWork,
    private readonly workflowCoordinator: ProductEntryMediaWorkflowCoordinator,
    private readonly idempotencyKeys: ProductEntryMediaIdempotencyKeyService,
    private readonly sourceRequirements = new ProductEntryMediaSourceRequirementsResolver(),
  ) {}

  async execute(
    context: ProductEntryExecutionContext,
    submissionIdValue: string,
  ): Promise<GetProductEntrySubmissionMediaStatusResult> {
    if (!context.permissions.has(PRODUCT_ENTRY_PERMISSIONS.read)) {
      return { type: "Forbidden", permission: PRODUCT_ENTRY_PERMISSIONS.read };
    }
    let submissionId: ProductEntrySubmissionId;
    try { submissionId = ProductEntrySubmissionId.create(submissionIdValue); }
    catch { return { type: "InvalidRequest" }; }
    const snapshot = await this.unitOfWork.execute<ProductEntryMediaStatusSnapshot>(async (transaction) => {
      const submission = await transaction.submissionRepository.findById(context.workspaceId, submissionId);
      if (!submission) return commitProductEntryTransaction({ type: "NotFound" as const });
      const plan = await transaction.mediaPlanRepository.findBySubmission(context.workspaceId, submissionId);
      return commitProductEntryTransaction({ type: "Found" as const, submission, plan });
    });
    if (snapshot.type === "NotFound") return { type: "NotFound", submissionId: submissionId.value };
    const idempotencyKey = snapshot.submission.productId === null ? null : this.idempotencyKeys.calculate({
      workspaceId: context.workspaceId.value,
      submissionId: submissionId.value,
      productId: snapshot.submission.productId.value,
      requestFingerprint: snapshot.submission.requestFingerprint.value,
    });
    let workflow: ProductEntryMediaWorkflowView | null = null;
    if (idempotencyKey) {
      try {
        workflow = await this.workflowCoordinator.resolveExisting(
          context,
          snapshot.submission.mediaWorkflowId ?? undefined,
          idempotencyKey,
        );
      } catch (error) {
        if (error instanceof ProductEntryMediaWorkflowCoordinationError) {
          return { type: "Conflict", code: "WorkflowConflict" };
        }
        throw error;
      }
    }
    if (workflow && workflow.productId !== snapshot.submission.productId?.value) {
      return { type: "Conflict", code: "WorkflowConflict" };
    }
    const requirements = this.sourceRequirements.resolve(snapshot.plan, workflow);
    if (requirements.type === "WorkflowMismatch") return { type: "Conflict", code: "WorkflowConflict" };
    return {
      type: "Found",
      status: {
        submissionId: submissionId.value,
        submissionStatus: snapshot.submission.status,
        productId: snapshot.submission.productId?.value ?? null,
        mediaWorkflowId: workflow?.workflowId ?? snapshot.submission.mediaWorkflowId,
        mediaIdempotencyKey: idempotencyKey,
        workflow,
        plannedOperationIds: snapshot.plan.map((operation) => operation.operationId),
        requiredSourceOperationIds: requirements.requiredSourceOperationIds,
        retryableOperationIds: workflow?.operations.filter((operation) => operation.retryAllowed).map((operation) => operation.operationId) ?? [],
        requiresNewSourceOperationIds: workflow?.operations.filter((operation) => operation.requiresNewSource).map((operation) => operation.operationId) ?? [],
      },
    };
  }
}
