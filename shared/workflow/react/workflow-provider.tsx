"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { WorkflowEngine } from "../workflow.engine";
import type {
  WorkflowDefinition,
  WorkflowEventListener,
  WorkflowStepId,
  WorkflowValueReconciler,
} from "../workflow.types";
import {
  type WorkflowContextStore,
  type WorkflowContextValue,
  type WorkflowStepView,
} from "./workflow-context";

export interface WorkflowProviderProps<TContext, TValues extends object> {
  children: ReactNode;
  workflow: WorkflowDefinition<TContext, TValues>;
  context: TContext;
  createInitialValues: () => TValues;
  initialStep: WorkflowStepId;
  onEvent?: WorkflowEventListener<TContext, TValues>;
  reconcileValues?: WorkflowValueReconciler<TContext, TValues>;
}

export function createWorkflowProvider<
  TContext,
  TValues extends object,
>(WorkflowContext: WorkflowContextStore<TContext, TValues>) {
  return function WorkflowProvider({
    children,
    workflow,
    context,
    createInitialValues,
    initialStep,
    onEvent,
    reconcileValues,
  }: WorkflowProviderProps<TContext, TValues>) {
    const initialConfigurationRef = useRef({
      context,
      createInitialValues,
      initialStep,
    });
    const [engine] = useState(() => {
      const definition = reconcileValues
        ? { ...workflow, reconcileValues }
        : workflow;

      return new WorkflowEngine(definition, context, createInitialValues(), {
        initialStepId: initialStep,
      });
    });
    const subscribe = useCallback(
      (notify: () => void) => engine.subscribe(() => notify()),
      [engine],
    );
    const getSnapshot = useCallback(() => engine.getState(), [engine]);
    const engineState = useSyncExternalStore(
      subscribe,
      getSnapshot,
      getSnapshot,
    );

    useEffect(() => {
      if (!onEvent) {
        return;
      }

      return engine.subscribe(onEvent, { emitCurrentStep: true });
    }, [engine, onEvent]);

    const updateValues = useCallback(
    async (values: TValues, nextContext: TContext) => {
      engine.update(values, nextContext);
      await engine.revalidateCompletedSteps();
    },
    [engine],
  );

    useEffect(() => {
    if (Object.is(engine.getState().context, context)) {
      return;
    }

    void updateValues(engine.getState().values, context);
  }, [context, engine, updateValues]);

    const next = useCallback(async () => {
    await engine.next();
  }, [engine]);

    const back = useCallback(() => {
    engine.back();
  }, [engine]);

    const goToStep = useCallback(
    (stepId: WorkflowStepId) => {
      engine.jumpTo(stepId);
    },
    [engine],
  );

    const setValues = useCallback(
    async (values: TValues) => {
      await updateValues(values, context);
    },
    [context, updateValues],
  );

    const setValue = useCallback(
    async <TKey extends keyof TValues>(key: TKey, value: TValues[TKey]) => {
      await setValues({ ...engine.getState().values, [key]: value });
    },
    [engine, setValues],
  );

    const validateCurrentStep = useCallback(async () => {
    const result = await engine.validateCurrentStep();
    return result.validation;
  }, [engine]);

    const completeWorkflow = useCallback(async () => {
    const result = await engine.completeWorkflow();
    return result.moved;
  }, [engine]);

    const resetWorkflow = useCallback(() => {
      const initial = initialConfigurationRef.current;
      engine.reset(
        initial.context,
        initial.createInitialValues(),
        initial.initialStep,
      );
    }, [engine]);

    const value = useMemo<WorkflowContextValue<TContext, TValues>>(() => {
    const stepViews = workflow.steps.map((definitionStep) => ({
      ...definitionStep,
      ...engineState.steps.find((step) => step.id === definitionStep.id)!,
    })) as WorkflowStepView<TContext, TValues>[];
    const currentStep =
      stepViews.find((step) => step.id === engineState.currentStepId) ?? null;
    const visibleSteps = stepViews.filter((step) => step.visible);
    const navigableSteps = visibleSteps.filter((step) => !step.disabled);
    const currentIndex = navigableSteps.findIndex(
      (step) => step.id === engineState.currentStepId,
    );

    return {
      currentStep,
      currentStepId: engineState.currentStepId,
      visibleSteps,
      completedSteps: stepViews.filter((step) =>
        engineState.completedStepIds.includes(step.id),
      ),
      progress: engineState.progress,
      values: engineState.values,
      validation: currentStep?.validation ?? null,
      canGoNext:
        currentStep !== null &&
        !currentStep.disabled &&
        !engineState.isCompleted,
      canGoBack: currentIndex > 0,
      next,
      back,
      goToStep,
      setValue,
      setValues,
      validateCurrentStep,
      completeWorkflow,
      resetWorkflow,
    };
  }, [
    back,
    completeWorkflow,
    engineState,
    goToStep,
    next,
    resetWorkflow,
    setValue,
    setValues,
    validateCurrentStep,
    workflow.steps,
  ]);

    return (
      <WorkflowContext.Provider value={value}>
        {children}
      </WorkflowContext.Provider>
    );
  };
}
