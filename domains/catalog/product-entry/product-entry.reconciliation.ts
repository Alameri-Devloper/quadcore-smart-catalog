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
  const categoryChanged = previousValues.categoryId !== nextValues.categoryId;
  const deviceClassChanged = previousValues.deviceClassId !== nextValues.deviceClassId;
  const compatibleDeviceClassIds = nextValues.categoryId
    ? (context.deviceClassIdsByCategory[nextValues.categoryId] ?? [])
    : [];
  const categoryRequiresDeviceClass = Boolean(
    nextValues.categoryId &&
      context.categoryRequiresDeviceClassByCategory[nextValues.categoryId],
  );
  const compatibleProductModelIds = nextValues.categoryId && nextValues.deviceClassId
    ? (context.productModelIdsByCategoryAndDeviceClass[nextValues.categoryId]?.[nextValues.deviceClassId] ?? [])
    : nextValues.categoryId
      ? (context.productModelIdsByCategory[nextValues.categoryId] ?? [])
    : [];
  const compatibleSpecificationIds = new Set(nextValues.categoryId && nextValues.deviceClassId
    ? (context.specificationFieldIdsByCategoryAndDeviceClass[nextValues.categoryId]?.[nextValues.deviceClassId] ?? [])
    : nextValues.categoryId
      ? (context.specificationFieldIdsByCategory[nextValues.categoryId] ?? [])
    : context.compatibleSpecificationFieldIds);
  const specificationValues = Object.fromEntries(
    Object.entries(nextValues.specificationValues).filter(([fieldId]) =>
      compatibleSpecificationIds.has(fieldId),
    ),
  );
  const deviceClassId = categoryRequiresDeviceClass
    ? isCompatible(nextValues.deviceClassId, compatibleDeviceClassIds)
      ? nextValues.deviceClassId
      : null
    : null;
  const productModelId = isCompatible(
    nextValues.productModelId,
    compatibleProductModelIds,
  )
    ? nextValues.productModelId
    : null;
  const productModelChanged =
    productModelId !== previousValues.productModelId ||
    productModelId !== nextValues.productModelId;
  const resolvedBrandId = productModelId
    ? (context.brandIdByProductModel[productModelId] ?? null)
    : null;
  const brandId = productModelId
    ? resolvedBrandId
    : categoryChanged || deviceClassChanged || productModelChanged
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
