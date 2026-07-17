"use client";

import { useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";
import {
  PRODUCT_ENTRY_STEP_IDS,
  type ProductEntryStepId,
} from "../product-entry.types";
import { EntryMethodStep } from "./steps/EntryMethodStep";
import { CategoryStep } from "./steps/CategoryStep";
import type { ProductEntryCategoryOption } from "../services/product-entry-category.service";
import type { ProductEntryDeviceClassOption } from "../services/product-entry-device-class.service";
import { DeviceClassStep } from "./steps/DeviceClassStep";
import type { ProductEntryProductModelOption } from "../services/product-entry-product-model.service";
import { ProductModelStep } from "./steps/ProductModelStep";
import type { ProductEntrySpecificationsResolution } from "../services/product-entry-specifications.service";
import { SpecificationsStep } from "./steps/SpecificationsStep";
import { CommercialDetailsStep } from "./steps/CommercialDetailsStep";
import { ProductImagesStep } from "./steps/ProductImagesStep";
import { ProductReviewStep } from "./steps/ProductReviewStep";
import type { ProductEntryReviewViewModel } from "../services/product-entry-review.service";

const STEP_PRESENTATION: Record<
  ProductEntryStepId,
  { title: string; description: string; placeholder: string }
> = {
  [PRODUCT_ENTRY_STEP_IDS.entryMethod]: {
    title: "Entry Method",
    description: "Choose how you want to add this product.",
    placeholder: "Manual entry is ready. More entry methods will be added later.",
  },
  [PRODUCT_ENTRY_STEP_IDS.category]: {
    title: "Category",
    description: "Choose where this product belongs in your catalog.",
    placeholder: "Category selection will appear here in the next UI task.",
  },
  [PRODUCT_ENTRY_STEP_IDS.deviceClass]: {
    title: "Device Class",
    description: "Narrow the product type when the selected category needs it.",
    placeholder: "Device class selection will appear here when required.",
  },
  [PRODUCT_ENTRY_STEP_IDS.productModel]: {
    title: "Product Model",
    description: "Select the model that defines this product.",
    placeholder: "Product model selection will appear here.",
  },
  [PRODUCT_ENTRY_STEP_IDS.specifications]: {
    title: "Device Specifications",
    description: "Add the technical details customers need to compare products.",
    placeholder: "Device specification fields will appear here.",
  },
  [PRODUCT_ENTRY_STEP_IDS.commercialDetails]: {
    title: "Product Details",
    description: "Add the name, price, quantity, condition, and availability.",
    placeholder: "Commercial product details will appear here.",
  },
  [PRODUCT_ENTRY_STEP_IDS.images]: {
    title: "Add product images",
    description: "Add clear product images, choose the main image, and prepare them for a consistent Catalog appearance.",
    placeholder: "Product images are optional.",
  },
  [PRODUCT_ENTRY_STEP_IDS.review]: {
    title: "Review",
    description: "Review the product information before completing the workflow.",
    placeholder: "A product summary will appear here before saving is implemented.",
  },
};

export function getProductEntryStepPresentation(stepId: string | null) {
  if (!stepId || !(stepId in STEP_PRESENTATION)) {
    return {
      title: "Product Entry",
      description: "Follow the steps to add a product.",
      placeholder: "Workflow content will appear here.",
    };
  }

  return STEP_PRESENTATION[stepId as ProductEntryStepId];
}

interface ProductEntryStepContentProps {
  categories: ProductEntryCategoryOption[];
  categoryLoadError: string | null;
  categoriesLoading: boolean;
  onRetryCategories: () => void;
  deviceClasses: ProductEntryDeviceClassOption[];
  deviceClassLoadError: string | null;
  deviceClassesLoading: boolean;
  onRetryDeviceClasses: () => void;
  productModels: ProductEntryProductModelOption[];
  productModelContextLabel: string;
  productModelContextValid: boolean;
  productModelLoadError: string | null;
  productModelsLoading: boolean;
  onRetryProductModels: () => void;
  specificationsLoadError: string | null;
  specificationsLoading: boolean;
  specificationsResolution: ProductEntrySpecificationsResolution | null;
  onRetrySpecifications: () => void;
  review: ProductEntryReviewViewModel;
}

export function ProductEntryStepContent({ categories, categoryLoadError, categoriesLoading, onRetryCategories, deviceClasses, deviceClassLoadError, deviceClassesLoading, onRetryDeviceClasses, productModels, productModelContextLabel, productModelContextValid, productModelLoadError, productModelsLoading, onRetryProductModels, specificationsLoadError, specificationsLoading, specificationsResolution, onRetrySpecifications, review }: ProductEntryStepContentProps) {
  const { currentStepId, validation } = useProductEntryWorkflow();
  const presentation = getProductEntryStepPresentation(currentStepId);
  const isEntryMethod = currentStepId === PRODUCT_ENTRY_STEP_IDS.entryMethod;
  const isCategory = currentStepId === PRODUCT_ENTRY_STEP_IDS.category;
  const isDeviceClass = currentStepId === PRODUCT_ENTRY_STEP_IDS.deviceClass;
  const isProductModel = currentStepId === PRODUCT_ENTRY_STEP_IDS.productModel;
  const isSpecifications = currentStepId === PRODUCT_ENTRY_STEP_IDS.specifications;
  const isCommercialDetails = currentStepId === PRODUCT_ENTRY_STEP_IDS.commercialDetails;
  const isImages = currentStepId === PRODUCT_ENTRY_STEP_IDS.images;
  const isReview = currentStepId === PRODUCT_ENTRY_STEP_IDS.review;

  return (
    <section
      aria-labelledby="product-entry-step-heading"
      className="min-h-72 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:min-h-80 sm:p-8"
    >
      {isEntryMethod ? (
        <EntryMethodStep />
      ) : isCategory ? (
        <CategoryStep categories={categories} loadError={categoryLoadError} loading={categoriesLoading} onRetry={onRetryCategories} />
      ) : isDeviceClass ? (
        <DeviceClassStep deviceClasses={deviceClasses} loadError={deviceClassLoadError} loading={deviceClassesLoading} onRetry={onRetryDeviceClasses} />
      ) : isProductModel ? (
        <ProductModelStep contextLabel={productModelContextLabel} contextValid={productModelContextValid} loadError={productModelLoadError} loading={productModelsLoading} onRetry={onRetryProductModels} productModels={productModels} />
      ) : isSpecifications ? (
        <SpecificationsStep loadError={specificationsLoadError} loading={specificationsLoading} onRetry={onRetrySpecifications} resolution={specificationsResolution} />
      ) : isCommercialDetails ? (
        <CommercialDetailsStep />
      ) : isImages ? (
        <ProductImagesStep />
      ) : isReview ? (
        <ProductReviewStep review={review} />
      ) : (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center sm:min-h-64">
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
          {currentStepId
            ? Object.values(PRODUCT_ENTRY_STEP_IDS).indexOf(
                currentStepId as ProductEntryStepId,
              ) + 1
            : "–"}
        </span>
        <h2
          id="product-entry-step-heading"
          className="text-xl font-semibold text-slate-950"
        >
          {presentation.title}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          {presentation.placeholder}
        </p>
      </div>
      )}

      {!isEntryMethod && !isCategory && !isDeviceClass && !isProductModel && !isSpecifications && !isCommercialDetails && !isImages && !isReview && validation && !validation.valid ? (
        <div
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="font-medium text-red-900">Please review this step.</p>
          <ul className="mt-2 space-y-1 text-sm text-red-800">
            {validation.issues.map((issue) => (
              <li key={`${issue.code}-${issue.field ?? issue.message}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
