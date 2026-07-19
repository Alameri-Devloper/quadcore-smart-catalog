"use client";

import { useState } from "react";
import { useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";
import {
  PRODUCT_ENTRY_STEP_IDS,
  isProductEntryMethodEnabled,
} from "../product-entry.types";

interface ProductEntryNavigationProps {
  deviceClassSelectionValid: boolean;
  reviewReadyToSave: boolean;
}

export function ProductEntryNavigation({ deviceClassSelectionValid, reviewReadyToSave }: ProductEntryNavigationProps) {
  const {
    currentStepId,
    canGoBack,
    canGoNext,
    back,
    next,
    completeWorkflow,
    values,
  } = useProductEntryWorkflow();
  const [isWorking, setIsWorking] = useState(false);
  const isReview = currentStepId === PRODUCT_ENTRY_STEP_IDS.review;
  const isImages = currentStepId === PRODUCT_ENTRY_STEP_IDS.images;
  const hasValidImage = values.images.some((image) => image.previewAvailability === "available" && Boolean(image.originalPreviewUrl));
  const hasValidEntryMethod =
    currentStepId !== PRODUCT_ENTRY_STEP_IDS.entryMethod ||
    isProductEntryMethodEnabled(values.entryMethod);
  const hasValidCurrentDecision =
    currentStepId !== PRODUCT_ENTRY_STEP_IDS.deviceClass ||
    deviceClassSelectionValid;

  const run = async (action: () => Promise<unknown>) => {
    setIsWorking(true);
    try {
      await action();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <footer className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:bg-white sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <button
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canGoBack || isWorking}
          onClick={back}
          type="button"
        >
          Back
        </button>

        {isReview ? (
          <button
            className="min-h-12 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canGoNext || !reviewReadyToSave || isWorking}
            onClick={() => void run(completeWorkflow)}
            type="button"
          >
            {isWorking ? "Checking…" : "Finish Review"}
          </button>
        ) : (
          <button
            className="min-h-12 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canGoNext || !hasValidEntryMethod || !hasValidCurrentDecision || isWorking}
            onClick={() => void run(next)}
            type="button"
          >
            {isWorking ? "Checking…" : isImages && !hasValidImage ? "Continue Without Images" : "Next"}
          </button>
        )}
      </div>
      {isImages && !hasValidImage ? <p className="mt-2 text-right text-xs text-slate-600">Images are optional for saving in the current version, but adding images improves customer presentation.</p> : null}
    </footer>
  );
}
