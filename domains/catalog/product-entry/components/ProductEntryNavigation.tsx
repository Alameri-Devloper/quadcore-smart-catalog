"use client";

import { useState } from "react";
import { useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";
import { PRODUCT_ENTRY_STEP_IDS, isProductEntryMethodEnabled } from "../product-entry.types";
import { PRODUCT_ENTRY_PRESENTATION_TEXT } from "../presentation/product-entry-i18n";

interface ProductEntryNavigationProps {
  readonly deviceClassSelectionValid: boolean;
  readonly reviewReadyToSave: boolean;
  readonly isBusy: boolean;
  readonly onSave: () => Promise<void>;
  readonly locale: "en" | "ar";
}

export function ProductEntryNavigation({ deviceClassSelectionValid, reviewReadyToSave, isBusy, onSave, locale }: ProductEntryNavigationProps) {
  const { currentStepId, canGoBack, canGoNext, back, next, values } = useProductEntryWorkflow();
  const [isWorking, setIsWorking] = useState(false);
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  const isReview = currentStepId === PRODUCT_ENTRY_STEP_IDS.review;
  const isImages = currentStepId === PRODUCT_ENTRY_STEP_IDS.images;
  const hasValidImage = values.images.some((image) => image.operationType !== "Remove" &&
    (image.operationType === null || image.hashStatus === "Ready"));
  const hasValidEntryMethod = currentStepId !== PRODUCT_ENTRY_STEP_IDS.entryMethod ||
    isProductEntryMethodEnabled(values.entryMethod);
  const hasValidCurrentDecision = currentStepId !== PRODUCT_ENTRY_STEP_IDS.deviceClass ||
    deviceClassSelectionValid;

  const run = async (action: () => Promise<unknown>) => {
    setIsWorking(true);
    try { await action(); }
    finally { setIsWorking(false); }
  };

  return (
    <footer className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:bg-white sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <button className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-45" disabled={!canGoBack || isWorking || isBusy} onClick={back} type="button">{text.back}</button>
        {isReview ? (
          <button className="min-h-12 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:opacity-45" disabled={!canGoNext || !reviewReadyToSave || isWorking || isBusy} onClick={() => void run(onSave)} type="button">{isWorking || isBusy ? text.saving : text.saveProduct}</button>
        ) : (
          <button className="min-h-12 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-45" disabled={!canGoNext || !hasValidEntryMethod || !hasValidCurrentDecision || isWorking || isBusy} onClick={() => void run(next)} type="button">{isWorking ? text.saving : isImages && !hasValidImage ? text.continueWithoutImages : text.next}</button>
        )}
      </div>
      {isImages && !hasValidImage ? <p className="mt-2 text-end text-xs text-slate-600">{text.imagesOptionalHint}</p> : null}
    </footer>
  );
}
