export type WorkflowStepId = string;

export type WorkflowEventType =
  | "step-entered"
  | "step-completed"
  | "step-changed"
  | "workflow-completed";

export interface WorkflowValidationIssue {
  code: string;
  message: string;
  field?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  issues: WorkflowValidationIssue[];
}

export interface WorkflowStepRuntime<TContext, TValues> {
  context: TContext;
  values: Readonly<TValues>;
  stepId: WorkflowStepId;
}

export type WorkflowStepPredicate<TContext, TValues> = (
  runtime: WorkflowStepRuntime<TContext, TValues>,
) => boolean;

export type WorkflowStepValidator<TContext, TValues> = (
  runtime: WorkflowStepRuntime<TContext, TValues>,
) => WorkflowValidationResult | Promise<WorkflowValidationResult>;

export interface WorkflowStep<TContext, TValues> {
  id: WorkflowStepId;
  label: string;
  optional?: boolean;
  isEmpty?: WorkflowStepPredicate<TContext, TValues>;
  isVisible?: WorkflowStepPredicate<TContext, TValues>;
  isDisabled?: WorkflowStepPredicate<TContext, TValues>;
  validator?: WorkflowStepValidator<TContext, TValues>;
}

export interface WorkflowStepState {
  id: WorkflowStepId;
  visible: boolean;
  disabled: boolean;
  optional: boolean;
  completed: boolean;
  validation: WorkflowValidationResult | null;
}

export interface WorkflowState<TContext, TValues> {
  workflowId: string;
  context: TContext;
  values: TValues;
  currentStepId: WorkflowStepId | null;
  steps: WorkflowStepState[];
  completedStepIds: WorkflowStepId[];
  isCompleted: boolean;
  progress: number;
}

export interface WorkflowEvent<TContext, TValues> {
  type: WorkflowEventType;
  workflowId: string;
  stepId: WorkflowStepId | null;
  previousStepId: WorkflowStepId | null;
  state: Readonly<WorkflowState<TContext, TValues>>;
}

export type WorkflowEventListener<TContext, TValues> = (
  event: WorkflowEvent<TContext, TValues>,
) => void;

export type WorkflowValueReconciler<TContext, TValues> = (input: {
  previousValues: Readonly<TValues>;
  nextValues: TValues;
  context: TContext;
  activeStepIds: WorkflowStepId[];
}) => TValues;

export interface WorkflowDefinition<TContext, TValues> {
  id: string;
  steps: WorkflowStep<TContext, TValues>[];
  reconcileValues?: WorkflowValueReconciler<TContext, TValues>;
}

export interface WorkflowTransitionResult<TContext, TValues> {
  moved: boolean;
  state: Readonly<WorkflowState<TContext, TValues>>;
  validation: WorkflowValidationResult | null;
}
