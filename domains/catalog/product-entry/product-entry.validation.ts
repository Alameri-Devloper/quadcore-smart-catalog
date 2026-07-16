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
import { ProductEntryCategoryService } from "./services/product-entry-category.service";
import { ProductEntryDeviceClassService } from "./services/product-entry-device-class.service";
import { ProductEntryProductModelService } from "./services/product-entry-product-model.service";

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
  const code = await ProductEntryCategoryService.validateSelection({
    categoryId: values.categoryId,
    departmentId: values.departmentId,
    companyId: context.companyId,
    workspaceId: context.workspaceId,
  });

  return code
    ? invalidWorkflowStep([{ code, field: "categoryId", message: CATEGORY_MESSAGES[code] }])
    : validWorkflowStep();
};

const DEVICE_CLASS_MESSAGES = {
  required: "Choose a device class to continue.",
  "device-class-unavailable": "This device class is no longer available.",
  "device-class-workspace": "The selected device class does not belong to the current workspace.",
  "device-class-incompatible": "This device class is not valid for the selected product type.",
} as const;

export const validateDeviceClass: ProductEntryValidator = async ({ context, values }) => {
  const categoryRequiresDeviceClass = Boolean(
    values.categoryId &&
      context.categoryRequiresDeviceClassByCategory[values.categoryId],
  );
  if (!categoryRequiresDeviceClass) return validWorkflowStep();

  const code = await ProductEntryDeviceClassService.validateSelection({
    categoryId: values.categoryId,
    deviceClassId: values.deviceClassId,
    companyId: context.companyId,
    workspaceId: context.workspaceId,
  });
  return code
    ? invalidWorkflowStep([{ code, field: "deviceClassId", message: DEVICE_CLASS_MESSAGES[code] }])
    : validWorkflowStep();
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

export const validateSpecifications: ProductEntryValidator = ({
  context,
  values,
}) => {
  const issues = context.requiredSpecificationFieldIds
    .filter((fieldId) => {
      const value = values.specificationValues[fieldId];
      return value === undefined || value === null || value === "";
    })
    .map((fieldId) =>
      requiredIssue(
        `specificationValues.${fieldId}`,
        "Enter a value for this required specification.",
      ),
    );

  return resultFromIssues(issues);
};

export const validateCommercialDetails: ProductEntryValidator = ({ values }) => {
  const issues: WorkflowValidationIssue[] = [];

  if (!values.productName.trim()) {
    issues.push(requiredIssue("productName", "Enter a product name."));
  }

  if (
    values.price === null ||
    !Number.isFinite(values.price) ||
    values.price < 0
  ) {
    issues.push({
      code: "non-negative",
      field: "price",
      message: "Enter a price of zero or greater.",
    });
  }

  if (
    values.quantity === null ||
    !Number.isFinite(values.quantity) ||
    values.quantity < 0
  ) {
    issues.push({
      code: "non-negative",
      field: "quantity",
      message: "Enter a quantity of zero or greater.",
    });
  }

  if (!values.condition) {
    issues.push(requiredIssue("condition", "Select the product condition."));
  }

  if (!values.availabilityStatus) {
    issues.push(
      requiredIssue(
        "availabilityStatus",
        "Select an availability status.",
      ),
    );
  }

  return resultFromIssues(issues);
};

export const validateImages: ProductEntryValidator = () => validWorkflowStep();

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
  ];
  const results = await Promise.all(
    requiredPreviousValidators.map((validator) => validator(runtime)),
  );

  return resultFromIssues(results.flatMap((result) => result.issues));
};
