import {
  invalidWorkflowStep,
  validWorkflowStep,
} from "@/shared/workflow/workflow.validation";
import type {
  WorkflowStepValidator,
  WorkflowValidationIssue,
  WorkflowValidationResult,
} from "@/shared/workflow/workflow.types";
import type {
  ProductEntryState,
  ProductEntryWorkflowContext,
} from "./product-entry.types";
import { isProductEntryMethodEnabled } from "./product-entry.types";
import { ProductEntryDeviceClassService } from "./services/product-entry-device-class.service";
import { ProductEntryProductModelService } from "./services/product-entry-product-model.service";
import { ProductEntrySpecificationsService } from "./services/product-entry-specifications.service";
import { isApprovedProductAvailability, isApprovedProductCondition, isApprovedProductEntryCurrency } from "./product-entry-commercial-options";
import { ProductEntryCategoryService } from "./services/product-entry-category.service";

export type ProductEntryValidator = WorkflowStepValidator<
  ProductEntryWorkflowContext,
  ProductEntryState
>;

const requiredIssue = (field: string, message: string): WorkflowValidationIssue => ({
  code: "required",
  field,
  message,
});

const resultFromIssues = (
  issues: WorkflowValidationIssue[],
): WorkflowValidationResult =>
  issues.length > 0 ? invalidWorkflowStep(issues) : validWorkflowStep();

export const validateEntryMethod: ProductEntryValidator = ({ values }) =>
  isProductEntryMethodEnabled(values.entryMethod)
    ? validWorkflowStep()
    : invalidWorkflowStep([
        {
          code: "entry-method-unavailable",
          field: "entryMethod",
          message: "Select an available Product Entry method to continue.",
        },
      ]);

const CATEGORY_MESSAGES = {
  required: "Choose a product type to continue.",
  "category-unavailable": "This product type is no longer available. Choose another one.",
  "category-workspace": "This product type does not belong to the current workspace.",
  "department-unavailable": "The related department is no longer available.",
  "department-workspace": "The related department does not belong to the current workspace.",
  "department-mismatch": "The selected product type and department do not match.",
} as const;

export const validateCategory: ProductEntryValidator = async ({ context, values }) => {
  if (!context.referenceDepartmentIds || !context.referenceCategoryDepartmentById || !context.referenceProductTypeCategoryById) {
    const code = await ProductEntryCategoryService.validateSelection({ categoryId: values.categoryId, departmentId: values.departmentId, companyId: context.companyId, workspaceId: context.workspaceId });
    return code ? invalidWorkflowStep([{ code, field: "categoryId", message: CATEGORY_MESSAGES[code] }]) : validWorkflowStep();
  }
  if (!values.departmentId || !context.referenceDepartmentIds.includes(values.departmentId)) {
    return invalidWorkflowStep([{ code: "department-unavailable", field: "departmentId", message: CATEGORY_MESSAGES["department-unavailable"] }]);
  }
  if (!values.categoryId) return invalidWorkflowStep([{ code: "required", field: "categoryId", message: CATEGORY_MESSAGES.required }]);
  if (context.referenceCategoryDepartmentById[values.categoryId] !== values.departmentId) {
    return invalidWorkflowStep([{ code: "department-mismatch", field: "categoryId", message: CATEGORY_MESSAGES["department-mismatch"] }]);
  }
  if (!values.productTypeId || context.referenceProductTypeCategoryById[values.productTypeId] !== values.categoryId) {
    return invalidWorkflowStep([{ code: "required", field: "productTypeId", message: "Choose a Product Type to continue." }]);
  }
  return validWorkflowStep();
};

const DEVICE_CLASS_MESSAGES = {
  required: "Choose a device class to continue.",
  "device-class-unavailable": "This device class is no longer available.",
  "device-class-workspace": "The selected device class does not belong to the current workspace.",
  "device-class-incompatible": "This device class is not valid for the selected product type.",
} as const;

