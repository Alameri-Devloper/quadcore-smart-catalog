import type { WorkflowDefinition } from "@/shared/workflow/workflow.types";
import { reconcileProductEntryValues } from "./product-entry.reconciliation";
import {
  PRODUCT_ENTRY_STEP_IDS,
  type ProductEntryState,
  type ProductEntryWorkflowContext,
} from "./product-entry.types";
import {
  validateCategory,
  validateCommercialDetails,
  validateDeviceClass,
  validateEntryMethod,
  validateImages,
  validateProductModel,
  validateReview,
  validateSpecifications,
} from "./product-entry.validation";

export const productEntryWorkflow: WorkflowDefinition<
  ProductEntryWorkflowContext,
  ProductEntryState
> = {
  id: "product-entry",
  reconcileValues: reconcileProductEntryValues,
  steps: [
    {
      id: PRODUCT_ENTRY_STEP_IDS.entryMethod,
      label: "Entry Method",
      validator: validateEntryMethod,
    },
    {
      id: PRODUCT_ENTRY_STEP_IDS.category,
      label: "Category",
      validator: validateCategory,
    },
    {
      id: PRODUCT_ENTRY_STEP_IDS.deviceClass,
      label: "Device Class",
      isVisible: ({ context }) => context.categoryRequiresDeviceClass,
      validator: validateDeviceClass,
    },
    {
      id: PRODUCT_ENTRY_STEP_IDS.productModel,
      label: "Product Model",
      validator: validateProductModel,
    },
    {
      id: PRODUCT_ENTRY_STEP_IDS.specifications,
      label: "Specifications",
      validator: validateSpecifications,
    },
    {
      id: PRODUCT_ENTRY_STEP_IDS.commercialDetails,
      label: "Commercial Details",
      validator: validateCommercialDetails,
    },
    {
      id: PRODUCT_ENTRY_STEP_IDS.images,
      label: "Images",
      optional: true,
      isEmpty: ({ values }) => values.images.length === 0,
      validator: validateImages,
    },
    {
      id: PRODUCT_ENTRY_STEP_IDS.review,
      label: "Review",
      validator: validateReview,
    },
  ],
};
