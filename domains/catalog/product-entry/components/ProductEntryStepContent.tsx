"use client";

import { useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";
import {
  PRODUCT_ENTRY_STEP_IDS,
  type ProductEntryStepId,
} from "../product-entry.types";
import { EntryMethodStep } from "./steps/EntryMethodStep";
import { CatalogHierarchyStep } from "./steps/CatalogHierarchyStep";
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
import { PRODUCT_ENTRY_PRESENTATION_TEXT } from "../presentation/product-entry-i18n";
import type { ProductEntryCatalogReferenceData } from "../ports/product-entry-catalog-reference-data.port";
import type { ProductEntryCatalogReferenceDataCoordinator } from "../presentation/product-entry-catalog-reference-data.coordinator";

const STEP_PRESENTATION: Record<
  ProductEntryStepId,
  { title: "entryMethodTitle" | "categoryTitle" | "deviceClassTitle" | "productModelTitle" | "specificationsTitle" | "detailsTitle" | "imagesTitle" | "reviewTitle"; description: "entryMethodDescription" | "categoryDescription" | "deviceClassDescription" | "productModelDescription" | "specificationsDescription" | "detailsDescription" | "imagesDescription" | "reviewDescription" }
> = {
  [PRODUCT_ENTRY_STEP_IDS.entryMethod]: {
    title: "entryMethodTitle", description: "entryMethodDescription",
  },
  [PRODUCT_ENTRY_STEP_IDS.category]: {
    title: "categoryTitle", description: "categoryDescription",
  },
  [PRODUCT_ENTRY_STEP_IDS.deviceClass]: {
    title: "deviceClassTitle", description: "deviceClassDescription",
  },
  [PRODUCT_ENTRY_STEP_IDS.productModel]: {
    title: "productModelTitle", description: "productModelDescription",
  },
  [PRODUCT_ENTRY_STEP_IDS.specifications]: {
    title: "specificationsTitle", description: "specificationsDescription",
  },
  [PRODUCT_ENTRY_STEP_IDS.commercialDetails]: {
    title: "detailsTitle", description: "detailsDescription",
  },
  [PRODUCT_ENTRY_STEP_IDS.images]: {
    title: "imagesTitle", description: "imagesDescription",
  },
  [PRODUCT_ENTRY_STEP_IDS.review]: {
    title: "reviewTitle", description: "reviewDescription",
  },
};

export function getProductEntryStepPresentation(stepId: string | null, locale: "en" | "ar") {
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  if (!stepId || !(stepId in STEP_PRESENTATION)) {
    return {
      title: text.productEntryTitle,
      description: text.productEntryDescription,
      placeholder: text.workflowPlaceholder,
    };
  }
  const presentation = STEP_PRESENTATION[stepId as ProductEntryStepId];
  return { title: text[presentation.title], description: text[presentation.description], placeholder: text.workflowPlaceholder };
}

interface ProductEntryStepContentProps {
  referenceCoordinator: ProductEntryCatalogReferenceDataCoordinator;
  referenceData: ProductEntryCatalogReferenceData;
  referenceLoadError: string | null;
  referenceLoading: boolean;
  onRetryReferenceData: () => void;
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
  locale: "en" | "ar";
}

export function ProductEntryStepContent({ referenceCoordinator, referenceData, referenceLoadError, referenceLoading, onRetryReferenceData, deviceClasses, deviceClassLoadError, deviceClassesLoading, onRetryDeviceClasses, productModels, productModelContextLabel, productModelContextValid, productModelLoadError, productModelsLoading, onRetryProductModels, specificationsLoadError, specificationsLoading, specificationsResolution, onRetrySpecifications, review, locale }: ProductEntryStepContentProps) {
  const { currentStepId, validation } = useProductEntryWorkflow();
  const presentation = getProductEntryStepPresentation(currentStepId, locale);
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
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
        <EntryMethodStep locale={locale} />
      ) : isCategory ? (
        <CatalogHierarchyStep coordinator={referenceCoordinator} data={referenceData} loadError={referenceLoadError} loading={referenceLoading} locale={locale} onRetry={onRetryReferenceData} />
      ) : isDeviceClass ? (
        <DeviceClassStep deviceClasses={deviceClasses} loadError={deviceClassLoadError} loading={deviceClassesLoading} locale={locale} onRetry={onRetryDeviceClasses} />
      ) : isProductModel ? (
        <ProductModelStep brands={referenceData.brands} contextLabel={productModelContextLabel} contextValid={productModelContextValid} loadError={productModelLoadError} loading={productModelsLoading} locale={locale} onRetry={onRetryProductModels} productModels={productModels} />
      ) : isSpecifications ? (
        <SpecificationsStep loadError={specificationsLoadError} loading={specificationsLoading} locale={locale} onRetry={onRetrySpecifications} resolution={specificationsResolution} />
      ) : isCommercialDetails ? (
        <CommercialDetailsStep conditions={referenceData.conditions} currencies={referenceData.currencies} locale={locale} supplyStatuses={referenceData.supplyStatuses} />
      ) : isImages ? (
        <ProductImagesStep locale={locale} />
      ) : isReview ? (
        <ProductReviewStep locale={locale} review={review} />
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
          <p className="font-medium text-red-900">{text.reviewStepPrompt}</p>
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
