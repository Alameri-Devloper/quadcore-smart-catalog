import {
  createWorkflowState,
  getNavigableSteps,
  recalculateWorkflowState,
  updateStepValidation,
} from "./workflow.state";
import type {
  WorkflowDefinition,
  WorkflowEventListener,
  WorkflowState,
  WorkflowStepId,
  WorkflowTransitionResult,
} from "./workflow.types";
import { validateWorkflowStep } from "./workflow.validation";

export interface WorkflowEngineOptions {
  initialStepId?: WorkflowStepId;
}

export interface WorkflowSubscriptionOptions {
  emitCurrentStep?: boolean;
}

export class WorkflowEngine<TContext, TValues> {
  private state: WorkflowState<TContext, TValues>;
  private readonly listeners = new Set<WorkflowEventListener<TContext, TValues>>();

  constructor(
    private readonly definition: WorkflowDefinition<TContext, TValues>,
    context: TContext,
    values: TValues,
    options: WorkflowEngineOptions = {},
  ) {
    this.assertDefinition();
    this.state = createWorkflowState(definition, context, values);

    if (options.initialStepId) {
      this.state = {
        ...this.state,
        currentStepId: this.resolveInitialStep(options.initialStepId),
      };
    }

    if (this.state.currentStepId) {
      this.emit("step-entered", this.state.currentStepId, null);
    }
  }

  getState(): Readonly<WorkflowState<TContext, TValues>> {
    return this.state;
  }

  subscribe(
    listener: WorkflowEventListener<TContext, TValues>,
    options: WorkflowSubscriptionOptions = {},
  ): () => void {
    this.listeners.add(listener);

    if (options.emitCurrentStep && this.state.currentStepId) {
      listener({
        type: "step-entered",
        workflowId: this.definition.id,
        stepId: this.state.currentStepId,
        previousStepId: null,
        state: this.state,
      });
    }

    return () => this.listeners.delete(listener);
  }

  update(values: TValues, context: TContext = this.state.context): void {
    const previousStepId = this.state.currentStepId;
    const preview = recalculateWorkflowState(
      this.definition,
      this.state,
      context,
      values,
    );
    const activeStepIds = getNavigableSteps(preview.steps).map((step) => step.id);
    const reconciledValues = this.definition.reconcileValues
      ? this.definition.reconcileValues({
          previousValues: this.state.values,
          nextValues: values,
          context,
          activeStepIds,
        })
      : values;

    this.state = recalculateWorkflowState(
      this.definition,
      this.state,
      context,
      reconciledValues,
    );

    if (previousStepId !== this.state.currentStepId) {
      this.emit("step-changed", this.state.currentStepId, previousStepId);
      this.emit("step-entered", this.state.currentStepId, previousStepId);
    }

    this.emit("workflow-state-changed", this.state.currentStepId, previousStepId);
  }

  async next(): Promise<WorkflowTransitionResult<TContext, TValues>> {
    const currentStep = this.getCurrentDefinitionStep();

    if (!currentStep || !this.state.currentStepId) {
      return this.result(false, null);
    }

    const validation = await this.runStepValidation(currentStep.id);
    this.state = updateStepValidation(
      this.state,
      currentStep.id,
      validation,
      validation.valid,
    );

    if (!validation.valid) {
      this.emit("workflow-state-changed", currentStep.id, currentStep.id);
      return this.result(false, validation);
    }

    this.emit("step-completed", currentStep.id, currentStep.id);
    const steps = getNavigableSteps(this.state.steps);
    const currentIndex = steps.findIndex((step) => step.id === currentStep.id);
    const nextStep = steps[currentIndex + 1];

    if (!nextStep) {
      this.state = { ...this.state, isCompleted: true, progress: 100 };
      this.emit("workflow-completed", currentStep.id, currentStep.id);
      this.emit("workflow-state-changed", currentStep.id, currentStep.id);
      return this.result(true, validation);
    }

    this.moveTo(nextStep.id);
    return this.result(true, validation);
  }

  async validateCurrentStep(): Promise<
    WorkflowTransitionResult<TContext, TValues>
  > {
    const currentStep = this.getCurrentDefinitionStep();

    if (!currentStep) {
      return this.result(false, null);
    }

    const validation = await this.runStepValidation(currentStep.id);
    const wasCompleted =
      this.state.steps.find((step) => step.id === currentStep.id)?.completed ??
      false;
    this.state = updateStepValidation(
      this.state,
      currentStep.id,
      validation,
      wasCompleted && validation.valid,
    );

    if (!validation.valid) {
      this.state = { ...this.state, isCompleted: false };
    }

    this.emit(
      "workflow-state-changed",
      this.state.currentStepId,
      this.state.currentStepId,
    );

    return this.result(false, validation);
  }

  async revalidateCompletedSteps(): Promise<void> {
    const completedStepIds = getNavigableSteps(this.state.steps)
      .filter((step) => step.completed)
      .map((step) => step.id);

    for (const stepId of completedStepIds) {
      const validation = await this.runStepValidation(stepId);
      this.state = updateStepValidation(
        this.state,
        stepId,
        validation,
        validation.valid,
      );
    }

    if (
      getNavigableSteps(this.state.steps).some(
        (step) => step.completed === false,
      )
    ) {
      this.state = { ...this.state, isCompleted: false };
    }

    this.emit(
      "workflow-state-changed",
      this.state.currentStepId,
      this.state.currentStepId,
    );
  }

