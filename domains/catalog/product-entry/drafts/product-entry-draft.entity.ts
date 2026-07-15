import type { WorkflowStepId } from "@/shared/workflow/workflow.types";
import type { ProductEntryMethod, ProductEntryValues } from "../product-entry.types";

export type ProductEntryDraftStatus = "active" | "completed" | "discarded";

export interface ProductEntryDraft {
  id: string;
  companyId: string;
  workspaceId: string;
  employeeId: string;
  entryMode: ProductEntryMethod;
  workflowValues: ProductEntryValues;
  currentStepId: WorkflowStepId;
  completedStepIds: WorkflowStepId[];
  status: ProductEntryDraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductEntryDraftScope {
  companyId: string;
  workspaceId: string;
  employeeId: string;
}
