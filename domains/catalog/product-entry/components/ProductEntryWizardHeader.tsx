"use client";

import { useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";
import { getProductEntryStepPresentation } from "./ProductEntryStepContent";
import { PRODUCT_ENTRY_PRESENTATION_TEXT } from "../presentation/product-entry-i18n";

interface ProductEntryWizardHeaderProps {
  readonly mode: "Create" | "Edit";
  readonly productId: string | null;
  readonly locale: "en" | "ar";
  readonly onLocaleChange: (locale: "en" | "ar") => void;
  readonly onClose: () => void;
  readonly onHome: () => void;
}

export function ProductEntryWizardHeader({ mode, productId, locale, onLocaleChange, onClose, onHome }: ProductEntryWizardHeaderProps) {
  const { currentStepId } = useProductEntryWorkflow();
  const presentation = getProductEntryStepPresentation(currentStepId, locale);
  const ar = locale === "ar";
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">{text.productCatalog}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{mode === "Edit" ? text.editProduct : text.addProduct}</h1>
          {productId ? <p className="mt-2 text-xs text-slate-500">{text.productId}: {productId}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button aria-label={text.switchLanguage} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={() => onLocaleChange(ar ? "en" : "ar")} type="button">{ar ? "English" : "العربية"}</button>
          <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={onHome} type="button">{text.home}</button>
          <button aria-label={`${text.close} ${text.productEntryTitle}`} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={onClose} type="button">{text.close}</button>
        </div>
      </div>
      <div><p className="text-lg font-semibold text-slate-900">{presentation.title}</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{presentation.description}</p></div>
    </header>
  );
}
