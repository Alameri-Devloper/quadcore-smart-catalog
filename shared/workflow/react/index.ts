import { createWorkflowContext } from "./workflow-context";
import { createWorkflowProvider } from "./workflow-provider";
import { createUseWorkflow } from "./use-workflow";

export function createWorkflowReactAdapter<
  TContext,
  TValues extends object,
>() {
  const WorkflowContext = createWorkflowContext<TContext, TValues>();

  return {
    WorkflowProvider: createWorkflowProvider(WorkflowContext),
    useWorkflow: createUseWorkflow(WorkflowContext),
  };
}

export type { WorkflowProviderProps } from "./workflow-provider";
export {
  type WorkflowContextValue,
  type WorkflowReactActions,
  type WorkflowReactState,
  type WorkflowStepView,
} from "./workflow-context";
