"use client";

import { createContext, type Context } from "react";
import type {
  WorkflowStep,
  WorkflowStepId,
  WorkflowStepState,
  WorkflowValidationResult,
} from "../workflow.types";

export type WorkflowStepView<TContext, TValues> = WorkflowStep<
  TContext,
  TValues
> &
  WorkflowStepState;

export interface WorkflowReactState<TContext, TValues> {
  currentStep: WorkflowStepView<TContext, TValues> | null;
  currentStepId: WorkflowStepId | null;
  visibleSteps: WorkflowStepView<TContext, TValues>[];
  completedSteps: WorkflowStepView<TContext, TValues>[];
  progress: number;
  values: TValues;
  validation: WorkflowValidationResult | null;
  canGoNext: boolean;
  canGoBack: boolean;
  isCompleted: boolean;
  isDirty: boolean;
}

export interface WorkflowReactActions<TValues> {
  next: () => Promise<void>;
  back: () => void;
  goToStep: (stepId: WorkflowStepId) => void;
  setValue: <TKey extends keyof TValues>(
    key: TKey,
    value: TValues[TKey],
  ) => Promise<void>;
  setValues: (values: TValues) => Promise<void>;
  validateCurrentStep: () => Promise<WorkflowValidationResult | null>;
  completeWorkflow: () => Promise<boolean>;
  resetWorkflow: () => void;
  restoreWorkflow: (snapshot: {
    values: TValues;
    currentStepId: WorkflowStepId;
    completedStepIds: WorkflowStepId[];
  }) => Promise<void>;
}

export type WorkflowContextValue<TContext, TValues> = WorkflowReactState<
  TContext,
  TValues
> &
  WorkflowReactActions<TValues>;

export type WorkflowContextStore<TContext, TValues> = Context<
  WorkflowContextValue<TContext, TValues> | undefined
>;

export function createWorkflowContext<TContext, TValues>(): WorkflowContextStore<
  TContext,
  TValues
> {
  return createContext<WorkflowContextValue<TContext, TValues> | undefined>(
    undefined,
  );
}
