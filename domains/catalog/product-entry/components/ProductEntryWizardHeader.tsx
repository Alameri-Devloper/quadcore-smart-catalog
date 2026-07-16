"use client";

import { useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";
import { getProductEntryStepPresentation } from "./ProductEntryStepContent";

interface ProductEntryWizardHeaderProps {
  onClose: () => void;
  onHome: () => void;
}

export function ProductEntryWizardHeader({
  onClose,
  onHome,
}: ProductEntryWizardHeaderProps) {
  const { currentStepId } = useProductEntryWorkflow();
  const presentation = getProductEntryStepPresentation(currentStepId);

  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            Product catalog
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Add Product
          </h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            onClick={onHome}
            type="button"
          >
            Home
          </button>
          <button
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            aria-label="Close Product Entry"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
      <div>
        <p className="text-lg font-semibold text-slate-900">
          {presentation.title}
        </p>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {presentation.description}
        </p>
      </div>
    </header>
  );
}
