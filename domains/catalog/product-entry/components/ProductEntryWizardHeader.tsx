"use client";

import { useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";
import { getProductEntryStepPresentation } from "./ProductEntryStepContent";

export function ProductEntryWizardHeader() {
  const { currentStepId } = useProductEntryWorkflow();
  const presentation = getProductEntryStepPresentation(currentStepId);

  return (
    <header className="space-y-3">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Product catalog
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Add Product
        </h1>
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