export const validateDeviceClass: ProductEntryValidator = async ({ context, values }) => {
  if (!context.referenceDeviceClassCodes) {
    const categoryRequiresDeviceClass = Boolean(values.categoryId && context.categoryRequiresDeviceClassByCategory[values.categoryId]);
    if (!categoryRequiresDeviceClass) return validWorkflowStep();
    const code = await ProductEntryDeviceClassService.validateSelection({ categoryId: values.categoryId, deviceClassId: values.deviceClassId, companyId: context.companyId, workspaceId: context.workspaceId });
    return code ? invalidWorkflowStep([{ code, field: "deviceClassId", message: DEVICE_CLASS_MESSAGES[code] }]) : validWorkflowStep();
  }
  const categoryRequiresDeviceClass = context.referenceDeviceClassCodes.length > 0;
  if (!categoryRequiresDeviceClass) return validWorkflowStep();
  return values.deviceClassId && context.referenceDeviceClassCodes.includes(values.deviceClassId)
    ? validWorkflowStep()
    : invalidWorkflowStep([{ code: values.deviceClassId ? "device-class-unavailable" : "required", field: "deviceClassId", message: values.deviceClassId ? DEVICE_CLASS_MESSAGES["device-class-unavailable"] : DEVICE_CLASS_MESSAGES.required }]);
};

const PRODUCT_MODEL_MESSAGES = {
  required: "Choose a product model to continue.",
  "product-model-unavailable": "This product model is no longer available.",
  "product-model-workspace": "This product model belongs to another workspace.",
  "product-model-category": "This product model does not match the selected product type.",
  "product-model-device-class": "This product model does not match the selected device class.",
  "brand-unavailable": "The related Brand is no longer available.",
  "brand-mismatch": "The selected model and Brand do not match.",
} as const;

export const validateProductModel: ProductEntryValidator = async ({ context, values }) => {
  if (context.referenceBrandIds && (!values.brandId || !context.referenceBrandIds.includes(values.brandId))) {
    return invalidWorkflowStep([{ code: "brand-unavailable", field: "brandId", message: PRODUCT_MODEL_MESSAGES["brand-unavailable"] }]);
  }
  const code = await ProductEntryProductModelService.validateProductModelContext({
    context: {
      companyId: context.companyId,
      workspaceId: context.workspaceId,
      departmentId: values.departmentId,
      categoryId: values.categoryId,
      deviceClassId: values.deviceClassId,
      categoryRequiresDeviceClass: Boolean(
        values.categoryId &&
          context.categoryRequiresDeviceClassByCategory[values.categoryId],
      ),
    },
    productModelId: values.productModelId,
    brandId: values.brandId,
  });
  return code
    ? invalidWorkflowStep([{ code, field: "productModelId", message: PRODUCT_MODEL_MESSAGES[code] }])
    : validWorkflowStep();
};

export const validateSpecifications: ProductEntryValidator = async ({
  context,
  values,
}) => {
  const resolution = context.referenceSpecificationResolutionsByProductType
    ? values.productTypeId
      ? context.referenceSpecificationResolutionsByProductType[values.productTypeId]
        ?? { status: "missing-template" as const, templateId: null, fields: [] as [] }
      : { status: "invalid-context" as const, templateId: null, fields: [] as [] }
    : await ProductEntrySpecificationsService.resolve({ companyId: context.companyId, workspaceId: context.workspaceId, categoryId: values.categoryId, deviceClassId: values.deviceClassId, categoryRequiresDeviceClass: Boolean(values.categoryId && context.categoryRequiresDeviceClassByCategory[values.categoryId]) });
  const issues = ProductEntrySpecificationsService.validateValues(
    resolution,
    values.specificationValues,
  ).map((issue) => ({
    code: issue.code,
    field: issue.specificationFieldId
      ? `specificationValues.${issue.specificationFieldId}`
      : "specificationValues",
    message: issue.message,
  }));

  return resultFromIssues(issues);
};

