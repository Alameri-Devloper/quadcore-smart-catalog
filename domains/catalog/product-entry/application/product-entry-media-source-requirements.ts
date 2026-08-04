import type { ProductEntryMediaOperation } from "../domain/product-entry-media-plan";
import type { ProductEntryMediaWorkflowView } from "../ports/product-entry-media-workflow-coordinator.port";

export type ProductEntryMediaSourceRequirementState =
  | "NotRequired"
  | "RequiredFromPlan"
  | "RetainedSourceAvailable"
  | "NewSourceRequired"
  | "Completed";

export interface ProductEntryMediaSourceRequirement {
  readonly operationId: string;
  readonly state: ProductEntryMediaSourceRequirementState;
  readonly sourceRequired: boolean;
}

export type ResolveProductEntryMediaSourceRequirementsResult =
  | {
      readonly type: "Resolved";
      readonly requirements: readonly ProductEntryMediaSourceRequirement[];
      readonly requiredSourceOperationIds: readonly string[];
      readonly newSourceRequiredOperationIds: readonly string[];
    }
  | { readonly type: "WorkflowMismatch" };

const sourceOperation = (operation: ProductEntryMediaOperation): boolean =>
  operation.operationType === "Add" || operation.operationType === "Replace";

const stateFor = (
  operation: ProductEntryMediaOperation,
  workflowOperation: ProductEntryMediaWorkflowView["operations"][number] | undefined,
): ProductEntryMediaSourceRequirementState => {
  if (!workflowOperation) return sourceOperation(operation) ? "RequiredFromPlan" : "NotRequired";
  if (sourceOperation(operation) && workflowOperation.requiresNewSource) return "NewSourceRequired";
  if (workflowOperation.status === "Completed") return "Completed";
  if (!sourceOperation(operation)) return "NotRequired";
  if (
    workflowOperation.retryAllowed
    && (workflowOperation.status === "Staged" || workflowOperation.status === "Failed")
  ) return "RetainedSourceAvailable";
  if (workflowOperation.status === "Pending") return "RequiredFromPlan";
  return "NotRequired";
};

export class ProductEntryMediaSourceRequirementsResolver {
  resolve(
    plan: readonly ProductEntryMediaOperation[],
    workflow: ProductEntryMediaWorkflowView | null,
  ): ResolveProductEntryMediaSourceRequirementsResult {
    const workflowOperations = workflow
      ? new Map(workflow.operations.map((operation) => [operation.operationId, operation]))
      : null;
    if (workflowOperations && workflowOperations.size !== plan.length) return { type: "WorkflowMismatch" };

    const requirements: ProductEntryMediaSourceRequirement[] = [];
    for (const operation of [...plan].sort((left, right) => left.sequence - right.sequence)) {
      const durableOperation = workflowOperations?.get(operation.operationId);
      if (
        workflowOperations
        && (!durableOperation || durableOperation.type !== operation.operationType)
      ) return { type: "WorkflowMismatch" };
      const state = stateFor(operation, durableOperation);
      requirements.push(Object.freeze({
        operationId: operation.operationId,
        state,
        sourceRequired: state === "RequiredFromPlan" || state === "NewSourceRequired",
      }));
    }
    return Object.freeze({
      type: "Resolved",
      requirements: Object.freeze(requirements),
      requiredSourceOperationIds: Object.freeze(requirements
        .filter((requirement) => requirement.sourceRequired)
        .map((requirement) => requirement.operationId)),
      newSourceRequiredOperationIds: Object.freeze(requirements
        .filter((requirement) => requirement.state === "NewSourceRequired")
        .map((requirement) => requirement.operationId)),
    });
  }
}
