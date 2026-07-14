"use client";

import { useContext } from "react";
import type {
  WorkflowContextStore,
  WorkflowContextValue,
} from "./workflow-context";

export function createUseWorkflow<TContext, TValues>(
  WorkflowContext: WorkflowContextStore<TContext, TValues>,
): () => WorkflowContextValue<TContext, TValues> {
  return function useWorkflow() {
    const workflow = useContext(WorkflowContext);

    if (workflow === undefined) {
      throw new Error("useWorkflow must be used within its WorkflowProvider.");
    }

    return workflow;
  };
}
