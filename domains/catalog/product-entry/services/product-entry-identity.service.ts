import type { WorkflowStepState } from "@/shared/workflow/workflow.types";
import {
  PRODUCT_ENTRY_AVAILABILITY_OPTIONS,
  PRODUCT_ENTRY_CONDITION_OPTIONS,
  isApprovedProductEntryCurrency,
} from "../product-entry-commercial-options";
import { PRODUCT_ENTRY_STEP_IDS, type ProductEntryValues } from "../product-entry.types";
import { ProductEntrySpecificationsService, type ProductEntrySpecificationsResolution } from "./product-entry-specifications.service";

export type ProductIdentityStatus = "Confirmed" | "In Progress" | "Needs Attention" | "Not Started";

export interface ProductIdentityValue {
  label: string;
  value: string;
}

export interface ProductEntryIdentityViewModel {
  displayTitle?: string;
  identityError: boolean;
  identityValues: ProductIdentityValue[];
  specifications: {
    completed?: number;
    required?: number;
    status: ProductIdentityStatus;
  };
  commercial: {
    status: ProductIdentityStatus;
    values: ProductIdentityValue[];
  };
  images: {
    count: number;
    mainSelected: boolean;
  };
  workStatus: "Draft Saved" | "Unsaved Changes";
}

interface CreateProductEntryIdentityInput {
  values: Readonly<ProductEntryValues>;
  steps: readonly WorkflowStepState[];
  categoryName?: string;
  deviceClassName?: string;
  brandName?: string;
  productModelName?: string;
  specificationsResolution: ProductEntrySpecificationsResolution | null;
  draftSaved: boolean;
  identityError: boolean;
}

const addProgressiveTerm = (current: string | undefined, next: string | undefined) => {
  if (!next) return current;
  if (!current) return next;
  const normalizedCurrent = current.toLocaleLowerCase();
  const normalizedNext = next.toLocaleLowerCase();
  return normalizedCurrent.includes(normalizedNext) ? current : `${next} ${current}`;
};

const hasAnyCommercialInput = (values: Readonly<ProductEntryValues>) =>
  Boolean(
    values.productName.trim() || values.productCode.trim() || values.retailPrice !== null ||
    values.wholesalePrice !== null || values.currency || values.quantity !== null ||
    values.condition || values.availabilityStatus,
  );

export const ProductEntryIdentityService = {
  createViewModel(input: CreateProductEntryIdentityInput): ProductEntryIdentityViewModel {
    const specificationStep = input.steps.find((step) => step.id === PRODUCT_ENTRY_STEP_IDS.specifications);
    const commercialStep = input.steps.find((step) => step.id === PRODUCT_ENTRY_STEP_IDS.commercialDetails);
    const invalidCommercialFields = new Set(
      commercialStep?.validation?.issues.flatMap((issue) => issue.field ? [issue.field] : []) ?? [],
    );
    const commercialValidationReady = commercialStep?.validation !== null && commercialStep?.validation !== undefined;
    const requiredCompletion = ProductEntrySpecificationsService.getRequiredCompletion(
      input.specificationsResolution,
      input.values.specificationValues,
    );
    const specificationStatus: ProductIdentityStatus =
      specificationStep?.validation?.valid === false
        ? "Needs Attention"
        : specificationStep?.completed
          ? "Confirmed"
          : requiredCompletion && requiredCompletion.completed > 0
            ? "In Progress"
            : "Not Started";
    const commercialStatus: ProductIdentityStatus = commercialStep?.completed
      ? "Confirmed"
      : hasAnyCommercialInput(input.values)
        ? "In Progress"
        : "Not Started";

    const confirmedProductName = commercialValidationReady && !invalidCommercialFields.has("productName") && input.values.productName.trim()
      ? input.values.productName.trim()
      : undefined;
    let progressiveTitle = input.categoryName;
    progressiveTitle = addProgressiveTerm(progressiveTitle, input.deviceClassName);
    progressiveTitle = addProgressiveTerm(progressiveTitle, input.brandName);
    if (input.productModelName) progressiveTitle = input.productModelName;

    const identityValues: ProductIdentityValue[] = [
      confirmedProductName ? { label: "Product Name", value: confirmedProductName } : null,
      input.categoryName ? { label: "Category", value: input.categoryName } : null,
      input.deviceClassName ? { label: "Device Class", value: input.deviceClassName } : null,
      input.brandName ? { label: "Brand", value: input.brandName } : null,
      input.productModelName ? { label: "Product Model", value: input.productModelName } : null,
    ].filter((value): value is ProductIdentityValue => value !== null);

    const condition = commercialValidationReady && !invalidCommercialFields.has("condition")
      ? PRODUCT_ENTRY_CONDITION_OPTIONS.find((option) => option.value === input.values.condition)?.label
      : undefined;
    const availability = commercialValidationReady && !invalidCommercialFields.has("availabilityStatus")
      ? PRODUCT_ENTRY_AVAILABILITY_OPTIONS.find((option) => option.value === input.values.availabilityStatus)?.label
      : undefined;
    const currencyValid = commercialValidationReady && !invalidCommercialFields.has("currency") && isApprovedProductEntryCurrency(input.values.currency);
    const retail = !invalidCommercialFields.has("retailPrice") && currencyValid && input.values.retailPrice !== null && Number.isFinite(input.values.retailPrice) && input.values.retailPrice >= 0
      ? `${input.values.retailPrice} ${input.values.currency}`
      : undefined;
    const wholesale = !invalidCommercialFields.has("wholesalePrice") && currencyValid && input.values.wholesalePrice !== null && Number.isFinite(input.values.wholesalePrice) && input.values.wholesalePrice >= 0
      ? `${input.values.wholesalePrice} ${input.values.currency}`
      : undefined;
    const quantity = commercialValidationReady && !invalidCommercialFields.has("quantity") && input.values.quantity !== null && Number.isInteger(input.values.quantity) && input.values.quantity >= 0
      ? `${input.values.quantity} units`
      : undefined;

    return {
      displayTitle: confirmedProductName ?? progressiveTitle,
      identityError: input.identityError,
      identityValues,
      specifications: {
        completed: requiredCompletion?.completed,
        required: requiredCompletion?.required,
        status: specificationStatus,
      },
      commercial: {
        status: commercialStatus,
        values: [
          retail ? { label: "Retail", value: retail } : null,
          wholesale ? { label: "Wholesale", value: wholesale } : null,
          condition ? { label: "Condition", value: condition } : null,
          availability ? { label: "Availability", value: quantity ? `${availability} — ${quantity}` : availability } : null,
          !availability && quantity ? { label: "Quantity", value: quantity } : null,
        ].filter((value): value is ProductIdentityValue => value !== null),
      },
      images: {
        count: input.values.images.length,
        mainSelected: input.values.images.some((image) => image.isPrimary),
      },
      workStatus: input.draftSaved ? "Draft Saved" : "Unsaved Changes",
    };
  },
};
