import type { WorkflowValueReconciler } from "@/shared/workflow/workflow.types";
import type {
  ProductEntryState,
  ProductEntryWorkflowContext,
} from "./product-entry.types";

const isCompatible = (
  id: string | null,
  compatibleIds: readonly string[],
): boolean => id === null || compatibleIds.includes(id);

export const reconcileProductEntryValues: WorkflowValueReconciler<
  ProductEntryWorkflowContext,
  ProductEntryState
> = ({ previousValues, nextValues, context }) => {
  const compatibleSpecificationIds = new Set(
    context.compatibleSpecificationFieldIds,
  );
  const specificationValues = Object.fromEntries(
    Object.entries(nextValues.specificationValues).filter(([fieldId]) =>
      compatibleSpecificationIds.has(fieldId),
    ),
  );
  const deviceClassId = context.categoryRequiresDeviceClass
    ? isCompatible(nextValues.deviceClassId, context.compatibleDeviceClassIds)
      ? nextValues.deviceClassId
      : null
    : null;
  const productModelId = isCompatible(
    nextValues.productModelId,
    context.compatibleProductModelIds,
  )
    ? nextValues.productModelId
    : null;
  const productModelChanged =
    productModelId !== previousValues.productModelId ||
    productModelId !== nextValues.productModelId;
  const brandId =
    context.resolvedProductModelBrandId !== undefined
      ? context.resolvedProductModelBrandId
      : productModelChanged
        ? null
        : nextValues.brandId;

  return {
    ...nextValues,
    deviceClassId,
    productModelId,
    brandId,
    specificationValues,
  };
};
