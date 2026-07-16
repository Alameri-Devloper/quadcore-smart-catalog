import type {
  WorkflowDefinition,
  WorkflowState,
  WorkflowStep,
  WorkflowStepId,
  WorkflowStepRuntime,
  WorkflowStepState,
  WorkflowValidationResult,
} from "./workflow.types";

function evaluateStep<TContext, TValues>(
  step: WorkflowStep<TContext, TValues>,
  runtime: WorkflowStepRuntime<TContext, TValues>,
  previous?: WorkflowStepState,
): WorkflowStepState {
  const visible = step.isVisible?.(runtime) ?? true;

  return {
    id: step.id,
    visible,
    disabled: visible && (step.isDisabled?.(runtime) ?? false),
    optional: step.optional ?? false,
    completed: visible ? (previous?.completed ?? false) : false,
    validation: visible ? (previous?.validation ?? null) : null,
  };
}

export function getNavigableSteps(
  steps: WorkflowStepState[],
): WorkflowStepState[] {
  return steps.filter((step) => step.visible && !step.disabled);
}

export function calculateWorkflowProgress(
  steps: WorkflowStepState[],
): number {
  const navigableSteps = getNavigableSteps(steps);

  if (navigableSteps.length === 0) {
    return 0;
  }

  const completedCount = navigableSteps.filter((step) => step.completed).length;
  return Math.round((completedCount / navigableSteps.length) * 100);
}

export function createWorkflowState<TContext, TValues>(
  definition: WorkflowDefinition<TContext, TValues>,
  context: TContext,
  values: TValues,
): WorkflowState<TContext, TValues> {
  const steps = definition.steps.map((step) =>
    evaluateStep(step, { context, values, stepId: step.id }),
  );
  const currentStepId = getNavigableSteps(steps)[0]?.id ?? null;

  return {
    workflowId: definition.id,
    context,
    values,
    currentStepId,
    steps,
    completedStepIds: [],
    isCompleted: false,
    progress: 0,
  };
}

export function recalculateWorkflowState<TContext, TValues>(
  definition: WorkflowDefinition<TContext, TValues>,
  state: WorkflowState<TContext, TValues>,
  context: TContext,
  values: TValues,
): WorkflowState<TContext, TValues> {
  const previousById = new Map(state.steps.map((step) => [step.id, step]));
  const steps = definition.steps.map((step) =>
    evaluateStep(
      step,
      { context, values, stepId: step.id },
      previousById.get(step.id),
    ),
  );
  const navigableSteps = getNavigableSteps(steps);
  const currentStillAvailable = navigableSteps.some(
    (step) => step.id === state.currentStepId,
  );
  const currentStepId = currentStillAvailable
    ? state.currentStepId
    : (navigableSteps.find((step) => !step.completed)?.id ??
      navigableSteps.at(-1)?.id ??
      null);
  const completedStepIds = navigableSteps
    .filter((step) => step.completed)
    .map((step) => step.id);

  return {
    ...state,
    context,
    values,
    currentStepId,
    steps,
    completedStepIds,
    isCompleted:
      navigableSteps.length > 0 && navigableSteps.every((step) => step.completed),
    progress: calculateWorkflowProgress(steps),
  };
}

export function updateStepValidation<TContext, TValues>(
  state: WorkflowState<TContext, TValues>,
  stepId: WorkflowStepId,
  validation: WorkflowValidationResult,
  completed: boolean,
): WorkflowState<TContext, TValues> {
  const steps = state.steps.map((step) =>
    step.id === stepId ? { ...step, validation, completed } : step,
  );

  return {
    ...state,
    steps,
    completedStepIds: getNavigableSteps(steps)
      .filter((step) => step.completed)
      .map((step) => step.id),
    progress: calculateWorkflowProgress(steps),
  };
}
