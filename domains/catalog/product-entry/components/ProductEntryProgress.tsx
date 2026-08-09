"use client";

import { useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";
import { formatProductEntryWesternNumber, PRODUCT_ENTRY_PRESENTATION_TEXT } from "../presentation/product-entry-i18n";
import { PRODUCT_ENTRY_STEP_IDS } from "../product-entry.types";

export function ProductEntryProgress({ locale }: { readonly locale: "en" | "ar" }) {
  const {
    currentStepId,
    visibleSteps,
    completedSteps,
    progress,
    goToStep,
  } = useProductEntryWorkflow();
  const completedIds = new Set(completedSteps.map((step) => step.id));
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  const stepLabels: Record<string, string> = {
    [PRODUCT_ENTRY_STEP_IDS.entryMethod]: text.entryMethodTitle,
    [PRODUCT_ENTRY_STEP_IDS.category]: text.categoryTitle,
    [PRODUCT_ENTRY_STEP_IDS.deviceClass]: text.deviceClassTitle,
    [PRODUCT_ENTRY_STEP_IDS.productModel]: text.productModelTitle,
    [PRODUCT_ENTRY_STEP_IDS.specifications]: text.specificationsTitle,
    [PRODUCT_ENTRY_STEP_IDS.commercialDetails]: text.detailsTitle,
    [PRODUCT_ENTRY_STEP_IDS.images]: text.imagesTitle,
    [PRODUCT_ENTRY_STEP_IDS.review]: text.reviewTitle,
  };

  return (
    <nav aria-label={text.productEntryProgress} className="space-y-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-slate-700">{text.progress}</span>
        <span className="font-semibold tabular-nums text-blue-700">
          {formatProductEntryWesternNumber(progress, locale)}%
        </span>
      </div>
      <div
        aria-label={`${formatProductEntryWesternNumber(progress, locale)}% ${text.complete}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="grid grid-cols-4 gap-2 pb-2 lg:grid-cols-8">
        {visibleSteps.map((step, index) => {
          const localizedStepLabel = stepLabels[step.id] ?? step.label;
          const isCurrent = step.id === currentStepId;
          const isCompleted = completedIds.has(step.id);
          const needsAttention = !isCurrent && step.validation?.valid === false;
          const canVisit = isCurrent || isCompleted || needsAttention;
          const stateLabel = isCurrent
            ? text.current
            : isCompleted
              ? text.completed
              : needsAttention
                ? text.needsAttention
                : text.notStarted;
          const stateIcon = isCompleted
            ? "✓"
            : needsAttention
              ? "!"
              : index + 1;

          return (
            <li className="shrink-0" key={step.id}>
              <button
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${text.step} ${formatProductEntryWesternNumber(index + 1, locale)}: ${localizedStepLabel}, ${stateLabel}`}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-xl border-2 px-2 py-2 text-sm font-semibold transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-45 ${
                  isCurrent
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : isCompleted
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : needsAttention
                        ? "border-amber-600 bg-amber-50 text-amber-950"
                        : "border-slate-300 bg-white text-slate-600"
                }`}
                disabled={!canVisit}
                onClick={() => goToStep(step.id)}
                type="button"
              >
                <span aria-hidden="true">{stateIcon}</span>
                <span className="sr-only">{localizedStepLabel}</span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 text-[0.65rem] leading-tight"
                >
                  {stateLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