export const validateCommercialDetails: ProductEntryValidator = ({ context, values }) => {
  const issues: WorkflowValidationIssue[] = [];

  if (!values.productName.trim()) {
    issues.push(requiredIssue("productName", "Enter a product name."));
  }

  if (
    values.retailPrice === null ||
    !Number.isFinite(values.retailPrice) ||
    values.retailPrice < 0
  ) {
    issues.push({
      code: "retail-price",
      field: "retailPrice",
      message: "Enter a valid retail price.",
    });
  }

  if (
    values.wholesalePrice !== null &&
    (!Number.isFinite(values.wholesalePrice) || values.wholesalePrice < 0)
  ) {
    issues.push({
      code: "wholesale-price",
      field: "wholesalePrice",
      message: "Wholesale price cannot be negative or invalid.",
    });
  }

  if (!values.currency || !(context.referenceCurrencyCodes ? context.referenceCurrencyCodes.includes(values.currency) : isApprovedProductEntryCurrency(values.currency))) {
    issues.push(requiredIssue("currency", "Choose a currency."));
  }

  if (!values.condition || !(context.referenceConditionCodes ? context.referenceConditionCodes.includes(values.condition) : isApprovedProductCondition(values.condition))) {
    issues.push(requiredIssue("condition", "Choose whether the product is new or used."));
  }

  if (!values.availabilityStatus || !(context.referenceSupplyStatusIds ? context.referenceSupplyStatusIds.includes(values.availabilityStatus) : isApprovedProductAvailability(values.availabilityStatus))) {
    issues.push(
      requiredIssue(
        "availabilityStatus",
        "Choose the availability status.",
      ),
    );
  }

  if (typeof values.isFeatured !== "boolean") {
    issues.push({ code: "featured-boolean", field: "isFeatured", message: "Choose whether to feature this product." });
  }

  if (values.publicationIntent !== "SaveAsDraft" && values.publicationIntent !== "PublishWhenReady") {
    issues.push({ code: "publication-intent", field: "publicationIntent", message: "Choose a publication intent." });
  }

  return resultFromIssues(issues);
};

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const validateImages: ProductEntryValidator = ({ values }) => {
  const issues: WorkflowValidationIssue[] = [];
  const ids = new Set<string>();
  const orders = new Set<number>();
  let mainCount = 0;

  const activeImages = values.images.filter((image) => image.operationType !== "Remove");
  for (const image of values.images) {
    if (ids.has(image.id)) issues.push({ code: "duplicate-image-id", field: "images", message: "An image was added more than once. Remove it and choose it again." });
    ids.add(image.id);
    if (orders.has(image.sortOrder)) issues.push({ code: "duplicate-image-order", field: "images", message: "Image order could not be confirmed. Reorder the images and try again." });
    orders.add(image.sortOrder);
    if (image.operationType !== "Remove" && image.isPrimary) mainCount += 1;
    if (image.operationType === "Add" || image.operationType === "Replace") {
      if (!image.mimeType || !SUPPORTED_IMAGE_TYPES.has(image.mimeType)) issues.push({ code: "unsupported-image-type", field: "images", message: "Choose a JPG, PNG, or WebP image." });
      if (image.sizeBytes === null || !Number.isFinite(image.sizeBytes) || image.sizeBytes <= 0) issues.push({ code: "empty-image", field: "images", message: "Select the image source again or remove the operation." });
      if (image.sourceAvailability !== "AvailableInCurrentSession" || image.hashStatus !== "Ready" || !image.expectedSourceSha256 || !image.expectedSourceByteLength) {
        issues.push({ code: "image-source-not-ready", field: "images", message: "Select and verify every added or replaced image before saving." });
      }
    }
  }

  if (activeImages.length > 0 && mainCount !== 1) issues.push({ code: "main-image", field: "images", message: "Choose exactly one Main Product Image." });
  const expectedOrders = activeImages.map((_, index) => index + 1);
  const actualOrders = activeImages.map((image) => image.sortOrder).sort((left, right) => left - right);
  if (actualOrders.some((order, index) => order !== expectedOrders[index])) issues.push({ code: "image-order", field: "images", message: "Image order must be continuous. Reorder the images and try again." });

  return resultFromIssues(issues);
};

export const validateReview: ProductEntryValidator = async (runtime) => {
  const requiredPreviousValidators: ProductEntryValidator[] = [
    validateEntryMethod,
    validateCategory,
    ...(runtime.values.categoryId &&
    runtime.context.categoryRequiresDeviceClassByCategory[runtime.values.categoryId]
      ? [validateDeviceClass]
      : []),
    validateProductModel,
    validateSpecifications,
    validateCommercialDetails,
    validateImages,
  ];
  const results = await Promise.all(
    requiredPreviousValidators.map((validator) => validator(runtime)),
  );

  return resultFromIssues(results.flatMap((result) => result.issues));
};
