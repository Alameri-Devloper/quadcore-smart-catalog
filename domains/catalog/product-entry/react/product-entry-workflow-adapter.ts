"use client";

import { createWorkflowReactAdapter } from "@/shared/workflow/react";
import type {
  ProductEntryValues,
  ProductEntryWorkflowContext,
} from "../product-entry.types";

const productEntryReactAdapter = createWorkflowReactAdapter<
  ProductEntryWorkflowContext,
  ProductEntryValues
>();

export const ProductEntryWorkflowProvider =
  productEntryReactAdapter.WorkflowProvider;
export const useProductEntryWorkflow = productEntryReactAdapter.useWorkflow;