  async completeWorkflow(): Promise<
    WorkflowTransitionResult<TContext, TValues>
  > {
    const navigableStepIds = getNavigableSteps(this.state.steps).map(
      (step) => step.id,
    );
    let firstInvalidStepId: WorkflowStepId | null = null;
    let firstInvalidValidation: WorkflowTransitionResult<
      TContext,
      TValues
    >["validation"] = null;

    for (const stepId of navigableStepIds) {
      const validation = await this.runStepValidation(stepId);
      this.state = updateStepValidation(
        this.state,
        stepId,
        validation,
        validation.valid,
      );

      if (!validation.valid && !firstInvalidStepId) {
        firstInvalidStepId = stepId;
        firstInvalidValidation = validation;
      }
    }

    if (firstInvalidStepId) {
      this.moveTo(firstInvalidStepId);
      return this.result(false, firstInvalidValidation);
    }

    this.state = { ...this.state, isCompleted: true, progress: 100 };
    this.emit(
      "workflow-completed",
      this.state.currentStepId,
      this.state.currentStepId,
    );
    this.emit(
      "workflow-state-changed",
      this.state.currentStepId,
      this.state.currentStepId,
    );
    return this.result(true, null);
  }

  reset(
    context: TContext,
    values: TValues,
    initialStepId?: WorkflowStepId,
  ): void {
    this.state = createWorkflowState(this.definition, context, values);

    if (initialStepId) {
      this.state = {
        ...this.state,
        currentStepId: this.resolveInitialStep(initialStepId),
      };
    }

    if (this.state.currentStepId) {
      this.emit("step-entered", this.state.currentStepId, null);
    }

    this.emit("workflow-state-changed", this.state.currentStepId, null);
  }

  back(): WorkflowTransitionResult<TContext, TValues> {
    if (this.state.isCompleted) {
      return this.result(false, null);
    }

    const steps = getNavigableSteps(this.state.steps);
    const currentIndex = steps.findIndex(
      (step) => step.id === this.state.currentStepId,
    );
    const previousStep = steps[currentIndex - 1];

    if (!previousStep) {
      return this.result(false, null);
    }

    this.moveTo(previousStep.id);
    return this.result(true, null);
  }

  jumpTo(stepId: WorkflowStepId): WorkflowTransitionResult<TContext, TValues> {
    const target = getNavigableSteps(this.state.steps).find(
      (step) => step.id === stepId,
    );

    const needsAttention = target?.validation?.valid === false;

    if (!target || (!target.completed && !needsAttention)) {
      return this.result(false, null);
    }

    this.moveTo(stepId);
    return this.result(true, null);
  }

  private moveTo(stepId: WorkflowStepId): void {
    const previousStepId = this.state.currentStepId;
    this.state = { ...this.state, currentStepId: stepId, isCompleted: false };
    this.emit("step-changed", stepId, previousStepId);
    this.emit("step-entered", stepId, previousStepId);
    this.emit("workflow-state-changed", stepId, previousStepId);
  }

  private getCurrentDefinitionStep() {
    return this.definition.steps.find(
      (step) => step.id === this.state.currentStepId,
    );
  }

  private async runStepValidation(stepId: WorkflowStepId) {
    const step = this.definition.steps.find((candidate) => candidate.id === stepId);

    if (!step) {
      throw new Error(`Workflow step "${stepId}" is not defined.`);
    }

    return validateWorkflowStep(step, {
      context: this.state.context,
      values: this.state.values,
      stepId,
    });
  }

  private resolveInitialStep(stepId: WorkflowStepId): WorkflowStepId {
    const isNavigable = getNavigableSteps(this.state.steps).some(
      (step) => step.id === stepId,
    );

    if (!isNavigable) {
      throw new Error(
        `Initial workflow step "${stepId}" must be visible and enabled.`,
      );
    }

    return stepId;
  }

  private result(
    moved: boolean,
    validation: WorkflowTransitionResult<TContext, TValues>["validation"],
  ): WorkflowTransitionResult<TContext, TValues> {
    return { moved, state: this.state, validation };
  }

  private emit(
    type: Parameters<WorkflowEventListener<TContext, TValues>>[0]["type"],
    stepId: WorkflowStepId | null,
    previousStepId: WorkflowStepId | null,
  ): void {
    const event = {
      type,
      workflowId: this.definition.id,
      stepId,
      previousStepId,
      state: this.state,
    } as const;

    this.listeners.forEach((listener) => listener(event));
  }

  private assertDefinition(): void {
    const ids = this.definition.steps.map((step) => step.id);

    if (new Set(ids).size !== ids.length) {
      throw new Error("Workflow step IDs must be unique.");
    }

    const optionalStepWithoutEmptyPredicate = this.definition.steps.find(
      (step) => step.optional && !step.isEmpty,
    );

    if (optionalStepWithoutEmptyPredicate) {
      throw new Error(
        `Optional workflow step "${optionalStepWithoutEmptyPredicate.id}" must define isEmpty.`,
      );
    }
  }
}
