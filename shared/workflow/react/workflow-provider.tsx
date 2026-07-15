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

function valuesEqual(current: unknown, initial: unknown): boolean {
  if (Object.is(current, initial)) {
    return true;
  }

  if (
    typeof current !== "object" ||
    current === null ||
    typeof initial !== "object" ||
    initial === null
  ) {
    return false;
  }

  if (Array.isArray(current) || Array.isArray(initial)) {
    return (
      Array.isArray(current) &&
      Array.isArray(initial) &&
      current.length === initial.length &&
      current.every((value, index) => valuesEqual(value, initial[index]))
    );
  }

  const currentRecord = current as Record<string, unknown>;
  const initialRecord = initial as Record<string, unknown>;
  const currentKeys = Object.keys(currentRecord);
  const initialKeys = Object.keys(initialRecord);

  return (
    currentKeys.length === initialKeys.length &&
    currentKeys.every(
      (key) =>
        Object.hasOwn(initialRecord, key) &&
        valuesEqual(currentRecord[key], initialRecord[key]),
    )
  );
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
    const initialValuesRef = useRef<TValues | null>(null);
    const initialConfigurationRef = useRef({
      context,
      createInitialValues,
      initialStep,
    });
    const [engine] = useState(() => {
      const definition = reconcileValues
        ? { ...workflow, reconcileValues }
        : workflow;

      const initialValues = createInitialValues();
      initialValuesRef.current = initialValues;

      return new WorkflowEngine(definition, context, initialValues, {
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
      const initialValues = initial.createInitialValues();
      initialValuesRef.current = initialValues;
      engine.reset(
        initial.context,
        initialValues,
        initial.initialStep,
      );
    }, [engine]);

    const restoreWorkflow = useCallback(
      async (snapshot: {
        values: TValues;
        currentStepId: WorkflowStepId;
        completedStepIds: WorkflowStepId[];
      }) => {
        await engine.restore(
          context,
          snapshot.values,
          snapshot.currentStepId,
          snapshot.completedStepIds,
        );
      },
      [context, engine],
    );

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
      isCompleted: engineState.isCompleted,
      isDirty:
        initialValuesRef.current !== null &&
        !valuesEqual(engineState.values, initialValuesRef.current),
      next,
      back,
      goToStep,
      setValue,
      setValues,
      validateCurrentStep,
      completeWorkflow,
      resetWorkflow,
      restoreWorkflow,
    };
  }, [
    back,
    completeWorkflow,
    engineState,
    goToStep,
    next,
    resetWorkflow,
    restoreWorkflow,
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
