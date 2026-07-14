"use client";

import { useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";

export function ProductEntryProgress() {
  const {
    currentStepId,
    visibleSteps,
    completedSteps,
    progress,
    goToStep,
  } = useProductEntryWorkflow();
  const completedIds = new Set(completedSteps.map((step) => step.id));

  return (
    <nav aria-label="Product entry progress" className="space-y-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-slate-700">Progress</span>
        <span className="font-semibold tabular-nums text-blue-700">
          {progress}%
        </span>
      </div>
      <div
        aria-label={`${progress}% complete`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 lg:grid-cols-8">
        {visibleSteps.map((step, index) => {
          const isCurrent = step.id === currentStepId;
          const isCompleted = completedIds.has(step.id);
          const canVisit = isCurrent || isCompleted;

          return (
            <li className="shrink-0" key={step.id}>
              <button
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${step.label}${
                  isCompleted ? ", completed" : ""
                }`}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-45 sm:w-full"
                disabled={!canVisit}
                onClick={() => goToStep(step.id)}
                type="button"
              >
                <span aria-hidden="true">{isCompleted ? "✓" : index + 1}</span>
                <span className="sr-only">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
