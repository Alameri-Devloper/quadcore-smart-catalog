import type {
  WorkflowStep,
  WorkflowStepRuntime,
  WorkflowValidationResult,
} from "./workflow.types";

export const validWorkflowStep = (): WorkflowValidationResult => ({
  valid: true,
  issues: [],
});

export const invalidWorkflowStep = (
  issues: WorkflowValidationResult["issues"],
): WorkflowValidationResult => ({
  valid: false,
  issues,
});

export async function validateWorkflowStep<TContext, TValues>(
  step: WorkflowStep<TContext, TValues>,
  runtime: WorkflowStepRuntime<TContext, TValues>,
): Promise<WorkflowValidationResult> {
  if (step.optional && step.isEmpty?.(runtime)) {
    return validWorkflowStep();
  }

  if (!step.validator) {
    return validWorkflowStep();
  }

  return step.validator(runtime);
}
