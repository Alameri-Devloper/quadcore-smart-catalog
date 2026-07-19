import type { WorkflowStepState, WorkflowValidationIssue } from "@/shared/workflow/workflow.types";
import {
  PRODUCT_ENTRY_AVAILABILITY_OPTIONS,
  PRODUCT_ENTRY_CONDITION_OPTIONS,
  isApprovedProductAvailability,
  isApprovedProductCondition,
  isApprovedProductEntryCurrency,
} from "../product-entry-commercial-options";
import { PRODUCT_ENTRY_REVIEW_POLICY } from "../product-entry-review-policy";
import { PRODUCT_ENTRY_STEP_IDS, type ProductEntryStepId, type ProductEntryValues } from "../product-entry.types";
import type { ProductEntrySpecificationsResolution } from "./product-entry-specifications.service";
import { ProductEntrySpecificationsService } from "./product-entry-specifications.service";

export interface ProductEntryReviewNotice {
  section: string;
  problem: string;
  correction: string;
  stepId: ProductEntryStepId;
}

export interface ProductEntryReviewScoreCategory {
  label: string;
  score: number;
  maximum: number;
  explanation: string;
}

export interface ProductEntryReviewViewModel {
  overallStatus: "Ready to Save" | "Needs Attention" | "Cannot Save";
  overallExplanation: string;
  readyToSave: boolean;
  customerStatus: "Ready for Customer" | "Customer Presentation Needs Improvement" | "Not Ready for Customer";
  customerExplanation: string;
  blockingErrors: ProductEntryReviewNotice[];
  warnings: ProductEntryReviewNotice[];
  identity: { values: { label: string; value: string }[]; editStepId: ProductEntryStepId };
  specifications: {
    requiredCompleted: number;
    requiredTotal: number;
    optionalCompleted: number;
    optionalTotal: number;
    values: { label: string; value: string }[];
    missing: string[];
  };
  commercial: { values: { label: string; value: string }[] };
  images: { count: number; mainStatus: string; values: { label: string; value: string }[] };
  quality: { score: number; maximum: 100; label: string; policyVersion: string; categories: ProductEntryReviewScoreCategory[] };
}

interface CreateReviewInput {
  values: Readonly<ProductEntryValues>;
  steps: readonly WorkflowStepState[];
  specificationsResolution: ProductEntrySpecificationsResolution | null;
  names: { department?: string; category?: string; deviceClass?: string; brand?: string; productModel?: string };
  categoryRequiresDeviceClass: boolean;
}

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== "";
const scoreRules = (rules: readonly number[], results: readonly boolean[]) =>
  rules.reduce((score, points, index) => score + (results[index] ? points : 0), 0);
const stepSection = (stepId: string) => {
  if (stepId === PRODUCT_ENTRY_STEP_IDS.category || stepId === PRODUCT_ENTRY_STEP_IDS.deviceClass || stepId === PRODUCT_ENTRY_STEP_IDS.productModel) return "Product Identity";
  if (stepId === PRODUCT_ENTRY_STEP_IDS.specifications) return "Specifications";
  if (stepId === PRODUCT_ENTRY_STEP_IDS.commercialDetails) return "Commercial Details";
  if (stepId === PRODUCT_ENTRY_STEP_IDS.images) return "Images";
  return "Product Decisions";
};
const correctionFor = (stepId: ProductEntryStepId) => ({
  [PRODUCT_ENTRY_STEP_IDS.entryMethod]: "Review the entry method.",
  [PRODUCT_ENTRY_STEP_IDS.category]: "Choose a valid Category.",
  [PRODUCT_ENTRY_STEP_IDS.deviceClass]: "Choose a valid Device Class.",
  [PRODUCT_ENTRY_STEP_IDS.productModel]: "Choose a valid Product Model and Brand.",
  [PRODUCT_ENTRY_STEP_IDS.specifications]: "Review the highlighted specification fields.",
  [PRODUCT_ENTRY_STEP_IDS.commercialDetails]: "Review the highlighted product details.",
  [PRODUCT_ENTRY_STEP_IDS.images]: "Review the image list and Main Product Image.",
  [PRODUCT_ENTRY_STEP_IDS.review]: "Review this product before finishing.",
})[stepId];
const displaySpecificationValue = (
  field: Extract<ProductEntrySpecificationsResolution, { status: "resolved" }>["fields"][number],
  value: unknown,
) => {
  if (field.fieldType === "select") return field.options.find((option) => Object.is(option.value, value))?.label ?? "Invalid selection";
  if (field.fieldType === "boolean") return value === true ? "Yes" : value === false ? "No" : "Not entered";
  return field.fieldType === "number" && field.guidance?.unitLabel
    ? `${String(value)} ${field.guidance.unitLabel}`
    : String(value);
};

