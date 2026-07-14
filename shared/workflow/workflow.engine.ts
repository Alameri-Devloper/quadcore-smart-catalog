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

export class WorkflowEngine<TContext, TValues> {
  private state: WorkflowState<TContext, TValues>;
  private readonly listeners = new Set<WorkflowEventListener<TContext, TValues>>();

  constructor(
    private readonly definition: WorkflowDefinition<TContext, TValues>,
    context: TContext,
    values: TValues,
  ) {
    this.assertDefinition();
    this.state = createWorkflowState(definition, context, values);

    if (this.state.currentStepId) {
      this.emit("step-entered", this.state.currentStepId, null);
    }
  }

  getState(): Readonly<WorkflowState<TContext, TValues>> {
    return this.state;
  }

  subscribe(listener: WorkflowEventListener<TContext, TValues>): () => void {
    this.listeners.add(listener);
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
  }

  async next(): Promise<WorkflowTransitionResult<TContext, TValues>> {
    const currentStep = this.getCurrentDefinitionStep();

    if (!currentStep || !this.state.currentStepId) {
      return this.result(false, null);
    }

    const validation = await validateWorkflowStep(currentStep, {
      context: this.state.context,
      values: this.state.values,
      stepId: currentStep.id,
    });
    this.state = updateStepValidation(
      this.state,
      currentStep.id,
      validation,
      validation.valid,
    );

    if (!validation.valid) {
      return this.result(false, validation);
    }

    this.emit("step-completed", currentStep.id, currentStep.id);
    const steps = getNavigableSteps(this.state.steps);
    const currentIndex = steps.findIndex((step) => step.id === currentStep.id);
    const nextStep = steps[currentIndex + 1];

    if (!nextStep) {
      this.state = { ...this.state, isCompleted: true, progress: 100 };
      this.emit("workflow-completed", currentStep.id, currentStep.id);
      return this.result(true, validation);
    }

    this.moveTo(nextStep.id);
    return this.result(true, validation);
  }

  back(): WorkflowTransitionResult<TContext, TValues> {
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

    if (!target?.completed) {
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
  }

  private getCurrentDefinitionStep() {
    return this.definition.steps.find(
      (step) => step.id === this.state.currentStepId,
    );
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
  }
}
