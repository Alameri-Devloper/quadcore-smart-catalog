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

export const validateCategory: ProductEntryValidator = ({ values }) =>
  values.categoryId
    ? validWorkflowStep()
    : invalidWorkflowStep([
        requiredIssue("categoryId", "Select a category to continue."),
      ]);

export const validateDeviceClass: ProductEntryValidator = ({
  context,
  values,
}) => {
  if (!context.categoryRequiresDeviceClass) {
    return validWorkflowStep();
  }

  if (!values.deviceClassId) {
    return invalidWorkflowStep([
        requiredIssue(
          "deviceClassId",
          "Select a device class for this category.",
        ),
      ]);
  }

  return context.compatibleDeviceClassIds.includes(values.deviceClassId)
    ? validWorkflowStep()
    : invalidWorkflowStep([
        {
          code: "incompatible",
          field: "deviceClassId",
          message: "Select a device class compatible with this category.",
        },
      ]);
};

export const validateProductModel: ProductEntryValidator = ({
  context,
  values,
}) => {
  if (!values.productModelId) {
    return invalidWorkflowStep([
        requiredIssue("productModelId", "Select a product model to continue."),
      ]);
  }

  return context.compatibleProductModelIds.includes(values.productModelId)
    ? validWorkflowStep()
    : invalidWorkflowStep([
        {
          code: "incompatible",
          field: "productModelId",
          message: "Select a product model compatible with the current selection.",
        },
      ]);
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
    ...(runtime.context.categoryRequiresDeviceClass
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