export const ProductEntryReviewService = {
  createViewModel(input: CreateReviewInput): ProductEntryReviewViewModel {
    const blockingErrors = input.steps.flatMap((step) => {
      if (step.id === PRODUCT_ENTRY_STEP_IDS.review || step.validation?.valid !== false) return [];
      return step.validation.issues.map((issue: WorkflowValidationIssue) => ({
        section: stepSection(step.id),
        problem: issue.message,
        correction: correctionFor(step.id as ProductEntryStepId),
        stepId: step.id as ProductEntryStepId,
      }));
    });
    const values = input.values;
    const resolved = input.specificationsResolution?.status === "resolved" ? input.specificationsResolution : null;
    const specificationIssues = resolved ? ProductEntrySpecificationsService.validateValues(resolved, values.specificationValues) : [];
    const invalidSpecificationIds = new Set(specificationIssues.flatMap((issue) => issue.specificationFieldId ? [issue.specificationFieldId] : []));
    const requiredFields = resolved?.fields.filter((field) => field.required) ?? [];
    const optionalFields = resolved?.fields.filter((field) => !field.required) ?? [];
    const validField = (field: (typeof requiredFields)[number]) => hasValue(values.specificationValues[field.specificationFieldId]) && !invalidSpecificationIds.has(field.specificationFieldId) && !field.configurationError;
    const requiredCompleted = requiredFields.filter(validField).length;
    const optionalCompleted = optionalFields.filter(validField).length;
    const specificationValues = (resolved?.fields ?? []).flatMap((field) => {
      const value = values.specificationValues[field.specificationFieldId];
      return hasValue(value) && !invalidSpecificationIds.has(field.specificationFieldId)
        ? [{ label: field.label, value: displaySpecificationValue(field, value) }]
        : [];
    });
    const validImages = values.images.filter((image) => image.previewAvailability === "available" && Boolean(image.originalPreviewUrl));
    const hasValidMain = validImages.some((image) => image.isPrimary);
    const hasReselection = values.images.some((image) => image.previewAvailability === "reselection-required");
    const warnings: ProductEntryReviewNotice[] = [];
    const warn = (section: string, problem: string, correction: string, stepId: ProductEntryStepId) => warnings.push({ section, problem, correction, stepId });
    if (!values.productCode.trim()) warn("Commercial Details", "Product Code is not entered.", "Add a Product Code when one is available. This is optional.", PRODUCT_ENTRY_STEP_IDS.commercialDetails);
    if (values.wholesalePrice === null) warn("Commercial Details", "Wholesale Price is not entered.", "Add it if employees need wholesale pricing. This is optional.", PRODUCT_ENTRY_STEP_IDS.commercialDetails);
    else if (values.retailPrice !== null && values.wholesalePrice > values.retailPrice) warn("Commercial Details", "Wholesale Price exceeds Retail Price.", "Confirm both prices before saving.", PRODUCT_ENTRY_STEP_IDS.commercialDetails);
    if (!values.isActive) warn("Commercial Details", "Product is hidden from the Catalog.", "Show it in the Catalog when it is ready for customers.", PRODUCT_ENTRY_STEP_IDS.commercialDetails);
    if (values.images.length === 0) warn("Images", "No Product images have been added.", "Add a Main Product Image to improve customer presentation.", PRODUCT_ENTRY_STEP_IDS.images);
    else if (values.images.length === 1) warn("Images", "Only one Product image is available.", "Add another useful view when available.", PRODUCT_ENTRY_STEP_IDS.images);
    if (hasReselection) warn("Images", "An image requires reselection after Draft restoration.", "Select the image again or remove it.", PRODUCT_ENTRY_STEP_IDS.images);
    if (optionalFields.length > optionalCompleted) warn("Specifications", "Some optional Specifications are empty.", "Add confirmed optional details to improve customer presentation.", PRODUCT_ENTRY_STEP_IDS.specifications);

    const identityResults = [Boolean(input.names.category), !input.categoryRequiresDeviceClass || Boolean(input.names.deviceClass), Boolean(input.names.productModel), Boolean(input.names.brand), Boolean(values.productName.trim())];
    const commercialResults = [values.retailPrice !== null && Number.isFinite(values.retailPrice) && values.retailPrice >= 0, isApprovedProductEntryCurrency(values.currency), values.quantity !== null && Number.isInteger(values.quantity) && values.quantity >= 0, isApprovedProductCondition(values.condition), isApprovedProductAvailability(values.availabilityStatus), !(values.availabilityStatus === "available" && values.quantity === 0)];
    const specScore = resolved && !resolved.fields.some((field) => field.configurationError)
      ? Math.round((requiredFields.length === 0 ? 1 : requiredCompleted / requiredFields.length) * PRODUCT_ENTRY_REVIEW_POLICY.score.specifications.maximum)
      : 0;
    const categories: ProductEntryReviewScoreCategory[] = [
      { label: "Product Identity", score: scoreRules(PRODUCT_ENTRY_REVIEW_POLICY.score.identity.rules, identityResults), maximum: 20, explanation: `${identityResults.filter(Boolean).length} of 5 identity checks confirmed.` },
      { label: "Required Specifications", score: specScore, maximum: 30, explanation: `${requiredCompleted} of ${requiredFields.length} required specifications confirmed.` },
      { label: "Commercial Details", score: scoreRules(PRODUCT_ENTRY_REVIEW_POLICY.score.commercial.rules, commercialResults), maximum: 25, explanation: `${commercialResults.filter(Boolean).length} of 6 commercial checks confirmed.` },
      { label: "Product Images", score: scoreRules(PRODUCT_ENTRY_REVIEW_POLICY.score.images.rules, [validImages.length > 0, hasValidMain, validImages.length > 1, !hasReselection]), maximum: 15, explanation: values.images.length === 0 ? "Images are optional for saving but improve presentation." : `${validImages.length} valid image${validImages.length === 1 ? "" : "s"}; ${hasValidMain ? "Main image confirmed" : "Main image needs attention"}.` },
      { label: "Presentation Readiness", score: scoreRules(PRODUCT_ENTRY_REVIEW_POLICY.score.presentation.rules, [values.isActive, Boolean(values.productCode.trim()), optionalFields.length === 0 || optionalCompleted === optionalFields.length, warnings.filter((warning) => warning.section !== "Commercial Details" || warning.problem !== "Wholesale Price is not entered.").length === 0]), maximum: 10, explanation: "Based on Catalog visibility, Product Code, optional specifications, and presentation warnings." },
    ];
    const total = Math.max(0, Math.min(100, categories.reduce((sum, category) => sum + category.score, 0)));
    const readyToSave = blockingErrors.length === 0;
    const customerRequirements = readyToSave && values.isActive && Boolean(values.productName.trim()) && commercialResults[0] && commercialResults[1] && requiredCompleted === requiredFields.length && validImages.length > 0 && hasValidMain && !hasReselection;
    const customerStatus = !readyToSave || !values.productName.trim() || !commercialResults[0] || requiredCompleted !== requiredFields.length || (values.images.length > 0 && !hasValidMain)
      ? "Not Ready for Customer" as const
      : customerRequirements ? "Ready for Customer" as const : "Customer Presentation Needs Improvement" as const;
    const overallStatus = !readyToSave ? "Cannot Save" as const : warnings.length > 0 ? "Needs Attention" as const : "Ready to Save" as const;

    return {
      overallStatus,
      overallExplanation: !readyToSave ? `${blockingErrors.length} problem${blockingErrors.length === 1 ? "" : "s"} must be corrected before finishing Review.` : warnings.length ? "The Product can be saved after Review, with optional improvements available." : "All blocking Product Entry requirements are valid.",
      readyToSave,
      customerStatus,
      customerExplanation: customerStatus === "Ready for Customer" ? "The confirmed information and Main Product Image support customer presentation." : customerStatus === "Not Ready for Customer" ? "Correct blocking or essential customer-facing information first." : "The Product can be saved, but customer-facing information can be improved.",
      blockingErrors,
      warnings,
      identity: { values: [{ label: "Product Name", value: values.productName.trim() || "Not entered" }, values.productCode.trim() ? { label: "Product Code", value: values.productCode.trim() } : null, input.names.department ? { label: "Department", value: input.names.department } : null, input.names.category ? { label: "Category", value: input.names.category } : null, input.names.deviceClass ? { label: "Device Class", value: input.names.deviceClass } : null, input.names.brand ? { label: "Brand", value: input.names.brand } : null, input.names.productModel ? { label: "Product Model", value: input.names.productModel } : null].filter((item): item is { label: string; value: string } => item !== null), editStepId: !input.names.category ? PRODUCT_ENTRY_STEP_IDS.category : input.categoryRequiresDeviceClass && !input.names.deviceClass ? PRODUCT_ENTRY_STEP_IDS.deviceClass : PRODUCT_ENTRY_STEP_IDS.productModel },
      specifications: { requiredCompleted, requiredTotal: requiredFields.length, optionalCompleted, optionalTotal: optionalFields.length, values: specificationValues, missing: requiredFields.filter((field) => !validField(field)).map((field) => field.label) },
      commercial: { values: [{ label: "Product Name", value: values.productName || "Not entered" }, values.productCode ? { label: "Product Code", value: values.productCode } : null, { label: "Retail Price", value: values.retailPrice === null ? "Not entered" : `${values.retailPrice} ${values.currency}` }, values.wholesalePrice === null ? null : { label: "Wholesale Price", value: `${values.wholesalePrice} ${values.currency}` }, { label: "Currency", value: values.currency || "Not entered" }, { label: "Quantity", value: values.quantity === null ? "Not entered" : String(values.quantity) }, { label: "Condition", value: PRODUCT_ENTRY_CONDITION_OPTIONS.find((option) => option.value === values.condition)?.label ?? "Not entered" }, { label: "Availability", value: PRODUCT_ENTRY_AVAILABILITY_OPTIONS.find((option) => option.value === values.availabilityStatus)?.label ?? "Not entered" }, { label: "Featured", value: values.isFeatured ? "Yes" : "No" }, { label: "Catalog visibility", value: values.isActive ? "Visible" : "Hidden" }].filter((item): item is { label: string; value: string } => item !== null) },
      images: { count: values.images.length, mainStatus: values.images.length === 0 ? "No images added" : hasValidMain ? "Main Product Image confirmed" : "Main Product Image needs attention", values: [...values.images].sort((a, b) => a.sortOrder - b.sortOrder).map((image) => ({ label: `${image.sortOrder}. ${image.fileName}`, value: `${image.selectedDisplayVersion === "processed" ? "Processed" : "Original"} · ${image.processingStatus} · ${image.previewAvailability === "available" ? "Original available" : "Reselection required"}${image.processedPreviewUrl ? " · Processed available" : ""}` })) },
      quality: { score: total, maximum: 100, label: PRODUCT_ENTRY_REVIEW_POLICY.labels.find((label) => total >= label.minimum)!.label, policyVersion: PRODUCT_ENTRY_REVIEW_POLICY.version, categories },
    };
  },
};
