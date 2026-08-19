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
  const liveHierarchy = context.referenceCategoryDepartmentById && context.referenceProductTypeCategoryById;
  const departmentChanged = previousValues.departmentId !== nextValues.departmentId;
  const categorySelectionChanged = previousValues.categoryId !== nextValues.categoryId;
  const productTypeSelectionChanged = previousValues.productTypeId !== nextValues.productTypeId;
  const categoryCandidate = liveHierarchy && departmentChanged ? null : nextValues.categoryId;
  const categoryId = liveHierarchy
    ? departmentChanged || categorySelectionChanged
      ? categoryCandidate && nextValues.departmentId &&
        context.referenceCategoryDepartmentById![categoryCandidate] === nextValues.departmentId
        ? categoryCandidate
        : null
      : nextValues.categoryId
    : categoryCandidate;
  const categoryChanged = previousValues.categoryId !== categoryId;
  const productTypeCandidate = categoryChanged ? null : nextValues.productTypeId;
  const productTypeId = liveHierarchy
    ? categoryChanged || productTypeSelectionChanged
      ? productTypeCandidate && categoryId && context.referenceProductTypeCategoryById![productTypeCandidate] === categoryId
        ? productTypeCandidate
        : null
      : nextValues.productTypeId
    : productTypeCandidate;
  const productTypeChanged = previousValues.productTypeId !== productTypeId;
  const deviceClassChanged = previousValues.deviceClassId !== nextValues.deviceClassId;
  const compatibleDeviceClassIds = context.referenceDeviceClassCodes
    ?? (categoryId ? context.deviceClassIdsByCategory[categoryId] ?? [] : []);
  const categoryRequiresDeviceClass = context.referenceDeviceClassCodes
    ? compatibleDeviceClassIds.length > 0
    : Boolean(categoryId && context.categoryRequiresDeviceClassByCategory[categoryId]);
  const compatibleSpecificationIds = new Set(context.referenceSpecificationResolutionsByProductType
    ? productTypeId
      ? (context.referenceSpecificationResolutionsByProductType[productTypeId]?.fields.map(({ specificationFieldId }) => specificationFieldId) ?? [])
      : []
    : categoryId && nextValues.deviceClassId
      ? (context.specificationFieldIdsByCategoryAndDeviceClass[categoryId]?.[nextValues.deviceClassId] ?? [])
      : categoryId
        ? (context.specificationFieldIdsByCategory[categoryId] ?? [])
        : context.compatibleSpecificationFieldIds);
  const specificationValues = productTypeChanged
    ? Object.fromEntries(
        Object.entries(nextValues.specificationValues).filter(([fieldId, value]) =>
          compatibleSpecificationIds.has(fieldId) &&
          (!(fieldId in context.selectOptionValuesBySpecificationField) ||
            context.selectOptionValuesBySpecificationField[fieldId].some(
              (optionValue) => Object.is(optionValue, value),
            )),
        ),
      )
    : nextValues.specificationValues;
  const deviceClassId = categoryRequiresDeviceClass
    ? isCompatible(nextValues.deviceClassId, compatibleDeviceClassIds)
      ? nextValues.deviceClassId
      : null
    : null;
  const compatibleProductModelIds = categoryId && nextValues.deviceClassId
    ? (context.productModelIdsByCategoryAndDeviceClass[categoryId]?.[nextValues.deviceClassId] ?? [])
    : categoryId
      ? (context.productModelIdsByCategory[categoryId] ?? [])
      : [];
  const productModelId = liveHierarchy
    ? categoryChanged || deviceClassChanged ? null : nextValues.productModelId
    : isCompatible(nextValues.productModelId, compatibleProductModelIds) ? nextValues.productModelId : null;
  const productModelChanged =
    productModelId !== previousValues.productModelId ||
    productModelId !== nextValues.productModelId;
  const resolvedBrandId = productModelId
    ? (context.brandIdByProductModel[productModelId] ?? nextValues.brandId)
    : null;
  const brandId = productModelId
    ? resolvedBrandId
    : categoryChanged || productTypeChanged || deviceClassChanged || productModelChanged
      ? null
      : nextValues.brandId;

  return {
    ...nextValues,
    categoryId,
    productTypeId,
    deviceClassId,
    productModelId,
    brandId,
    specificationValues,
  };
};
