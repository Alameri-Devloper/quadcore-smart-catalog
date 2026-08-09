"use client";
import { PRODUCT_ENTRY_PRESENTATION_TEXT } from "../presentation/product-entry-i18n";

interface ProductEntryCompletionProps {
  onReturnToReview: () => void;
  onEditProduct: () => void;
  onHome: () => void;
  locale: "en" | "ar";
}

export function ProductEntryCompletion({
  onReturnToReview,
  onEditProduct,
  onHome,
  locale,
}: ProductEntryCompletionProps) {
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-700"
        >
          ✓
        </span>
        <h1 className="mt-5 text-3xl font-bold text-slate-950">
          {text.reviewCompleted}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
          {text.reviewCompletedDescription}
        </p>
        <div className="mt-8 grid w-full max-w-sm gap-3">
          <button
            className="min-h-12 rounded-xl bg-blue-600 px-5 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            onClick={onReturnToReview}
            type="button"
          >
            {text.returnToReview}
          </button>
          <button
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            onClick={onEditProduct}
            type="button"
          >
            {text.editProduct}
          </button>
          <button
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            onClick={onHome}
            type="button"
          >
            {text.home}
          </button>
          <button className="min-h-12 cursor-not-allowed rounded-xl bg-slate-200 px-5 font-semibold text-slate-500" disabled title={text.availableLater} type="button">
            {text.continueToSave}
          </button>
          <p className="text-xs font-medium text-slate-500">{text.availableLater}</p>
          <button className="min-h-12 cursor-not-allowed rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-400" disabled title={text.multipleDraftsUnavailable} type="button">{text.startAnotherDraft}</button>
          <p className="text-xs font-medium text-slate-500">{text.multipleDraftsUnavailable}</p>
        </div>
      </section>
    </main>
  );
}
